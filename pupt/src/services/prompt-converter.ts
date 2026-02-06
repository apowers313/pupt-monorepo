/**
 * Converts old-format pupt Handlebars .md prompts to new pupt-lib .prompt (JSX) format.
 *
 * This is the service version of scripts/convert-prompt.ts, extracted for use by the CLI.
 */
import path from 'node:path';
import matter from 'gray-matter';

// --- Types ---

interface HelperCall {
  helperName: string;
  varName: string;
  message?: string;
  fullMatch: string;
}

interface AskComponent {
  tag: string;
  name: string;
  label: string;
  props: Record<string, string>;
  selfClosing: boolean;
  children?: string;
}

interface FrontmatterVariable {
  name: string;
  type: string;
  message?: string;
  default?: unknown;
  choices?: string[];
  validate?: string;
  basePath?: string;
  filter?: string;
  autoReview?: boolean;
}

interface ContentSection {
  type: string;
  content: string;
}

export interface ConversionResult {
  output: string;
  askComponents: AskComponent[];
  sections: ContentSection[];
  reviewFileVars: string[];
  promptName: string;
  description: string;
  tags: string[];
}

// --- Helper mappings ---

const INTERACTIVE_HELPERS: Record<string, string> = {
  input: 'Ask.Text',
  select: 'Ask.Select',
  multiselect: 'Ask.MultiSelect',
  confirm: 'Ask.Confirm',
  editor: 'Ask.Editor',
  password: 'Ask.Secret',
  file: 'Ask.File',
  reviewFile: 'Ask.ReviewFile',
};

const HELPER_LABEL_SUFFIX: Record<string, string> = {
  input: ':',
  select: ':',
  multiselect: ' (select multiple):',
  confirm: '?',
  editor: ' (press enter to open editor):',
  password: ':',
  file: ':',
  reviewFile: ':',
};

/**
 * Generate a human-readable label from a variable name and helper type,
 * matching the old Handlebars generateDefaultMessage() behaviour.
 */
function generateLabel(name: string, helperType: string): string {
  const humanized = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
  const capitalized = humanized.charAt(0).toUpperCase() + humanized.slice(1);
  const suffix = HELPER_LABEL_SUFFIX[helperType] ?? ':';
  return `${capitalized}${suffix}`;
}

const STATIC_HELPERS: Record<string, string> = {
  date: '<DateTime />',
  time: '<DateTime />',
  datetime: '<DateTime />',
  timestamp: '<Timestamp />',
  uuid: '<UUID />',
  username: '<Username />',
  hostname: '<Hostname />',
  cwd: '<Cwd />',
};

const SECTION_PATTERNS: Array<{ pattern: RegExp; component: string }> = [
  { pattern: /^\*\*Role(?:\s*&\s*Context)?/i, component: 'Role' },
  { pattern: /^\*\*Objective/i, component: 'Task' },
  { pattern: /^\*\*Task/i, component: 'Task' },
  { pattern: /^\*\*Context/i, component: 'Context' },
  { pattern: /^\*\*(?:Specific\s+)?Requirements?\*\*/i, component: 'Constraint' },
  { pattern: /^\*\*Constraints?\*?\*?/i, component: 'Constraint' },
  { pattern: /^\*\*Format(?:\s*&\s*Structure)?/i, component: 'Format' },
  { pattern: /^\*\*Examples?\*?\*?/i, component: 'Section' },
  { pattern: /^\*\*Success\s+Criteria/i, component: 'SuccessCriteria' },
  { pattern: /^\*\*Audience/i, component: 'Audience' },
  { pattern: /^\*\*Tone/i, component: 'Tone' },
];

// --- Core functions ---

function parseHelperCalls(body: string): HelperCall[] {
  const calls: HelperCall[] = [];
  const helperRegex = /\{\{(input|select|multiselect|confirm|editor|password|file|reviewFile)\s+"([^"]+)"(?:\s+"([^"]+)")?\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = helperRegex.exec(body)) !== null) {
    calls.push({
      helperName: match[1],
      varName: match[2],
      message: match[3],
      fullMatch: match[0],
    });
  }
  return calls;
}

function buildAskComponents(
  helperCalls: HelperCall[],
  frontmatterVars: FrontmatterVariable[],
): AskComponent[] {
  const seen = new Set<string>();
  const components: AskComponent[] = [];

  for (const v of frontmatterVars) {
    if (seen.has(v.name)) continue;
    seen.add(v.name);

    const helperType = mapFrontmatterType(v.type);
    const tag = INTERACTIVE_HELPERS[helperType] ?? 'Ask.Text';
    const props: Record<string, string> = {};

    if (v.default !== undefined) {
      props['default'] = typeof v.default === 'string'
        ? `"${escapeJsxAttr(v.default)}"`
        : JSON.stringify(v.default);
    }
    if (v.validate) {
      props['pattern'] = `"${escapeJsxAttr(v.validate)}"`;
    }
    if (v.basePath) {
      props['basePath'] = `"${escapeJsxAttr(v.basePath)}"`;
    }
    if (v.filter) {
      props['filter'] = `"${escapeJsxAttr(v.filter)}"`;
    }

    const hasChildren = v.choices && v.choices.length > 0;
    components.push({
      tag,
      name: v.name,
      label: v.message ?? generateLabel(v.name, helperType),
      props,
      selfClosing: !hasChildren,
      children: hasChildren
        ? v.choices!.map(c => `    <Option value="${escapeJsxAttr(c)}">${escapeJsx(c)}</Option>`).join('\n')
        : undefined,
    });
  }

  for (const call of helperCalls) {
    if (seen.has(call.varName)) continue;
    seen.add(call.varName);

    const tag = INTERACTIVE_HELPERS[call.helperName] ?? 'Ask.Text';
    components.push({
      tag,
      name: call.varName,
      label: call.message ?? generateLabel(call.varName, call.helperName),
      props: {},
      selfClosing: true,
    });
  }

  return components;
}

function mapFrontmatterType(type: string): string {
  const map: Record<string, string> = {
    text: 'input',
    input: 'input',
    select: 'select',
    multiselect: 'multiselect',
    confirm: 'confirm',
    editor: 'editor',
    password: 'password',
    file: 'file',
    reviewFile: 'reviewFile',
    'review-file': 'reviewFile',
  };
  return map[type] ?? 'input';
}

function convertBody(body: string): string {
  let result = body;

  // Extract and protect {{#raw}} blocks
  const rawBlocks: string[] = [];
  result = result.replace(
    /\{\{#raw\}\}([\s\S]*?)\{\{\/raw\}\}/g,
    (_match, content) => {
      rawBlocks.push(content);
      return `__RAW_BLOCK_${rawBlocks.length - 1}__`;
    },
  );

  // Process block helpers
  result = result.replace(
    /\{\{#each\s+(\w+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, varName, content) => {
      const innerContent = content.replace(/\{\{this\}\}/g, '{item}');
      return `<ForEach items={inputs.${varName}}>${innerContent}</ForEach>`;
    },
  );

  result = result.replace(
    /\{\{#if\s+\(?([\w"' ]+)\)?\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, condition, content) => {
      const cond = condition.trim().replace(/^"(.*)"$/, '$1');
      return `<If condition={inputs.${cond}}>${content}</If>`;
    },
  );

  result = result.replace(
    /\{\{#unless\s+(\w+)\s*\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_match, varName, content) => `<If condition={!inputs.${varName}}>${content}</If>`,
  );

  // Replace static helpers
  for (const [helper, jsx] of Object.entries(STATIC_HELPERS)) {
    result = result.replace(new RegExp(`\\{\\{${helper}\\}\\}`, 'g'), jsx);
  }

  // Replace interactive helpers with input references
  result = result.replace(
    /\{\{(input|select|multiselect|confirm|editor|password|file|reviewFile)\s+"([^"]+)"(?:\s+"[^"]*")?\s*\}\}/g,
    (_match, _helper, varName) => `{inputs.${varName}}`,
  );

  // Replace simple variable references
  result = result.replace(
    /\{\{(?!#|\/|else\b|!--)([a-zA-Z_]\w*)\}\}/g,
    (_match, varName) => {
      if (STATIC_HELPERS[varName]) return STATIC_HELPERS[varName];
      return `{inputs.${varName}}`;
    },
  );

  // Restore raw blocks
  for (let i = 0; i < rawBlocks.length; i++) {
    result = result.replace(`__RAW_BLOCK_${i}__`, rawBlocks[i]);
  }

  return result;
}

function detectSections(body: string): ContentSection[] {
  const lines = body.split('\n');
  const sections: ContentSection[] = [];
  let currentType: string | null = null;
  let currentContent: string[] = [];

  function flushSection(): void {
    if (currentType && currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (content) {
        sections.push({ type: currentType, content });
      }
    }
    currentContent = [];
  }

  for (const line of lines) {
    let matched = false;
    for (const { pattern, component } of SECTION_PATTERNS) {
      if (pattern.test(line)) {
        flushSection();
        currentType = component;
        const afterHeading = line.replace(/^\*\*[^*]+\*\*\s*:?\s*/, '').trim();
        if (afterHeading) {
          currentContent.push(afterHeading);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (currentType === null) {
        currentType = 'Section';
      }
      currentContent.push(line);
    }
  }
  flushSection();

  return sections;
}

function renderAskComponent(comp: AskComponent, indent: string): string {
  const propsStr = Object.entries(comp.props)
    .map(([k, v]) => ` ${k}={${v}}`)
    .join('');

  if (comp.selfClosing) {
    return `${indent}<${comp.tag} name="${escapeJsxAttr(comp.name)}" label="${escapeJsxAttr(comp.label)}"${propsStr} />`;
  }

  return [
    `${indent}<${comp.tag} name="${escapeJsxAttr(comp.name)}" label="${escapeJsxAttr(comp.label)}"${propsStr}>`,
    comp.children,
    `${indent}</${comp.tag}>`,
  ].join('\n');
}

function renderSections(sections: ContentSection[], convertedBody: string, indent: string): string {
  if (sections.length === 0) {
    return `${indent}<Section>\n${indentText(convertedBody.trim(), indent + '  ')}\n${indent}</Section>`;
  }

  const parts: string[] = [];
  for (const section of sections) {
    const converted = convertBody(section.content);

    if (section.type === 'SuccessCriteria') {
      const criteria = extractBulletItems(converted);
      if (criteria.length > 0) {
        const criteriaJsx = criteria
          .map(c => `${indent}  <Criterion>${c.trim()}</Criterion>`)
          .join('\n');
        parts.push(`${indent}<SuccessCriteria>\n${criteriaJsx}\n${indent}</SuccessCriteria>`);
      } else {
        parts.push(`${indent}<SuccessCriteria>\n${indent}  <Criterion>${converted.trim()}</Criterion>\n${indent}</SuccessCriteria>`);
      }
    } else if (section.type === 'Section') {
      parts.push(`${indent}<Section>\n${indentText(converted.trim(), indent + '  ')}\n${indent}</Section>`);
    } else {
      parts.push(`${indent}<${section.type}>\n${indentText(converted.trim(), indent + '  ')}\n${indent}</${section.type}>`);
    }
  }

  return parts.join('\n\n');
}

function extractBulletItems(text: string): string[] {
  const items: string[] = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*[-*]\s+(.*)/);
    if (match) {
      items.push(match[1]);
    }
  }
  return items;
}

function indentText(text: string, indent: string): string {
  return text.split('\n').map(line => line ? indent + line : '').join('\n');
}

function escapeJsxAttr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeJsx(s: string): string {
  return s.replace(/[{}<>]/g, c => {
    const map: Record<string, string> = { '{': '&#123;', '}': '&#125;', '<': '&lt;', '>': '&gt;' };
    return map[c] ?? c;
  });
}

function titleToName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFrontmatterVariables(frontmatter: Record<string, unknown>): FrontmatterVariable[] {
  const vars: FrontmatterVariable[] = [];

  if (Array.isArray(frontmatter.variables)) {
    for (const v of frontmatter.variables) {
      if (typeof v === 'object' && v !== null) {
        const obj = v as Record<string, unknown>;
        vars.push({
          name: String(obj.name ?? ''),
          type: String(obj.type ?? 'input'),
          message: obj.message ? String(obj.message) : undefined,
          default: obj.default,
          choices: Array.isArray(obj.choices) ? obj.choices.map(String) : undefined,
          validate: obj.validate ? String(obj.validate) : undefined,
          basePath: obj.basePath ? String(obj.basePath) : undefined,
          filter: obj.filter ? String(obj.filter) : undefined,
          autoReview: typeof obj.autoReview === 'boolean' ? obj.autoReview : undefined,
        });
      }
    }
  }

  if (typeof frontmatter.vars === 'object' && frontmatter.vars !== null && !Array.isArray(frontmatter.vars)) {
    const varsObj = frontmatter.vars as Record<string, unknown>;
    for (const [name, def] of Object.entries(varsObj)) {
      if (typeof def === 'object' && def !== null) {
        const obj = def as Record<string, unknown>;
        vars.push({
          name,
          type: String(obj.type ?? 'input'),
          message: obj.message ? String(obj.message) : undefined,
          default: obj.default,
          choices: Array.isArray(obj.choices) ? obj.choices.map(String) : undefined,
          validate: obj.validate ? String(obj.validate) : undefined,
          basePath: obj.basePath ? String(obj.basePath) : undefined,
          filter: obj.filter ? String(obj.filter) : undefined,
        });
      }
    }
  }

  return vars;
}

/**
 * Convert a .md prompt to a .prompt JSX string.
 */
export function convertPrompt(mdContent: string, filename: string): ConversionResult {
  const { data: frontmatter, content: body } = matter(mdContent);

  const title = (frontmatter.title as string) ?? path.basename(filename, '.md');
  const promptName = titleToName(title);
  const description = (frontmatter.summary as string) ?? title;
  const tags: string[] = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

  const fmVars = parseFrontmatterVariables(frontmatter);
  const helperCalls = parseHelperCalls(body);
  const askComponents = buildAskComponents(helperCalls, fmVars);

  const reviewFileVars = helperCalls
    .filter(c => c.helperName === 'reviewFile')
    .map(c => c.varName)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const sections = detectSections(body);
  const convertedBody = convertBody(body);

  const indent = '  ';
  const lines: string[] = [];

  lines.push(`{/* Converted from ${path.basename(filename)} */}`);

  const tagsStr = tags.length > 0
    ? `tags={[${tags.map(t => `"${escapeJsxAttr(t)}"`).join(', ')}]}`
    : 'tags={[]}';
  lines.push(`<Prompt name="${escapeJsxAttr(promptName)}" description="${escapeJsxAttr(description)}" ${tagsStr}>`);

  if (askComponents.length > 0) {
    for (const comp of askComponents) {
      lines.push(renderAskComponent(comp, indent));
    }
    lines.push('');
  }

  const sectionsJsx = renderSections(sections, convertedBody, indent);
  lines.push(sectionsJsx);

  if (reviewFileVars.length > 0) {
    lines.push('');
    const reviewChildren = reviewFileVars
      .map(v => `${indent}  <ReviewFile file={inputs.${v}} />`)
      .join('\n');
    lines.push(`${indent}<PostExecution>`);
    lines.push(reviewChildren);
    lines.push(`${indent}</PostExecution>`);
  }

  lines.push('</Prompt>');

  return {
    output: lines.join('\n') + '\n',
    askComponents,
    sections,
    reviewFileVars,
    promptName,
    description,
    tags,
  };
}

#!/usr/bin/env npx tsx
/**
 * Converts a pupt Handlebars .md prompt file to a pupt-lib .prompt (runtime JSX) file.
 *
 * Usage: npx tsx scripts/convert-prompt.ts <input.md> [output.prompt]
 */
import fs from 'fs-extra';
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
  type: string; // JSX component name (Role, Task, Context, etc.)
  content: string;
}

interface ConversionResult {
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

// Section heading patterns → JSX component names
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

/**
 * Parse all {{helperName "varName" "message"}} calls from the template body.
 */
export function parseHelperCalls(body: string): HelperCall[] {
  const calls: HelperCall[] = [];
  // Match: {{helperName "varName"}} or {{helperName "varName" "message"}}
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

/**
 * Build Ask components from helper calls and frontmatter variables.
 * Deduplicates by variable name (first occurrence wins).
 */
export function buildAskComponents(
  helperCalls: HelperCall[],
  frontmatterVars: FrontmatterVariable[],
): AskComponent[] {
  const seen = new Set<string>();
  const components: AskComponent[] = [];

  // First process frontmatter variables (they have richer metadata)
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
      label: v.message ?? v.name,
      props,
      selfClosing: !hasChildren,
      children: hasChildren
        ? v.choices!.map(c => `    <Option value="${escapeJsxAttr(c)}">${escapeJsx(c)}</Option>`).join('\n')
        : undefined,
    });
  }

  // Then process inline helper calls
  for (const call of helperCalls) {
    if (seen.has(call.varName)) continue;
    seen.add(call.varName);

    const tag = INTERACTIVE_HELPERS[call.helperName] ?? 'Ask.Text';
    components.push({
      tag,
      name: call.varName,
      label: call.message ?? call.varName,
      props: {},
      selfClosing: true,
    });
  }

  return components;
}

/**
 * Map frontmatter variable types to helper names.
 */
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

/**
 * Replace Handlebars expressions in the body with JSX equivalents.
 */
export function convertBody(body: string): string {
  let result = body;

  // 1. Extract and protect {{#raw}} blocks first (content should not be transformed)
  const rawBlocks: string[] = [];
  result = result.replace(
    /\{\{#raw\}\}([\s\S]*?)\{\{\/raw\}\}/g,
    (_match, content) => {
      rawBlocks.push(content);
      return `__RAW_BLOCK_${rawBlocks.length - 1}__`;
    },
  );

  // 2. Process block helpers before variable references
  // {{#each items}}...{{/each}} — must run before {{this}} gets caught by variable regex
  result = result.replace(
    /\{\{#each\s+(\w+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, varName, content) => {
      const innerContent = content.replace(/\{\{this\}\}/g, '{item}');
      return `<ForEach items={inputs.${varName}}>${innerContent}</ForEach>`;
    },
  );

  // {{#if var}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+\(?([\w"' ]+)\)?\s*\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, condition, content) => {
      const cond = condition.trim().replace(/^"(.*)"$/, '$1');
      return `<If condition={inputs.${cond}}>${content}</If>`;
    },
  );

  // {{#unless var}}...{{/unless}}
  result = result.replace(
    /\{\{#unless\s+(\w+)\s*\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_match, varName, content) => `<If condition={!inputs.${varName}}>${content}</If>`,
  );

  // 3. Replace static helpers
  for (const [helper, jsx] of Object.entries(STATIC_HELPERS)) {
    result = result.replace(new RegExp(`\\{\\{${helper}\\}\\}`, 'g'), jsx);
  }

  // 4. Replace interactive helpers with input references
  result = result.replace(
    /\{\{(input|select|multiselect|confirm|editor|password|file|reviewFile)\s+"([^"]+)"(?:\s+"[^"]*")?\s*\}\}/g,
    (_match, _helper, varName) => `{inputs.${varName}}`,
  );

  // 5. Replace simple variable references {{varName}} (not block helpers)
  result = result.replace(
    /\{\{(?!#|\/|else\b|!--)([a-zA-Z_]\w*)\}\}/g,
    (_match, varName) => {
      if (STATIC_HELPERS[varName]) return STATIC_HELPERS[varName];
      return `{inputs.${varName}}`;
    },
  );

  // 6. Restore raw blocks
  for (let i = 0; i < rawBlocks.length; i++) {
    result = result.replace(`__RAW_BLOCK_${i}__`, rawBlocks[i]);
  }

  return result;
}

/**
 * Split markdown body into structural sections based on heading patterns.
 */
export function detectSections(body: string): ContentSection[] {
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
        // Extract content after the heading marker
        const afterHeading = line
          .replace(/^\*\*[^*]+\*\*\s*:?\s*/, '')
          .trim();
        if (afterHeading) {
          currentContent.push(afterHeading);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (currentType === null) {
        // Content before any section heading → generic Section
        currentType = 'Section';
      }
      currentContent.push(line);
    }
  }
  flushSection();

  return sections;
}

/**
 * Render an Ask component to JSX string.
 */
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

/**
 * Render sections to JSX, applying component wrappers.
 */
function renderSections(sections: ContentSection[], convertedBody: string, indent: string): string {
  if (sections.length === 0) {
    // No detected sections — output the converted body as-is inside a Section
    return `${indent}<Section>\n${indentText(convertedBody.trim(), indent + '  ')}\n${indent}</Section>`;
  }

  const parts: string[] = [];
  for (const section of sections) {
    // Convert the section content (replace helpers)
    const converted = convertBody(section.content);

    if (section.type === 'SuccessCriteria') {
      // Wrap bullet points as Criterion components
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

/**
 * Extract bullet items from markdown text.
 */
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

/**
 * Indent every line of text.
 */
function indentText(text: string, indent: string): string {
  return text.split('\n').map(line => line ? indent + line : '').join('\n');
}

/**
 * Escape characters for JSX attribute values.
 */
function escapeJsxAttr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Escape characters for JSX text content.
 */
function escapeJsx(s: string): string {
  return s.replace(/[{}<>]/g, c => {
    const map: Record<string, string> = { '{': '&#123;', '}': '&#125;', '<': '&lt;', '>': '&gt;' };
    return map[c] ?? c;
  });
}

/**
 * Derive a kebab-case name from a title.
 */
export function titleToName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert a .md prompt to a .prompt JSX string.
 */
export function convertPrompt(mdContent: string, filename: string): ConversionResult {
  const { data: frontmatter, content: body } = matter(mdContent);

  // Extract metadata
  const title = (frontmatter.title as string) ?? path.basename(filename, '.md');
  const promptName = titleToName(title);
  const description = (frontmatter.summary as string) ?? title;
  const tags: string[] = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

  // Parse frontmatter variables
  const fmVars = parseFrontmatterVariables(frontmatter);

  // Parse helper calls from body
  const helperCalls = parseHelperCalls(body);

  // Build Ask components (deduplicated)
  const askComponents = buildAskComponents(helperCalls, fmVars);

  // Detect reviewFile vars (for PostExecution)
  const reviewFileVars = helperCalls
    .filter(c => c.helperName === 'reviewFile')
    .map(c => c.varName)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  // Detect sections
  const sections = detectSections(body);

  // Convert the body text (replace helpers with JSX)
  const convertedBody = convertBody(body);

  // Assemble output
  const indent = '  ';
  const lines: string[] = [];

  // Comment header
  lines.push(`{/* Converted from ${path.basename(filename)} */}`);

  // Prompt opening tag
  const tagsStr = tags.length > 0
    ? `tags={[${tags.map(t => `"${escapeJsxAttr(t)}"`).join(', ')}]}`
    : 'tags={[]}';
  lines.push(`<Prompt name="${escapeJsxAttr(promptName)}" description="${escapeJsxAttr(description)}" ${tagsStr}>`);

  // Ask components
  if (askComponents.length > 0) {
    for (const comp of askComponents) {
      lines.push(renderAskComponent(comp, indent));
    }
    lines.push('');
  }

  // Sections
  const sectionsJsx = renderSections(sections, convertedBody, indent);
  lines.push(sectionsJsx);

  // PostExecution block
  if (reviewFileVars.length > 0) {
    lines.push('');
    const reviewChildren = reviewFileVars
      .map(v => `${indent}  <ReviewFile file={inputs.${v}} />`)
      .join('\n');
    lines.push(`${indent}<PostExecution>`);
    lines.push(reviewChildren);
    lines.push(`${indent}</PostExecution>`);
  }

  // Close Prompt
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

/**
 * Parse frontmatter variables from different formats.
 */
function parseFrontmatterVariables(frontmatter: Record<string, unknown>): FrontmatterVariable[] {
  const vars: FrontmatterVariable[] = [];

  // Format 1: variables: [{name, type, ...}]
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

  // Format 2: vars: {name: {type, default, ...}}
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

// --- CLI entry point ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: npx tsx scripts/convert-prompt.ts <input.md> [output.prompt]');
    console.log('');
    console.log('Converts a pupt Handlebars .md prompt to a pupt-lib .prompt (JSX) file.');
    console.log('');
    console.log('If output path is not specified, writes to <basename>.prompt in the same directory.');
    process.exit(args.length === 0 ? 1 : 0);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = args[1]
    ? path.resolve(args[1])
    : inputPath.replace(/\.md$/, '.prompt');

  if (!await fs.pathExists(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const mdContent = await fs.readFile(inputPath, 'utf-8');
  const result = convertPrompt(mdContent, inputPath);

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, result.output, 'utf-8');

  console.log(`Converted: ${inputPath}`);
  console.log(`Output:    ${outputPath}`);
  console.log(`  Name: ${result.promptName}`);
  console.log(`  Ask components: ${result.askComponents.length}`);
  console.log(`  Sections: ${result.sections.length}`);
  if (result.reviewFileVars.length > 0) {
    console.log(`  PostExecution: ReviewFile (${result.reviewFileVars.join(', ')})`);
  }
}

// Only run CLI when executed directly (not when imported by tests)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('convert-prompt.ts') ||
  process.argv[1].endsWith('convert-prompt.js')
);
if (isDirectRun) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import { ROLE_PRESETS, PROVIDER_ADAPTATIONS } from '../presets';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const roleSchema = z.object({
  preset: z.string().optional(),
  title: z.string().optional(),
  expertise: z.union([z.string(), z.array(z.string())]).optional(),
  experience: z.enum(['junior', 'mid', 'senior', 'expert', 'principal']).optional(),
  traits: z.array(z.string()).optional(),
  domain: z.string().optional(),
  style: z.enum(['professional', 'casual', 'academic', 'friendly']).optional(),
  extend: z.boolean().optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type RoleProps = z.infer<typeof roleSchema> & { children?: PuptNode };

export class Role extends Component<RoleProps> {
  static schema = roleSchema;

  render(props: RoleProps, _resolvedValue: void, context: RenderContext): PuptNode {
    const {
      preset,
      title,
      expertise,
      experience,
      traits,
      domain,
      delimiter = 'xml',
      children,
    } = props;

    // If custom children provided, use them (children override preset)
    if (this.hasContent(children)) {
      const parts: PuptNode[] = [children];
      if (expertise) {
        const expertiseStr = Array.isArray(expertise) ? expertise.join(', ') : expertise;
        parts.push(`\nwith expertise in ${expertiseStr}`);
      }
      if (domain) {
        parts.push(`\nspecializing in the ${domain} domain`);
      }
      const content = parts.length === 1 ? parts[0] : parts;
      return wrapWithDelimiter(content, 'role', delimiter);
    }

    // Build from preset + customizations
    const config = preset ? ROLE_PRESETS[preset] : undefined;
    const provider = this.getProvider(context);
    const adaptations = PROVIDER_ADAPTATIONS[provider];

    // Build title
    const roleTitle = title ?? config?.title ?? 'Assistant';
    const expLevel = experience ?? config?.experienceLevel;
    const expPrefix = this.getExperiencePrefix(expLevel);

    // Build expertise list
    const expertiseList = this.buildExpertiseList(expertise, config?.expertise);

    // Build description
    const parts: string[] = [];
    parts.push(`${adaptations.rolePrefix}${expPrefix}${roleTitle}`);

    if (expertiseList.length > 0) {
      parts[0] += ` with expertise in ${expertiseList.join(', ')}`;
    }
    parts[0] += '.';

    // Traits
    const allTraits = traits ?? config?.traits;
    if (allTraits && allTraits.length > 0) {
      parts.push(`You are ${allTraits.join(', ')}.`);
    }

    // Domain
    if (domain) {
      parts.push(`Specializing in the ${domain} domain.`);
    }

    return wrapWithDelimiter(parts.join(' '), 'role', delimiter);
  }

  private getExperiencePrefix(level?: string): string {
    if (!level) return '';
    const prefixes: Record<string, string> = {
      'junior': 'a junior ',
      'mid': 'a ',
      'senior': 'a senior ',
      'expert': 'an expert ',
      'principal': 'a principal ',
    };
    return prefixes[level] ?? '';
  }

  private buildExpertiseList(
    propsExpertise: string | string[] | undefined,
    presetExpertise: string[] | undefined,
  ): string[] {
    const result: string[] = [];

    // Props expertise comes first (user-specified)
    if (propsExpertise) {
      if (Array.isArray(propsExpertise)) {
        result.push(...propsExpertise);
      } else {
        result.push(...propsExpertise.split(',').map(s => s.trim()));
      }
    }

    // Add preset expertise that isn't already listed
    if (presetExpertise) {
      for (const exp of presetExpertise) {
        if (!result.some(r => r.toLowerCase() === exp.toLowerCase())) {
          result.push(exp);
        }
      }
    }

    return result;
  }
}

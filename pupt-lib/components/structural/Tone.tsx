import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const toneSchema = z.object({
  type: z.enum(['professional', 'casual', 'friendly', 'academic', 'authoritative', 'empathetic', 'enthusiastic', 'neutral', 'humorous', 'serious']).optional(),
  formality: z.enum(['formal', 'semi-formal', 'informal']).optional(),
  energy: z.enum(['calm', 'measured', 'energetic']).optional(),
  warmth: z.enum(['warm', 'neutral', 'distant']).optional(),
  brandVoice: z.string().optional(),
  avoidTones: z.array(z.string()).optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type ToneProps = z.infer<typeof toneSchema> & { children?: PuptNode };

export class Tone extends Component<ToneProps> {
  static schema = toneSchema;

  render(props: ToneProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { type, formality, energy, warmth, brandVoice, avoidTones, delimiter = 'xml', children } = props;

    // If custom children, use them
    if (this.hasContent(children)) {
      return wrapWithDelimiter(children, 'tone', delimiter);
    }

    const sections: string[] = [];

    // Tone type
    if (type) {
      sections.push(`Tone: ${type}`);
      const description = this.getToneDescription(type);
      if (description) {
        sections.push(description);
      }
    }

    // Voice characteristics
    const characteristics: string[] = [];
    if (formality) characteristics.push(`formality: ${formality}`);
    if (energy) characteristics.push(`energy: ${energy}`);
    if (warmth) characteristics.push(`warmth: ${warmth}`);
    if (characteristics.length > 0) {
      sections.push(`Voice characteristics: ${characteristics.join(', ')}`);
    }

    // Brand voice
    if (brandVoice) {
      sections.push(`Match the ${brandVoice} brand voice.`);
    }

    // Tones to avoid
    if (avoidTones && avoidTones.length > 0) {
      sections.push(`Avoid these tones: ${avoidTones.join(', ')}`);
    }

    const content = sections.join('\n');
    return wrapWithDelimiter(content, 'tone', delimiter);
  }

  private getToneDescription(type: string): string | null {
    const descriptions: Record<string, string> = {
      'professional': 'Maintain a formal, business-appropriate communication style.',
      'casual': 'Use a relaxed, conversational style.',
      'friendly': 'Be warm, approachable, and supportive.',
      'academic': 'Use scholarly precision with formal structure.',
      'authoritative': 'Be confident and decisive in your guidance.',
      'empathetic': 'Show understanding and emotional sensitivity.',
      'enthusiastic': 'Be energetic and positive.',
      'neutral': 'Maintain objectivity and balanced perspective.',
      'humorous': 'Use light humor and wit where appropriate.',
      'serious': 'Address topics with gravity and importance.',
    };
    return descriptions[type] ?? null;
  }
}

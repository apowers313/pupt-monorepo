import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const dateTimeSchema = z.object({
  format: z.string().optional(),
}).passthrough();

type DateTimeProps = z.infer<typeof dateTimeSchema>;

export class DateTime extends Component<DateTimeProps> {
  static schema = dateTimeSchema;

  render({ format }: DateTimeProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const now = new Date();

    if (!format) {
      return now.toISOString();
    }

    // Simple format string replacement
    let result = format;
    result = result.replace('YYYY', String(now.getFullYear()));
    result = result.replace('MM', String(now.getMonth() + 1).padStart(2, '0'));
    result = result.replace('DD', String(now.getDate()).padStart(2, '0'));
    result = result.replace('HH', String(now.getHours()).padStart(2, '0'));
    result = result.replace('mm', String(now.getMinutes()).padStart(2, '0'));
    result = result.replace('ss', String(now.getSeconds()).padStart(2, '0'));

    return result;
  }
}

import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

interface DateTimeProps {
  format?: string;
}

export class DateTime extends Component<DateTimeProps> {
  render({ format }: DateTimeProps, _context: RenderContext): PuptNode {
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

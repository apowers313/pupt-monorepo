export const DateFormats = {
  YYYYMMDD: (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  },

  UTC_DATETIME: (date: Date): string => {
    return date.toISOString();
  },

  LOCAL_DATE: (date: Date): string => {
    return date.toLocaleDateString();
  },

  LOCAL_TIME: (date: Date): string => {
    return date.toLocaleTimeString();
  },

  LOCAL_DATETIME: (date: Date): string => {
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  },

  RELATIVE: (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
};

export function formatDate(date: Date, format: keyof typeof DateFormats): string {
  const formatter = DateFormats[format];
  if (!formatter) {
    throw new Error(`Unknown date format: ${format}`);
  }
  return formatter(date);
}
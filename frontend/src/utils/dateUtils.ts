/**
 * Utility functions for parsing and formatting UTC dates returned from backend/SQLite
 * into the user's browser local timezone.
 */

export const parseServerDate = (dateInput: string | number | Date | null | undefined): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  let str = String(dateInput).trim();
  if (!str) return new Date();

  // If SQLite string "YYYY-MM-DD HH:MM:SS" or ISO string lacking timezone info:
  // Append 'Z' so JavaScript treats it as UTC, preventing naive local parsing.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (str.includes(' ') && !str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    str = str + 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const formatLocalTime = (dateInput: string | number | Date | null | undefined): string => {
  const date = parseServerDate(dateInput);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatLocalDateTime = (dateInput: string | number | Date | null | undefined): string => {
  const date = parseServerDate(dateInput);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export const formatLocalDate = (dateInput: string | number | Date | null | undefined): string => {
  const date = parseServerDate(dateInput);
  return date.toLocaleDateString();
};

export const formatSmartNotificationTime = (dateInput: string | number | Date | null | undefined): string => {
  const date = parseServerDate(dateInput);
  const now = new Date();
  const isSameDay = date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate();
  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return `${date.toLocaleDateString([], { month: 'numeric', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export function isValidText(value: string, minLength: number = 1): boolean {
  return !!value && value.trim().length >= minLength;
}

export function isValidDate(value: string): boolean {
  const date = new Date(value);
  return !!value && !isNaN(date.getTime());
}

export function isValidImageUrl(value: string): boolean {
  return !!value && value.startsWith('http');
}

export function isValidEmail(value: string): boolean {
  return !!value && value.includes('@');
}

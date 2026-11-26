// Text helpers the Worker and the web app share.

/** `text` with each character whose code point `unwanted` matches replaced by `replacement`. */
export function replaceChars(
  text: string,
  unwanted: (codePoint: number) => boolean,
  replacement = '',
): string {
  return Array.from(text, (char) => (unwanted(char.codePointAt(0) ?? 0) ? replacement : char)).join(
    '',
  );
}

/** C0 control characters (U+0000–U+001F). */
export const isC0Control = (codePoint: number): boolean => codePoint <= 0x1f;

/** A value read from JSON as text: strings as they are, numbers written out, anything else ''. */
export const textOf = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

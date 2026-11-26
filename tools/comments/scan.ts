// Finds comment blocks in source text: runs of comment lines, or one comment after code.
// Strings, template literals and character literals are skipped so `//` inside them is not a comment.

export interface CommentLine {
  /** 1-based line number. */
  line: number;
  /** The comment's words, without markers (//, /*, *, #, <!--). */
  text: string;
  /** The whole physical line's length, code included. */
  physicalLength: number;
}

export interface CommentBlock {
  lines: CommentLine[];
}

export type Syntax = 'c-like' | 'css' | 'hash' | 'html';

export function syntaxOf(file: string): Syntax | undefined {
  if (/\.(ts|tsx|mts|cts|js|mjs|cjs|cpp|cc|hpp|h|mm)$/.test(file)) return 'c-like';
  if (file.endsWith('.css')) return 'css';
  if (file.endsWith('.astro')) return 'c-like';
  if (/(^|\/)CMakeLists\.txt$|\.cmake$|\.sh$/.test(file)) return 'hash';
  if (file.endsWith('.html')) return 'html';
  return undefined;
}

const stripMarkers = (raw: string) =>
  raw
    .replace(/^\s*(\/\/\/?|\/\*\*?|\*\/|\*|#|<!--)/, '')
    .replace(/(\*\/|-->)\s*$/, '')
    .trim();

interface RawComment {
  line: number;
  text: string;
  afterCode: boolean;
}

function scanCLike(source: string, lineComments: boolean): RawComment[] {
  const comments: RawComment[] = [];
  let line = 1;
  let lineHasCode = false;
  let index = 0;
  const peek = (offset = 0) => source[index + offset] ?? '';
  const advance = () => {
    if (peek() === '\n') {
      line++;
      lineHasCode = false;
    }
    index++;
  };
  const skipQuoted = (quote: string) => {
    advance();
    while (index < source.length && peek() !== quote && peek() !== '\n') {
      if (peek() === '\\') advance();
      advance();
    }
    advance();
  };
  const skipTemplate = () => {
    advance();
    let depth = 0;
    while (index < source.length) {
      if (peek() === '\\') {
        advance();
        advance();
        continue;
      }
      if (depth === 0 && peek() === '`') break;
      if (peek() === '$' && peek(1) === '{') depth++;
      else if (peek() === '}' && depth > 0) depth--;
      advance();
    }
    advance();
  };
  while (index < source.length) {
    const char = peek();
    if (lineComments && char === '/' && peek(1) === '/') {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      comments.push({
        line,
        text: stripMarkers(source.slice(index, stop)),
        afterCode: lineHasCode,
      });
      index = stop;
      continue;
    }
    if (char === '/' && peek(1) === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      const afterCode = lineHasCode;
      source
        .slice(index, stop)
        .split('\n')
        .forEach((part, offset) => {
          comments.push({
            line: line + offset,
            text: stripMarkers(part),
            afterCode: afterCode && offset === 0,
          });
        });
      while (index < stop) advance();
      continue;
    }
    if (char === '"' || char === "'") skipQuoted(char);
    else if (char === '`') skipTemplate();
    else {
      if (!/\s/.test(char)) lineHasCode = true;
      advance();
    }
  }
  return comments;
}

function scanLinePrefixed(source: string, marker: RegExp): RawComment[] {
  const comments: RawComment[] = [];
  source.split('\n').forEach((text, offset) => {
    const match = marker.exec(text);
    if (match) {
      comments.push({
        line: offset + 1,
        text: stripMarkers(text.slice(match.index)),
        afterCode: match.index > 0 && text.slice(0, match.index).trim() !== '',
      });
    }
  });
  return comments;
}

function scanHtml(source: string): RawComment[] {
  const comments: RawComment[] = [];
  const pattern = /<!--([\s\S]*?)-->/g;
  for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
    const startLine = source.slice(0, match.index).split('\n').length;
    match[0].split('\n').forEach((part, offset) => {
      comments.push({ line: startLine + offset, text: stripMarkers(part), afterCode: false });
    });
  }
  return comments;
}

/** Comment lines grouped into blocks; empty marker-only lines (`/**`, ` *\/`) are dropped. */
export function commentBlocks(source: string, syntax: Syntax): CommentBlock[] {
  const raw =
    syntax === 'c-like' || syntax === 'css'
      ? scanCLike(source, syntax === 'c-like')
      : syntax === 'hash'
        ? scanLinePrefixed(source, /(^|\s)#(?![\w{])/)
        : scanHtml(source);
  const physical = source.split('\n');
  const blocks: CommentBlock[] = [];
  let previous: RawComment | undefined;
  for (const comment of raw) {
    const continues =
      previous !== undefined &&
      !comment.afterCode &&
      !previous.afterCode &&
      comment.line === previous.line + 1;
    previous = comment;
    if (comment.text === '') continue;
    const entry = {
      line: comment.line,
      text: comment.text,
      physicalLength: (physical[comment.line - 1] ?? '').length,
    };
    const last = blocks.at(-1);
    if (continues && last) last.lines.push(entry);
    else blocks.push({ lines: [entry] });
  }
  return blocks;
}

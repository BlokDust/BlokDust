/** v1's word wrap (SharePanel.WordWrap): fill `text` within `width` from (x, y), `lineHeight`
 * apart; returns the next line's y. */
export function wordWrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  lineHeight: number,
  width: number,
): number {
  let line = '',
    nextY = y;
  for (const word of text.split(' ')) {
    const longer = line ? `${line} ${word}` : word;
    if (ctx.measureText(longer).width > width && line) {
      ctx.fillText(line, x, nextY);
      nextY += lineHeight;
      line = word;
    } else line = longer;
  }
  if (line) {
    ctx.fillText(line, x, nextY);
    nextY += lineHeight;
  }
  return nextY;
}

/** The lines `text` breaks into within `width`, as wordWrap would draw them. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const longer = line ? `${line} ${word}` : word;
    if (ctx.measureText(longer).width > width && line) {
      lines.push(line);
      line = word;
    } else line = longer;
  }
  if (line) lines.push(line);
  return lines;
}

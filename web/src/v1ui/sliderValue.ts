// v1 OptionSlider's value while dragged, readable over its own bar (CHG-0049, SPEC-VISUAL-V1-PARITY
// R24): where text and bar colours are too close, the text's part over the bar takes the panel's.

/** Contrast (WCAG ratio) below which the text colour is swapped where it crosses the bar. */
export const MIN_CONTRAST = 2;

const luminance = (colour: string): number => {
  const rgb = (colour.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
export const contrast = (a: string, b: string): number => {
  const la = luminance(a),
    lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** The colour of the value's part over the bar: the text colour, or the panel's when that reads
 * clearly better. */
export function overBarColour(text: string, panel: string, bar: string): string {
  const onText = contrast(text, bar);
  return onText < MIN_CONTRAST && contrast(panel, bar) > onText ? panel : text;
}

export interface SliderBar {
  /** The bar's two ends in x (either order), its top and height. */
  from: number;
  to: number;
  y: number;
  height: number;
  colour: string;
}

/** Draws `value` at (x, y) like v1 (fill colour `text`), and its part over `bar` in
 * `overBarColour`. */
export function drawSliderValue(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  bar: SliderBar,
  text: string,
  panel: string,
): void {
  const over = overBarColour(text, panel, bar.colour);
  ctx.fillStyle = text;
  if (over === text) {
    ctx.fillText(value, x, y);
    return;
  }
  const left = Math.min(bar.from, bar.to),
    width = Math.abs(bar.to - bar.from);
  // Outside the bar: v1's colour (even-odd clip: the canvas minus the bar).
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1e6, -1e6, 2e6, 2e6);
  ctx.rect(left, bar.y, width, bar.height);
  ctx.clip('evenodd');
  ctx.fillText(value, x, y);
  ctx.restore();
  // Over the bar: the panel's colour.
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, bar.y, width, bar.height);
  ctx.clip();
  ctx.fillStyle = over;
  ctx.fillText(value, x, y);
  ctx.restore();
  ctx.fillStyle = text;
}

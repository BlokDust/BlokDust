/** The page element with `id` (of class `kind`); the panels' fields always exist (ensureTextFields
 * made them), so a missing one is a bug. */
export function pageElement(id: string): HTMLElement;
export function pageElement<Kind extends HTMLElement>(id: string, kind: new () => Kind): Kind;
export function pageElement(id: string, kind: new () => HTMLElement = HTMLElement): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof kind)) throw new Error(`BlokDust: the page has no ${kind.name} #${id}`);
  return element;
}

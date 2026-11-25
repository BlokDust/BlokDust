/** The page element with `id`; the panels' fields always exist (ensureTextFields made them), so a
 * missing one is a bug. */
export function pageElement<Element extends HTMLElement = HTMLElement>(id: string): Element {
  const element = document.getElementById(id);
  if (!element) throw new Error(`BlokDust: the page has no #${id}`);
  return element as Element;
}

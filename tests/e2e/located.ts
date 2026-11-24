// A point the page reported, or an error naming what was not found there.
export function located(
  point: readonly number[] | null | undefined,
  what: string,
): [number, number] {
  if (!point || point.length < 2) throw new Error(`${what} is not on the page`);
  return [point[0], point[1]];
}
/** Where a redirect points; throws when the answer is not a redirect. */
export function locationOf(response: Response): string {
  const location = response.headers.get('location');
  if (location === null) throw new Error(`no redirect (${response.status})`);
  return location;
}

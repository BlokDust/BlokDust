// A simple word check for text other people see (handles now; gallery titles next): SPEC-SHARING-ACCOUNTS R6.
// Owner, 2026-11-15: "a simple check on save and a report button" to start; real moderation if it takes off.
// It is deliberately small and conservative: it catches the obvious, and the report button handles the rest.

/** Refused anywhere in a name (after folding look-alikes): roots with few innocent uses. */
const ANYWHERE = [
  'fuck',
  'nigg',
  'faggot',
  'retard',
  'hitler',
  'whore',
  'porn',
  'wank',
  'twat',
  'motherf',
];
/** Refused only as a whole word (between spaces, _ or punctuation), so grape, spicy, Scunthorpe and peacock stay fine. */
const WHOLE = new Set([
  'shit',
  'shite',
  'cunt',
  'bitch',
  'slut',
  'dick',
  'cock',
  'pussy',
  'penis',
  'vagina',
  'rape',
  'rapist',
  'fag',
  'spic',
  'chink',
  'kike',
  'tranny',
  'paki',
  'nazi',
  'sex',
  'anal',
  'cum',
  'tits',
  'boobs',
]);
/** Names that would look official. */
const RESERVED = new Set([
  'admin',
  'administrator',
  'blokdust',
  'funputs',
  'moderator',
  'mod',
  'support',
  'staff',
  'official',
  'root',
  'system',
  'help',
  'api',
  'www',
  'null',
  'undefined',
  'anonymous',
]);

/** Lower case, accents dropped, common look-alikes (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s) folded, separators gone. */
export function fold(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[0@4]/g, (c) => (c === '0' ? 'o' : 'a'))
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
}

/** True when the text contains a blocked word. */
export function isOffensive(text: string): boolean {
  if (ANYWHERE.some((w) => fold(text).includes(w))) return true;
  return text
    .toLowerCase()
    .split(/[\s_\-.,!?'"()]+/)
    .some((t) => WHOLE.has(fold(t)));
}

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/** Why `handle` can't be used, or null when it can (R6). Handles are stored lower case. */
export function handleProblem(handle: string): string | null {
  if (!HANDLE_RE.test(handle)) return 'Use 3 to 20 letters, numbers or _.';
  if (RESERVED.has(handle) || RESERVED.has(handle.replace(/_/g, '')))
    return 'That name is reserved.';
  if (isOffensive(handle)) return 'Please choose another name.';
  return null;
}

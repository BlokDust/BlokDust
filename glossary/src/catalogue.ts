import { getCollection, type CollectionEntry } from 'astro:content';
import art from './original-art.json';
import { frontmatter as siteCopy } from './content/site.md';

export const categories = ['source', 'effect', 'power', 'interaction'] as const;
type Category = typeof categories[number];

const manifests = Object.values(import.meta.glob<{ id: string; category: Category }>(
  '../../blocks/*/*.block.json', { eager: true, import: 'default' },
));
const blocks = (await getCollection('blocks')).sort((a, b) => a.data.title.localeCompare(b.data.title, 'en'));
const guide = await getCollection('guide');
const coverage = new Map(blocks.map(block => [block.data.blockId, block.data.category]));

if (coverage.size !== blocks.length || coverage.size !== manifests.length ||
    manifests.some(manifest => coverage.get(manifest.id) !== manifest.category)) {
  throw new Error('Every block manifest must have exactly one glossary article in its category.');
}

type Article = CollectionEntry<'blocks'> | CollectionEntry<'guide'>;
const blockPath = (id: string) => `/blocks/${id}/`;
const categoryPath = (category: Category) => `/blocks/categories/${category}/`;
const articlePath = (entry: Article) => entry.collection === 'blocks' ? blockPath(entry.id) : `/${entry.data.route}/`;
const articles: Article[] = [...blocks, ...guide];
const articlesByPath = new Map(articles.map(entry => [articlePath(entry), entry]));
if (articlesByPath.size !== articles.length) throw new Error('Duplicate glossary route.');

const routes = [...articlesByPath.keys()].map(path => path.slice(1, -1));
export { blocks, guide, routes, siteCopy, blockPath, categoryPath };

const linksByPath = new Map(articles.map(entry => [
  articlePath(entry),
  new Set(Array.from((entry.body ?? '').matchAll(/\]\((\/[a-z0-9/-]+\/)(?:[#?][^\s)]*)?\)/g), ([, path]) => path)),
]));

export const categoryLinks = (category: Category) => blocks
  .filter(block => block.data.category === category)
  .map(block => ({ href: blockPath(block.id), title: block.data.title }));

export function relatedFor(entry: Article, group?: Category) {
  const ownPath = articlePath(entry);
  const members = group ? categoryLinks(group) : [];
  const outgoing = linksByPath.get(ownPath) ?? [];
  const incoming = [...linksByPath].filter(([, links]) => links.has(ownPath)).map(([path]) => path);
  const nearby = entry.collection === 'blocks' ? [categoryPath(entry.data.category)] : [];
  const general = ['/guide/get-started/', '/guide/keyboard-shortcuts/', '/blocks/'];
  const otherPaths = new Set([...outgoing, ...nearby, ...incoming, ...general]);
  otherPaths.delete(ownPath);
  const more = [...otherPaths].flatMap(href => {
    const other = articlesByPath.get(href);
    return other ? [{ href, title: other.data.title }] : [];
  });
  return [...members, ...more.slice(0, 5).filter(link => !members.some(member => member.href === link.href))];
}

export const categoryTitle = (category: Category) => {
  const entry = guide.find(entry => entry.data.route === `blocks/categories/${category}`);
  if (!entry) throw new Error(`Missing guide article for ${category}`);
  return entry.data.title;
};

type Artwork = { src: string; width: number; height: number };
const originalArt: Record<string, { banner: Artwork; tile?: Artwork }> = art;
export function guideArt(legacySource?: string) {
  const name = legacySource?.split('/').pop();
  return name ? originalArt[name] : undefined;
}

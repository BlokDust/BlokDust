# BlokDust guide

- [Block articles](src/content/blocks/) contain block descriptions, options and things to try.
- [Guide articles](src/content/guide/) cover About, Features, FAQ, Get Started, Keyboard Shortcuts, Synths, What’s New and the block categories.
- [Shared labels](src/content/site.md) hold the navigation and footer labels.
- The [guide copy skill](../.agents/skills/blokdust-guide-copy/SKILL.md) records the original guide’s writing pattern.

The crawl followed 151 URLs from the old guide, including WordPress archive pages, and found 44 articles. The glossary carries 42 of those articles forward. The V2 updates page replaces the original launch article. Each migrated Markdown file records its source in `legacySource`. The old Examples article is deferred while new patches are made.

The 15 new block pages cover Arpeggiator, Audio In, Chance, Chord, Compressor, Counter, Gate, LFO, Prism, Random Note, Sound Laser, Stage, Stage In, Touchpad and Wavetable. Their screenshots use built-in BlokDust themes.

When a patch is ready, add it to the relevant block’s Markdown frontmatter:

```yaml
examples:
  - title: A name for the patch
    href: /?c=YOUR_PATCH_ID
```

Run `pnpm -C glossary dev` and open `/guide/`, `/blocks/` or `/about/` to review the guide. `pnpm glossary:build` generates standalone HTML in `glossary/dist/`. The full Worker asset bundle comes from `pnpm site:build`, and `pnpm test:glossary` checks that bundle.

The layout follows the [original WordPress theme](https://github.com/BlokDust/BLOKDUST_GUIDE). The original article banners and cover thumbnails are served locally from `public/guide-media/original/`. The cover grid at `/guide/` links to Blocks in place of the deferred Examples page.

Related links use cross-references in the article copy and fall back to the relevant block category and guide pages.

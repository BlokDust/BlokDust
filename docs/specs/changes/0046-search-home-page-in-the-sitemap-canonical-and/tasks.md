# CHG-0046 tasks: Search: home page in the sitemap, canonical and crawlable links

- [x] 1. Sitemap lists `/` first (glossary/src/pages/sitemap.xml.ts).
- [x] 2. Canonical, og:image and summary_large_image on the home page (server/src/pages.ts).
- [x] 3. `<noscript>` intro with guide links (web/index.html).
- [x] 4. Tests: sitemap and no-JS links (tests/e2e/glossary.ts), home tags (tests/e2e/sharing/shareLinks.ts), no blokdust.com links.
- [x] 5. BlokDust 2 naming, home title and description (server/src/pages.ts, web/index.html, glossary/src/content/site.md).
- [ ] 6. Production deploy, then submit the sitemap in Google Search Console and Bing Webmaster Tools (owner).

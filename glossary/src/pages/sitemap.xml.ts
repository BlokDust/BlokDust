import type { APIRoute } from 'astro';
import { routes } from '../catalogue';

export const GET: APIRoute = ({ site }) => {
  // The app's page (`/`, served by the Worker) first, then every guide page (R4).
  const urls = ['/', ...[...routes].sort().map((route) => `/${route}/`)].map(
    (path) => `<url><loc>${new URL(path, site).href}</loc></url>`,
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};

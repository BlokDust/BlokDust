import type { APIRoute } from 'astro';
import { routes } from '../catalogue';

export const GET: APIRoute = ({ site }) => {
  const urls = [...routes].sort().map(route => `<url><loc>${new URL(`/${route}/`, site).href}</loc></url>`);
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};

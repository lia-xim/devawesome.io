import type { APIRoute } from "astro";
import { canonicalRoutes, toCanonicalUrl } from "../data/routes";
import { site } from "../data/site";

const urls = site.indexable
  ? canonicalRoutes
      .filter((route) => route.searchEligible)
      .map((route) => `  <url><loc>${toCanonicalUrl(route.path, site.canonicalHost)}</loc></url>`)
  : [];
const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.length ? `\n${urls.join("\n")}\n` : ""}</urlset>\n`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });

import type { APIRoute } from "astro";
import { site } from "../data/site";

const sitemapLine = site.indexable ? `Sitemap: ${site.canonicalHost}/sitemap.xml\n` : "";

export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n${sitemapLine}`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

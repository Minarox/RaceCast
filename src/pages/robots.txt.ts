import type { APIRoute } from "astro"

const getRobotsTxt = (sitemapURL: URL): string => `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${sitemapURL.href}
`

export const GET: APIRoute = ({ site }): Response => {
    const sitemapURL = new URL("sitemap-index.xml", site)

    return new Response(getRobotsTxt(sitemapURL), {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    })
}

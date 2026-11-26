import { describe, it, expect } from "vitest";
import { client } from "./helpers.js";

describe("search engines", () => {
  it("robots.txt allows the site, hides private pages and points to the sitemap", async () => {
    const r = await (await client()).get("/robots.txt");
    expect(r.status).toBe(200);
    expect(r.text).toMatch(/User-agent: \*/);
    expect(r.text).toMatch(/Disallow: \/api\//);
    expect(r.text).toMatch(/Disallow: \/admin\.html/);
    expect(r.text).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  it("sitemap.xml lists the home page", async () => {
    const r = await (await client()).get("/sitemap.xml");
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toMatch(/xml/);
    expect(r.text).toMatch(/<urlset[^>]*sitemaps\.org/);
    expect(r.text).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
  });

  it("the home page has the search and link-preview tags; private pages are noindex", async () => {
    const c = await client();
    const home = (await c.get("/")).text;
    expect(home).toMatch(/<title>Part-time Jobs for International Students in Korea \| Work Abroad Hub<\/title>/);
    expect(home).toMatch(/<meta name="description" content="[^"]{120,160}">/);
    expect(home).toMatch(/<link rel="canonical" href="https:\/\/[^"]+\/">/);
    for (const tag of ["og:title", "og:description", "og:image", "og:url"]) expect(home).toContain(`property="${tag}"`);
    for (const tag of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) expect(home).toContain(`name="${tag}"`);
    const ld = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    expect(ld["@graph"].map(x => x["@type"])).toEqual(["Organization", "WebSite"]);
    for (const page of ["/admin.html", "/reset-password.html"])
      expect((await c.get(page)).text).toMatch(/<meta name="robots" content="noindex/);
  });

  it("an unknown address shows a friendly 404 page (and stays out of search results)", async () => {
    const c = await client();
    const r = await c.get("/no-such-page").set("Accept", "text/html");
    expect(r.status).toBe(404);
    expect(r.text).toMatch(/Page not found/);
    expect(r.text).toMatch(/noindex/);
    expect((await c.get("/api/no-such-api")).status).toBe(404);
  });
});

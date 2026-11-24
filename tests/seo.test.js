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
});

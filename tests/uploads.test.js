import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { client, signup } from "./helpers.js";

const png = (w = 40, h = 30) => sharp({ create: { width: w, height: h, channels: 3, background: "#ff8a3d" } }).png().toBuffer();
const upload = (agent, buf, name = "photo.png", type = "image/png", kind = "photo") =>
  agent.post("/api/files").field("kind", kind).attach("file", buf, { filename: name, contentType: type });

describe("photo / logo uploads", () => {
  it("a real small PNG is accepted and comes back as WEBP", async () => {
    const { agent } = await signup();
    const r = await upload(agent, await png());
    expect(r.status).toBe(201);
    expect(r.body.url).toMatch(/^\/api\/files\/[a-f0-9]{24}$/);

    const img = await agent.get(r.body.url).buffer(true).parse((res, cb) => { const b = []; res.on("data", c => b.push(c)); res.on("end", () => cb(null, Buffer.concat(b))); });
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toBe("image/webp");
    expect((await sharp(img.body).metadata()).format).toBe("webp");
  });

  it("a text file pretending to be a PNG is refused", async () => {
    const { agent } = await signup();
    const r = await upload(agent, Buffer.from("this is definitely not a picture"), "fake.png");
    expect(r.status).toBe(415);
  });

  it("a file that starts like a PNG but is broken is refused", async () => {
    const { agent } = await signup();
    const head = (await png()).subarray(0, 16);
    const r = await upload(agent, Buffer.concat([head, Buffer.alloc(200, 7)]), "broken.png");
    expect(r.status).toBe(415);
    expect(r.body.error).toMatch(/broken/);
  });

  it("more than 5 MB is refused", async () => {
    const { agent } = await signup();
    const big = Buffer.concat([await png(), Buffer.alloc(5 * 1024 * 1024)]);
    const r = await upload(agent, big, "huge.png");
    expect(r.status).toBe(413);
  });

  it("needs a login and a valid kind", async () => {
    expect((await upload(await client(), await png())).status).toBe(401);
    const { agent } = await signup();
    expect((await upload(agent, await png(), "a.png", "image/png", "banner")).status).toBe(400);
  });

  it("only the owner can delete an image", async () => {
    const a = await signup(), b = await signup();
    const { body } = await upload(a.agent, await png());
    expect((await b.agent.delete(body.url)).status).toBe(403);
    expect((await a.agent.delete(body.url)).status).toBe(200);
    expect((await a.agent.get(body.url)).status).toBe(404);
  });
});

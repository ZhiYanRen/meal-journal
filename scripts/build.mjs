import { mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import sharp from "sharp";
const root = new URL("../", import.meta.url),
  assets = new URL("public/assets/", root);
const logo = await readFile(new URL("logo.svg", assets));
for (const [name, size] of [
  ["apple-touch-icon", 180],
  ["icon-192", 192],
  ["icon-512", 512],
])
  await sharp(logo)
    .resize(size, size)
    .png()
    .toFile(new URL(`${name}.png`, assets).pathname);
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#245747" },
})
  .composite([
    {
      input: await sharp(logo).resize(380, 380).png().toBuffer(),
      gravity: "centre",
    },
  ])
  .png()
  .toFile(new URL("icon-maskable.png", assets).pathname);
await rm(new URL("dist/", root), { recursive: true, force: true });
await mkdir(new URL("dist/", root));
await cp(new URL("public/", root), new URL("dist/", root), { recursive: true });
// Cache names follow the exact published assets so updates invalidate old offline shells.
const { createHash } = await import("node:crypto");
const hash = createHash("sha256");
for (const name of [
  "sw.js",
  "index.html",
  "app.js",
  "styles.css",
  "domain.js",
  "store.js",
  "manifest.webmanifest",
  "assets/logo.svg",
])
  hash.update(await readFile(new URL(`public/${name}`, root)));
const sw = await readFile(new URL("public/sw.js", root), "utf8");
await writeFile(
  new URL("dist/sw.js", root),
  sw.replace(
    "meal-journal-v1",
    `meal-journal-${hash.digest("hex").slice(0, 12)}`,
  ),
);
console.log("Static build ready: dist/ (GitHub Pages project paths supported)");

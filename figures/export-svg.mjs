#!/usr/bin/env node
/**
 * Export the rest pose of each Hairline figure as a static SVG, one per theme,
 * with the bench's stroke styles baked in so the file stands alone.
 *
 *   node figures/export-svg.mjs            # all figures
 *   node figures/export-svg.mjs trays      # one
 *
 * Writes images/rate-limits/<name>-{light,dark}.svg. Build the HTML first
 * (look.mjs or build.mjs); this reads hairline-<name>.html next to this file.
 */
import { createRequire } from "node:module";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "..", "images", "rate-limits");
const cache = join(homedir(), "Library", "Caches", "hairline-look");
const { chromium } = createRequire(join(cache, "package.json"))("playwright-core");

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(here).filter((f) => /^hairline-.*\.html$/.test(f)).map((f) => f.replace(/^hairline-|\.html$/g, ""));

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
mkdirSync(out, { recursive: true });

const PROPS = ["stroke", "stroke-width", "fill", "stroke-linejoin", "stroke-linecap", "stroke-dasharray", "opacity"];
// Mintlify's page backgrounds for this site (read from the running preview).
const GROUND = { light: "#ffffff", dark: "#0d0d0f" };

for (const name of names) {
  for (const theme of ["light", "dark"]) {
    const url = pathToFileURL(join(here, `hairline-${name}.html`)).href + `?theme=${theme}`;
    await page.goto(url);
    await page.waitForTimeout(1600);
    const svg = await page.evaluate((props) => {
      const src = document.querySelector("#stage svg");
      const copy = src.cloneNode(true);
      const a = src.querySelectorAll("*"), b = copy.querySelectorAll("*");
      a.forEach((el, i) => {
        const cs = getComputedStyle(el);
        for (const p of props) {
          const v = cs.getPropertyValue(p);
          if (v && v !== "none" || p === "fill") b[i].setAttribute(p, v || "none");
        }
        b[i].removeAttribute("class");
        b[i].removeAttribute("style");
      });
      copy.removeAttribute("class");
      copy.removeAttribute("style");
      // crop to the drawing, with a margin, so the page gets no empty plate above and below
      const bb = src.getBBox(), m = 10;
      const x = Math.floor(bb.x - m), y = Math.floor(bb.y - m), w = Math.ceil(bb.width + 2 * m), h = Math.ceil(bb.height + 2 * m);
      copy.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
      copy.setAttribute("width", String(w));
      copy.setAttribute("height", String(h));
      copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      copy.setAttribute("role", "img");
      return copy.outerHTML;
    }, PROPS);
    // The bench's ground colour becomes the docs page background, so plates stay opaque on the page.
    const ground = theme === "dark" ? "rgb(8, 9, 10)" : "rgb(255, 255, 255)";
    const cleaned = svg
      .replaceAll(`fill="${ground}"`, `fill="${GROUND[theme]}"`)
      .replaceAll("&quot;", "")
      .replace(' aria-hidden="true"', "");
    const file = join(out, `${name}-${theme}.svg`);
    writeFileSync(file, cleaned + "\n");
    console.log("wrote", file);
  }
}
await browser.close();

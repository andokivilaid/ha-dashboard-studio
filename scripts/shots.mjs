/** Captures review screenshots of the running app. */
import { chromium } from "@playwright/test";
import path from "node:path";

const BASE = process.env.BASE ?? "http://127.0.0.1:3177";
const OUT = process.env.OUT ?? "./shots";
const ONLY = process.argv.slice(2);

const TARGETS = [
  { name: "home-dark", path: "/", theme: "dark", height: 1000 },
  { name: "home-light", path: "/", theme: "light", height: 1000 },
  { name: "gallery-dark", path: "/gallery", theme: "dark", height: 1100 },
  { name: "gallery-light", path: "/gallery", theme: "light", height: 1100 },
  { name: "detail-sections", path: "/gallery/studio-sections-home", theme: "dark", height: 1200 },
  { name: "detail-masonry", path: "/gallery/studio-classic-masonry", theme: "dark", height: 1200 },
  { name: "detail-mushroom", path: "/gallery/studio-mushroom-mobile", theme: "dark", height: 1100 },
  { name: "detail-walltablet", path: "/gallery/studio-wall-tablet", theme: "light", height: 1100 },
  { name: "builder-dark", path: "/builder", theme: "dark", height: 950 },
  { name: "builder-light", path: "/builder", theme: "light", height: 950 },
  { name: "sources", path: "/sources", theme: "dark", height: 1100 },
  { name: "connect-docs", path: "/docs/connect", theme: "light", height: 1100 },
  { name: "gallery-mobile", path: "/gallery", theme: "dark", width: 414, height: 860 },
  { name: "builder-mobile", path: "/builder", theme: "dark", width: 414, height: 860 },
];

const browser = await chromium.launch();
for (const t of TARGETS) {
  if (ONLY.length && !ONLY.includes(t.name)) continue;
  const ctx = await browser.newContext({
    viewport: { width: t.width ?? 1440, height: t.height ?? 900 },
    colorScheme: t.theme,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.addInitScript((theme) => {
    window.localStorage.setItem("theme", theme);
  }, t.theme);
  await page.goto(`${BASE}${t.path}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2200);
  await page.addStyleTag({
    content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}",
  });
  await page.evaluate(() => document.querySelectorAll("[data-sonner-toaster]").forEach((e) => e.remove()));
  await page.screenshot({ path: path.join(OUT, `${t.name}.png`), fullPage: false });
  console.log("shot", t.name);
  await ctx.close();
}
await browser.close();

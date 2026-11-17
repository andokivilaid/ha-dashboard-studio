/** Copies the MDI webfont into the web app's public directory. */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "apps", "web", "node_modules", "@mdi", "font");
const dest = path.join(root, "apps", "web", "public", "mdi");

if (!existsSync(src)) {
  console.error("@mdi/font is not installed - run pnpm install first.");
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
cpSync(path.join(src, "css", "materialdesignicons.min.css"), path.join(dest, "materialdesignicons.min.css"));
cpSync(path.join(src, "fonts"), path.join(dest, "fonts"), { recursive: true });
console.log("MDI webfont synced to apps/web/public/mdi");

// Keep only woff2 and rewrite the @font-face block: the other three formats
// add 3.2 MB to the repository for browsers that no longer exist.
import { readFileSync, writeFileSync, rmSync } from "node:fs";
for (const f of ["eot", "ttf", "woff"]) {
  const p = path.join(dest, "fonts", `materialdesignicons-webfont.${f}`);
  if (existsSync(p)) rmSync(p);
}
const cssPath = path.join(dest, "materialdesignicons.min.css");
const css = readFileSync(cssPath, "utf8").replace(
  /@font-face\{[^}]*\}/,
  '@font-face{font-family:"Material Design Icons";src:url("./fonts/materialdesignicons-webfont.woff2?v=7.4.47") format("woff2");font-weight:normal;font-style:normal;font-display:swap}',
);
writeFileSync(cssPath, css, "utf8");
console.log("Trimmed MDI font formats to woff2 only");

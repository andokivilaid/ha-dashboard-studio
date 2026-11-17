/**
 * Turbopack resolves workspace sources with bundler resolution, which does not
 * map a `.js` specifier onto a neighbouring `.ts` file. A single `./x.js`
 * import inside packages/ therefore fails the production build while tsc and
 * vitest stay happy — so it is worth its own check.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "packages");
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "data") continue;
      walk(full);
      continue;
    }
    if (!/\.tsx?$/.test(name)) continue;
    const text = readFileSync(full, "utf8");
    text.split("\n").forEach((line, i) => {
      const m = line.match(/from\s+"(\.{1,2}\/[^"]+\.js)"/);
      if (m) offenders.push(`${path.relative(root, full)}:${i + 1}  ${m[1]}`);
    });
  }
}

walk(root);
if (offenders.length) {
  console.error("Relative imports must be extensionless inside packages/:\n");
  for (const o of offenders) console.error("  " + o);
  process.exit(1);
}
console.log("Import extensions OK.");

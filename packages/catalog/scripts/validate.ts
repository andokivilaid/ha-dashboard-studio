import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalogSchema } from "../src/schema";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, "..", "data", "catalog.json");
if (!existsSync(file)) {
  console.log("No catalog.json yet — nothing to validate.");
  process.exit(0);
}
const parsed = catalogSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
if (!parsed.success) {
  console.error(parsed.error.issues.slice(0, 20));
  process.exit(1);
}
const { entries, stats } = parsed.data;
const dupes = entries.length - new Set(entries.map((e) => e.id)).size;
const badLicence = entries.filter((e) => e.yamlFile && !e.license.permissive);
console.log(`catalog.json OK — ${entries.length} entries, ${stats.withYaml} with YAML.`);
if (dupes) console.warn(`  ${dupes} duplicate ids`);
if (badLicence.length) {
  console.error(`  LICENCE VIOLATION: ${badLicence.length} entries store YAML without a permissive licence`);
  process.exit(1);
}

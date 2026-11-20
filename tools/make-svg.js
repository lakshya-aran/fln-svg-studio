#!/usr/bin/env node
/* Make FLN drawings from the command line with the same recipes as the app.
 *   node tools/make-svg.js "orange" "5 apples" "clock 3:30"      → writes SVGs into ./out/<category>/
 *   node tools/make-svg.js --all                                  → every recipe in the catalog
 *   node tools/make-svg.js --list                                 → list everything it can draw
 *   options: --out <folder>  --variants (save every version, not just the first)
 */
const fs = require("fs"), path = require("path");
global.window = global;
require("../js/helpers.js");
require("../js/generator.js");

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const outDir = opt("--out") || "out", all = flag("--all"), list = flag("--list"), variants = flag("--variants");

if (list) {
  const byFam = {};
  Object.values(FLNGen.catalog).forEach((e) => (byFam[e.fam] = byFam[e.fam] || []).push(e.name));
  for (const [k, names] of Object.entries(byFam)) console.log(`${FLNGen.families[k].name}:\n  ${names.join(", ")}\n`);
  console.log("Numbers & counting: '5 apples', 'clock 3:30', 'letter B', 'number 7', 'dice 4', 'ten frame 6', 'tally 8', 'domino 3 4', 'number line 0 to 10'");
  process.exit(0);
}
const queries = all ? Object.keys(FLNGen.catalog) : args;
if (!queries.length) { console.log('Usage: node tools/make-svg.js "orange" "5 apples" [--out folder] [--variants] | --all | --list'); process.exit(1); }

let n = 0;
for (const q of queries) {
  const res = FLNGen.make(q);
  if (!res.results.length) { console.log(`✗ ${q}: ${res.note}${res.suggestions && res.suggestions.length ? " Did you mean: " + res.suggestions.join(", ") + "?" : ""}`); continue; }
  (variants ? res.results : res.results.slice(0, 1)).forEach((r, i) => {
    const dir = path.join(outDir, r.category); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, r.file + (variants && i ? `-${i + 1}` : "") + ".svg");
    fs.writeFileSync(file, r.svg); n++;
    console.log(`✓ ${q} → ${file}`);
  });
}
console.log(`${n} file(s) written.`);

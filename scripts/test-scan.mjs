// Manual LIVE test for /api/scan. Costs real OpenRouter credit (~half a cent) —
// the lead runs this, not the scan agent. Requires `npm run dev` running.
//
// Usage: node scripts/test-scan.mjs path/to/photo.jpg
import { readFileSync } from "node:fs";

const path = process.argv[2];

if (!path) {
  console.log("Usage: node scripts/test-scan.mjs path/to/photo.jpg");
  process.exit(0);
}

const buffer = readFileSync(path);
const base64 = buffer.toString("base64");

const start = Date.now();
const res = await fetch("http://localhost:3000/api/scan", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image: base64 }),
});
const elapsed = Date.now() - start;

const data = await res.json();

if (!res.ok) {
  console.error("Scan failed:", res.status, data);
  process.exit(1);
}

console.log(`Arena: ${data.arenaName}`);
for (const fighter of data.fighters ?? []) {
  console.log(
    `${fighter.emoji} ${fighter.fighterName} (${fighter.type}, weak: ${fighter.weakness}) hp ${fighter.hp} box ${JSON.stringify(
      fighter.box
    )}`
  );
}
console.log(`Elapsed: ${elapsed}ms`);
console.log(`x-cache: ${res.headers.get("x-cache") ?? "miss"}`);

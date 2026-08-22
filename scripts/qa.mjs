import { readFile } from "node:fs/promises";

const domain = "devawesome.io";
const index = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const robots = await readFile(new URL("../dist/robots.txt", import.meta.url), "utf8");

const checks = [
  [index.includes(domain), `built page must name ${domain}`],
  [index.includes('content="noindex, nofollow, noarchive"'), "built page must remain noindex"],
  [robots.includes("Disallow: /"), "robots.txt must block the placeholder"],
  [!index.includes("__"), "template placeholders must be fully replaced"],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`QA passed for ${domain}`);



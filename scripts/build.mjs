// Runs before every deploy (wrangler.jsonc "build"): tests first, then stamps the
// tracker's files with a version taken from their contents, so installed copies
// pick up exactly the files that changed and nothing has to be bumped by hand.
//   node scripts/build.mjs            tests + stamp (what the deploy does)
//   node scripts/build.mjs --check    tests only; leaves the files alone
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url).pathname;
const list = (dir, re) => readdirSync(root + dir).filter((f) => re.test(f)).sort().map((f) => `${dir}/${f}`);
const read = (f) => readFileSync(root + f, "utf8");

// 1. tests: a failure stops the deploy
const tests = [...list("worker", /\.test\.mjs$/), ...list("log/lib", /\.test\.mjs$/)];
execFileSync(process.execPath, ["--test", ...tests], { cwd: root, stdio: "inherit" });
if (process.argv.includes("--check")) process.exit(0);

// 2. version = hash of everything the app shell is made of
const modules = list("log/lib", /^(?!.*\.test\.).*\.js$/);
const fonts = list("log/fonts", /\.woff2$/);
const hashed = ["log/index.html", "log/app.css", "log/app.js", "log/sw.js", ...modules];
const h = createHash("sha256");
// (earlier stamps are stripped first, so re-running gives the same answer)
const unstamped = (f) => read(f).replace(/\?v=[\w-]+/g, "").replace(/"tft-[\w-]+"/, '""').replace(/\/\*SHELL\*\/[\s\S]*?\/\*\/SHELL\*\//, "");
for (const f of hashed) h.update(f).update(unstamped(f));
for (const f of fonts) h.update(f).update(readFileSync(root + f));
const v = h.digest("hex").slice(0, 10);

// 3. stamp it into every reference
const stampImports = (src) => src.replace(/(from\s+")(\.[^"?]+\.js)(?:\?v=[\w-]+)?(")/g, `$1$2?v=${v}$3`);
for (const f of ["log/app.js", ...modules]) writeFileSync(root + f, stampImports(read(f)));

writeFileSync(root + "log/index.html", read("log/index.html").replace(/(\/log\/app\.(?:css|js))\?v=[\w-]+/g, `$1?v=${v}`));

const shell = ["/log/", `/log/app.css?v=${v}`, `/log/app.js?v=${v}`, ...modules.map((f) => `/${f}?v=${v}`), ...fonts.map((f) => `/${f}`)];
const sw = read("log/sw.js")
  .replace(/const VERSION = "[^"]*";/, `const VERSION = "tft-${v}";`)
  .replace(/\/\*SHELL\*\/[\s\S]*?\/\*\/SHELL\*\//, `/*SHELL*/\nconst SHELL = ${JSON.stringify(shell, null, 2)};\n/*/SHELL*/`);
if (!sw.includes(`"tft-${v}"`) || !sw.includes(`app.js?v=${v}`)) throw new Error("build: could not stamp log/sw.js");
writeFileSync(root + "log/sw.js", sw);

// public marker (outside the sign-in wall) to confirm which build is live
writeFileSync(root + "pwa/tennis-fitness/version.json", JSON.stringify({ version: v, built: new Date().toISOString() }) + "\n");
console.log(`Tennis Fitness Tracker build ${v}: ${shell.length} shell files`);

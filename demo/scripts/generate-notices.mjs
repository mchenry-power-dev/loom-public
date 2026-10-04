import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Include the complete locked production dependency tree, including packages
// eliminated by tree shaking. Duplicates with the same name/version share a notice.
const root = fileURLToPath(new URL("../", import.meta.url));
const lock = JSON.parse(
  await readFile(path.join(root, "package-lock.json"), "utf8"),
);
const notices = new Map();
const missing = [];
for (const [relative, entry] of Object.entries(lock.packages)) {
  if (!relative || entry.dev || entry.devOptional) continue;
  const directory = path.join(root, relative);
  const pkg = JSON.parse(
    await readFile(path.join(directory, "package.json"), "utf8"),
  );
  const key = `${pkg.name}@${pkg.version}`;
  if (notices.has(key)) continue;
  const names = await readdir(directory);
  const files = names.filter((name) =>
    /^(licen[cs]e|copying|notice|copyright)([.\-_]|$)/i.test(name),
  );
  const sections = [];
  for (const name of files.sort()) {
    try {
      sections.push(
        `${name}\n${await readFile(path.join(directory, name), "utf8")}`,
      );
    } catch (error) {
      if (error.code !== "EISDIR") throw error;
    }
  }
  // A few older packages distribute their license as a README section.
  if (!sections.length) {
    for (const name of names.filter((name) => /^readme(?:\.|$)/i.test(name))) {
      const readme = await readFile(path.join(directory, name), "utf8");
      const heading =
        /^(?:#{1,6}\s*)?(?:licen[cs]e|copyright)\s*[:\r]?$/im.exec(readme);
      if (heading)
        sections.push(
          `${name} (license section)\n${readme.slice(heading.index).trim()}`,
        );
    }
  }
  // PptxGenJS declares this metadata-only Node placeholder and maps https to
  // false for browsers. Its published archive has no source or license file.
  if (
    !sections.length &&
    key === "https@1.0.0" &&
    names.length === 1 &&
    names[0] === "package.json"
  ) {
    sections.push(
      `The published archive contains package.json only; no executable source or license file is distributed.\nAuthor metadata: ${typeof pkg.author === "string" ? pkg.author : JSON.stringify(pkg.author)}\nLicense metadata: ${pkg.license}`,
    );
  }
  if (!sections.length) missing.push(key);
  const declared =
    pkg.license ?? pkg.licenses ?? entry.license ?? "See distributed notice";
  notices.set(
    key,
    `${"=".repeat(78)}\n${key}\nDeclared license: ${typeof declared === "string" ? declared : JSON.stringify(declared)}\n\n${sections
      .join("\n\n")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+$/gm, "")}`,
  );
}
if (missing.length)
  throw new Error(`Missing distributed notices: ${missing.join(", ")}`);
const text =
  "Loom public demo — third-party notices\n\n" +
  "Generated from demo/package-lock.json and installed package license files.\n" +
  "This includes the full production dependency tree, even where the browser build\n" +
  "does not include a package. License choices: JSZip is used under MIT; DOMPurify\n" +
  "is used under Apache-2.0. Copyright and license terms below belong to their\n" +
  "respective authors. This file does not grant a license to the Loom project.\n\n" +
  [...notices]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([, notice]) => notice)
    .join("\n\n") +
  "\n";
const output = path.join(root, "public", "third-party-notices.txt");
if (process.argv.includes("--check")) {
  if ((await readFile(output, "utf8")) !== text)
    throw new Error(
      "Third-party notices are stale. Run node demo/scripts/generate-notices.mjs.",
    );
  console.log(
    `Verified notices for ${notices.size} production package versions.`,
  );
} else {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, text, "utf8");
  console.log(`Wrote notices for ${notices.size} production package versions.`);
}

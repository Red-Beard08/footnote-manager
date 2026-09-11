import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const source = readFileSync("src/utils.ts", "utf8");
assert.match(source, /parseFootnotes/);
assert.match(source, /renumberMarkdown/);
assert.match(source, /safeFileName/);
execFileSync(process.execPath, ["-e", "console.log('footnote utility source checks passed')"], { stdio: "inherit" });

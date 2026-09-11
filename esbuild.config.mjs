import esbuild from "esbuild";
import { readFileSync } from "node:fs";

const production = process.argv.includes("production");
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2018",
  sourcemap: production ? false : "inline",
  minify: production,
  outfile: "main.js",
  define: { "process.env.NODE_ENV": JSON.stringify(production ? "production" : "development") },
  banner: { js: `/* ${manifest.name} ${manifest.version} — Red-Beard */` }
});

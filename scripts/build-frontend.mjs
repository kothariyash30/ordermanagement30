import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const apiBaseUrl = process.env.VITE_API_BASE_URL || process.env.OMS_API_BASE_URL || "";

await mkdir(dist, { recursive: true });
await Promise.all([
  copyFile(resolve(root, "index.html"), resolve(dist, "index.html")),
  copyFile(resolve(root, "app.js"), resolve(dist, "app.js")),
  copyFile(resolve(root, "styles.css"), resolve(dist, "styles.css"))
]);

await writeFile(
  resolve(dist, "config.js"),
  `window.__OMS_CONFIG__ = ${JSON.stringify({ apiBaseUrl }, null, 2)};\n`
);

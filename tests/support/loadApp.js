import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// app.js is loaded as a classic <script> (see index.html), not an ES module,
// so it has no exports. Rather than modify production code to make it
// "testable", this loads it the same way a real browser does: as a classic
// script inside a real DOM, then hands back `window` so tests can call its
// top-level functions/state directly, the same way the app itself runs.
//
// window.__OMS_CONFIG__ is intentionally left unset so API_BASE_URL is empty
// and the app runs in its supported local/offline mode (see app.js loadState:
// `if (!API_BASE_URL) return localState;`) with no network calls.
export async function loadApp() {
  const appSource = await readFile(resolve(root, "app.js"), "utf8");
  const dom = new JSDOM(`<!doctype html><html><body><div id="app"></div></body></html>`, {
    url: "http://localhost/",
    runScripts: "dangerously"
  });

  const script = dom.window.document.createElement("script");
  script.textContent = appSource;
  dom.window.document.body.appendChild(script);

  // initialize() (called at the bottom of app.js) is async; give its
  // microtasks/promise chain a turn to resolve before handing back window.
  await new Promise((resolve) => setTimeout(resolve, 0));

  return dom.window;
}

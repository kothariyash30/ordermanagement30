import { defineConfig, devices } from "@playwright/test";

const API_PORT = 8080;
const WEB_PORT = 4173;
const testMongoUri = process.env.E2E_MONGODB_URI || "mongodb://127.0.0.1:27017/lensflow_oms_e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: [
    {
      command: "node server/index.js",
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: true,
      timeout: 20000,
      env: {
        MONGODB_URI: testMongoUri,
        PORT: String(API_PORT),
        CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
        ALLOW_SEED_RESET: "true",
        JWT_SECRET: "e2e-test-secret-do-not-use-in-production",
        // The suite's beforeEach resets seed data (and logs in to do so) before
        // every test, which easily exceeds the production rate limits; raise
        // them for the test server only.
        STATE_RATE_LIMIT_MAX: "1000",
        LOGIN_RATE_LIMIT_MAX: "1000"
      }
    },
    {
      command: `npx vite --host 0.0.0.0 --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: true,
      timeout: 20000
    }
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } }
  ]
});

import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// If .env.test.local exists (e.g. a Neon `test` branch), its values override
// .env.local for the test server. Otherwise tests run against .env.local.
const testEnv = loadEnv({ path: ".env.test.local", processEnv: {}, quiet: true }).parsed ?? {};

export default defineConfig({
  testDir: "./tests/e2e",
  // Remote DB (Neon) + serialized Server Actions: allow for latency under parallel load.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI: annotations in the PR + an HTML report uploaded on failure.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    {
      // README screenshot generator; only via `npm run screenshots` (not part of E2E/CI).
      name: "screenshots",
      testDir: "./tests/screenshots",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
  ],
  // Production build: Next allows only one `next dev` per project, and the dev
  // server may already be running on :3000.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { ...testEnv, BETTER_AUTH_URL: baseURL, E2E_DISABLE_RATE_LIMIT: "1" },
  },
});

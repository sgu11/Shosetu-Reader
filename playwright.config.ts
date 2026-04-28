import { defineConfig, devices } from "@playwright/test";

const allowAutoServer = process.env.CI === "true" || process.env.PW_AUTOSTART === "1";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: process.env.CI ? "retain-on-failure" : "off",
  },
  webServer: {
    command: allowAutoServer
      ? "pnpm dev"
      : "node -e \"console.error('[playwright] dev server not running on :3000. start it manually (pnpm dev / pnpm start) or set PW_AUTOSTART=1 to auto-spawn'); process.exit(1)\"",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: allowAutoServer ? 120_000 : 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

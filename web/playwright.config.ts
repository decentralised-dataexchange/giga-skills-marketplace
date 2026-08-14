import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The suite drives one shared, seeded database; spec files must not
  // interleave their submissions and delistings.
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4820",
    trace: "retain-on-failure",
  },
  reporter: [["list"]],
});

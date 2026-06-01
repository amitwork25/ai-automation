/** Playwright project config for run 2341f6ec-4700-4e4b-a0a2-b4c63bf3e912 (step 14). */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests",
  testMatch: ["**/*.generated.spec.ts"],
  projects: [
    {
      name: "bbps-ccbp-2341f6ec",
      testDir: ".",
      grep: /@bbps-ccbp|@run-2341f6ec/
    }
  ]
});

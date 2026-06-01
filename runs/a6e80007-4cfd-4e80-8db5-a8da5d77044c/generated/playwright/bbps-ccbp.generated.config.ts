/** Playwright project config for run a6e80007-4cfd-4e80-8db5-a8da5d77044c (step 14). */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests",
  testMatch: ["**/*.generated.spec.ts"],
  projects: [
    {
      name: "bbps-ccbp-a6e80007",
      testDir: ".",
      grep: /@bbps-ccbp|@run-a6e80007/
    }
  ]
});

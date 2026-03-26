// Copyright 2026 Gaurav Mathur (mail.gauravmathur@gmail.com). All rights reserved.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    // No browser needed — pure logic tests run in Node
  },
});

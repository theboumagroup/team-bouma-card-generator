const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests/cards',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5010',
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}
  },
  webServer: {
    command: 'npm run build && node_modules/.bin/serve . -l 5010',
    url: 'http://127.0.0.1:5010',
    reuseExistingServer: false
  },
  reporter: 'list'
});

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('page load time should be under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('API response time for /api/competities should be under 500ms', async ({ page }) => {
    let apiResponseTime = 0;
    await page.route('**/api/competities', async route => {
      const start = Date.now();
      await route.continue();
      apiResponseTime = Date.now() - start;
    });
    await page.goto('http://localhost:3000');
    expect(apiResponseTime).toBeLessThan(500);
  });

  test('bulk operation: creating 10 teams should take less than 5 seconds', async ({ page }) => {
    // Log in first (assuming we have a test user)
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || '');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || '');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to teams page
    await page.goto('http://localhost:3000/teams');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await page.click('button:has-text("Add Team")');
      await page.fill('input[name="name"]', `Test Team ${i}`);
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(500); // Wait for save animation
    }
    const bulkTime = Date.now() - startTime;
    expect(bulkTime).toBeLessThan(5000); // 5 seconds
  });

  test('memory leak detection on display page', async ({ page }) => {
    // Skip if not Chrome (memory API only available in Chrome)
    const isChrome = await page.evaluate(() => navigator.userAgent.includes('Chrome'));
    if (!isChrome) {
      test.skip();
    }

    await page.goto('http://localhost:3000/display');
    await page.waitForLoadState('networkidle');

    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    // Leave page open for 30 seconds
    await page.waitForTimeout(30000);

    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50 MB
  });
});
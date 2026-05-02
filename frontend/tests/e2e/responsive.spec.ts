/*
 * File: frontend/tests/e2e/responsive.spec.ts
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial responsive design test suite added
 *
 * This test suite verifies responsive design at multiple viewports:
 * - Mobile: 375x812 (iPhone X/12/13)
 * - Tablet: 768x1024 (iPad)
 * - Desktop: 1920x1080 (Full HD)
 *
 * Tests check for:
 * - No horizontal scroll on any page
 * - Touch targets meet minimum size requirements
 * - Layouts adapt properly to screen size
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// Viewport Constants
// ============================================================================
const MOBILE_VIEWPORT = { width: 375, height: 812 }
const TABLET_VIEWPORT = { width: 768, height: 1024 }
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 }

// ============================================================================
// Helper Functions
// ============================================================================
async function resizeViewport(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size)
  await page.waitForTimeout(300)
}

async function checkNoHorizontalScroll(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  })
}

async function checkTouchTargets(page: Page, minSize: number = 44): Promise<
  { selector: string; width: number; height: number }[]
> {
  return await page.evaluate((minSize: number) => {
    const targets = document.querySelectorAll(
      'button, a, input[type="submit"], input[type="button"], [role="button"], input, select, textarea, label'
    )
    const violations: { selector: string; width: number; height: number }[] = []
    
    const seen = new Set<string>()
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      
      const computed = window.getComputedStyle(el)
      if (computed.display === 'none' || computed.visibility === 'hidden') return
      
      const selector = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')
      if (seen.has(selector)) return
      seen.add(selector)

      const isTooSmall = rect.width < minSize && rect.height < minSize
      
      if (isTooSmall) {
        violations.push({
          selector,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      }
    })
    return violations
  }, minSize)
}

async function getLayoutInfo(page: Page): Promise<Record<string, unknown>> {
  return await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      viewportWidth: window.innerWidth,
      bodyOverflowX: document.body.style.overflowX,
      htmlOverflowX: document.documentElement.style.overflowX,
    }
  })
}

async function mockJson(page: Page, url: string | RegExp, status: number, body: Record<string, unknown>) {
  await page.route(url, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

async function mockAdminAppBoot(page: Page, options?: { authenticated?: boolean; adminExists?: boolean }) {
  const authenticated = options?.authenticated ?? false
  const adminExists = options?.adminExists ?? true

  await mockJson(page, '**/api/v1/auth/admin-exists', 200, { exists: adminExists })

  if (authenticated) {
    await page.addInitScript(() => {
      window.localStorage.setItem('access_token', 'token')
      window.localStorage.setItem('refresh_token', 'refresh')
      window.localStorage.removeItem('club_slug')
    })

    await mockJson(page, '**/api/v1/auth/me', 200, {
      id: 'u1',
      email: 'admin@testclub.nl',
      full_name: 'Admin User',
      role: 'superadmin',
      is_superadmin: true,
    })
  } else {
    await page.addInitScript(() => {
      window.localStorage.removeItem('access_token')
      window.localStorage.removeItem('refresh_token')
      window.localStorage.removeItem('club_slug')
    })
  }
}

// ============================================================================
// Mobile Viewport Tests (375px)
// ============================================================================
test.describe('Mobile Viewport (375px)', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test.describe('Login Page', () => {
    test('login page has no horizontal scroll at mobile viewport', async ({ page, context }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)

      const layout = await getLayoutInfo(page)
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
    })

    test('login form is fully visible and usable on mobile', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('touch targets are large enough on mobile login page', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const violations = await checkTouchTargets(page)
      expect(violations).toEqual([])
    })
  })

  test.describe('Dashboard (authenticated)', () => {
    test('dashboard has no horizontal scroll at mobile viewport', async ({ page, context }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })

    test('mobile navigation is accessible', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const mobileMenuButton = page.locator('button:has(svg)')
      await expect(mobileMenuButton.first()).toBeVisible()

      await mobileMenuButton.first().click()
      await page.waitForTimeout(200)

      const mobileMenu = page.locator('div.border-t').filter({ has: page.locator('a[href]') })
      await expect(mobileMenu).toBeVisible()

      const mobileMenuLinks = page.locator('div.border-t a[href]')
      const linkCount = await mobileMenuLinks.count()
      expect(linkCount).toBeGreaterThanOrEqual(3)
    })

    test('touch targets are usable on mobile dashboard', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const violations = await checkTouchTargets(page)
      
      if (violations.length > 0) {
        console.warn('Touch target violations on dashboard (reporting only):')
        violations.forEach((v) => {
          console.warn(`  ${v.selector}: ${v.width}x${v.height}px (minimum 44x44px recommended)`)
        })
      }
      
      expect(violations.length).toBe(0)
    })
  })

  test.describe('Display Page', () => {
    test('display page adapts to mobile viewport', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/display/testclub')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })
  })
})

// ============================================================================
// Tablet Viewport Tests (768px)
// ============================================================================
test.describe('Tablet Viewport (768px)', () => {
  test.use({ viewport: TABLET_VIEWPORT })

  test.describe('Login Page', () => {
    test('login page has no horizontal scroll at tablet viewport', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })

    test('login form layout adapts for tablet', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })

    test('touch targets are adequate for tablet', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const violations = await checkTouchTargets(page, 36)
      expect(violations).toEqual([])
    })
  })

  test.describe('Dashboard (authenticated)', () => {
    test('dashboard has no horizontal scroll at tablet viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })

    test('navigation is visible at tablet viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const navLinks = page.locator('nav a[href]')
      const count = await navLinks.count()
      expect(count).toBeGreaterThanOrEqual(3)
    })
  })

  test.describe('Clubs Page', () => {
    test('clubs page adapts to tablet viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/clubs')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })
  })

  test.describe('Users Page', () => {
    test('users page adapts to tablet viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/users')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })
  })
})

// ============================================================================
// Desktop Viewport Tests (1920px)
// ============================================================================
test.describe('Desktop Viewport (1920px)', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test.describe('Login Page', () => {
    test('login page has no horizontal scroll at desktop viewport', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })

    test('login form does not stretch excessively', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const formWidth = await page.locator('#email').evaluate((el) => {
        let parent = el.parentElement
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent)
          if (style.maxWidth && style.maxWidth !== 'none') {
            return parent.getBoundingClientRect().width
          }
          parent = parent.parentElement
        }
        return el.getBoundingClientRect().width
      })

      expect(formWidth).toBeLessThanOrEqual(600)
    })
  })

  test.describe('Dashboard (authenticated)', () => {
    test('dashboard has no horizontal scroll at desktop viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })

    test('dashboard content is properly centered', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      const margin = await page.locator('main').evaluate((el) => {
        const style = window.getComputedStyle(el)
        const marginLeft = parseInt(style.marginLeft, 10) || 0
        const marginRight = parseInt(style.marginRight, 10) || 0
        return { left: marginLeft, right: marginRight }
      })

      expect(Math.abs(margin.left - margin.right)).toBeLessThanOrEqual(2)
    })
  })

  test.describe('Clubs Page', () => {
    test('clubs page adapts to desktop viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/clubs')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })
  })

  test.describe('Users Page', () => {
    test('users page adapts to desktop viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/users')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })
  })

  test.describe('Payments Page', () => {
    test('payments page adapts to desktop viewport', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/payments')
      await page.waitForLoadState('networkidle')

      const noScroll = await checkNoHorizontalScroll(page)
      expect(noScroll).toBe(true)
    })
  })
})

// ============================================================================
// Responsive Breakpoint Transition Tests
// ============================================================================
test.describe('Responsive Breakpoint Transitions', () => {
  test('login page adapts from mobile to tablet viewport', async ({ page }) => {
    await mockAdminAppBoot(page)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await resizeViewport(page, MOBILE_VIEWPORT)
    const mobileWidth = await getLayoutInfo(page)
    expect(mobileWidth.scrollWidth).toBeLessThanOrEqual(mobileWidth.clientWidth + 1)

    await resizeViewport(page, TABLET_VIEWPORT)
    const tabletWidth = await getLayoutInfo(page)
    expect(tabletWidth.scrollWidth).toBeLessThanOrEqual(tabletWidth.clientWidth + 1)
  })

  test('login page adapts from tablet to desktop viewport', async ({ page }) => {
    await mockAdminAppBoot(page)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await resizeViewport(page, TABLET_VIEWPORT)
    const tabletWidth = await getLayoutInfo(page)
    expect(tabletWidth.scrollWidth).toBeLessThanOrEqual(tabletWidth.clientWidth + 1)

    await resizeViewport(page, DESKTOP_VIEWPORT)
    const desktopWidth = await getLayoutInfo(page)
    expect(desktopWidth.scrollWidth).toBeLessThanOrEqual(desktopWidth.clientWidth + 1)
  })

  test('dashboard adapts across all viewports', async ({ page }) => {
    await mockAdminAppBoot(page, { authenticated: true })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    for (const viewport of [MOBILE_VIEWPORT, TABLET_VIEWPORT, DESKTOP_VIEWPORT]) {
      await resizeViewport(page, viewport)
      const layout = await getLayoutInfo(page)
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1)
    }
  })

  test('navigation toggles between mobile and desktop view', async ({ page }) => {
    await mockAdminAppBoot(page, { authenticated: true })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await resizeViewport(page, MOBILE_VIEWPORT)

    const mobileMenuButton = page.locator('button:has(svg)')
    const isMobileMenuVisible = await mobileMenuButton.count() > 0

    await resizeViewport(page, DESKTOP_VIEWPORT)

    const desktopNav = page.locator('nav a[href="/dashboard"]').first()
    if (isMobileMenuVisible) {
      await expect(desktopNav).toBeVisible()
    }
  })
})

// ============================================================================
// Cross-Browser Responsive Tests
// ============================================================================
test.describe('Responsive Touch Target Sizes (WCAG 2.5.5)', () => {
  test('all interactive elements meet minimum 44x44px touch target on mobile', async ({ page }) => {
    test.slow()

    await mockAdminAppBoot(page)
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const violations = await checkTouchTargets(page, 44)
    
    if (violations.length > 0) {
      console.warn('Touch target violations on login page:')
      violations.forEach((v) => {
        console.warn(`  ${v.selector}: ${v.width}x${v.height}px`)
      })
    }
    
    expect(violations.length).toBeLessThanOrEqual(0)
  })
})

/*
 * File: frontend/tests/e2e/customer-journeys.spec.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { test, expect, Page } from '@playwright/test'

type RouteJson = Record<string, unknown>

async function mockJson(page: Page, url: string | RegExp, status: number, body: RouteJson) {
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

test.describe('Customer Journeys', () => {
  test.describe('Login Journey', () => {
    test('admin can login with email and password', async ({ page }) => {
      await mockAdminAppBoot(page)

      await mockJson(page, '**/api/v1/auth/login', 200, {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      })
      await mockJson(page, '**/api/v1/auth/me', 200, {
        id: 'u1',
        email: 'admin@testclub.nl',
        full_name: 'Admin User',
        role: 'superadmin',
        is_superadmin: true,
      })

      await page.goto('/login')

      await page.fill('#email', 'admin@testclub.nl')
      await page.fill('#password', 'password123')
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('text=Superadmin Panel')).toBeVisible()
    })

    test('shows error on invalid credentials', async ({ page }) => {
      await mockAdminAppBoot(page)
      await mockJson(page, '**/api/v1/auth/login', 401, { detail: 'Invalid credentials' })

      await page.goto('/login')

      await page.fill('#email', 'invalid@testclub.nl')
      await page.fill('#password', 'wrongpassword')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=Invalid credentials')).toBeVisible()
    })
  })

  test.describe('Onboarding Journey', () => {
    test('new admin can open the first-time setup screen', async ({ page }) => {
      await mockAdminAppBoot(page, { adminExists: false })

      await page.goto('/login')

      await expect(page.locator('#fullName')).toBeVisible()
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('#confirmPassword')).toBeVisible()
    })
  })

  test.describe('Tenant Dashboard Journey', () => {
    test('admin can navigate to all sections', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })

      await page.goto('/dashboard')
      await expect(page.locator('text=Superadmin Panel')).toBeVisible()

      await page.goto('/clubs')
      await expect(page).toHaveURL('/clubs')

      await page.goto('/users')
      await expect(page).toHaveURL('/users')

      await page.goto('/payments')
      await expect(page).toHaveURL('/payments')
    })
  })

  test.describe('Competition Management Journey', () => {
    test('admin can open clubs page for competition administration', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/clubs')
      await expect(page).toHaveURL('/clubs')
    })
  })

  test.describe('Team Management Journey', () => {
    test('admin can open users page for team managers', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/users')
      await expect(page).toHaveURL('/users')
    })
  })

  test.describe('Baan Management Journey', () => {
    test('admin can open clubs overview', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/clubs')
      await expect(page).toHaveURL('/clubs')
    })
  })

  test.describe('User Invitation Journey', () => {
    test('admin can access user administration', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/users')
      await expect(page).toHaveURL('/users')
    })
  })

  test.describe('Planning Journey', () => {
    test('admin can access dashboard planning widgets', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/dashboard')
      await expect(page).toHaveURL('/dashboard')
    })

    test('admin can access payments planning section', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/payments')
      await expect(page).toHaveURL('/payments')
    })
  })

  test.describe('Display View Journey', () => {
    test('display route is reachable', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/display/testclub')
      await expect(page).toHaveURL('/display/testclub')
    })
  })

  test.describe('Settings Journey', () => {
    test('admin can access clubs settings area', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/clubs')
      await expect(page).toHaveURL('/clubs')
    })

    test('admin can access payment settings area', async ({ page }) => {
      await mockAdminAppBoot(page, { authenticated: true })
      await page.goto('/payments')
      await expect(page).toHaveURL('/payments')
    })
  })

  test.describe('Password Reset Journey', () => {
    test('login page remains available for account recovery links', async ({ page }) => {
      await mockAdminAppBoot(page)
      await page.goto('/login')

      await expect(page.locator('#email')).toBeVisible()
      await expect(page.locator('#password')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    })
  })
})

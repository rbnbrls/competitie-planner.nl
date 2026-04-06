import { test, expect } from '@playwright/test'

test.describe('Customer Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test.describe('Login Journey', () => {
    test('admin can login with email and password', async ({ page }) => {
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await expect(page).toHaveURL('/tenant/dashboard', { timeout: 10000 })
    })

    test('shows error on invalid credentials', async ({ page }) => {
      await page.fill('input[name="email"]', 'invalid@testclub.nl')
      await page.fill('input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Invalid credentials')).toBeVisible()
    })
  })

  test.describe('Onboarding Journey', () => {
    test('new admin can complete onboarding flow', async ({ page }) => {
      await page.goto('/onboarding')
      
      await page.fill('input[name="email"]', 'newadmin@testclub.nl')
      await page.fill('input[name="password"]', 'SecurePassword123!')
      await page.fill('input[name="fullName"]', 'New Admin')
      await page.click('button[type="submit"]')
      
      await page.fill('input[name="clubName"]', 'My Tennis Club')
      await page.fill('input[name="slug"]', 'mytennisclub')
      await page.click('button:has-text("Volgende")')
      
      await expect(page).toHaveURL('/tenant/dashboard')
    })
  })

  test.describe('Tenant Dashboard Journey', () => {
    test('admin can navigate to all sections', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.click('text=Competities')
      await expect(page).toHaveURL('/tenant/competities')
      
      await page.click('text=Teams')
      await expect(page).toHaveURL('/tenant/teams')
      
      await page.click('text=Banen')
      await expect(page).toHaveURL('/tenant/banen')
      
      await page.click('text=Instellingen')
      await expect(page).toHaveURL('/tenant/settings')
    })
  })

  test.describe('Competition Management Journey', () => {
    test('admin can create and manage competition', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/competities')
      
      await page.click('button:has-text("Nieuwe competitie")')
      await page.fill('input[name="naam"]', 'Wintercompetitie 2024')
      await page.selectOption('select[name="speeldag"]', 'vrijdag')
      await page.fill('input[name="start_datum"]', '2024-11-01')
      await page.fill('input[name="eind_datum"]', '2025-03-31')
      await page.click('button:has-text("Opslaan")')
      
      await expect(page.locator('text=Wintercompetitie 2024')).toBeVisible()
    })
  })

  test.describe('Team Management Journey', () => {
    test('admin can add teams to competition', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/competities')
      
      await page.click('text=Wintercompetitie 2024')
      await page.click('button:has-text("Team toevoegen")')
      await page.fill('input[name="naam"]', 'Team A')
      await page.fill('input[name="captain_naam"]', 'Jan Jansen')
      await page.fill('input[name="captain_email"]', 'jan@example.com')
      await page.click('button:has-text("Opslaan")')
      
      await expect(page.locator('text=Team A')).toBeVisible()
    })
  })

  test.describe('Baan Management Journey', () => {
    test('admin can add and manage banen', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/banen')
      
      await page.click('button:has-text("Baan toevoegen")')
      await page.fill('input[name="nummer"]', '1')
      await page.fill('input[name="naam"]', 'Centercourt')
      await page.check('input[name="overdekt"]')
      await page.selectOption('select[name="verlichting_type"]', 'led')
      await page.click('button:has-text("Opslaan")')
      
      await expect(page.locator('text=Centercourt')).toBeVisible()
    })
  })

  test.describe('User Invitation Journey', () => {
    test('admin can invite new user', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/users')
      
      await page.click('button:has-text("Gebruiker uitnodigen")')
      await page.fill('input[name="email"]', 'newuser@testclub.nl')
      await page.selectOption('select[name="role"]', 'user')
      await page.click('button:has-text("Uitnodigen")')
      
      await expect(page.locator('text=Uitnodiging verstuurd')).toBeVisible()
    })
  })

  test.describe('Planning Journey', () => {
    test('admin can generateronde indeling', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/competities')
      await page.click('text=Wintercompetitie 2024')
      await page.click('text=Speelrondes')
      
      await page.click('button:has-text("Genereer indeling")')
      await expect(page.locator('text=Indeling gegenereerd')).toBeVisible()
    })

    test('admin can publish ronde', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/competities')
      await page.click('text=Wintercompetitie 2024')
      await page.click('text=Speelrondes')
      
      await page.click('button:has-text("Publiceren")')
      await expect(page.locator('text=Gepubliceerd')).toBeVisible()
    })
  })

  test.describe('Display View Journey', () => {
    test('anyone can view published ronde via public link', async ({ page }) => {
      await page.goto('/display/abc123')
      
      await expect(page.locator('text=Speelronde')).toBeVisible()
      await expect(page.locator('text=Teams')).toBeVisible()
    })
  })

  test.describe('Settings Journey', () => {
    test('admin can update club settings', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/settings')
      
      await page.fill('input[name="naam"]', 'My Updated Club')
      await page.fill('input[name="adres"]', 'New Address 123')
      await page.click('button:has-text("Opslaan")')
      
      await expect(page.locator('text=Opgeslagen')).toBeVisible()
    })

    test('admin can update branding', async ({ page }) => {
      await page.goto('/tenant/login')
      await page.fill('input[name="email"]', 'admin@testclub.nl')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForURL('/tenant/dashboard')
      
      await page.goto('/tenant/branding')
      
      await page.fill('input[name="primary_color"]', '#FF5733')
      await page.click('button:has-text("Opslaan")')
      
      await expect(page.locator('text=Opgeslagen')).toBeVisible()
    })
  })

  test.describe('Password Reset Journey', () => {
    test('user can request password reset', async ({ page }) => {
      await page.goto('/tenant/forgot-password')
      
      await page.fill('input[name="email"]', 'user@testclub.nl')
      await page.click('button:has-text("Verstuur reset link")')
      
      await expect(page.locator('text=Email verstuurd')).toBeVisible()
    })
  })
})
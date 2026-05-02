/*
 * File: frontend/tests/e2e/modal-focus-trap.spec.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Added E2E tests for modal focus trapping
 * 
 * This test suite validates modal focus trap behavior:
 * - Focus moves to first focusable element when modal opens
 * - Tab key cycles focus within modal (last -> first)
 * - Shift+Tab key cycles focus within modal (first -> last)
 * - Focus returns to trigger element when modal closes
 */

import { test, expect } from '@playwright/test'

test.describe('Modal Focus Trapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-modal')
    await page.waitForLoadState('networkidle')
  })

  test('focus moves to first focusable element when modal opens', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    
    const firstInput = page.locator('#modalInput1')
    await expect(firstInput).toBeFocused()
  })

  test('Tab key cycles focus from last element to first element', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    const cancelButton = page.getByRole('button', { name: 'Cancel' })
    await cancelButton.focus()
    await expect(cancelButton).toBeFocused()
    
    await page.keyboard.press('Tab')
    
    const closeBtn = page.getByRole('button', { name: 'Sluiten' })
    await expect(closeBtn).toBeFocused()
  })

  test('Shift+Tab key cycles focus from first element to last element', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    const closeBtn = page.getByRole('button', { name: 'Sluiten' })
    await expect(closeBtn).toBeFocused()
    
    await page.keyboard.press('Shift+Tab')
    
    const confirmBtn = page.getByRole('button', { name: 'Confirm' })
    await expect(confirmBtn).toBeFocused()
  })

  test('focus cannot escape modal with Tab key', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    const lastInput = page.locator('#modalInput3')
    await lastInput.focus()
    
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    const isFocusedOutside = await page.evaluate(() => {
      const active = document.activeElement
      return active?.id === 'beforeInput' || active?.id === 'afterInput' || active?.id === 'openModalBtn'
    })
    
    expect(isFocusedOutside).toBe(false)
  })

  test('focus returns to trigger button when modal closes', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    const cancelButton = page.getByRole('button', { name: 'Cancel' })
    await cancelButton.click()
    
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).not.toBeVisible()
    
    const openModalBtn = page.locator('#openModalBtn')
    await expect(openModalBtn).toBeFocused()
  })

  test('Escape key closes modal and returns focus to trigger', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    await page.keyboard.press('Escape')
    
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).not.toBeVisible()
    
    const openModalBtn = page.locator('#openModalBtn')
    await expect(openModalBtn).toBeFocused()
  })

  test('close button in header closes modal', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    const closeBtn = page.getByRole('button', { name: 'Sluiten' })
    await closeBtn.click()
    
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).not.toBeVisible()
  })

  test('focus stays within modal through multiple Tab cycles', async ({ page }) => {
    await page.click('#openModalBtn')
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })
    
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
    }
    
    const isFocusedOutside = await page.evaluate(() => {
      const active = document.activeElement
      return active?.id === 'beforeInput' || active?.id === 'afterInput' || active?.id === 'openModalBtn'
    })
    
    expect(isFocusedOutside).toBe(false)
  })
})

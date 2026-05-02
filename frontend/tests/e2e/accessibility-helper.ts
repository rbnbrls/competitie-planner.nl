/*
 * File: frontend/tests/e2e/accessibility-helper.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial accessibility helper functions added
 */

import { Page } from '@playwright/test'
import { createRequire } from 'module'
import path from 'path'

const require = createRequire(import.meta.url)
const axeCorePath = path.dirname(require.resolve('axe-core/package.json'))

export async function injectAxe(page: Page): Promise<void> {
  await page.addScriptTag({
    path: path.join(axeCorePath, 'axe.min.js'),
  })
}

/**
 * Run axe-core accessibility audit on the current page
 * @param page - Playwright page instance
 * @param options - Optional axe configuration
 * @returns axe results object
 */
export async function runAxeAudit(
  page: Page,
  options?: { runOnly?: { type: string; values: string[] } }
): Promise<unknown> {
  await injectAxe(page)
  
  const result = await page.evaluate(async (axeOptions) => {
    // @ts-expect-error - axe is injected globally
    return await window.axe.run(axeOptions || {})
  }, options)
  
  return result
}

/**
 * Assert that there are no accessibility violations, logging details if any
 * @param page - Playwright page instance
 * @param context - Description of what is being tested (for error messages)
 */
export async function expectNoAccessibilityViolations(
  page: Page,
  context: string = 'page'
): Promise<void> {
  const result = await runAxeAudit(page, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
  })
  
  if (result.violations && result.violations.length > 0) {
    console.error(`Accessibility violations found on ${context}:`)
    result.violations.forEach((violation: { id: string; description: string; impact: string; help: string; nodes: { html: string }[] }) => {
      console.error(`\n  [${violation.id}] ${violation.description}`)
      console.error(`  Impact: ${violation.impact}`)
      console.error(`  Help: ${violation.help}`)
      console.error(`  Nodes affected: ${violation.nodes.length}`)
      violation.nodes.forEach((node: { html: string }) => {
        console.error(`    - ${node.html.split('\n')[0].trim()}`)
      })
    })
  }
  
  expect(result.violations?.length).toBe(0)
}

/**
 * Check color contrast specifically
 */
export async function checkColorContrast(page: Page): Promise<void> {
  const result = await runAxeAudit(page, {
    runOnly: { type: 'rule', values: ['color-contrast'] },
  })
  
  expect(result.violations?.length).toBe(0)
}

/**
 * Get all focusable elements on the page in order
 */
export function getFocusableElements(page: Page): Promise<HTMLElement[]> {
  return page.evaluate(() => {
    // Standard focusable elements plus custom tabindex
    return Array.from(document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    )) as HTMLElement[]
  })
}

/**
 * Check that an element has a visible focus indicator
 */
export async function hasVisibleFocus(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector)
  if (await element.count() === 0) return false
  
  return await element.evaluate((el) => {
    const style = window.getComputedStyle(el, ':focus')
    // Check for outline or box-shadow that creates visible focus
    const outlineVisible = style.outlineWidth !== '0px' && 
                          style.outlineStyle !== 'none' &&
                          style.outlineColor !== 'transparent'
    const boxShadowVisible = style.boxShadow !== 'none' && 
                            style.boxShadow !== ''
    return outlineVisible || boxShadowVisible
  })
}

/**
 * Check if element has associated label
 */
export async function hasAssociatedLabel(page: Page, selector: string): Promise<boolean> {
  const input = page.locator(selector)
  if (await input.count() === 0) return false
  
  return await input.evaluate((el) => {
    const id = el.getAttribute('id')
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`)
      if (label) return true
    }
    const ariaLabel = el.getAttribute('aria-label')
    const ariaLabelledby = el.getAttribute('aria-labelledby')
    const placeholder = el.getAttribute('placeholder')
    
    return !!(ariaLabel || ariaLabelledby || (placeholder && (el as HTMLInputElement).type === 'text'))
  })
}

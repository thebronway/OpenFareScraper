import type { Page } from 'playwright';

const EXCLUDE_BASIC_REGEX = /exclude\s+basic/i;

const BASIC_ECONOMY_CARD_PATTERNS: RegExp[] = [
  /\bbasic\s+economy\b/i,
  /\b(?:blue|main)\s+basic\b/i,
  /\beconomy\s*\(\s*basic\s*\)/i,
  /\beconomy\s+light\b/i,
  /\bbasic\s+fare\b/i,
];

/**
 * Returns true if a rendered DOM itinerary card explicitly advertises a Basic Economy fare tier.
 */
export function isBasicEconomyDomCard(
  cardText: string,
  cardAriaLabel = ''
): boolean {
  const combined = `${cardAriaLabel}\n${cardText}`;
  return BASIC_ECONOMY_CARD_PATTERNS.some((pattern) => pattern.test(combined));
}

/**
 * Inspects rendered Google Flights cabin/fare controls to verify whether
 * "Economy (exclude Basic)" is visibly active in the hydrated UI.
 */
export async function isStandardEconomyActiveInDom(
  page: Page
): Promise<boolean> {
  return page
    .evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll(
          'button, [role="combobox"], [role="button"], [aria-pressed="true"], [aria-selected="true"]'
        )
      );

      for (const el of candidates) {
        const htmlEl = el as HTMLElement;
        if (htmlEl.offsetParent === null) continue;
        const text = `${htmlEl.innerText || ''} ${el.getAttribute('aria-label') || ''}`;
        if (/exclude\s+basic/i.test(text)) {
          return true;
        }
      }

      return false;
    })
    .catch(() => false);
}

/**
 * Ensures Google Flights' rendered cabin selector has "Economy (exclude Basic)" active.
 * Fast-exits in <5ms when already active; otherwise opens the cabin dropdown and selects
 * "Economy (exclude Basic)" so Google dispatches a post-filter GetShoppingResults XHR.
 */
export async function ensureStandardEconomyFilterActive(
  page: Page
): Promise<boolean> {
  if (await isStandardEconomyActiveInDom(page)) {
    return true;
  }

  try {
    const cabinTriggers = [
      page.locator('[role="combobox"][aria-label*="cabin" i]').first(),
      page.locator('button[aria-label*="cabin" i]').first(),
      page.locator('[role="combobox"]').filter({ hasText: /^\s*Economy\s*$/i }).first(),
      page.locator('button').filter({ hasText: /^\s*Economy\s*$/i }).first(),
    ];

    for (const trigger of cabinTriggers) {
      const visible = await trigger.isVisible().catch(() => false);
      if (!visible) continue;

      const labelText = `${await trigger.innerText().catch(() => '')} ${
        (await trigger.getAttribute('aria-label').catch(() => '')) ?? ''
      }`;
      if (EXCLUDE_BASIC_REGEX.test(labelText)) {
        return true;
      }

      await trigger.click({ timeout: 2500 }).catch(() => null);
      await page.waitForTimeout(250);

      const excludeOption = page
        .locator('[role="option"], [role="menuitemradio"], [role="menuitem"], li, button')
        .filter({ hasText: EXCLUDE_BASIC_REGEX })
        .first();

      const optionVisible = await excludeOption.isVisible().catch(() => false);
      if (optionVisible) {
        await excludeOption.click({ timeout: 2500 }).catch(() => null);
        return true;
      }

      // Close open menu if "Economy (exclude Basic)" is unavailable on this route
      await page.keyboard.press('Escape').catch(() => null);
      break;
    }
  } catch {
    // Best-effort UI filter recovery
  }

  return isStandardEconomyActiveInDom(page);
}
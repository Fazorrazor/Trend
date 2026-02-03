/**
 * Configuration for highlighted categories across different services
 * These categories are prioritized in trend analysis and pivot tables
 */

export type ServiceKey = 'flexcube' | 'cards' | 'ibps' | 'mfs' | 'smart_teller';

export interface ServiceHighlights {
  key: ServiceKey;
  title: string;
  highlights: string[];
}

export const HIGHLIGHTED_CATEGORIES: Record<ServiceKey, string[]> = {
  flexcube: [
    'Account Maintenance',
    'Cheque Book',
    'Account Closure',
    'Account Class Transfer',
  ],
  cards: [
    'Card Complain with error code',
    'Card error',
    'Challenges on indigo',
    'Card Issuance Connectivity issues',
  ],
  ibps: [
    'Account Opening Challenges',
    'AO update Challenges',
    'Account Maintenance',
    'FT validation issue',
  ],
  mfs: [
    'Issue creating virtual cards',
    'Onboarding related',
    'Account Activation',
    'Onboarding - Non recipient OTP',
  ],
  smart_teller: [
    'Interface freezing, slow and or unresponsive',
    'Core Banking Error',
    'Assign application to user on Smart Teller',
    'Transaction Failure',
  ],
};

/**
 * Check if a category is highlighted for a given service
 */
export function isHighlightedCategory(
  serviceKey: ServiceKey,
  category: string
): boolean {
  const highlights = HIGHLIGHTED_CATEGORIES[serviceKey];
  if (!highlights) return false;
  
  const normalizedCategory = category.trim().toLowerCase();
  return highlights.some(h => h.toLowerCase() === normalizedCategory);
}

/**
 * Get all highlighted categories for a service
 */
export function getHighlightedCategories(serviceKey: ServiceKey): string[] {
  return HIGHLIGHTED_CATEGORIES[serviceKey] || [];
}

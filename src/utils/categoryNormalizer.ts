// Normalizes third level category names per service to canonical labels for consistent aggregation

export type ServiceKey = 'flexcube' | 'cards' | 'ibps' | 'mfs' | 'smart_teller';

export function normalizeCategory(service: ServiceKey, rawCategory: string | null | undefined): string {
  const input = (rawCategory || '').trim();
  if (input === '') return '';

  if (service === 'smart_teller') {
    const v = input.toLowerCase();

    // Interface freezing variants
    if (v.includes('interface freezing') || v.includes('unresponsive') || v.includes('slow')) {
      return 'Interface freezing, slow and or unresponsive';
    }

    // Core banking error variants
    if (v.includes('core') && v.includes('bank') && v.includes('error')) {
      return 'Core Banking Error';
    }

    // Assign application to user variants
    if (v.startsWith('assign application to user')) {
      return 'Assign application to user on Smart Teller';
    }

    // Transaction failure variants (including notes to contact support)
    if (v.startsWith('transaction failure')) {
      return 'Transaction Failure';
    }

    return input;
  }

  if (service === 'cards') {
    const v = input.toLowerCase();
    // Card Issuance Connectivity issues (catch "Instant Card Issuance Connectivity issues" etc.)
    if (v.includes('issuance') && v.includes('connect')) {
      return 'Card Issuance Connectivity issues';
    }
    if (v.includes('error code') || (v.includes('complain') && v.includes('error'))) {
      return 'Card Complain with error code';
    }
    if (v.includes('card') && v.includes('error')) {
      return 'Card error';
    }
    if (v.includes('indigo')) {
      return 'Challenges on indigo';
    }
    return input;
  }

  if (service === 'flexcube') {
    const v = input.toLowerCase();
    if (v.includes('account maintenance')) return 'Account Maintenance';
    if (v.includes('cheque') && v.includes('book')) return 'Cheque Book';
    if (v.includes('account') && v.includes('closure')) return 'Account Closure';
    if (v.includes('account') && v.includes('class') && v.includes('transfer')) return 'Account Class Transfer';
    return input;
  }

  if (service === 'ibps') {
    const v = input.toLowerCase();
    if (v.includes('account') && v.includes('opening')) return 'Account Opening Challenges';
    if ((v.includes('ao') && v.includes('update')) || (v.includes('account') && v.includes('opening') && v.includes('update'))) return 'AO update Challenges';
    if (v.includes('account maintenance')) return 'Account Maintenance';
    if ((v.includes('ft') && v.includes('validation')) || v.includes('fund transfer validation')) return 'FT validation issue';
    return input;
  }

  if (service === 'mfs') {
    const v = input.toLowerCase();
    if (v.includes('virtual') && v.includes('card')) return 'Issue creating virtual cards';
    if (v.includes('onboarding') && v.includes('non') && (v.includes('recipient') || v.includes('recipient'))) return 'Onboarding - Non recipient OTP';
    if (v.includes('onboarding')) return 'Onboarding related';
    if (v.includes('account') && v.includes('activation')) return 'Account Activation';
    return input;
  }

  // Default: no normalization
  return input;
}



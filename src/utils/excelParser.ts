import Papa from 'papaparse';
import { TicketData } from '../types/ticket';

export interface ParsedData {
  data: TicketData[];
  errors: string[];
  warnings: string[];
}

// Expected column headers (case-insensitive mapping)
const COLUMN_MAPPING: Record<string, keyof TicketData> = {
  'ticket id': 'ticket_id',
  'ticketid': 'ticket_id',
  'request time': 'request_time',
  'requesttime': 'request_time',
  'week': 'week_label',
  'weeks': 'week_label',
  'initiator': 'initiator',
  'affiliate': 'affiliate',
  'cluster': 'cluster',
  'clusters': 'cluster',
  'service record type': 'service_record_type',
  'servicerecordtype': 'service_record_type',
  'record type': 'service_record_type',
  'category': 'category',
  'sub-category': 'sub_category',
  'subcategory': 'sub_category',
  'sub category': 'sub_category',
  'third lvl category': 'third_lvl_category',
  'third level category': 'third_lvl_category',
  'thirdlvlcategory': 'third_lvl_category',
  '3rd lvl category': 'third_lvl_category',
  'title': 'title',
  'description': 'description',
  'name': 'name',
  'support group': 'support_group',
  'supportgroup': 'support_group',
  'process': 'process',
  'process manager': 'process_manager',
  'processmanager': 'process_manager',
  'manager': 'process_manager',
  'priority': 'priority',
  'status': 'status',
  'resolution': 'resolution',
  'root cause': 'root_cause',
  'rootcause': 'root_cause',
  'incident origin': 'incident_origin',
  'incidentorigin': 'incident_origin',
  'close time': 'close_time',
  'closetime': 'close_time',
  'sla indicator': 'sla_indicator',
  'slaindicator': 'sla_indicator',
};

function normalizeColumnName(header: string): keyof TicketData | null {
  const normalized = header.toLowerCase().trim();
  return COLUMN_MAPPING[normalized] || null;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  const trimmed = dateStr.trim();

  // Try direct Date constructor first (handles ISO, RFC, etc.)
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // Continue to other formats
  }

  const monthMap: Record<string, number> = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  };

  // Try DD/MM/YYYY format (common in many regions)
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?)?$/i);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1]);
    const month = parseInt(ddmmyyyyMatch[2]);
    const year = parseInt(ddmmyyyyMatch[3]);
    let hour = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4]) : 0;
    const minute = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5]) : 0;
    const second = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6]) : 0;
    const ampm = ddmmyyyyMatch[7];

    // Handle AM/PM
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }

    // Try DD/MM/YYYY first (day <= 12 is ambiguous)
    if (day <= 31 && month <= 12) {
      const date = new Date(year, month - 1, day, hour, minute, second);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // If that fails and day > 12, try MM/DD/YYYY
    if (day > 12 && month <= 31) {
      const date = new Date(year, day - 1, month, hour, minute, second);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Try YYYY-MM-DD format
  const yyyymmddMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1]);
    const month = parseInt(yyyymmddMatch[2]);
    const day = parseInt(yyyymmddMatch[3]);
    const hour = yyyymmddMatch[4] ? parseInt(yyyymmddMatch[4]) : 0;
    const minute = yyyymmddMatch[5] ? parseInt(yyyymmddMatch[5]) : 0;
    const second = yyyymmddMatch[6] ? parseInt(yyyymmddMatch[6]) : 0;

    const date = new Date(year, month - 1, day, hour, minute, second);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try DD MMM YYYY format (e.g., "15 Jan 2025", "15-Jan-2025")
  const ddmmmyyyyMatch = trimmed.match(/^(\d{1,2})[\s\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/i);
  if (ddmmmyyyyMatch) {
    const day = parseInt(ddmmmyyyyMatch[1]);
    const monthStr = ddmmmyyyyMatch[2].toLowerCase().substring(0, 3);
    const year = parseInt(ddmmmyyyyMatch[3]);
    const hour = ddmmmyyyyMatch[4] ? parseInt(ddmmmyyyyMatch[4]) : 0;
    const minute = ddmmmyyyyMatch[5] ? parseInt(ddmmmyyyyMatch[5]) : 0;
    const second = ddmmmyyyyMatch[6] ? parseInt(ddmmmyyyyMatch[6]) : 0;

    const month = monthMap[monthStr];
    if (month !== undefined) {
      const date = new Date(year, month, day, hour, minute, second);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Try MMM DD, YYYY format (e.g., "Jan 15, 2025")
  const mmmddyyyyMatch = trimmed.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/i);
  if (mmmddyyyyMatch) {
    const monthStr = mmmddyyyyMatch[1].toLowerCase().substring(0, 3);
    const day = parseInt(mmmddyyyyMatch[2]);
    const year = parseInt(mmmddyyyyMatch[3]);
    const hour = mmmddyyyyMatch[4] ? parseInt(mmmddyyyyMatch[4]) : 0;
    const minute = mmmddyyyyMatch[5] ? parseInt(mmmddyyyyMatch[5]) : 0;
    const second = mmmddyyyyMatch[6] ? parseInt(mmmddyyyyMatch[6]) : 0;

    const month = monthMap[monthStr];
    if (month !== undefined) {
      const date = new Date(year, month, day, hour, minute, second);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  // Try Excel serial date number (days since 1900-01-01)
  const excelSerial = parseFloat(trimmed);
  if (!isNaN(excelSerial) && excelSerial > 0 && excelSerial < 100000) {
    // Excel date serial number
    const excelEpoch = new Date(1899, 11, 30); // Excel's epoch is Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + excelSerial * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function validatePriority(priority: string): 'P1' | 'P2' | 'P3' | 'P4' | undefined {
  if (!priority) return undefined;

  const normalized = priority.toUpperCase().trim();

  // Direct match (e.g., "P1", "P2", "P3", "P4")
  if (['P1', 'P2', 'P3', 'P4'].includes(normalized)) {
    return normalized as 'P1' | 'P2' | 'P3' | 'P4';
  }

  // Extract priority from strings like "P1 Critical", "P4 Low", "P3 Medium", etc.
  const match = normalized.match(/P[1-4]/);
  if (match) {
    return match[0] as 'P1' | 'P2' | 'P3' | 'P4';
  }

  // Match common priority names to levels
  const priorityMap: Record<string, 'P1' | 'P2' | 'P3' | 'P4'> = {
    'CRITICAL': 'P1',
    'HIGH': 'P2',
    'MEDIUM': 'P3',
    'LOW': 'P4',
    'URGENT': 'P1',
    'NORMAL': 'P3',
  };

  for (const [key, value] of Object.entries(priorityMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return undefined;
}

export function parseExcelData(csvText: string): ParsedData {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedTickets: TicketData[] = [];

  try {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy', // Skip empty lines more aggressively
      transformHeader: (header: string) => header.trim(),
      delimitersToGuess: [',', '\t', '|', ';'], // Try multiple delimiters
    });

    if (result.errors.length > 0) {
      result.errors.forEach(err => {
        const rowNum = err.row !== undefined ? err.row + 2 : 'Unknown';
        // Only show critical errors, convert field count mismatches to warnings
        if (err.code === 'TooFewFields' || err.code === 'TooManyFields') {
          warnings.push(`Row ${rowNum}: ${err.message} - Row will be skipped if invalid`);
        } else {
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      });
    }

    const headers = result.meta.fields || [];
    const mappedHeaders = new Map<string, keyof TicketData>();

    // Map headers to our schema
    headers.forEach(header => {
      const mapped = normalizeColumnName(header);
      if (mapped) {
        mappedHeaders.set(header, mapped);
      }
    });

    // Check for required fields
    if (!mappedHeaders.has('ticket_id') && !Array.from(mappedHeaders.values()).includes('ticket_id')) {
      errors.push('Missing required column: Ticket ID');
    }
    if (!mappedHeaders.has('request_time') && !Array.from(mappedHeaders.values()).includes('request_time')) {
      errors.push('Missing required column: Request Time');
    }

    if (errors.length > 0) {
      return { data: [], errors, warnings };
    }

    // Process each row
    result.data.forEach((row: any, index: number) => {
      try {
        const ticket: Partial<TicketData> = {};

        // Map each column
        headers.forEach(header => {
          const fieldName = mappedHeaders.get(header);
          if (fieldName && row[header] !== undefined && row[header] !== null) {
            const value = String(row[header]).trim();

            if (value === '') return;

            // Special handling for dates
            if (fieldName === 'request_time' || fieldName === 'close_time') {
              const parsedDate = parseDate(value);
              if (parsedDate) {
                ticket[fieldName] = parsedDate;
              } else if (fieldName === 'request_time') {
                // Request time is required, show warning
                warnings.push(`Row ${index + 2}: Invalid date format in ${header}`);
              }
              // Close time is optional, silently skip if invalid
            }
            // Special handling for priority
            else if (fieldName === 'priority') {
              ticket[fieldName] = validatePriority(value);
              if (!ticket[fieldName] && value) {
                warnings.push(`Row ${index + 2}: Invalid priority value "${value}". Expected P1-P4.`);
              }
            }
            // All other fields
            else {
              (ticket as any)[fieldName] = value;
            }
          }
        });

        // Validate required fields
        if (!ticket.ticket_id) {
          // Include tickets without IDs by generating a surrogate ID
          const surrogateId = `AUTO-${Date.now()}-${index + 2}`;
          ticket.ticket_id = surrogateId;
          warnings.push(`Row ${index + 2}: Missing Ticket ID, generated ${surrogateId}`);
        }
        if (!ticket.request_time) {
          warnings.push(`Row ${index + 2}: Missing Request Time, skipping row`);
          return;
        }

        parsedTickets.push(ticket as TicketData);
      } catch (err) {
        warnings.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

    if (parsedTickets.length === 0) {
      errors.push('No valid ticket data found in the input');
    }

  } catch (err) {
    errors.push(`Parse error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  return {
    data: parsedTickets,
    errors,
    warnings,
  };
}

// Calculate week numbers based on the earliest date in the dataset
export function calculateWeekNumbers(tickets: TicketData[]): TicketData[] {
  if (tickets.length === 0) return tickets;

  // If any row already has a week_label, respect it and only fill missing ones
  const ticketsNeedingWeeks = tickets.filter(t => !t.week_label || t.week_label.trim() === '');
  if (ticketsNeedingWeeks.length === 0) return tickets;

  // Find the earliest date among all tickets (not just those missing weeks)
  const dates = tickets
    .map(t => t.request_time)
    .filter(d => d)
    .map(d => new Date(d!).getTime());

  if (dates.length === 0) return tickets;

  const minDate = new Date(Math.min(...dates));
  minDate.setHours(0, 0, 0, 0); // Start of day

  return tickets.map(ticket => {
    // Preserve provided week_label
    if (ticket.week_label && ticket.week_label.trim() !== '') return ticket;
    if (!ticket.request_time) return ticket;

    const ticketDate = new Date(ticket.request_time);
    const diffTime = ticketDate.getTime() - minDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;

    return {
      ...ticket,
      week_number: weekNumber,
      week_label: `Week ${weekNumber}`,
    };
  });
}

// Export data to CSV format
export function exportToCSV(data: any[], filename: string = 'export.csv'): void {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

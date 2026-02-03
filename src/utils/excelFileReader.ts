import * as XLSX from 'xlsx';

export interface FileReadResult {
    csvText: string;
    fileName: string;
    rowCount: number;
    columnCount: number;
    sheetName?: string;
}

export interface FileValidationError {
    type: 'size' | 'format' | 'empty' | 'read';
    message: string;
}

// const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - DISABLED: No file size limit
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/octet-stream', // Sometimes Excel files are detected as this
];

/**
 * Validates an Excel file before reading
 */
export function validateExcelFile(file: File): FileValidationError | null {
    // Check file size - DISABLED: No file size limit
    // if (file.size > MAX_FILE_SIZE) {
    //     return {
    //         type: 'size',
    //         message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 10MB`,
    //     };
    // }

    // Check if file is empty
    if (file.size === 0) {
        return {
            type: 'empty',
            message: 'File is empty',
        };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
        return {
            type: 'format',
            message: `Invalid file format. Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)`,
        };
    }

    // Check MIME type (more lenient as browsers can be inconsistent)
    const hasValidMimeType = ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';

    if (!hasValidMimeType && !hasValidExtension) {
        return {
            type: 'format',
            message: `Unsupported file type: ${file.type}`,
        };
    }

    return null;
}

/**
 * Reads an Excel file and converts it to CSV text format
 */
export async function readExcelFile(file: File): Promise<FileReadResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    reject(new Error('Failed to read file'));
                    return;
                }

                // Read the workbook
                const workbook = XLSX.read(data, { type: 'array' });

                // Helper: check if CSV header looks like raw ticket data
                const looksLikeTicketCSV = (csv: string): boolean => {
                    const firstLine = csv.split(/\r?\n/).find(line => line.trim() !== '') || '';
                    if (!firstLine) return false;
                    const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
                    const hasTicketId = headers.includes('ticket id') || headers.includes('ticketid');
                    const hasRequestTime = headers.includes('request time') || headers.includes('requesttime');
                    return hasTicketId && hasRequestTime;
                };

                // Iterate sheets to find the first likely raw data sheet
                let chosenCsv: string | null = null;
                let chosenSheetName: string | undefined;
                let chosenRange: XLSX.Range | null = null;

                for (const sheetName of workbook.SheetNames) {
                    const ws = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false, strip: true });
                    if (!csv || csv.trim().length === 0) continue;
                    if (looksLikeTicketCSV(csv)) {
                        chosenCsv = csv;
                        chosenSheetName = sheetName;
                        chosenRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                        break;
                    }
                }

                // If none matched the expected headers, fallback to first non-empty sheet
                if (!chosenCsv) {
                    const firstNonEmpty = workbook.SheetNames.find(name => {
                        const ws = workbook.Sheets[name];
                        const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false, strip: true });
                        return csv && csv.trim().length > 0;
                    });

                    if (!firstNonEmpty) {
                        reject(new Error('All sheets are empty or contain no data'));
                        return;
                    }

                    const ws = workbook.Sheets[firstNonEmpty];
                    chosenCsv = XLSX.utils.sheet_to_csv(ws, { blankrows: false, strip: true });
                    chosenSheetName = firstNonEmpty;
                    chosenRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                }

                const csvText = chosenCsv!;
                const range = chosenRange!;
                const rowCount = range.e.r - range.s.r + 1;
                const columnCount = range.e.c - range.s.c + 1;

                resolve({
                    csvText,
                    fileName: file.name,
                    rowCount,
                    columnCount,
                    sheetName: chosenSheetName,
                });
            } catch (error) {
                reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        // Read as array buffer for better Excel compatibility
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Validates and reads an Excel file in one operation
 */
export async function validateAndReadExcelFile(file: File): Promise<FileReadResult> {
    // Validate first
    const validationError = validateExcelFile(file);
    if (validationError) {
        throw new Error(validationError.message);
    }

    // Read the file
    return await readExcelFile(file);
}

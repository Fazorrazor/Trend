import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, X, File as FileIcon } from 'lucide-react';
import { parseExcelData, calculateWeekNumbers } from '../../utils/excelParser';
import { validateAndReadExcelFile } from '../../utils/excelFileReader';
import { TicketData } from '../../types/ticket';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface DataImportViewProps {
  onImportComplete: () => void;
}

export function DataImportView({ onImportComplete }: DataImportViewProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [pastedData, setPastedData] = useState('');
  const [importName, setImportName] = useState('');
  // Removed manual date filters (month/year); period is auto-detected from data
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedResult, setParsedResult] = useState<{
    data: TicketData[];
    errors: string[];
    warnings: string[];
  } | null>(null);

  const handleFileSelect = async (file: File) => {
    setParsing(true);
    setUploadedFile(file);
    setParsedResult(null);

    try {
      // Read and validate the Excel file
      const fileResult = await validateAndReadExcelFile(file);

      // Auto-set import name from filename if not already set
      if (!importName.trim()) {
        const nameWithoutExt = file.name.replace(/\.(xlsx|xls|csv)$/i, '');
        setImportName(nameWithoutExt);
      }

      // Parse the CSV data
      const result = parseExcelData(fileResult.csvText);

      if (result.errors.length > 0) {
        setParsedResult(result);
      } else {
        // Calculate week numbers
        const dataWithWeeks = calculateWeekNumbers(result.data);
        setParsedResult({
          ...result,
          data: dataWithWeeks,
        });
      }
    } catch (err) {
      setParsedResult({
        data: [],
        errors: [err instanceof Error ? err.message : 'Unknown file reading error'],
        warnings: [],
      });
    } finally {
      setParsing(false);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length > 1) {
        toast.info(`${files.length} files selected. Processing first file: ${files[0].name}`);
      }
      // For now, process the first file
      // TODO: Enhance to process all files sequentially
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleParse = () => {
    console.log('Parse button clicked');

    if (!pastedData.trim()) {
      toast.warning('Please paste Excel data first');
      return;
    }

    console.log('Starting parse, data length:', pastedData.length);
    setParsing(true);
    setParsedResult(null);
    setUploadedFile(null);

    try {
      console.log('Calling parseExcelData...');
      const result = parseExcelData(pastedData);
      console.log('Parse result:', result);

      if (result.errors.length > 0) {
        console.log('Errors found:', result.errors);
        setParsedResult(result);
      } else {
        // Calculate week numbers
        console.log('Calculating week numbers...');
        const dataWithWeeks = calculateWeekNumbers(result.data);
        console.log('Week calculation complete, records:', dataWithWeeks.length);
        setParsedResult({
          ...result,
          data: dataWithWeeks,
        });
      }
    } catch (err) {
      console.error('Parse error:', err);
      setParsedResult({
        data: [],
        errors: [err instanceof Error ? err.message : 'Unknown parsing error'],
        warnings: [],
      });
    } finally {
      setParsing(false);
      console.log('Parse complete');
    }
  };

  const handleImport = async () => {
    if (!parsedResult || parsedResult.data.length === 0) {
      toast.warning('No valid data to import');
      return;
    }

    if (!importName.trim()) {
      toast.warning('Please provide an import name');
      return;
    }

    setImporting(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Auto-detect period (month/year) from data
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const validDates = parsedResult.data
        .map(r => r.request_time ? new Date(r.request_time) : null)
        .filter((d): d is Date => !!d && !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      const baseDate = validDates[0] || new Date();
      const importMonth = baseDate.getMonth() + 1;
      const importYear = baseDate.getFullYear();
      const monthLabel = `${monthNames[importMonth - 1]} ${importYear}`;

      // Create import record
      const importResponse = await api.post<{ data: any }>('/imports', {
        import_name: importName,
        total_records: parsedResult.data.length,
        import_month: importMonth,
        import_year: importYear,
        month_label: monthLabel,
      });

      const importId = importResponse.data.id;

      // Prepare ticket data - clean dates to match backend expectations if needed
      // (The parser already produces ISO strings which are JSON compatible)

      // Insert tickets in batches of 500 (API has generous timeout but better safe)
      const batchSize = 500;
      for (let i = 0; i < parsedResult.data.length; i += batchSize) {
        const batch = parsedResult.data.slice(i, i + batchSize);
        await api.post('/tickets/batch', {
          import_id: importId,
          tickets: batch
        });
      }

      toast.success(`Successfully imported ${parsedResult.data.length} tickets!`);

      // Reset form
      setPastedData('');
      setImportName('');
      setParsedResult(null);

      // Notify parent
      onImportComplete();
    } catch (err) {
      console.error('Import error:', err);
      toast.error(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setPastedData('');
    setParsedResult(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Ticket Data</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Upload Excel files or paste data to begin analysis
            </p>
          </div>
        </div>
      </div>

      {/* Import Configuration */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Import Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={importName}
            onChange={(e) => setImportName(e.target.value)}
            placeholder="e.g., Q4 2025 Tickets"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Identify this import in your history
          </p>
        </div>
      </div>

      {/* File Upload / Drag & Drop Area */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Upload Excel File</h3>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative border-2 border-dashed rounded-lg p-8 sm:p-10 md:p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
            ${parsing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {parsing ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-600 font-medium">Reading file...</p>
            </div>
          ) : uploadedFile ? (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-green-50 rounded-lg mb-3">
                <FileIcon className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-base text-gray-900 font-semibold mb-1 break-all px-2">{uploadedFile.name}</p>
              <p className="text-sm text-gray-500 mb-4">
                {(uploadedFile.size / 1024).toFixed(2)} KB
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className={`p-4 rounded-lg mb-4 ${isDragging ? 'bg-blue-50' : 'bg-gray-50'}`}>
                <Upload className={`w-12 h-12 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <p className="text-base text-gray-900 font-semibold mb-2 px-2">
                {isDragging ? 'Drop your file here' : 'Drag & drop Excel file'}
              </p>
              <p className="text-sm text-gray-500 mb-4">or click to browse</p>
              <div className="text-xs text-gray-400">
                Supports .xlsx, .xls, .csv
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OR Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-gray-50 text-gray-500 font-medium">OR</span>
        </div>
      </div>

      {/* Paste Area */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Paste Excel Data</h3>
            <p className="text-xs text-gray-500 mt-1">Copy from Excel and paste here</p>
          </div>
          {pastedData && (
            <button
              onClick={handleClear}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
        <textarea
          value={pastedData}
          onChange={(e) => setPastedData(e.target.value)}
          placeholder="1. Open Excel&#10;2. Select all data (Ctrl+A)&#10;3. Copy (Ctrl+C)&#10;4. Paste here (Ctrl+V)"
          className="w-full h-48 px-3 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono resize-none"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleParse}
            disabled={!pastedData.trim() || parsing}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {parsing ? 'Parsing...' : 'Parse Data'}
          </button>
        </div>
      </div>

      {/* Parsing Results */}
      {parsedResult && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Parsing Results</h3>

          {/* Errors */}
          {parsedResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-red-900 mb-2">Errors Found</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-red-800">
                    {parsedResult.errors.map((error, idx) => (
                      <li key={idx} className="break-words">{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {parsedResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-yellow-900 mb-2">Warnings</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-yellow-800 max-h-40 overflow-y-auto">
                    {parsedResult.warnings.slice(0, 20).map((warning, idx) => (
                      <li key={idx} className="break-words">{warning}</li>
                    ))}
                    {parsedResult.warnings.length > 20 && (
                      <li className="font-semibold">
                        ... and {parsedResult.warnings.length - 20} more warnings
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {parsedResult.data.length > 0 && parsedResult.errors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold text-green-900 mb-2">Ready to Import</h4>
                  <p className="text-xs sm:text-sm text-green-800">
                    Successfully parsed {parsedResult.data.length} ticket records.
                  </p>
                  {parsedResult.data.length > 0 && (
                    <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-green-800 space-y-1">
                      <p className="break-words">
                        <strong>Date Range:</strong>{' '}
                        {new Date(parsedResult.data[0].request_time).toLocaleDateString()} -{' '}
                        {new Date(
                          parsedResult.data[parsedResult.data.length - 1].request_time
                        ).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Weeks:</strong>{' '}
                        {Math.max(...parsedResult.data.map(d => d.week_number || 0))} weeks
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Import Button */}
          {parsedResult.data.length > 0 && parsedResult.errors.length === 0 && (
            <div className="pt-3 sm:pt-4 border-t">
              <button
                onClick={handleImport}
                disabled={importing || !importName.trim()}
                className="px-6 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                title={!importName.trim() ? 'Please enter an import name above' : 'Import tickets to database'}
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : `Import ${parsedResult.data.length} Tickets`}
              </button>
              {!importName.trim() && (
                <p className="text-sm text-orange-600 mt-2 font-medium">
                  Please enter an import name to enable import
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

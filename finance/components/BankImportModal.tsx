import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../_shared/useEscapeKey';
import { useBankTransactionStore } from '../stores/useBankTransactionStore';
import CustomSelect from '../../../components/CustomSelect';
import * as XLSX from 'xlsx';

interface BankImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
    onImportComplete: () => void;
}

interface ColumnMapping {
    date: number | null;
    description: number | null;
    amount: number | null;
    income: number | null;
    expense: number | null;
    balance: number | null;
    reference: number | null;
}

interface ParsedRow {
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    balance_after: number | null;
    reference: string | null;
}

const COLUMN_PATTERNS: Record<string, string[]> = {
    date: ['tarih', 'date', 'işlem tarihi', 'islem tarihi', 'valör', 'valor', 'değer tarihi', 'deger tarihi'],
    description: ['açıklama', 'aciklama', 'description', 'işlem açıklaması', 'islem aciklamasi', 'detay'],
    amount: ['tutar', 'amount', 'miktar', 'işlem tutarı', 'islem tutari'],
    income: ['alacak', 'gelen', 'credit', 'yatan', 'giriş', 'giris'],
    expense: ['borç', 'borc', 'giden', 'debit', 'çekilen', 'cekilen', 'çıkış', 'cikis'],
    balance: ['bakiye', 'balance', 'kalan', 'hesap bakiyesi'],
    reference: ['referans', 'reference', 'ref', 'işlem no', 'islem no', 'dekont no', 'fiş no', 'fis no'],
};

const normalize = (s: string) =>
    s.toLowerCase().trim()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

const detectColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = { date: null, description: null, amount: null, income: null, expense: null, balance: null, reference: null };
    headers.forEach((h, idx) => {
        const norm = normalize(String(h));
        for (const [key, patterns] of Object.entries(COLUMN_PATTERNS)) {
            if (patterns.some(p => norm.includes(normalize(p)))) {
                mapping[key as keyof ColumnMapping] = idx;
                break;
            }
        }
    });
    return mapping;
};

const parseDate = (val: any): string => {
    if (!val) return '';
    const str = String(val).trim();

    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

    // YYYY-MM-DD
    const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

    // DD/MM/YY (2-digit year)
    const dmy2 = str.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2})$/);
    if (dmy2) {
        const year = parseInt(dmy2[3]) > 50 ? `19${dmy2[3]}` : `20${dmy2[3]}`;
        return `${year}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
    }

    // Excel serial date number
    const numVal = typeof val === 'number' ? val : parseFloat(str);
    if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
        const d = new Date((numVal - 25569) * 86400 * 1000);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }

    return '';
};

const parseAmount = (val: any): number => {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim()
        .replace(/\s/g, '')
        .replace(/[₺TL]/gi, '')
        .replace(/\u00A0/g, '');

    const hasComma = str.includes(',');
    const hasDot = str.includes('.');

    if (hasComma && hasDot) {
        // Turkish: 1.234,56 → 1234.56
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
        str = str.replace(',', '.');
    }

    return parseFloat(str) || 0;
};

// Find the actual header row — skip bank metadata rows at the top
const findHeaderRow = (rows: any[][]): number => {
    const allPatterns = Object.values(COLUMN_PATTERNS).flat();
    let bestIdx = 0;
    let bestScore = 0;

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const filledCells = row.filter((c: any) => c != null && String(c).trim() !== '').length;
        if (filledCells < 2) continue;

        let score = 0;
        for (const cell of row) {
            if (cell == null) continue;
            const norm = normalize(String(cell));
            if (allPatterns.some(p => norm.includes(normalize(p)))) score++;
        }

        if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
        }
    }

    if (bestScore === 0) {
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row)) continue;
            const filledCells = row.filter((c: any) => c != null && String(c).trim() !== '').length;
            if (filledCells >= 3) return i;
        }
    }

    return bestIdx;
};

// Turkish banks commonly export HTML tables saved as .xls
const isHtmlContent = (text: string): boolean => {
    const t = text.trimStart().substring(0, 300).toLowerCase();
    return t.startsWith('<html') || t.startsWith('<!doctype') || t.startsWith('<table') ||
        (t.startsWith('<?xml') && t.includes('<html'));
};

// Parse HTML table into rows
const parseHtmlTable = (html: string): any[][] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tables = doc.querySelectorAll('table');

    let bestTable: HTMLTableElement | null = null;
    let bestRowCount = 0;
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        if (rows.length > bestRowCount) {
            bestRowCount = rows.length;
            bestTable = table;
        }
    });

    if (!bestTable) return [];

    const rows: any[][] = [];
    (bestTable as HTMLTableElement).querySelectorAll('tr').forEach(tr => {
        const cells: any[] = [];
        tr.querySelectorAll('td, th').forEach(cell => {
            cells.push((cell as HTMLElement).textContent?.trim() || '');
        });
        if (cells.some(c => c !== '')) rows.push(cells);
    });

    return rows;
};

// Parse text as CSV with auto-detected delimiter
const parseCsvManually = (text: string): any[][] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const delimiters = ['\t', ';', ',', '|'];
    let bestDelimiter = ',';
    let bestConsistency = 0;
    let bestColCount = 0;

    for (const delim of delimiters) {
        const colCounts = lines.slice(0, Math.min(lines.length, 10)).map(l => l.split(delim).length);
        const firstCount = colCounts[0];
        if (firstCount <= 1) continue;
        const consistent = colCounts.filter(c => c === firstCount).length;
        if (consistent > bestConsistency || (consistent === bestConsistency && firstCount > bestColCount)) {
            bestConsistency = consistent;
            bestDelimiter = delim;
            bestColCount = firstCount;
        }
    }

    return lines.map(line => {
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === bestDelimiter && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        parts.push(current.trim());
        return parts;
    });
};

// Extract table rows from PDF via pdfjs-dist (lazy loaded)
const parsePdfToRows = async (file: File): Promise<any[][]> => {
    let pdfjsLib: any;
    try {
        pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    } catch {
        throw new Error('PDF support could not be loaded. Please try Excel format.');
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const allRows: any[][] = [];

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const items = textContent.items.filter((item: any) => 'str' in item && item.str.trim());

        if (items.length === 0) continue;

        // Group text items by Y position (tolerance ±3px for same line)
        const lineMap: Map<number, { x: number; text: string }[]> = new Map();
        for (const item of items as any[]) {
            const y = Math.round(item.transform[5]);
            let matchedKey: number | null = null;
            for (const key of lineMap.keys()) {
                if (Math.abs(key - y) <= 3) {
                    matchedKey = key;
                    break;
                }
            }
            if (matchedKey !== null) {
                lineMap.get(matchedKey)!.push({ x: item.transform[4], text: item.str });
            } else {
                lineMap.set(y, [{ x: item.transform[4], text: item.str }]);
            }
        }

        // Sort top-to-bottom (PDF Y is bottom-up), then left-to-right
        const sortedLines = [...lineMap.entries()]
            .sort(([a], [b]) => b - a)
            .map(([, lineItems]) =>
                lineItems.sort((a, b) => a.x - b.x).map(i => i.text)
            );

        allRows.push(...sortedLines);
    }

    if (allRows.length < 2) {
        throw new Error('Could not extract enough data from PDF. Scanned (image) PDFs are not supported.');
    }

    return allRows;
};

const BankImportModal: React.FC<BankImportModalProps> = ({ isOpen, onClose, accountId, onImportComplete }) => {
    const { t } = useTranslation();
    useEscapeKey(onClose, isOpen);
    const { bulkAddTransactions } = useBankTransactionStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [rawData, setRawData] = useState<any[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping>({ date: null, description: null, amount: null, income: null, expense: null, balance: null, reference: null });
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const reset = () => {
        setStep(1);
        setRawData([]);
        setHeaders([]);
        setMapping({ date: null, description: null, amount: null, income: null, expense: null, balance: null, reference: null });
        setParsedRows([]);
        setIsImporting(false);
        setFileName('');
        setError('');
        setIsLoading(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const processRawRows = (allRows: any[][]) => {
        if (allRows.length < 2) {
            setError(t('bank.noDataRows'));
            return;
        }
        const headerIdx = findHeaderRow(allRows);
        const headerRow = allRows[headerIdx].map((h: any) => String(h || '').trim());
        const dataRows = allRows.slice(headerIdx + 1).filter((r: any[]) => r.some((c: any) => c != null && String(c).trim() !== ''));

        if (dataRows.length === 0) {
            setError(t('bank.noDataRows'));
            return;
        }

        setHeaders(headerRow);
        setRawData(dataRows);
        setMapping(detectColumns(headerRow));
        setStep(2);
    };

    const processWorkbook = (wb: XLSX.WorkBook) => {
        if (!wb.SheetNames.length) {
            setError(t('bank.noPages'));
            return;
        }
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        processRawRows(rows);
    };

    const handleSpreadsheetFile = async (file: File) => {
        const textContent = await file.text();

        // Strategy 1: HTML table (Turkish banks often save HTML as .xls)
        if (isHtmlContent(textContent)) {
            const rows = parseHtmlTable(textContent);
            if (rows.length >= 2) {
                processRawRows(rows);
                return;
            }
        }

        // Strategy 2: XLSX.read with type 'string' (handles HTML, CSV, text formats)
        try {
            const wb = XLSX.read(textContent, { type: 'string' });
            if (wb.SheetNames.length > 0) {
                processWorkbook(wb);
                return;
            }
        } catch (e) {
            console.warn('XLSX string read failed:', e);
        }

        // Strategy 3: XLSX.read with ArrayBuffer (standard .xlsx)
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
            processWorkbook(wb);
            return;
        } catch (e) {
            console.warn('XLSX array read failed:', e);
        }

        // Strategy 4: XLSX.read with binary string (older .xls)
        try {
            const buffer = await file.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const wb = XLSX.read(binary, { type: 'binary' });
            processWorkbook(wb);
            return;
        } catch (e) {
            console.warn('XLSX binary read failed:', e);
        }

        // Strategy 5: Manual CSV parsing (last resort)
        const csvRows = parseCsvManually(textContent);
        if (csvRows.length >= 2) {
            processRawRows(csvRows);
            return;
        }

        throw new Error(t('bank.unknownFormat'));
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const input = e.target;
        if (!file) return;
        setFileName(file.name);
        setError('');
        setIsLoading(true);

        const ext = file.name.toLowerCase().split('.').pop() || '';

        try {
            if (ext === 'pdf') {
                const rows = await parsePdfToRows(file);
                processRawRows(rows);
            } else {
                await handleSpreadsheetFile(file);
            }
        } catch (err: any) {
            console.error('File parse error:', err);
            setError(err?.message || t('bank.readError'));
        } finally {
            setIsLoading(false);
            input.value = '';
        }
    };

    const columnOptions = headers.map((h, i) => ({ value: String(i), label: `${i + 1}. ${h}` }));
    const emptyOption = [{ value: '', label: t('bank.notSelected') }];

    const handleMappingChange = (key: keyof ColumnMapping, val: string) => {
        setMapping(prev => ({ ...prev, [key]: val === '' ? null : parseInt(val) }));
    };

    const hasSeparateColumns = mapping.income !== null && mapping.expense !== null;

    const buildParsedRows = (): ParsedRow[] => {
        return rawData.map(row => {
            const dateStr = mapping.date !== null ? parseDate(row[mapping.date]) : '';
            const desc = mapping.description !== null ? String(row[mapping.description] || '') : '';
            const ref = mapping.reference !== null ? String(row[mapping.reference] || '') : null;
            const bal = mapping.balance !== null ? parseAmount(row[mapping.balance]) : null;

            let amount = 0;
            let type: 'income' | 'expense' = 'expense';

            if (hasSeparateColumns) {
                const incAmt = mapping.income !== null ? parseAmount(row[mapping.income]) : 0;
                const expAmt = mapping.expense !== null ? parseAmount(row[mapping.expense]) : 0;
                if (incAmt > 0) {
                    amount = incAmt;
                    type = 'income';
                } else {
                    amount = Math.abs(expAmt);
                    type = 'expense';
                }
            } else if (mapping.amount !== null) {
                const rawAmt = parseAmount(row[mapping.amount]);
                amount = Math.abs(rawAmt);
                type = rawAmt >= 0 ? 'income' : 'expense';
            }

            return { date: dateStr, description: desc, amount, type, balance_after: bal, reference: ref };
        }).filter(r => r.date && r.amount > 0);
    };

    const handleGoToStep3 = () => {
        if (mapping.date === null) return;
        if (!hasSeparateColumns && mapping.amount === null) return;
        const rows = buildParsedRows();
        setParsedRows(rows);
        setStep(3);
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            await bulkAddTransactions(
                parsedRows.map(r => ({
                    bank_account_id: accountId,
                    date: r.date,
                    description: r.description,
                    amount: r.amount,
                    type: r.type,
                    balance_after: r.balance_after,
                    reference_id: r.reference || null,
                    category: null,
                    matched_transaction_id: null,
                    is_imported: 1,
                }))
            );
            onImportComplete();
            handleClose();
        } catch (err) {
            console.error('Import error:', err);
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold font-sans text-gray-800">
                            Dosyadan İçe Aktar
                        </h3>
                        <p className="text-sm font-sans text-gray-500">
                            {step === 1 && t('bank.importTitle')}
                            {step === 2 && t('bank.importStep2')}
                            {step === 3 && `${parsedRows.length} hareket içe aktarılmaya hazır`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`w-2.5 h-2.5 rounded-full transition-all ${s === step ? 'bg-[#663259] scale-110' : s < step ? 'bg-[#663259]/40' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                        <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {/* Step 1: File Upload */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[40px] text-emerald-500">upload_file</span>
                            </div>
                            <div className="text-center">
                                <h4 className="text-lg font-bold text-gray-800 mb-1">{t('bank.selectFile')}</h4>
                                <p className="text-sm text-gray-500">
                                    Excel, CSV veya PDF formatında banka ekstresi yükleyin
                                </p>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                                className="flex items-center gap-2 px-8 py-4 bg-[#663259] text-white rounded-xl font-bold text-sm hover:bg-[#7a3d6b] transition-all shadow-lg shadow-[#663259]/20 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                                        Dosya Okunuyor...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">folder_open</span>
                                        Dosya Seç
                                    </>
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv,.pdf,.html,.htm"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <p className="text-xs text-gray-400">Desteklenen formatlar: .xlsx, .xls, .csv, .pdf</p>
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 w-full max-w-md">
                                    <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Column Mapping */}
                    {step === 2 && (
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <span className="material-symbols-outlined text-blue-500 text-[20px]">info</span>
                                <p className="text-sm text-blue-700 font-medium">
                                    <strong>{fileName}</strong> — {rawData.length} satır tespit edildi. Kolon eşlemesini kontrol edin.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Tarih <span className="text-red-400">*</span>
                                    </label>
                                    <CustomSelect
                                        options={[...emptyOption, ...columnOptions]}
                                        value={mapping.date !== null ? String(mapping.date) : ''}
                                        onChange={(v) => handleMappingChange('date', v)}
                                        placeholder={t('bank.selectColumn')}
                                        icon="calendar_today"
                                        accentColor="#663259"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Açıklama</label>
                                    <CustomSelect
                                        options={[...emptyOption, ...columnOptions]}
                                        value={mapping.description !== null ? String(mapping.description) : ''}
                                        onChange={(v) => handleMappingChange('description', v)}
                                        placeholder={t('bank.selectColumn')}
                                        icon="description"
                                        accentColor="#663259"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                <p className="text-xs font-bold text-amber-700 mb-3">{t('bank.amountColumns')}</p>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Tek Tutar Kolonu</label>
                                        <CustomSelect
                                            options={[...emptyOption, ...columnOptions]}
                                            value={mapping.amount !== null ? String(mapping.amount) : ''}
                                            onChange={(v) => handleMappingChange('amount', v)}
                                            placeholder="Seçin"
                                            icon="payments"
                                            accentColor="#663259"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1.5">{t('bank.debitColumn')}</label>
                                        <CustomSelect
                                            options={[...emptyOption, ...columnOptions]}
                                            value={mapping.expense !== null ? String(mapping.expense) : ''}
                                            onChange={(v) => handleMappingChange('expense', v)}
                                            placeholder="Seçin"
                                            icon="arrow_upward"
                                            accentColor="#663259"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Alacak (Gelir)</label>
                                        <CustomSelect
                                            options={[...emptyOption, ...columnOptions]}
                                            value={mapping.income !== null ? String(mapping.income) : ''}
                                            onChange={(v) => handleMappingChange('income', v)}
                                            placeholder="Seçin"
                                            icon="arrow_downward"
                                            accentColor="#663259"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-amber-600 mt-2">
                                    {t('bank.singleAmountHint')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Bakiye</label>
                                    <CustomSelect
                                        options={[...emptyOption, ...columnOptions]}
                                        value={mapping.balance !== null ? String(mapping.balance) : ''}
                                        onChange={(v) => handleMappingChange('balance', v)}
                                        placeholder={t('bank.selectColumn')}
                                        icon="account_balance_wallet"
                                        accentColor="#663259"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Referans</label>
                                    <CustomSelect
                                        options={[...emptyOption, ...columnOptions]}
                                        value={mapping.reference !== null ? String(mapping.reference) : ''}
                                        onChange={(v) => handleMappingChange('reference', v)}
                                        placeholder={t('bank.selectColumn')}
                                        icon="tag"
                                        accentColor="#663259"
                                    />
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{t('bank.previewFirst5')}</p>
                                <div className="border border-gray-100 rounded-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    {headers.map((h, i) => (
                                                        <th key={i} className="px-3 py-2 font-bold text-gray-500 whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {rawData.slice(0, 5).map((row, i) => (
                                                    <tr key={i}>
                                                        {headers.map((_, ci) => (
                                                            <td key={ci} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[ci] != null ? String(row[ci]) : ''}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview & Confirm */}
                    {step === 3 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                                <p className="text-sm text-emerald-700 font-medium">
                                    <strong>{parsedRows.length}</strong> hareket başarıyla ayrıştırıldı
                                </p>
                            </div>

                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 sticky top-0">
                                                <th className="px-3 py-2.5 font-bold text-gray-500">Tarih</th>
                                                <th className="px-3 py-2.5 font-bold text-gray-500">Açıklama</th>
                                                <th className="px-3 py-2.5 font-bold text-gray-500">Tür</th>
                                                <th className="px-3 py-2.5 font-bold text-gray-500 text-right">Tutar</th>
                                                <th className="px-3 py-2.5 font-bold text-gray-500 text-right">Bakiye</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {parsedRows.map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50">
                                                    <td className="px-3 py-2 text-gray-700 font-medium">{r.date}</td>
                                                    <td className="px-3 py-2 text-gray-700 max-w-[250px] truncate">{r.description}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${r.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {r.type === 'income' ? 'Gelir' : 'Gider'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-bold ${r.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {r.type === 'income' ? '+' : '-'}{r.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-gray-500 font-medium">
                                                        {r.balance_after != null ? r.balance_after.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Toplam Gelir</p>
                                    <p className="text-lg font-black text-emerald-600">
                                        {parsedRows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Toplam Gider</p>
                                    <p className="text-lg font-black text-red-600">
                                        {parsedRows.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('bank.totalRows')}</p>
                                    <p className="text-lg font-black text-gray-800">{parsedRows.length}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
                    <button
                        onClick={step === 1 ? handleClose : () => setStep((step - 1) as 1 | 2)}
                        className="px-6 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm"
                    >
                        {step === 1 ? t('common.cancel') : t('common.back')}
                    </button>

                    {step === 2 && (
                        <button
                            onClick={handleGoToStep3}
                            disabled={mapping.date === null || (!hasSeparateColumns && mapping.amount === null)}
                            className="flex items-center gap-2 px-6 py-3 bg-[#663259] text-white rounded-xl font-bold text-sm hover:bg-[#7a3d6b] transition-all shadow-lg shadow-[#663259]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Önizleme
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    )}

                    {step === 3 && (
                        <button
                            onClick={handleImport}
                            disabled={isImporting || parsedRows.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                <>
                                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                    İçe Aktarılıyor...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    {parsedRows.length} Hareketi İçe Aktar
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BankImportModal;

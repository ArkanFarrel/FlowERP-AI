/**
 * Helper utility to export array of objects to CSV file openable in Excel.
 */
export function exportToCSV<T extends object>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[]
) {
  if (!rows || !rows.length) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  const sampleObj = rows[0] as Record<string, unknown>;
  const columnHeaders = headers
    ? headers.map((h) => h.label)
    : Object.keys(sampleObj);

  const keys = headers
    ? headers.map((h) => h.key as string)
    : Object.keys(sampleObj);

  const escapeCSVValue = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows: string[] = [];

  // UTF-8 BOM for Microsoft Excel compatibility
  const BOM = '\uFEFF';

  // Add Header Line
  csvRows.push(columnHeaders.map(escapeCSVValue).join(','));

  // Add Data Lines
  rows.forEach((row) => {
    const rowRec = row as Record<string, unknown>;
    const line = keys.map((k) => escapeCSVValue(rowRec[k])).join(',');
    csvRows.push(line);
  });

  const csvContent = BOM + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CSVValidationResult<T> {
  success: boolean;
  validRows: T[];
  errors: Array<{ rowNumber: number; field: string; message: string }>;
}

/**
 * Parsing dan validasi ketat batch CSV Import untuk mencegah data corruption pada data Produk / Supplier.
 */
export function parseAndValidateCSV<T extends Record<string, unknown>>(
  csvText: string,
  requiredFields: Array<{ key: keyof T; label: string; type: 'string' | 'number' | 'email' }>
): CSVValidationResult<T> {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length <= 1) {
    return { success: false, validRows: [], errors: [{ rowNumber: 0, field: 'file', message: 'Berkas CSV kosong atau tidak memiliki baris data.' }] };
  }

  // Helper untuk membersihkan tanda kutip CSV
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
  };

  const headerRow = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const fieldIndexMap: Record<string, number> = {};

  requiredFields.forEach(f => {
    const index = headerRow.findIndex(h => h.includes(f.label.toLowerCase()) || h.includes(String(f.key).toLowerCase()));
    if (index !== -1) {
      fieldIndexMap[String(f.key)] = index;
    }
  });

  const validRows: T[] = [];
  const errors: Array<{ rowNumber: number; field: string; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCSVLine(lines[i]);
    const rowObj: Record<string, unknown> = {};
    let isRowValid = true;

    requiredFields.forEach(f => {
      const keyStr = String(f.key);
      const colIndex = fieldIndexMap[keyStr];
      const rawValue = colIndex !== undefined ? rowValues[colIndex] : undefined;

      if (!rawValue || rawValue === '') {
        errors.push({ rowNumber: i + 1, field: f.label, message: `Kolom '${f.label}' wajib diisi.` });
        isRowValid = false;
        return;
      }

      if (f.type === 'number') {
        const num = Number(rawValue.replace(/[^0-9.-]+/g, ''));
        if (isNaN(num)) {
          errors.push({ rowNumber: i + 1, field: f.label, message: `Nilai '${rawValue}' harus berupa angka.` });
          isRowValid = false;
        } else {
          rowObj[keyStr] = num;
        }
      } else if (f.type === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
          errors.push({ rowNumber: i + 1, field: f.label, message: `Format email '${rawValue}' tidak valid.` });
          isRowValid = false;
        } else {
          rowObj[keyStr] = rawValue;
        }
      } else {
        rowObj[keyStr] = rawValue;
      }
    });

    if (isRowValid) {
      validRows.push(rowObj as T);
    }
  }

  return {
    success: errors.length === 0,
    validRows,
    errors,
  };
}

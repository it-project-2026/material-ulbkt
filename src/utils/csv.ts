import { MATERIAL_LIST, MaterialRecord, MaterialUsage, MaterialItem } from '../types';

export function getCSVHeadersDynamic(materialsList: MaterialItem[]): string[] {
  const headers = [
    'NO.',
    'TIMESTAMPS',
    'ULP',
    'POSKO',
    'SHIFT',
    'PETUGAS SERAH',
    'PETUGAS TERIMA'
  ];
  for (const item of materialsList) {
    headers.push(item.name.toUpperCase());
    headers.push('LOKASI TERPASANG');
  }
  headers.push('KETERANGAN');
  return headers;
}

/**
 * Escapes a cell value for CSV formatting
 */
function escapeCSVCell(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Escapes a cell value for TSV (Excel clipboard) formatting
 */
function escapeTSVCell(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  return str.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

/**
 * Converts a record to an array of string values matching dynamic CSV headers
 */
export function recordToRowArrayDynamic(record: MaterialRecord, index: number, materialsList: MaterialItem[]): (string | number)[] {
  const row: (string | number)[] = [
    index + 1,
    record.timestamp,
    record.ulp,
    record.posko,
    record.shift,
    record.petugasSerah,
    record.petugasTerima
  ];

  for (const item of materialsList) {
    const usage = record.materials[item.id] || { qty: 0, lokasi: '' };
    row.push(usage.qty || 0);
    row.push(usage.lokasi || '');
  }

  row.push(record.keterangan || '');
  return row;
}

/**
 * Exports MaterialRecords to CSV string dynamically
 */
export function exportToCSV(records: MaterialRecord[], materialsList?: MaterialItem[]): string {
  const list = materialsList || MATERIAL_LIST;
  const headers = getCSVHeadersDynamic(list);
  const headerRow = headers.map(escapeCSVCell).join(',');
  const dataRows = records.map((record, i) => {
    const rowData = recordToRowArrayDynamic(record, i, list);
    return rowData.map(escapeCSVCell).join(',');
  });
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Exports MaterialRecords to TSV string (Tab-delimited, perfect for Excel) dynamically
 */
export function exportToTSV(records: MaterialRecord[], materialsList?: MaterialItem[]): string {
  const list = materialsList || MATERIAL_LIST;
  const headers = getCSVHeadersDynamic(list);
  const headerRow = headers.map(escapeTSVCell).join('\t');
  const dataRows = records.map((record, i) => {
    const rowData = recordToRowArrayDynamic(record, i, list);
    return rowData.map(escapeTSVCell).join('\t');
  });
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Simple CSV parser to restore data dynamically
 */
export function importFromCSV(csvText: string, materialsList?: MaterialItem[]): MaterialRecord[] {
  if (!csvText || !csvText.trim()) return [];
  const list = materialsList || MATERIAL_LIST;
  
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  const cleanedText = csvText.trim();
  
  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const nextChar = cleanedText[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField);
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        currentLine.push(currentField);
        currentField = '';
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip LF after CR
        }
      } else {
        currentField += char;
      }
    }
  }
  
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField);
    lines.push(currentLine);
  }
  
  if (lines.length <= 1) return []; // No headers or no data
  
  const headers = lines[0].map(h => h.trim().toUpperCase());
  const parsedRecords: MaterialRecord[] = [];
  
  const getIndex = (name: string) => headers.indexOf(name.toUpperCase());
  
  const colIndexTimestamp = getIndex('TIMESTAMPS') !== -1 ? getIndex('TIMESTAMPS') : getIndex('TIMESTAMP');
  const colIndexUlp = getIndex('ULP');
  const colIndexPosko = getIndex('POSKO');
  const colIndexShift = getIndex('SHIFT');
  const colIndexSerah = getIndex('PETUGAS SERAH') !== -1 ? getIndex('PETUGAS SERAH') : getIndex('PETUGAS_SERAH');
  const colIndexTerima = getIndex('PETUGAS TERIMA') !== -1 ? getIndex('PETUGAS TERIMA') : getIndex('PETUGAS_TERIMA');
  const colIndexKeterangan = getIndex('KETERANGAN');
  
  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    if (row.length < 5) continue;
    
    const timestamp = colIndexTimestamp !== -1 ? row[colIndexTimestamp] : new Date().toISOString().substring(0, 16).replace('T', ' ');
    const ulp = colIndexUlp !== -1 ? row[colIndexUlp] : 'ULP Ambon';
    const posko = colIndexPosko !== -1 ? row[colIndexPosko] : 'Posko Induk';
    const shift = colIndexShift !== -1 ? row[colIndexShift] : 'Shift Pagi (08:00 - 16:00)';
    const petugasSerah = colIndexSerah !== -1 ? row[colIndexSerah] : '';
    const petugasTerima = colIndexTerima !== -1 ? row[colIndexTerima] : '';
    const keterangan = colIndexKeterangan !== -1 ? row[colIndexKeterangan] : '';
    
    const materials: Record<string, MaterialUsage> = {};
    
    let currentIdx = 7;
    for (const item of list) {
      const qtyVal = parseFloat(row[currentIdx]) || 0;
      const lokVal = row[currentIdx + 1] || '';
      
      materials[item.id] = {
        qty: qtyVal,
        lokasi: lokVal
      };
      
      currentIdx += 2;
    }
    
    parsedRecords.push({
      id: `record_${Date.now()}_${r}_${Math.random().toString(36).substr(2, 5)}`,
      no: parsedRecords.length + 1,
      timestamp,
      ulp,
      posko,
      shift,
      petugasSerah,
      petugasTerima,
      materials,
      keterangan
    });
  }
  
  return parsedRecords;
}

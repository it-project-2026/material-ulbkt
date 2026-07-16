import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { MATERIAL_LIST, MaterialRecord, MaterialUsage, MaterialItem, ULP_OPTIONS, POSKO_OPTIONS, SHIFT_OPTIONS, MappedOption, DEFAULT_POSKOS_MAPPED, DEFAULT_PETUGAS_MAPPED, UlpOption } from '../types';

// SPREADSHEET_ID and SHEET_NAME as requested
export const SPREADSHEET_ID = '1bZ8SnCGucSd5ppxTeCm60lgYI8c3zzQzl75bQj9YZ14';
export const SHEET_NAME = 'DATA';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Sheets full scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('google_sheets_token');

export function handleHttpStatus(status: number) {
  if (status === 401) {
    localStorage.removeItem('google_sheets_token');
    localStorage.removeItem('google_sheets_user');
    cachedAccessToken = null;
    throw new Error('Sesi Google Sheets Anda telah kedaluwarsa. Silakan muat ulang halaman dan hubungkan kembali akun Anda.');
  }
}

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // If we already have a cached token in localStorage, trigger the success callback immediately
  const savedUserRaw = localStorage.getItem('google_sheets_user');
  let savedUser = null;
  if (savedUserRaw) {
    try {
      savedUser = JSON.parse(savedUserRaw);
    } catch (e) {}
  }

  if (cachedAccessToken) {
    setTimeout(() => {
      if (onAuthSuccess) {
        onAuthSuccess(savedUser || { displayName: 'Petugas PLN ES' }, cachedAccessToken!);
      }
    }, 50);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        const storedToken = localStorage.getItem('google_sheets_token');
        if (storedToken) {
          cachedAccessToken = storedToken;
          if (onAuthSuccess) onAuthSuccess(user, storedToken);
        } else if (!isSigningIn) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      const storedToken = localStorage.getItem('google_sheets_token');
      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(savedUser || { displayName: 'Petugas PLN ES' }, storedToken);
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Google Sign-In with popup
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    const userData = {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL
    };
    localStorage.setItem('google_sheets_token', credential.accessToken);
    localStorage.setItem('google_sheets_user', JSON.stringify(userData));
    return { user: userData, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve cached access token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || localStorage.getItem('google_sheets_token');
};

// Logout
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('google_sheets_token');
  localStorage.removeItem('google_sheets_user');
};

/**
 * Ensures that the 'DATA' and reference sheets exist in the Google Spreadsheet.
 * If they do not exist, they are created and populated with default data.
 */
export async function ensureAndInitializeSheets(accessToken: string): Promise<void> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    handleHttpStatus(res.status);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Gagal memuat metadata Spreadsheet.`);
    }

    const meta = await res.json();
    const sheets = meta.sheets || [];
    const existingTitles = sheets.map((s: any) => s.properties?.title);

    const requiredSheets = [SHEET_NAME, 'ULP', 'POSKO', 'PETUGAS', 'MATERIAL', 'SHIFT'];
    const missingSheets = requiredSheets.filter(title => !existingTitles.includes(title));

    if (missingSheets.length > 0) {
      console.log('Sheet yang belum ada:', missingSheets, 'Membuat...');
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: missingSheets.map(title => ({
            addSheet: {
              properties: {
                title
              }
            }
          }))
        })
      });

      handleHttpStatus(createRes.status);

      if (!createRes.ok) {
        throw new Error(`HTTP ${createRes.status}: Gagal membuat sheet baru.`);
      }
    }

    // Initialize individual sheet values if they are empty
    const initSheetIfEmpty = async (title: string, headers: string[], rows: any[][]) => {
      try {
        const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(title + '!A1:C20')}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        handleHttpStatus(checkRes.status);

        if (checkRes.ok) {
          const data = await checkRes.json();
          if (data.values && data.values.length > 0) {
            return; // has content, skip
          }
        }
        
        const body = {
          values: [headers, ...rows]
        };
        const putRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(title + '!A1')}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        handleHttpStatus(putRes.status);
      } catch (err) {
        console.error(`Gagal menginisialisasi sheet ${title}:`, err);
      }
    };

    const defaultUlps = ULP_OPTIONS.map(opt => [opt]);
    const defaultPoskos = DEFAULT_POSKOS_MAPPED.map(p => [p.name, p.ulp]);
    const defaultShifts = SHIFT_OPTIONS.map(opt => [opt]);
    const defaultPetugas = DEFAULT_PETUGAS_MAPPED.map(p => [p.name, p.ulp]);
    const defaultMaterials = MATERIAL_LIST.map(item => [item.id, item.name, item.category]);

    await initSheetIfEmpty('ULP', ['name'], defaultUlps);
    await initSheetIfEmpty('POSKO', ['name', 'ulp'], defaultPoskos);
    await initSheetIfEmpty('SHIFT', ['NAMA SHIFT'], defaultShifts);
    await initSheetIfEmpty('PETUGAS', ['name', 'ulp'], defaultPetugas);
    await initSheetIfEmpty('MATERIAL', ['ID', 'NAMA MATERIAL', 'KATEGORI'], defaultMaterials);

  } catch (error) {
    console.error('Error ensuring and initializing sheets:', error);
    throw error;
  }
}

export interface SheetsReferenceOptions {
  ulp: UlpOption[];
  posko: MappedOption[];
  petugas: MappedOption[];
  shift: string[];
  materials: MaterialItem[];
}

// GAS Connection Utilities
export const getGasUrl = (): string => {
  return localStorage.getItem('google_sheets_gas_url') || (import.meta as any).env?.VITE_GAS_URL || '';
};

export const setGasUrl = (url: string) => {
  if (url) {
    localStorage.setItem('google_sheets_gas_url', url.trim());
  } else {
    localStorage.removeItem('google_sheets_gas_url');
  }
};

export const isGasConfigured = (): boolean => {
  return getGasUrl() !== '';
};

// Helper for parsing reference options
export function parseReferenceOptions(
  ulpRows: any[][],
  poskoRows: any[][],
  shiftRows: any[][],
  petugasRows: any[][],
  materialRows: any[][]
): SheetsReferenceOptions {
  // Helper for index matching
  const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
    if (!headers || headers.length === 0) return -1;
    const normalizedHeaders = headers.map(h => String(h).trim().toLowerCase());
    for (const name of possibleNames) {
      const idx = normalizedHeaders.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    for (const name of possibleNames) {
      const idx = normalizedHeaders.findIndex(h => h.includes(name.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // Parse ULP (needs 'name' column or fallback to first column, also looks for 'id' / 'ulpid')
  let ulp: UlpOption[] = [];
  if (ulpRows && ulpRows.length > 0) {
    const headers = ulpRows[0].map(h => String(h).trim());
    const idIdx = findColumnIndex(headers, ['ulpid', 'ulp_id', 'id']);
    const nameIdx = findColumnIndex(headers, ['name', 'nama ulp', 'ulp']);
    
    const targetIdIdx = idIdx !== -1 ? idIdx : (nameIdx !== -1 ? nameIdx : 0);
    const targetNameIdx = nameIdx !== -1 ? nameIdx : 0;
    
    ulp = ulpRows.slice(1)
      .map(row => {
        const idVal = row[targetIdIdx] ? String(row[targetIdIdx]).trim() : '';
        const nameVal = row[targetNameIdx] ? String(row[targetNameIdx]).trim() : '';
        return {
          id: idVal || nameVal,
          name: nameVal || idVal
        };
      })
      .filter(val => val.name !== '');
  }

  // Parse POSKO (needs 'name' column and 'ulp' column / 'ulpid' column)
  let posko: MappedOption[] = [];
  if (poskoRows && poskoRows.length > 0) {
    const headers = poskoRows[0].map(h => String(h).trim());
    const nameIdx = findColumnIndex(headers, ['name', 'nama posko', 'posko']);
    const ulpIdx = findColumnIndex(headers, ['ulpid', 'ulp_id', 'ulp', 'nama ulp', 'unit']);
    
    const targetNameIdx = nameIdx !== -1 ? nameIdx : 0;
    const targetUlpIdx = ulpIdx !== -1 ? ulpIdx : 1; // fallback to col 1 if not found

    posko = poskoRows.slice(1)
      .map(row => {
        const name = row[targetNameIdx] ? String(row[targetNameIdx]).trim() : '';
        const rowUlp = (targetUlpIdx !== -1 && row[targetUlpIdx]) ? String(row[targetUlpIdx]).trim() : '';
        return { name, ulp: rowUlp };
      })
      .filter(p => p.name !== '');
  }

  // Parse PETUGAS (needs 'name' column and 'ulp' column / 'ulpid' column)
  let petugas: MappedOption[] = [];
  if (petugasRows && petugasRows.length > 0) {
    const headers = petugasRows[0].map(h => String(h).trim());
    const nameIdx = findColumnIndex(headers, ['name', 'nama petugas', 'petugas']);
    const ulpIdx = findColumnIndex(headers, ['ulpid', 'ulp_id', 'ulp', 'nama ulp', 'unit']);
    
    const targetNameIdx = nameIdx !== -1 ? nameIdx : 0;
    const targetUlpIdx = ulpIdx !== -1 ? ulpIdx : 1;

    petugas = petugasRows.slice(1)
      .map(row => {
        const name = row[targetNameIdx] ? String(row[targetNameIdx]).trim() : '';
        const rowUlp = (targetUlpIdx !== -1 && row[targetUlpIdx]) ? String(row[targetUlpIdx]).trim() : '';
        return { name, ulp: rowUlp };
      })
      .filter(p => p.name !== '');
  }

  // Parse SHIFT
  let shift: string[] = [];
  if (shiftRows && shiftRows.length > 1) {
    shift = shiftRows.slice(1).map(row => row[0] ? String(row[0]).trim() : '').filter(val => val !== '');
  }

  // Parse materials
  let materials: MaterialItem[] = [];
  if (materialRows && materialRows.length > 1) {
    const headers = materialRows[0].map(h => String(h).trim());
    const idIdx = findColumnIndex(headers, ['id', 'kode']);
    const nameIdx = findColumnIndex(headers, ['nama material', 'name', 'nama']);
    const catIdx = findColumnIndex(headers, ['kategori', 'category']);

    const targetIdIdx = idIdx !== -1 ? idIdx : 0;
    const targetNameIdx = nameIdx !== -1 ? nameIdx : 1;
    const targetCatIdx = catIdx !== -1 ? catIdx : 2;

    materials = materialRows.slice(1).map((row, i) => {
      const rawId = row[targetIdIdx] ? String(row[targetIdIdx]).trim() : '';
      const rawName = row[targetNameIdx] ? String(row[targetNameIdx]).trim() : '';
      const rawCat = row[targetCatIdx] ? String(row[targetCatIdx]).trim() : '';

      const name = rawName || rawId || `Material ${i + 1}`;
      const id = rawId || name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      let category: 'KWh Meter' | 'MCB' | 'Fuse Link' | 'NH Fuse' | 'Kabel & Aksesoris' = 'Kabel & Aksesoris';
      const catUpper = rawCat.toUpperCase();
      if (catUpper.includes('METER') || catUpper.includes('KWH')) category = 'KWh Meter';
      else if (catUpper.includes('MCB')) category = 'MCB';
      else if (catUpper.includes('FUSE LINK')) category = 'Fuse Link';
      else if (catUpper.includes('NH FUSE')) category = 'NH Fuse';
      else if (catUpper.includes('KABEL') || catUpper.includes('AKSESORIS')) category = 'Kabel & Aksesoris';

      return { id, name, category };
    }).filter(item => item.name !== '');
  }

  return {
    ulp: ulp.length > 0 ? ulp : ULP_OPTIONS.map(name => ({ id: name, name })),
    posko: posko.length > 0 ? posko : DEFAULT_POSKOS_MAPPED,
    shift: shift.length > 0 ? shift : SHIFT_OPTIONS,
    petugas: petugas.length > 0 ? petugas : DEFAULT_PETUGAS_MAPPED,
    materials: materials.length > 0 ? materials : MATERIAL_LIST
  };
}

/**
 * Fetches all records and reference options from the Google Apps Script Web App
 */
export async function fetchDataFromGas(
  gasUrl: string,
  materialsList: MaterialItem[]
): Promise<{ records: MaterialRecord[]; options: SheetsReferenceOptions }> {
  const url = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}action=readAll`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal memuat data dari Google Apps Script.`);
  }
  const result = await res.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Gagal memuat data dari GAS.');
  }

  const { records: rawRecords, ulp: rawUlp, posko: rawPosko, shift: rawShift, petugas: rawPetugas, material: rawMaterial } = result.data;

  // Re-use parsers
  const options = parseReferenceOptions(rawUlp, rawPosko, rawShift, rawPetugas, rawMaterial);
  const records = rowsToRecordsDynamic(rawRecords || [], options.materials);

  return { records, options };
}

/**
 * Saves all records to the Spreadsheet via Google Apps Script Web App
 */
export async function saveRecordsToGas(
  records: MaterialRecord[],
  gasUrl: string,
  materialsList: MaterialItem[]
): Promise<void> {
  const headers = getDynamicHeaders(materialsList);
  const rows = records.map((record, index) => recordToRowArrayDynamic(record, index, materialsList));
  const body = {
    action: 'writeRecords',
    records: [headers, ...rows]
  };

  const url = gasUrl;
  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal mengirim data ke Google Apps Script.`);
  }

  const result = await res.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Gagal menyimpan data via GAS.');
  }
}

/**
 * Fetches all dropdown reference lists from the Spreadsheet
 */
export async function fetchAllReferenceOptions(accessToken: string): Promise<SheetsReferenceOptions> {
  await ensureAndInitializeSheets(accessToken);

  const fetchSingleSheetValues = async (sheetName: string): Promise<any[][]> => {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName + '!A1:K1000')}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      handleHttpStatus(res.status);

      if (!res.ok) return [];
      const data = await res.json();
      return data.values || [];
    } catch (err) {
      console.error(`Gagal memuat detail sheet ${sheetName}:`, err);
      return [];
    }
  };

  const [ulpRows, poskoRows, shiftRows, petugasRows, materialRows] = await Promise.all([
    fetchSingleSheetValues('ULP'),
    fetchSingleSheetValues('POSKO'),
    fetchSingleSheetValues('SHIFT'),
    fetchSingleSheetValues('PETUGAS'),
    fetchSingleSheetValues('MATERIAL')
  ]);

  return parseReferenceOptions(ulpRows, poskoRows, shiftRows, petugasRows, materialRows);
}

/**
 * Builds standard Google Sheets headers dynamically from a material list
 */
export function getDynamicHeaders(materialsList: MaterialItem[]): string[] {
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
 * Converts a record to a spreadsheet row dynamically
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
 * Converts Google Sheets rows back to MaterialRecord[] using dynamic material list
 */
export function rowsToRecordsDynamic(rows: any[][], materialsList: MaterialItem[]): MaterialRecord[] {
  if (!rows || rows.length <= 1) return [];

  const headers = rows[0].map(h => String(h).trim().toUpperCase());
  const parsedRecords: MaterialRecord[] = [];

  const getIndex = (name: string) => headers.indexOf(name.toUpperCase());

  const colIndexTimestamp = getIndex('TIMESTAMPS') !== -1 ? getIndex('TIMESTAMPS') : getIndex('TIMESTAMP');
  const colIndexUlp = getIndex('ULP');
  const colIndexPosko = getIndex('POSKO');
  const colIndexShift = getIndex('SHIFT');
  const colIndexSerah = getIndex('PETUGAS SERAH');
  const colIndexTerima = getIndex('PETUGAS TERIMA');
  const colIndexKeterangan = getIndex('KETERANGAN');

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 3) continue;

    const timestamp = colIndexTimestamp !== -1 && row[colIndexTimestamp] !== undefined 
      ? String(row[colIndexTimestamp]) 
      : new Date().toISOString().substring(0, 16).replace('T', ' ');
    const ulp = colIndexUlp !== -1 && row[colIndexUlp] !== undefined ? String(row[colIndexUlp]) : 'ULP Ambon';
    const posko = colIndexPosko !== -1 && row[colIndexPosko] !== undefined ? String(row[colIndexPosko]) : 'Posko Induk';
    const shift = colIndexShift !== -1 && row[colIndexShift] !== undefined ? String(row[colIndexShift]) : 'Shift Pagi (08:00 - 16:00)';
    const petugasSerah = colIndexSerah !== -1 && row[colIndexSerah] !== undefined ? String(row[colIndexSerah]) : '';
    const petugasTerima = colIndexTerima !== -1 && row[colIndexTerima] !== undefined ? String(row[colIndexTerima]) : '';
    const keterangan = colIndexKeterangan !== -1 && row[colIndexKeterangan] !== undefined ? String(row[colIndexKeterangan]) : '';

    const materials: Record<string, MaterialUsage> = {};

    for (let i = 0; i < materialsList.length; i++) {
      const item = materialsList[i];
      const qtyIdx = 7 + (i * 2);
      const lokIdx = 7 + (i * 2) + 1;

      const qtyVal = row[qtyIdx] !== undefined ? parseFloat(row[qtyIdx]) || 0 : 0;
      const lokVal = row[lokIdx] !== undefined ? String(row[lokIdx]) : '';

      materials[item.id] = {
        qty: qtyVal,
        lokasi: lokVal
      };
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

/**
 * Fetches all records from Google Sheets
 */
export async function fetchRecordsFromSheets(accessToken: string, materialsList: MaterialItem[]): Promise<MaterialRecord[]> {
  await ensureAndInitializeSheets(accessToken);

  // We request columns A to ZZ to cover a large amount of columns
  const range = `${SHEET_NAME}!A1:ZZ2000`;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  handleHttpStatus(res.status);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal menarik data dari Google Sheets.`);
  }

  const data = await res.json();
  const rows = data.values || [];

  if (rows.length <= 1) {
    return [];
  }

  return rowsToRecordsDynamic(rows, materialsList);
}

/**
 * Saves all records to Google Sheets
 */
export async function saveRecordsToSheets(records: MaterialRecord[], accessToken: string, materialsList: MaterialItem[]): Promise<void> {
  await ensureAndInitializeSheets(accessToken);

  // Clear existing DATA sheet
  const clearRange = `${SHEET_NAME}!A1:ZZ2000`;
  const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(clearRange)}:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  handleHttpStatus(clearRes.status);

  if (!clearRes.ok) {
    throw new Error(`HTTP ${clearRes.status}: Gagal mengosongkan data di Google Sheets.`);
  }

  // Build rows dynamically
  const headers = getDynamicHeaders(materialsList);
  const rows = records.map((record, index) => recordToRowArrayDynamic(record, index, materialsList));
  const body = {
    values: [headers, ...rows]
  };

  const writeRange = `${SHEET_NAME}!A1`;
  const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  handleHttpStatus(writeRes.status);

  if (!writeRes.ok) {
    throw new Error(`HTTP ${writeRes.status}: Gagal menulis data ke Google Sheets.`);
  }
}


export interface MaterialItem {
  id: string;
  name: string;
  category: 'KWh Meter' | 'MCB' | 'Fuse Link' | 'NH Fuse' | 'Kabel & Aksesoris';
}

export const MATERIAL_LIST: MaterialItem[] = [
  // 1. KWh Meter
  { id: 'kwh_prabayar', name: 'KWH METER PRABAYAR', category: 'KWh Meter' },
  { id: 'kwh_pascabayar', name: 'KWH METER PASCABAYAR', category: 'KWh Meter' },
  
  // 2. MCB
  { id: 'mcb_2a', name: 'MCB 2 A', category: 'MCB' },
  { id: 'mcb_4a', name: 'MCB 4 A', category: 'MCB' },
  { id: 'mcb_6a', name: 'MCB 6 A', category: 'MCB' },
  { id: 'mcb_10a', name: 'MCB 10 A', category: 'MCB' },
  { id: 'mcb_16a', name: 'MCB 16 A', category: 'MCB' },
  { id: 'mcb_25a', name: 'MCB 25 A', category: 'MCB' },
  { id: 'mcb_35a', name: 'MCB 35 A', category: 'MCB' },
  
  // 3. Fuse Link
  { id: 'fuse_2a', name: 'FUSE LINK 2 A', category: 'Fuse Link' },
  { id: 'fuse_3a', name: 'FUSE LINK 3 A', category: 'Fuse Link' },
  { id: 'fuse_5a', name: 'FUSE LINK 5 A', category: 'Fuse Link' },
  { id: 'fuse_6a', name: 'FUSE LINK 6 A', category: 'Fuse Link' },
  { id: 'fuse_8a', name: 'FUSE LINK 8 A', category: 'Fuse Link' },
  { id: 'fuse_10a', name: 'FUSE LINK 10 A', category: 'Fuse Link' },
  { id: 'fuse_15a', name: 'FUSE LINK 15 A', category: 'Fuse Link' },
  { id: 'fuse_20a', name: 'FUSE LINK 20 A', category: 'Fuse Link' },
  
  // 4. NH Fuse
  { id: 'nh_25a', name: 'NH FUSE 25 A', category: 'NH Fuse' },
  { id: 'nh_50a', name: 'NH FUSE 50 A', category: 'NH Fuse' },
  { id: 'nh_100a', name: 'NH FUSE 100 A', category: 'NH Fuse' },
  { id: 'nh_160a', name: 'NH FUSE 160 A', category: 'NH Fuse' },
  { id: 'nh_200a', name: 'NH FUSE 200 A', category: 'NH Fuse' },
  { id: 'nh_250a', name: 'NH FUSE 250 A', category: 'NH Fuse' },
  
  // 5. Kabel & Aksesoris
  { id: 'ijuk', name: 'IJUK', category: 'Kabel & Aksesoris' },
  { id: 'protective_sleeve', name: 'PROTEKTIF SLEEVE', category: 'Kabel & Aksesoris' },
  { id: 'penghalang_panjat', name: 'PENGHALANG PANJAT', category: 'Kabel & Aksesoris' },
  { id: 'kabel_twisted', name: 'KABEL TWISTED 2X10 mm', category: 'Kabel & Aksesoris' },
  { id: 'cco_10_16', name: 'CCO 10/16 mm', category: 'Kabel & Aksesoris' },
  { id: 'cco_16_35', name: 'CCO 16/35 mm', category: 'Kabel & Aksesoris' },
  { id: 'cco_16_70', name: 'CCO 16/70 mm', category: 'Kabel & Aksesoris' },
  { id: 'strain_clamp', name: 'STRAIN CLAMP', category: 'Kabel & Aksesoris' },
  { id: 'dll', name: 'dll', category: 'Kabel & Aksesoris' }
];

export interface MaterialUsage {
  qty: number;
  lokasi: string;
}

export interface ReceiveMaterialRecord {
  id: string;
  timestamp: string; // Formatting: YYYY-MM-DD HH:mm
  ulp: string;
  pegawaiPenyerah: string;
  petugasPenerima: string;
  materials: Record<string, number>; // Key is material.id, value is qty
  fotoTandaTerima: string; // Base64 data URL
}

export interface MaterialRecord {
  id: string;
  no: number; // Auto increment or row number
  timestamp: string; // Formatting: YYYY-MM-DD HH:mm
  ulp: string;
  posko: string;
  shift: string;
  petugasSerah: string;
  petugasTerima: string;
  materials: Record<string, MaterialUsage>; // Key is material.id
  keterangan: string;
}

export interface UlpOption {
  id: string;
  name: string;
}

export const ULP_OPTIONS = [
  'ULP Bukittinggi',
  'ULP Ambon',
  'ULP Banda',
  'ULP Dobo',
  'ULP Masohi',
  'ULP Namlea',
  'ULP Saparua',
  'ULP Tual',
  'ULP Piru',
  'ULP Kairatu'
];

export interface MappedOption {
  name: string;
  ulp: string;
}

export const DEFAULT_POSKOS_MAPPED: MappedOption[] = [
  { name: 'Posko Bukittinggi Kota', ulp: 'ULP Bukittinggi' },
  { name: 'Posko Baso', ulp: 'ULP Bukittinggi' },
  { name: 'Posko Ambon Kota', ulp: 'ULP Ambon' },
  { name: 'Posko Banda', ulp: 'ULP Banda' },
  { name: 'Posko Dobo', ulp: 'ULP Dobo' },
  { name: 'Posko Masohi', ulp: 'ULP Masohi' },
  { name: 'Posko Namlea', ulp: 'ULP Namlea' },
  { name: 'Posko Saparua', ulp: 'ULP Saparua' },
  { name: 'Posko Tual', ulp: 'ULP Tual' },
  { name: 'Posko Piru', ulp: 'ULP Piru' },
  { name: 'Posko Kairatu', ulp: 'ULP Kairatu' },
  // Generic fallback if not matched
  { name: 'Posko Induk', ulp: '' },
  { name: 'Posko Pelayanan Teknik', ulp: '' }
];

export const DEFAULT_PETUGAS_MAPPED: MappedOption[] = [
  { name: 'Ahmad Dani', ulp: 'ULP Bukittinggi' },
  { name: 'Budi Santoso', ulp: 'ULP Bukittinggi' },
  { name: 'Chandra Wijaya', ulp: 'ULP Ambon' },
  { name: 'Dedi Kusnadi', ulp: 'ULP Ambon' },
  { name: 'Eko Prasetyo', ulp: 'ULP Banda' },
  { name: 'Fahri Hamzah', ulp: 'ULP Dobo' },
  { name: 'Genta Buana', ulp: 'ULP Masohi' },
  { name: 'Hadi Wibowo', ulp: 'ULP Namlea' },
  { name: 'Indra Jaya', ulp: 'ULP Saparua' },
  { name: 'Joni Iskandar', ulp: 'ULP Tual' },
  { name: 'Kurniawan', ulp: 'ULP Piru' },
  { name: 'Lukman Hakim', ulp: 'ULP Kairatu' }
];

export const POSKO_OPTIONS = DEFAULT_POSKOS_MAPPED.map(p => p.name);

export const SHIFT_OPTIONS = [
  'Shift Pagi (08:00 - 16:00)',
  'Shift Sore (16:00 - 00:00)',
  'Shift Malam (00:00 - 08:00)'
];


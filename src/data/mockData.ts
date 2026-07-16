import { MaterialRecord } from '../types';

export const INITIAL_MOCK_RECORDS: MaterialRecord[] = [
  {
    id: 'rec_1',
    no: 1,
    timestamp: '2026-07-12 08:30',
    ulp: 'ULP Ambon',
    posko: 'Posko Induk',
    shift: 'Shift Pagi (08:00 - 16:00)',
    petugasSerah: 'Budi Santoso',
    petugasTerima: 'Andi Wijaya',
    materials: {
      kwh_prabayar: { qty: 2, lokasi: 'Jl. Pattimura No. 12, Ambon' },
      mcb_4a: { qty: 5, lokasi: 'Gardu AM04 & Gardu AM05' },
      mcb_6a: { qty: 3, lokasi: 'Gardu AM04' },
      fuse_10a: { qty: 2, lokasi: 'Feeder Sirimau' },
      nh_100a: { qty: 1, lokasi: 'Gardu Distribusi AM12' },
      kabel_twisted: { qty: 45, lokasi: 'SR Perumahan Poka' },
      strain_clamp: { qty: 4, lokasi: 'Tiang No. 12 - 14 Poka' }
    },
    keterangan: 'Pekerjaan perbaikan saluran rumah (SR) dan penggantian MCB pelanggan prabayar yang rusak.'
  },
  {
    id: 'rec_2',
    no: 2,
    timestamp: '2026-07-13 16:45',
    ulp: 'ULP Namlea',
    posko: 'Posko Pelayanan Teknik',
    shift: 'Shift Sore (16:00 - 00:00)',
    petugasSerah: 'Hasan Basri',
    petugasTerima: 'Faisal Rahman',
    materials: {
      kwh_pascabayar: { qty: 1, lokasi: 'Desa Lala, Namlea' },
      mcb_2a: { qty: 2, lokasi: 'Pelanggan R1/450VA Desa Lala' },
      mcb_10a: { qty: 1, lokasi: 'Kantor Desa Lala' },
      fuse_15a: { qty: 3, lokasi: 'SUTM Feeder Namlea Kota' },
      protective_sleeve: { qty: 5, lokasi: 'Gardu NM03 Desa Jikumerasa' },
      ijuk: { qty: 2, lokasi: 'Pangkal tiang Gardu NM03' }
    },
    keterangan: 'Penanganan gangguan sekring putus Feeder Namlea Kota dan pemasangan pelindung kabel.'
  },
  {
    id: 'rec_3',
    no: 3,
    timestamp: '2026-07-14 01:15',
    ulp: 'ULP Masohi',
    posko: 'Posko B',
    shift: 'Shift Malam (00:00 - 08:00)',
    petugasSerah: 'Rizal Lestaluhu',
    petugasTerima: 'Budi Santoso',
    materials: {
      mcb_6a: { qty: 4, lokasi: 'Jl. Abdullah Soulissa, Masohi' },
      fuse_20a: { qty: 1, lokasi: 'Gardu MS08 Feeder Amahai' },
      nh_160a: { qty: 3, lokasi: 'Gardu MS14 Kota Masohi' },
      cco_16_35: { qty: 6, lokasi: 'Sambungan JTR Jl. Pattimura Masohi' },
      penghalang_panjat: { qty: 1, lokasi: 'Tiang Gardu MS14' }
    },
    keterangan: 'Penggantian NH Fuse Gardu MS14 yang meleleh akibat beban lebih dan pemasangan penghalang panjat binatang.'
  }
];

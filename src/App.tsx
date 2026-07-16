import React, { useState, useEffect } from 'react';
import { MaterialRecord, MATERIAL_LIST, MaterialItem } from './types';
import { INITIAL_MOCK_RECORDS } from './data/mockData';
import Dashboard from './components/Dashboard';
import MaterialForm from './components/MaterialForm';
import MaterialTable from './components/MaterialTable';
import FileManagement from './components/FileManagement';
import ReportPdfModal from './components/ReportPdfModal';
import { 
  FileSpreadsheet, 
  LayoutDashboard, 
  FileEdit, 
  Settings2, 
  Database,
  Layers,
  Menu,
  X,
  CloudOff,
  RefreshCw,
  LogOut,
  CheckCircle,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ChevronRight,
  User,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  fetchRecordsFromSheets, 
  saveRecordsToSheets,
  fetchAllReferenceOptions,
  SheetsReferenceOptions,
  SPREADSHEET_ID,
  SHEET_NAME,
  getGasUrl,
  setGasUrl,
  isGasConfigured,
  fetchDataFromGas,
  saveRecordsToGas
} from './utils/sheets';
import { SPREADSHEET_WEB_APP_URL } from './utils/constants';

export default function App() {
  const [records, setRecords] = useState<MaterialRecord[]>([]);
  
  // Navigation states: 'menu' | 'form' | 'laporan'
  const [currentView, setCurrentView] = useState<'menu' | 'form' | 'laporan'>('menu');
  // Laporan sub-tabs: 'table' | 'dashboard' | 'files'
  const [laporanTab, setLaporanTab] = useState<'table' | 'dashboard' | 'files'>('table');
  
  const [editingRecord, setEditingRecord] = useState<MaterialRecord | null>(null);
  const [activePdfRecord, setActivePdfRecord] = useState<MaterialRecord | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Login States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [username, setUsername] = useState('pln');
  const [password, setPassword] = useState('material');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Google Sheets options states
  const [sheetsOptions, setSheetsOptions] = useState<SheetsReferenceOptions | null>(null);

  // Initial Sync Progress States
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(true);
  const [syncStep, setSyncStep] = useState<string>('Memulai aplikasi...');
  const [syncPercent, setSyncPercent] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // Google Sheets authentication state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSheetsLoading, setIsSheetsLoading] = useState(true);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsSuccessMessage, setSheetsSuccessMessage] = useState<string | null>(null);

  // GAS States
  const [gasUrl, setGasUrlState] = useState<string>('');
  const [isBackendGas, setIsBackendGas] = useState<boolean>(false);

  // Fetch dynamic reference options and records from Google Apps Script (GAS)
  const handleLoadGasData = async (activeGasUrl: string) => {
    setIsSheetsLoading(true);
    setSheetsError(null);
    try {
      const activeMaterialsList = sheetsOptions?.materials || MATERIAL_LIST;
      const { records: gasRecords, options: gasOpts } = await fetchDataFromGas(activeGasUrl, activeMaterialsList);
      setSheetsOptions(gasOpts);
      
      const reindexed = gasRecords.map((rec, index) => ({
        ...rec,
        no: index + 1
      }));
      setRecords(reindexed);
      localStorage.setItem('material_logs', JSON.stringify(reindexed));
      setSheetsSuccessMessage('Berhasil menyinkronkan data & opsi referensi via Google Apps Script (GAS)!');
      setTimeout(() => setSheetsSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Gagal menyinkronkan data via GAS. Pastikan Web App URL Anda aktif.');
      
      // Fallback to localStorage on fetch failure so the app remains usable
      const localData = localStorage.getItem('material_logs');
      if (localData) {
        try {
          setRecords(JSON.parse(localData));
        } catch (e) {
          setRecords(INITIAL_MOCK_RECORDS);
        }
      } else {
        setRecords(INITIAL_MOCK_RECORDS);
      }
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Synchronize with database on start / retry
  const syncDatabaseCloud = async () => {
    setIsSheetsLoading(true);
    setSyncStatus('loading');
    setSheetsError(null);
    
    try {
      setSyncStep('Memeriksa status server backend PLN...');
      setSyncPercent(15);
      await new Promise(r => setTimeout(r, 450)); // Smooth entry transition

      let gasActive = false;
      let gasUrlToUse = '';
      let backendActive = false;

      try {
        const res = await fetch('/api/gas-config');
        if (res.ok) {
          const config = await res.json();
          if (config.configured) {
            backendActive = true;
            gasActive = true;
            setIsBackendGas(true);
            gasUrlToUse = '/api/gas';
          }
        }
      } catch (err) {
        console.warn('Backend proxy tidak terdeteksi atau bermasalah. Mencoba koneksi langsung...', err);
      }

      // Fallback: If backend proxy is not active/fails, try using direct client-side SPREADSHEET_WEB_APP_URL
      if (!backendActive) {
        if (SPREADSHEET_WEB_APP_URL && SPREADSHEET_WEB_APP_URL.startsWith('https://script.google.com')) {
          gasActive = true;
          setIsBackendGas(false);
          gasUrlToUse = SPREADSHEET_WEB_APP_URL;
          console.log('Berhasil beralih ke koneksi langsung ke Google Apps Script:', SPREADSHEET_WEB_APP_URL);
        }
      }

      if (gasActive && gasUrlToUse) {
        setSyncStep('Mengunduh konfigurasi Google Apps Script...');
        setSyncPercent(35);
        await new Promise(r => setTimeout(r, 300));

        setGasUrlState(gasUrlToUse);
        
        setSyncStep('Menghubungkan ke Google Sheets Cloud PLN...');
        setSyncPercent(55);
        await new Promise(r => setTimeout(r, 300));
        
        setSyncStep('Menyinkronkan data riwayat & opsi referensi petugas...');
        setSyncPercent(75);
        
        // Directly load data from GAS
        const activeMaterialsList = sheetsOptions?.materials || MATERIAL_LIST;
        const { records: gasRecords, options: gasOpts } = await fetchDataFromGas(gasUrlToUse, activeMaterialsList);
        setSheetsOptions(gasOpts);
        
        const reindexed = gasRecords.map((rec, index) => ({
          ...rec,
          no: index + 1
        }));
        
        setSyncStep('Menyimpan data sinkronisasi ke penyimpanan aman...');
        setSyncPercent(95);
        setRecords(reindexed);
        localStorage.setItem('material_logs', JSON.stringify(reindexed));
        await new Promise(r => setTimeout(r, 300));
        
        setSyncStep('Selesai! Membuka portal utama...');
        setSyncPercent(100);
        setSyncStatus('success');
        await new Promise(r => setTimeout(r, 500));
        setIsInitialSyncing(false);
      } else {
        throw new Error('Google Apps Script Web App URL (GAS_URL) tidak terkonfigurasi. Sila tambahkan ke .env atau src/utils/constants.ts.');
      }
    } catch (err: any) {
      console.error('Gagal menyelaraskan koneksi database cloud:', err);
      setSheetsError(err.message || 'Gagal menyelaraskan koneksi database cloud.');
      setSyncStatus('error');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Load initial data on mount
  useEffect(() => {
    syncDatabaseCloud();
  }, []);

  // Google Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsLoggedIn(true);
        setSheetsSuccessMessage('Google Sheets Terkoneksi!');
        setTimeout(() => setSheetsSuccessMessage(null), 4000);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Fetch dynamic reference options and records when token changes
  const handleLoadSheetsData = async (activeToken: string) => {
    if (gasUrl) return; // Skip if GAS is active
    setIsSheetsLoading(true);
    setSheetsError(null);
    try {
      const opts = await fetchAllReferenceOptions(activeToken);
      setSheetsOptions(opts);
      
      const sheetsRecords = await fetchRecordsFromSheets(activeToken, opts.materials);
      const reindexed = sheetsRecords.map((rec, index) => ({
        ...rec,
        no: index + 1
      }));
      setRecords(reindexed);
      localStorage.setItem('material_logs', JSON.stringify(reindexed));
      setSheetsSuccessMessage('Berhasil menyinkronkan data & opsi referensi dari Google Sheets!');
      setTimeout(() => setSheetsSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError('Koneksi sukses, namun gagal menyelaraskan opsi. Menggunakan data cadangan lokal.');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  useEffect(() => {
    if (token && !gasUrl) {
      handleLoadSheetsData(token);
    } else if (!gasUrl) {
      setSheetsOptions(null);
    }
  }, [token, gasUrl]);

  // Pull data from Google Sheets manually
  const handlePullFromSheets = async (activeToken?: string) => {
    const activeGasUrl = gasUrl;
    if (activeGasUrl) {
      setIsSheetsLoading(true);
      setSheetsError(null);
      setSheetsSuccessMessage(null);
      try {
        const activeMaterialsList = sheetsOptions?.materials || MATERIAL_LIST;
        const { records: gasRecords, options: gasOpts } = await fetchDataFromGas(activeGasUrl, activeMaterialsList);
        setSheetsOptions(gasOpts);
        const reindexed = gasRecords.map((rec, index) => ({
          ...rec,
          no: index + 1
        }));
        setRecords(reindexed);
        localStorage.setItem('material_logs', JSON.stringify(reindexed));
        setSheetsSuccessMessage('Berhasil menarik data terbaru via Google Apps Script (GAS)!');
        setTimeout(() => setSheetsSuccessMessage(null), 4000);
      } catch (err: any) {
        console.error(err);
        setSheetsError(err.message || 'Gagal menarik data melalui GAS.');
      } finally {
        setIsSheetsLoading(false);
      }
      return;
    }

    const currentToken = activeToken || token;
    if (!currentToken) return;

    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccessMessage(null);
    try {
      const activeMaterialsList = sheetsOptions?.materials || MATERIAL_LIST;
      const sheetsRecords = await fetchRecordsFromSheets(currentToken, activeMaterialsList);
      const reindexed = sheetsRecords.map((rec, index) => ({
        ...rec,
        no: index + 1
      }));
      setRecords(reindexed);
      localStorage.setItem('material_logs', JSON.stringify(reindexed));
      setSheetsSuccessMessage('Berhasil menarik data terbaru dari Google Sheets!');
      setTimeout(() => setSheetsSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Gagal menarik data dari Google Sheets.');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Push data to Google Sheets manually
  const handlePushToSheets = async (recordsToPush?: MaterialRecord[]) => {
    const activeGasUrl = gasUrl;
    const dataToPush = recordsToPush || records;
    const activeMaterialsList = sheetsOptions?.materials || MATERIAL_LIST;

    if (activeGasUrl) {
      setIsSheetsLoading(true);
      setSheetsError(null);
      setSheetsSuccessMessage(null);
      try {
        await saveRecordsToGas(dataToPush, activeGasUrl, activeMaterialsList);
        setSheetsSuccessMessage('Data berhasil dikirim dan disinkronkan ke Spreadsheet via GAS!');
        setTimeout(() => setSheetsSuccessMessage(null), 4000);
      } catch (err: any) {
        console.error(err);
        setSheetsError(err.message || 'Gagal mengirim data melalui GAS.');
      } finally {
        setIsSheetsLoading(false);
      }
      return;
    }

    const currentToken = token;
    if (!currentToken) return;

    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccessMessage(null);
    try {
      await saveRecordsToSheets(dataToPush, currentToken, activeMaterialsList);
      setSheetsSuccessMessage('Data berhasil diunggah dan disinkronkan ke Google Sheets!');
      setTimeout(() => setSheetsSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Gagal mengirim data ke Google Sheets.');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Google Sign-In with popup
  const handleGoogleSignIn = async () => {
    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccessMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setIsLoggedIn(true);
        sessionStorage.setItem('pln_logged_in', 'true');
        setSheetsSuccessMessage('Selamat! Anda berhasil terhubung ke Google Sheets.');
        setTimeout(() => setSheetsSuccessMessage(null), 4000);
        await handleLoadSheetsData(res.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      const errStr = String(err.message || err.code || err);
      if (errStr.includes('popup-closed-by-user') || errStr.includes('cancelled-popup-request') || errStr.includes('popup_closed_by_user')) {
        setSheetsError(
          'Jendela popup login ditutup atau diblokir browser. Silakan klik tombol "Buka di Tab Baru" di kanan atas panel jika Anda membukanya di dalam pratinjau AI Studio agar popup login Google dapat berjalan lancar.'
        );
      } else {
        setSheetsError(err.message || 'Gagal terhubung dengan akun Google. Pastikan pop-up diizinkan.');
      }
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Disconnect Google Sheets (Logout)
  const handleGoogleLogout = async () => {
    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccessMessage(null);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSheetsOptions(null);
      setSheetsSuccessMessage('Berhasil memutuskan koneksi Google Sheets.');
      setTimeout(() => setSheetsSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Gagal memutuskan koneksi.');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  // Save records to localStorage helper
  const saveRecordsToDB = (updatedList: MaterialRecord[]) => {
    const reindexed = updatedList.map((rec, index) => ({
      ...rec,
      no: index + 1
    }));
    setRecords(reindexed);
    localStorage.setItem('material_logs', JSON.stringify(reindexed));

    if (gasUrl || token) {
      handlePushToSheets(reindexed);
    }
  };

  // Create or Update Record
  const handleSaveRecord = (recordData: Omit<MaterialRecord, 'no'>) => {
    let savedRecord: MaterialRecord;
    if (editingRecord) {
      savedRecord = {
        ...recordData,
        no: editingRecord.no
      };
      const updatedList = records.map(r => r.id === recordData.id ? savedRecord : r);
      saveRecordsToDB(updatedList);
      setEditingRecord(null);
    } else {
      savedRecord = {
        ...recordData,
        no: records.length + 1
      };
      saveRecordsToDB([...records, savedRecord]);
    }

    // Set active pdf record to show the custom print report with PDF feature immediately!
    setActivePdfRecord(savedRecord);

    // Automatically route to table view inside Laporan Material to inspect changes
    setCurrentView('laporan');
    setLaporanTab('table');
  };

  // Delete Record
  const handleDeleteRecord = (id: string) => {
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus data ini?');
    if (!confirmed) return;
    const filtered = records.filter(r => r.id !== id);
    saveRecordsToDB(filtered);
  };

  // Edit Trigger
  const handleEditRecord = (record: MaterialRecord) => {
    setEditingRecord(record);
    setCurrentView('form');
  };

  // Import CSV callback
  const handleImportRecords = (newRecords: MaterialRecord[], append: boolean) => {
    if (append) {
      saveRecordsToDB([...records, ...newRecords]);
    } else {
      saveRecordsToDB(newRecords);
    }
    setCurrentView('laporan');
    setLaporanTab('table');
  };

  // Clear All
  const handleClearAll = () => {
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus semua data? Tindakan ini tidak dapat dibatalkan.');
    if (!confirmed) return;

    setRecords([]);
    localStorage.removeItem('material_logs');

    if (gasUrl || token) {
      handlePushToSheets([]);
    }
  };

  // Handle standard PLN user login
  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'pln' && password === 'material') {
      setIsLoggedIn(true);
      setLoginError(null);
      sessionStorage.setItem('pln_logged_in', 'true');
    } else {
      setLoginError('ID Petugas atau PIN yang Anda masukkan salah. Gunakan ID demo: "pln" & PIN: "material"');
    }
  };

  // Logout system
  const handleSystemLogout = () => {
    const confirmLogout = window.confirm('Apakah Anda yakin ingin mereset sesi dan keluar dari koneksi Google?');
    if (!confirmLogout) return;
    sessionStorage.removeItem('pln_logged_in');
    handleGoogleLogout();
    setCurrentView('menu');
  };

  // Active custom lists to feed form/table
  const activeMaterialsList = sheetsOptions?.materials || MATERIAL_LIST;
  const activeUlpList = sheetsOptions?.ulp || null;
  const activePoskoList = sheetsOptions?.posko || null;
  const activeShiftList = sheetsOptions?.shift || null;
  const activePetugasList = sheetsOptions?.petugas || null;

  if (isInitialSyncing) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Decorative ambient background elements */}
        <div className="absolute top-0 left-0 -translate-x-12 -translate-y-12 w-96 h-96 bg-[#007491]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 translate-x-12 translate-y-12 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative z-10 space-y-8 text-center animate-fade-in">
          {/* Logo Brand Name */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg relative overflow-hidden shrink-0 select-none animate-pulse">
              <span>PLN</span>
              <div className="absolute right-0 top-0 w-3 h-full bg-cyan-700/20 transform rotate-12"></div>
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-display tracking-tight text-white flex items-center justify-center gap-2">
                LOGIMAT PLN
                <span className="text-[10px] bg-yellow-400 text-slate-950 font-extrabold px-1.5 py-0.5 rounded-sm tracking-wider uppercase">
                  v2.1
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">Sistem Rekapitulasi Real-Time Material Lapangan</p>
            </div>
          </div>

          {/* Sync Progress Indicator */}
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-slate-300 flex items-center gap-1.5 min-w-0 truncate">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400 shrink-0" />
                <span className="truncate">{syncStep}</span>
              </span>
              <span className="text-cyan-400 font-mono shrink-0 ml-2">{syncPercent}%</span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full h-2.5 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/30">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 via-[#007491] to-yellow-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(34,211,238,0.3)]"
                style={{ width: `${syncPercent}%` }}
              ></div>
            </div>

            {/* Status indicators */}
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
              <Database className="h-3.5 w-3.5 text-cyan-500/70" />
              <span>Menghubungkan langsung ke Google Sheets PLN Cloud...</span>
            </div>
          </div>

          {/* Fallback & Error Handling */}
          {syncStatus === 'error' ? (
            <div className="bg-rose-950/40 border border-rose-800/50 p-4 rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5 text-left text-xs text-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold">Gagal Terhubung ke Database Cloud</p>
                  <p className="text-[11px] text-rose-300/90 mt-1 leading-relaxed break-words">
                    {sheetsError || 'Pastikan server backend atau GAS_URL aktif.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    syncDatabaseCloud();
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Coba Lagi
                </button>
                <button
                  onClick={() => {
                    // Force skip to local/offline data
                    const localData = localStorage.getItem('material_logs');
                    if (localData) {
                      try {
                        setRecords(JSON.parse(localData));
                      } catch (e) {
                        setRecords(INITIAL_MOCK_RECORDS);
                      }
                    } else {
                      setRecords(INITIAL_MOCK_RECORDS);
                    }
                    setIsInitialSyncing(false);
                  }}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Mode Offline (Lokal)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 border-t border-slate-700/40 pt-4 leading-relaxed">
              Teknologi sinkronisasi otomatis Cloud PLN. Mengabaikan penyimpanan lokal sebagai sumber utama demi akurasi data kerja tim di lapangan.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* PLN Iconic Top Header Brand */}
      <header className="bg-[#007491] text-white border-b border-cyan-800 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            
            {/* Logo Brand Name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-slate-900 shadow-sm relative overflow-hidden shrink-0 select-none">
                <span className="text-sm tracking-tighter">PLN</span>
                <div className="absolute right-0 top-0 w-2 h-full bg-cyan-700/20 transform rotate-12"></div>
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                  LOGIMAT PLN
                  <span className="text-[9px] bg-yellow-400 text-slate-950 font-extrabold px-1.5 py-0.5 rounded-sm tracking-wider uppercase">
                    v2.1
                  </span>
                </h1>
                <p className="text-[10px] text-cyan-200">Aplikasi Input Penggunaan Material Kerja Lapangan</p>
              </div>
            </div>

            {/* Header Right user menu / logout */}
            <div className="flex items-center gap-3">
              {/* Back to main menu helper */}
              {currentView !== 'menu' && (
                <button
                  onClick={() => {
                    setCurrentView('menu');
                    setEditingRecord(null);
                  }}
                  className="hidden sm:flex items-center gap-1.5 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-100 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border border-cyan-700/30"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Menu Utama
                </button>
              )}

              {user && (
                <div className="hidden md:flex items-center gap-2 bg-cyan-950/20 px-3 py-1.5 rounded-lg text-xs text-white border border-cyan-700/20">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-5 h-5 rounded-full shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                  <span className="font-semibold">{user.displayName || 'Google User'}</span>
                </div>
              )}

              <button
                onClick={handleSystemLogout}
                className="flex items-center gap-1.5 bg-rose-600/80 hover:bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer transition-colors"
                title="Keluar Aplikasi"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>

              {/* Mobile menu trigger */}
              {currentView === 'laporan' && (
                <div className="flex md:hidden">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-cyan-100 hover:text-white hover:bg-cyan-800 rounded-lg focus:outline-none cursor-pointer"
                  >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Sub-navigation for reports view */}
      {currentView === 'laporan' && (
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1 py-2 items-center justify-between">
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setCurrentView('menu');
                    setEditingRecord(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Menu
                </button>

                <button
                  onClick={() => setLaporanTab('table')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    laporanTab === 'table'
                      ? 'bg-blue-50 text-blue-700 shadow-3xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Tabel Rekapitulasi ({activeMaterialsList.length * 2 + 7} Kolom)
                </button>

                <button
                  onClick={() => setLaporanTab('dashboard')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    laporanTab === 'dashboard'
                      ? 'bg-blue-50 text-blue-700 shadow-3xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Visualisasi & Analisis
                </button>

                <button
                  onClick={() => setLaporanTab('files')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    laporanTab === 'files'
                      ? 'bg-blue-50 text-blue-700 shadow-3xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Settings2 className="h-4 w-4" />
                  Ekspor & Impor (Excel/CSV)
                </button>
              </div>

              <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg text-slate-500 font-mono font-semibold">
                Total: {records.length} Rekor
              </div>
            </nav>

            {/* Mobile Expanded Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden py-3 border-t border-slate-100 space-y-1 animate-fade-in">
                <button
                  onClick={() => {
                    setCurrentView('menu');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Menu Utama
                </button>

                <button
                  onClick={() => {
                    setLaporanTab('table');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
                    laporanTab === 'table' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Tabel Rekapitulasi
                </button>

                <button
                  onClick={() => {
                    setLaporanTab('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
                    laporanTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Visualisasi & Analisis
                </button>

                <button
                  onClick={() => {
                    setLaporanTab('files');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
                    laporanTab === 'files' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                  }`}
                >
                  <Settings2 className="h-4 w-4" />
                  Ekspor & Impor (Excel/CSV)
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Google Sheets / GAS Connection Banner */}
      {(gasUrl || token || isSheetsLoading) && (
        <div className="bg-white border-b border-slate-200 py-3 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {gasUrl ? (
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Database className="h-5 w-5" />
                  </div>
                ) : token ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Database className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <CloudOff className="h-5 w-5" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${gasUrl || token ? 'bg-emerald-500 animate-pulse' : (isSheetsLoading ? 'bg-blue-500 animate-pulse' : 'bg-slate-400')}`}></span>
                    <h4 className="text-sm font-bold text-slate-800">
                      {gasUrl ? 'Koneksi Otomatis Aktif (Google Apps Script)' : (token ? 'Koneksi Google Sheets Aktif' : (isSheetsLoading ? 'Menghubungkan ke Database...' : 'Mode Offline'))}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {gasUrl ? 'Sinkronisasi dua arah real-time dengan Spreadsheet Cloud PLN aktif.' : (token ? 'Terhubung dengan akun Google Sheets Anda.' : (isSheetsLoading ? 'Menyelaraskan data dan opsi referensi...' : 'Menggunakan penyimpanan lokal browser.'))}
                  </p>
                </div>
              </div>

              <div className="flex-items-center gap-2 w-full sm:w-auto justify-end flex">
                {isSheetsLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Memproses...</span>
                  </div>
                )}

                {(gasUrl || token) && (
                  <>
                    <button
                      onClick={() => handlePullFromSheets()}
                      disabled={isSheetsLoading}
                      className="flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      title="Tarik Data Terkini dari Google Sheets / GAS"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      Tarik (Pull)
                    </button>

                    <button
                      onClick={() => handlePushToSheets()}
                      disabled={isSheetsLoading}
                      className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      title="Kirim Data Lokal ke Google Sheets / GAS"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      Kirim (Push)
                    </button>
                  </>
                )}

                {token && !gasUrl && (
                  <button
                    onClick={handleGoogleLogout}
                    disabled={isSheetsLoading}
                    className="flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Disconnect OAuth
                  </button>
                )}
              </div>

            </div>

            {/* Messages Alert overlay */}
            {(sheetsError || sheetsSuccessMessage) && (
              <div className="mt-3 animate-fade-in">
                {sheetsError && (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-lg text-xs font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{sheetsError}</span>
                  </div>
                )}
                {sheetsSuccessMessage && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-xs font-medium">
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{sheetsSuccessMessage}</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="animate-fade-in">
            
            {/* VIEW 1: MAIN MENU */}
            {currentView === 'menu' && (
              <div className="space-y-8 py-4">
                
                {/* Hero Greeting Panel */}
                <div className="bg-gradient-to-r from-blue-900 to-cyan-800 text-white rounded-3xl p-8 shadow-md relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="max-w-xl space-y-3 relative z-10">
                    <span className="text-[10px] bg-yellow-400 text-slate-950 font-bold uppercase px-2.5 py-1 rounded-full">
                      PT PLN PERSERO • PORTAL UTAMA
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
                      Selamat Datang di LOGIMAT PLN
                    </h2>
                    <p className="text-sm text-cyan-100 leading-relaxed">
                      Sistem rekapitulasi real-time penggunaan material lapangan. Kelola data serah terima shift secara akurat, terstruktur, dan terintegrasi langsung dengan database Google Sheets pusat.
                    </p>
                  </div>
                </div>

                {/* Main Action Menu (Bento Cards) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-4">PILIH MENU UTAMA</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Card 1: INPUT MATERIAL */}
                    <button
                      onClick={() => {
                        setEditingRecord(null);
                        setCurrentView('form');
                      }}
                      className="group bg-white border border-slate-200 hover:border-blue-400 p-8 rounded-3xl text-left shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-64 cursor-pointer"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-blue-50 text-[#007491] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FileEdit className="h-6 w-6" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                            INPUT DATA MATERIAL
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1.5 transition-transform" />
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Formulir serah terima material kerja yang dioptimalkan sepenuhnya untuk perangkat handphone / mobile. Lengkapi jumlah terpasang dan koordinat lokasi secara real-time.
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] text-[#007491] font-bold tracking-wider uppercase bg-blue-50/50 self-start px-3 py-1 rounded-full">
                        Formulir Mobile-Ready
                      </div>
                    </button>

                    {/* Card 2: LAPORAN MATERIAL */}
                    <button
                      onClick={() => {
                        setCurrentView('laporan');
                        setLaporanTab('table');
                      }}
                      className="group bg-white border border-slate-200 hover:border-emerald-400 p-8 rounded-3xl text-left shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-64 cursor-pointer"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                            LAPORAN & ANALISIS
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1.5 transition-transform" />
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Kelola data rekapitulasi material ({activeMaterialsList.length * 2 + 7} kolom). Visualisasikan grafik distribusi penggunaan material dan unduh file rekapitulasi Excel / TSV secara praktis.
                          </p>
                        </div>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold tracking-wider uppercase bg-emerald-50/50 self-start px-3 py-1 rounded-full">
                        {records.length} Laporan Terdaftar
                      </div>
                    </button>

                  </div>
                </div>

                {/* Quick Info & Reference Options Status */}
                <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-xs">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Status Referensi Database Terkoneksi</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-0.5">Unit (ULP)</span>
                      <strong className="text-slate-700 block">
                        {activeUlpList ? `${activeUlpList.length} Pilihan` : '9 Pilihan (Default)'}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-0.5">Posko</span>
                      <strong className="text-slate-700 block">
                        {activePoskoList ? `${activePoskoList.length} Pilihan` : '6 Pilihan (Default)'}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-0.5">Petugas</span>
                      <strong className="text-slate-700 block">
                        {activePetugasList ? `${activePetugasList.length} Nama` : 'Bebas Ketik'}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block mb-0.5">Jenis Material</span>
                      <strong className="text-slate-700 block">
                        {activeMaterialsList.length} Item
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block mb-0.5">Status Cloud</span>
                      <span className={`inline-flex items-center gap-1 font-bold ${token ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {token ? 'Synchronized' : 'Local Only'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 2: INPUT FORM */}
            {currentView === 'form' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setCurrentView('menu');
                      setEditingRecord(null);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Menu Utama
                  </button>
                  <span className="text-xs text-slate-400">Mode: {editingRecord ? 'Edit Laporan' : 'Laporan Baru'}</span>
                </div>
                
                <MaterialForm 
                  editingRecord={editingRecord} 
                  onSave={handleSaveRecord}
                  onCancelEdit={() => {
                    setEditingRecord(null);
                    setCurrentView('menu');
                  }}
                  materialsList={activeMaterialsList}
                  ulpOptions={activeUlpList}
                  poskoOptions={activePoskoList}
                  shiftOptions={activeShiftList}
                  petugasOptions={activePetugasList}
                />
              </div>
            )}

            {/* VIEW 3: REPORTS & REKAPITULASI (With Sub-tabs) */}
            {currentView === 'laporan' && (
              <div className="space-y-6">
                
                {laporanTab === 'dashboard' && (
                  <Dashboard records={records} materialsList={activeMaterialsList} />
                )}

                {laporanTab === 'table' && (
                  <MaterialTable 
                    records={records} 
                    onEdit={handleEditRecord} 
                    onDelete={handleDeleteRecord} 
                    materialsList={activeMaterialsList}
                    onViewPdf={setActivePdfRecord}
                  />
                )}

                {laporanTab === 'files' && (
                  <FileManagement 
                    records={records} 
                    onImport={handleImportRecords} 
                    onClearAll={handleClearAll} 
                    materialsList={activeMaterialsList}
                  />
                )}

              </div>
            )}

          </div>

        </div>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[11px] text-slate-400 shrink-0 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            © 2026 PT PLN (Persero) Unit Induk Wilayah. Hak Cipta Dilindungi.
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Database className="h-3 w-3 text-slate-300" />
            Penyimpanan: {gasUrl ? 'Google Apps Script Cloud DB' : (token ? 'Google Sheets OAuth DB' : 'Penyimpanan Lokal Aktif (Browser)')}
          </span>
        </div>
      </footer>

      {activePdfRecord && (
        <ReportPdfModal 
          record={activePdfRecord} 
          onClose={() => setActivePdfRecord(null)} 
          materialsList={activeMaterialsList}
        />
      )}

    </div>
  );
}


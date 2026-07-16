import React, { useState, useEffect } from 'react';
import { MaterialRecord, MATERIAL_LIST, MaterialItem } from './types';
import { INITIAL_MOCK_RECORDS } from './data/mockData';
import Dashboard from './components/Dashboard';
import MaterialForm from './components/MaterialForm';
import MaterialTable from './components/MaterialTable';
import FileManagement from './components/FileManagement';
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

export default function App() {
  const [records, setRecords] = useState<MaterialRecord[]>([]);
  
  // Navigation states: 'menu' | 'form' | 'laporan'
  const [currentView, setCurrentView] = useState<'menu' | 'form' | 'laporan'>('menu');
  // Laporan sub-tabs: 'table' | 'dashboard' | 'files'
  const [laporanTab, setLaporanTab] = useState<'table' | 'dashboard' | 'files'>('table');
  
  const [editingRecord, setEditingRecord] = useState<MaterialRecord | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Login States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [username, setUsername] = useState('pln');
  const [password, setPassword] = useState('material');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Google Sheets options states
  const [sheetsOptions, setSheetsOptions] = useState<SheetsReferenceOptions | null>(null);

  // Google Sheets authentication state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSheetsLoading, setIsSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsSuccessMessage, setSheetsSuccessMessage] = useState<string | null>(null);

  // GAS States
  const [gasUrl, setGasUrlState] = useState<string>(() => getGasUrl());
  const [showGasModal, setShowGasModal] = useState<boolean>(false);
  const [inputGasUrl, setInputGasUrl] = useState<string>(() => getGasUrl());
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
      setSheetsError(err.message || 'Gagal menyinkronkan data via GAS. Pastikan Web App URL Anda aktif dan mengizinkan CORS.');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleSaveGasConfig = async (url: string) => {
    setIsSheetsLoading(true);
    setSheetsError(null);
    setSheetsSuccessMessage(null);
    try {
      const activeMaterialsList = sheetsOptions?.materials || MATERIAL_LIST;
      const { records: gasRecords, options: gasOpts } = await fetchDataFromGas(url, activeMaterialsList);
      
      // If success, save
      setGasUrl(url);
      setGasUrlState(url);
      setSheetsOptions(gasOpts);
      
      const reindexed = gasRecords.map((rec, index) => ({
        ...rec,
        no: index + 1
      }));
      setRecords(reindexed);
      localStorage.setItem('material_logs', JSON.stringify(reindexed));
      
      setSheetsSuccessMessage('Berhasil mengonfigurasi dan terhubung ke Spreadsheet melalui GAS!');
      setTimeout(() => setSheetsSuccessMessage(null), 4000);
      setShowGasModal(false);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Gagal memvalidasi Web App URL GAS. Silakan periksa kembali URL Anda.');
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleDisconnectGas = () => {
    setGasUrl('');
    setGasUrlState('');
    setInputGasUrl('');
    setSheetsOptions(null);
    setSheetsSuccessMessage('Koneksi GAS diputuskan. Kembali ke penyimpanan offline.');
    setTimeout(() => setSheetsSuccessMessage(null), 4000);
  };

  // Load initial data on mount
  useEffect(() => {
    const localData = localStorage.getItem('material_logs');
    if (localData) {
      try {
        setRecords(JSON.parse(localData));
      } catch (err) {
        console.error('Error parsing material records from localStorage:', err);
        setRecords(INITIAL_MOCK_RECORDS);
        localStorage.setItem('material_logs', JSON.stringify(INITIAL_MOCK_RECORDS));
      }
    } else {
      setRecords(INITIAL_MOCK_RECORDS);
      localStorage.setItem('material_logs', JSON.stringify(INITIAL_MOCK_RECORDS));
    }

    // Check if backend has GAS_URL configured
    const checkGasBackend = async () => {
      try {
        const res = await fetch('/api/gas-config');
        if (res.ok) {
          const config = await res.json();
          if (config.configured) {
            setIsBackendGas(true);
            setGasUrlState('/api/gas');
            await handleLoadGasData('/api/gas');
            return;
          }
        }
      } catch (err) {
        console.error('Gagal memeriksa konfigurasi GAS backend:', err);
      }

      // Fallback: Auto-load from localStorage GAS if configured
      const activeGasUrl = getGasUrl();
      if (activeGasUrl) {
        handleLoadGasData(activeGasUrl);
      }
    };

    checkGasBackend();
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
    if (editingRecord) {
      const updatedList = records.map(r => r.id === recordData.id ? { ...r, ...recordData } : r);
      saveRecordsToDB(updatedList);
      setEditingRecord(null);
    } else {
      const newRecord: MaterialRecord = {
        ...recordData,
        no: records.length + 1
      };
      saveRecordsToDB([...records, newRecord]);
    }
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
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${gasUrl ? 'bg-blue-500 animate-pulse' : token ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  <h4 className="text-sm font-bold text-slate-800">
                    {gasUrl ? 'Koneksi Database GAS Aktif' : token ? 'Koneksi Google Sheets Aktif' : 'Penyimpanan Offline (Lokal)'}
                  </h4>
                </div>
                {gasUrl ? (
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
                    {isBackendGas ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        ⚡ Google Apps Script Terintegrasi Server (Backend Proxy)
                      </span>
                    ) : (
                      <>URL GAS: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono break-all select-all">{gasUrl}</code></>
                    )}
                  </p>
                ) : token ? (
                  <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                    Spreadsheet ID: 
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono inline-flex items-center gap-0.5"
                    >
                      {SPREADSHEET_ID.substring(0, 10)}...{SPREADSHEET_ID.substring(SPREADSHEET_ID.length - 6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Koneksikan ke Google Apps Script (GAS) Web App untuk sinkronisasi otomatis instan tanpa login manual.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

              <button
                onClick={() => setShowGasModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Konfigurasi GAS
              </button>

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
            Penyimpanan: {gasUrl ? 'Google Apps Script Cloud DB' : (token ? 'Google Sheets OAuth DB' : 'Client LocalStorage (Offline)')}
          </span>
        </div>
      </footer>

      {/* Google Apps Script (GAS) Setup Modal */}
      {showGasModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-fade-in border border-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Konfigurasi Database Spreadsheet (GAS)</h3>
                  <p className="text-[11px] text-slate-500">Hubungkan database spreadsheet instan tanpa login berulang.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGasModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-600">
              {/* URL Input Form */}
              {isBackendGas ? (
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl space-y-2 text-emerald-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <strong className="text-xs font-bold uppercase tracking-wider">Koneksi Backend Aktif</strong>
                  </div>
                  <p className="text-xs leading-relaxed font-medium">
                    Konfigurasi Google Apps Script (GAS) telah tertanam langsung pada server backend secara aman. Data Anda akan disinkronkan secara otomatis melalui rute backend tanpa memerlukan pengisian URL manual atau penyimpanan data sensitif di sisi browser Anda.
                  </p>
                  <div className="pt-2 text-slate-400 font-mono text-[11px]">
                    Endpoint Proxy: <code className="bg-white/70 px-1 py-0.5 rounded border border-emerald-200 text-emerald-800">/api/gas</code>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Google Apps Script Web App URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={inputGasUrl}
                      onChange={(e) => setInputGasUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    {gasUrl && (
                      <button
                        onClick={handleDisconnectGas}
                        className="px-4 py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold transition-all cursor-pointer"
                      >
                        Putuskan Koneksi (Disconnect)
                      </button>
                    )}
                    <button
                      onClick={() => handleSaveGasConfig(inputGasUrl)}
                      disabled={isSheetsLoading || !inputGasUrl}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSheetsLoading ? 'Menghubungkan...' : 'Simpan & Tes Koneksi'}
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block"></span>
                  Langkah-Langkah Setup Google Apps Script (Hanya 2 Menit):
                </h4>
                <ol className="list-decimal pl-5 space-y-2.5 text-slate-600">
                  <li>Buka Google Spreadsheet target Anda (Disarankan gunakan ID: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono select-all text-[11px]">{SPREADSHEET_ID}</code>).</li>
                  <li>Di menu atas, pilih **Ekstensi** (Extensions) &gt; **Apps Script**.</li>
                  <li>Hapus seluruh kode bawaan yang ada di editor, lalu salin dan tempel kode di bawah ini.</li>
                  <li>Di kanan atas, klik **Terapkan** (Deploy) &gt; **Penerapan Baru** (New deployment).</li>
                  <li>Klik ikon gerigi di sebelah "Pilih jenis" dan pilih **Aplikasi Web** (Web app).</li>
                  <li>Ubah pengaturan konfigurasi berikut:
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-500">
                      <li>*Deskripsi:* Database PLN Material</li>
                      <li>*Jalankan sebagai (Execute as):* **Saya (Email Anda)**</li>
                      <li>*Siapa yang memiliki akses (Who has access):* **Siapa saja (Anyone)**</li>
                    </ul>
                  </li>
                  <li>Klik **Terapkan** (Deploy), setujui otorisasi akun Google Anda jika diminta (klik Advanced &gt; Go to Untitled project &gt; Allow).</li>
                  <li>Salin **URL Aplikasi Web** yang diberikan, lalu tempel pada input form di atas dan klik **Simpan & Tes Koneksi**!</li>
                </ol>
              </div>

              {/* Code block copy section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Kode Apps Script (Salin Semua):</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                      alert('Kode Apps Script berhasil disalin ke clipboard!');
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Salin Kode
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl overflow-x-auto text-[10px] font-mono leading-relaxed max-h-56">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const GOOGLE_APPS_SCRIPT_CODE = `// KODE GOOGLE APPS SCRIPT (GAS) UNTUK INTEGRASI DATABASE SPREADSHEET
// -------------------------------------------------------------
// Salin semua kode ini dan tempelkan di editor Apps Script Anda.
// Lalu terapkan (deploy) sebagai "Web App" (Aplikasi Web).

const SPREADSHEET_ID = "${SPREADSHEET_ID}";

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Inisialisasi sheet jika belum lengkap
  ensureAndInitializeSheets(ss);
  
  if (action === "readAll" || !action) {
    const data = {
      records: fetchSheetValues(ss, "DATA"),
      ulp: fetchSheetValues(ss, "ULP"),
      posko: fetchSheetValues(ss, "POSKO"),
      shift: fetchSheetValues(ss, "SHIFT"),
      petugas: fetchSheetValues(ss, "PETUGAS"),
      material: fetchSheetValues(ss, "MATERIAL")
    };
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi tidak valid" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (action === "writeRecords") {
      const records = postData.records;
      const sheet = ss.getSheetByName("DATA") || ss.insertSheet("DATA");
      sheet.clearContents();
      
      if (records && records.length > 0) {
        sheet.getRange(1, 1, records.length, records[0].length).setValues(records);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data berhasil ditulis" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi tidak valid" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function fetchSheetValues(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  if (!range) return [];
  return range.getValues();
}

function ensureAndInitializeSheets(ss) {
  const requiredSheets = ["DATA", "ULP", "POSKO", "PETUGAS", "MATERIAL", "SHIFT"];
  for (let i = 0; i < requiredSheets.length; i++) {
    const title = requiredSheets[i];
    let sheet = ss.getSheetByName(title);
    if (!sheet) {
      sheet = ss.insertSheet(title);
    }
  }
  
  // Inisialisasi data bawaan jika sheet kosong
  initSheetIfEmpty(ss, "ULP", ["name"], [
    ["ULP Bukittinggi"],
    ["ULP Payakumbuh"],
    ["ULP Padang Panjang"],
    ["ULP Solok"],
    ["ULP Pariaman"],
    ["ULP Lubuk Alung"],
    ["ULP Batusangkar"],
    ["ULP Lima Puluh Kota"],
    ["ULP Sicincin"]
  ]);
  
  initSheetIfEmpty(ss, "POSKO", ["name", "ulp"], [
    ["Posko Bukittinggi Kota", "ULP Bukittinggi"],
    ["Posko Agam Timur", "ULP Bukittinggi"],
    ["Posko Payakumbuh", "ULP Payakumbuh"],
    ["Posko Padang Panjang", "ULP Padang Panjang"],
    ["Posko Solok Kota", "ULP Solok"],
    ["Posko Pariaman", "ULP Pariaman"]
  ]);
  
  initSheetIfEmpty(ss, "SHIFT", ["NAMA SHIFT"], [
    ["Shift Pagi (08:00 - 16:00)"],
    ["Shift Sore (16:00 - 00:00)"],
    ["Shift Malam (00:00 - 08:00)"]
  ]);
  
  initSheetIfEmpty(ss, "PETUGAS", ["name", "ulp"], [
    ["Andi", "ULP Bukittinggi"],
    ["Budi", "ULP Bukittinggi"],
    ["Candra", "ULP Payakumbuh"],
    ["Dedi", "ULP Solok"]
  ]);
  
  initSheetIfEmpty(ss, "MATERIAL", ["ID", "NAMA MATERIAL", "KATEGORI"], [
    ["SR_1X16", "SR 1x16 mm2", "Kabel & Aksesoris"],
    ["SR_2X10", "SR 2x10 mm2", "Kabel & Aksesoris"],
    ["SR_2X16", "SR 2x16 mm2", "Kabel & Aksesoris"],
    ["TIC_2X16", "TIC 2x16 mm2", "Kabel & Aksesoris"],
    ["TIC_4X16", "TIC 4x16 mm2", "Kabel & Aksesoris"],
    ["KWH_1P_5A", "KWh Meter 1 Phase 5(20)A", "KWh Meter"],
    ["KWH_1P_20A", "KWh Meter 1 Phase 20(80)A", "KWh Meter"],
    ["KWH_3P_5A", "KWh Meter 3 Phase 5(20)A", "KWh Meter"],
    ["MCB_1P_2A", "MCB 1 Phase 2A", "MCB"],
    ["MCB_1P_4A", "MCB 1 Phase 4A", "MCB"],
    ["MCB_1P_6A", "MCB 1 Phase 6A", "MCB"],
    ["MCB_1P_10A", "MCB 1 Phase 10A", "MCB"],
    ["MCB_1P_16A", "MCB 1 Phase 16A", "MCB"],
    ["MCB_1P_20A", "MCB 1 Phase 20A", "MCB"],
    ["MCB_1P_25A", "MCB 1 Phase 25A", "MCB"],
    ["MCB_1P_35A", "MCB 1 Phase 35A", "MCB"],
    ["MCB_1P_50A", "MCB 1 Phase 50A", "MCB"],
    ["MCB_3P_16A", "MCB 3 Phase 16A", "MCB"],
    ["MCB_3P_20A", "MCB 3 Phase 20A", "MCB"],
    ["MCB_3P_25A", "MCB 3 Phase 25A", "MCB"],
    ["MCB_3P_35A", "MCB 3 Phase 35A", "MCB"],
    ["MCB_3P_50A", "MCB 3 Phase 50A", "MCB"],
    ["FUSE_3A", "Fuse Link 3A", "Fuse Link"],
    ["FUSE_6A", "Fuse Link 6A", "Fuse Link"],
    ["FUSE_10A", "Fuse Link 10A", "Fuse Link"],
    ["FUSE_15A", "Fuse Link 15A", "Fuse Link"],
    ["FUSE_20A", "Fuse Link 20A", "Fuse Link"],
    ["NH_FUSE_100A", "NH Fuse 100A", "NH Fuse"],
    ["NH_FUSE_160A", "NH Fuse 160A", "NH Fuse"],
    ["NH_FUSE_250A", "NH Fuse 250A", "NH Fuse"]
  ]);
}

function initSheetIfEmpty(ss, title, headers, rows) {
  const sheet = ss.getSheetByName(title);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    if (rows && rows.length > 0) {
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
  }
}
`;

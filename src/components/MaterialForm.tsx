import React, { useState, useEffect } from 'react';
import { MaterialRecord, MATERIAL_LIST, ULP_OPTIONS, POSKO_OPTIONS, SHIFT_OPTIONS, MaterialUsage, MaterialItem, MappedOption, DEFAULT_POSKOS_MAPPED, DEFAULT_PETUGAS_MAPPED, UlpOption } from '../types';
import { Calendar, User, FileText, ChevronDown, ChevronUp, Plus, Minus, Check, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

interface MaterialFormProps {
  editingRecord: MaterialRecord | null;
  onSave: (record: Omit<MaterialRecord, 'no'>) => void;
  onCancelEdit?: () => void;
  materialsList?: MaterialItem[];
  ulpOptions?: (string | UlpOption)[] | null;
  poskoOptions?: MappedOption[] | null;
  shiftOptions?: string[] | null;
  petugasOptions?: MappedOption[] | null;
}

export default function MaterialForm({ 
  editingRecord, 
  onSave, 
  onCancelEdit,
  materialsList,
  ulpOptions,
  poskoOptions,
  shiftOptions,
  petugasOptions
}: MaterialFormProps) {
  const activeMaterials = materialsList || MATERIAL_LIST;
  const activeUlpsNormalized: UlpOption[] = (ulpOptions && ulpOptions.length > 0
    ? ulpOptions.map(opt => typeof opt === 'string' ? { id: opt, name: opt } : opt)
    : ULP_OPTIONS.map(name => ({ id: name, name }))) as UlpOption[];
  const activePoskosMapped = poskoOptions && poskoOptions.length > 0 ? poskoOptions : DEFAULT_POSKOS_MAPPED;
  const activeShifts = shiftOptions && shiftOptions.length > 0 ? shiftOptions : SHIFT_OPTIONS;
  const activePetugasMapped = petugasOptions && petugasOptions.length > 0 ? petugasOptions : DEFAULT_PETUGAS_MAPPED;

  // Discover all unique categories present in the active material list
  const categories = Array.from(new Set(activeMaterials.map(item => item.category)));

  // Navigation state: Page 1 (Informasi Serah Terima) or Page 2 (Input Material)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // General Info states
  const [timestamp, setTimestamp] = useState('');
  const [ulp, setUlp] = useState(activeUlpsNormalized[0]?.name || 'ULP Bukittinggi');
  const [posko, setPosko] = useState('');
  const [shift, setShift] = useState(activeShifts[0] || 'Shift Pagi (08:00 - 16:00)');
  const [petugasSerah, setPetugasSerah] = useState('');
  const [petugasTerima, setPetugasTerima] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // Dropdown select vs custom text states
  const [selectedSerahOpt, setSelectedSerahOpt] = useState('');
  const [selectedTerimaOpt, setSelectedTerimaOpt] = useState('');
  const [isSerahManual, setIsSerahManual] = useState(false);
  const [isTerimaManual, setIsTerimaManual] = useState(false);

  // Materials usage state (key is item.id)
  const [materials, setMaterials] = useState<Record<string, MaterialUsage>>({});

  // Active expanded section for material categories
  const [expandedCategory, setExpandedCategory] = useState<string>('KWh Meter');

  // Compute dynamically filtered posko and petugas list based on current ULP selection
  const selectedUlpObj = activeUlpsNormalized.find(
    u => u.name.toLowerCase() === ulp.toLowerCase() || u.id.toLowerCase() === ulp.toLowerCase()
  );

  const filteredPoskos = activePoskosMapped.filter(p => {
    if (!p.ulp) return false;
    const pUlp = p.ulp.toLowerCase();
    return pUlp === selectedUlpObj?.id.toLowerCase() || pUlp === selectedUlpObj?.name.toLowerCase();
  });
  const displayPoskos = filteredPoskos.length > 0 
    ? filteredPoskos 
    : activePoskosMapped.filter(p => !p.ulp); // fallback to general/all if no direct match

  const filteredPetugas = activePetugasMapped.filter(p => {
    if (!p.ulp) return false;
    const pUlp = p.ulp.toLowerCase();
    return pUlp === selectedUlpObj?.id.toLowerCase() || pUlp === selectedUlpObj?.name.toLowerCase();
  });
  const displayPetugas = filteredPetugas.length > 0 
    ? filteredPetugas 
    : activePetugasMapped;

  // Consolidate dropdown initialization & sync
  useEffect(() => {
    if (!editingRecord) {
      const defaultUlpObj = activeUlpsNormalized[0] || { id: 'ULP Bukittinggi', name: 'ULP Bukittinggi' };
      const defaultUlpVal = defaultUlpObj.name;
      setUlp(defaultUlpVal);

      const firstFilteredPoskos = activePoskosMapped.filter(p => {
        if (!p.ulp) return false;
        const pUlp = p.ulp.toLowerCase();
        return pUlp === defaultUlpObj.id.toLowerCase() || pUlp === defaultUlpObj.name.toLowerCase();
      });
      const initialPosko = firstFilteredPoskos[0]?.name || activePoskosMapped[0]?.name || 'Posko Induk';
      setPosko(initialPosko);

      const firstFilteredPetugas = activePetugasMapped.filter(p => {
        if (!p.ulp) return false;
        const pUlp = p.ulp.toLowerCase();
        return pUlp === defaultUlpObj.id.toLowerCase() || pUlp === defaultUlpObj.name.toLowerCase();
      });
      const initialPetugas = firstFilteredPetugas[0]?.name || activePetugasMapped[0]?.name || '';
      if (initialPetugas) {
        setSelectedSerahOpt(initialPetugas);
        setPetugasSerah(initialPetugas);
        setSelectedTerimaOpt(initialPetugas);
        setPetugasTerima(initialPetugas);
      } else {
        setSelectedSerahOpt('');
        setPetugasSerah('');
        setSelectedTerimaOpt('');
        setPetugasTerima('');
      }
    }
  }, [ulpOptions, poskoOptions, petugasOptions, editingRecord]);

  useEffect(() => {
    if (!editingRecord) {
      if (activeShifts.length > 0 && !activeShifts.includes(shift)) {
        setShift(activeShifts[0]);
      }
    }
  }, [shiftOptions, editingRecord]);

  // Load editing record data if present
  useEffect(() => {
    if (editingRecord) {
      setTimestamp(editingRecord.timestamp);
      setUlp(editingRecord.ulp);
      setPosko(editingRecord.posko);
      setShift(editingRecord.shift);
      
      const serah = editingRecord.petugasSerah;
      const terima = editingRecord.petugasTerima;
      setPetugasSerah(serah);
      setPetugasTerima(terima);
      setKeterangan(editingRecord.keterangan || '');

      const isSerahRegistered = activePetugasMapped.some(p => p.name === serah);
      if (isSerahRegistered) {
        setSelectedSerahOpt(serah);
        setIsSerahManual(false);
      } else {
        setSelectedSerahOpt('MANUAL');
        setIsSerahManual(true);
      }

      const isTerimaRegistered = activePetugasMapped.some(p => p.name === terima);
      if (isTerimaRegistered) {
        setSelectedTerimaOpt(terima);
        setIsTerimaManual(false);
      } else {
        setSelectedTerimaOpt('MANUAL');
        setIsTerimaManual(true);
      }
      
      // Load materials
      const loadedMaterials: Record<string, MaterialUsage> = {};
      activeMaterials.forEach(item => {
        loadedMaterials[item.id] = editingRecord.materials[item.id] 
          ? { ...editingRecord.materials[item.id] }
          : { qty: 0, lokasi: '' };
      });
      setMaterials(loadedMaterials);
    } else {
      // Default to current local date & time
      const now = new Date();
      const localTime = now.toLocaleDateString('sv') + ' ' + now.toTimeString().substring(0, 5); // YYYY-MM-DD HH:mm
      setTimestamp(localTime);
      setKeterangan('');
      
      // Reset materials
      const initialMaterials: Record<string, MaterialUsage> = {};
      activeMaterials.forEach(item => {
        initialMaterials[item.id] = { qty: 0, lokasi: '' };
      });
      setMaterials(initialMaterials);
    }

    if (categories.length > 0) {
      setExpandedCategory(categories[0]);
    }
    
    // Always start at step 1 when the editing record changes
    setCurrentStep(1);
  }, [editingRecord, materialsList]);

  // Handle ULP change and dynamically re-filter poskos & officers
  const handleUlpChange = (newUlpName: string) => {
    setUlp(newUlpName);

    const matchUlpObj = activeUlpsNormalized.find(
      u => u.name.toLowerCase() === newUlpName.toLowerCase() || u.id.toLowerCase() === newUlpName.toLowerCase()
    );

    const nextFilteredPoskos = activePoskosMapped.filter(p => {
      if (!p.ulp) return false;
      const pUlp = p.ulp.toLowerCase();
      return pUlp === matchUlpObj?.id.toLowerCase() || pUlp === matchUlpObj?.name.toLowerCase();
    });

    if (nextFilteredPoskos.length > 0) {
      const hasCurrentPosko = nextFilteredPoskos.some(p => p.name === posko);
      if (!hasCurrentPosko) {
        setPosko(nextFilteredPoskos[0].name);
      }
    } else {
      const fallbackPoskos = activePoskosMapped.filter(p => !p.ulp);
      if (fallbackPoskos.length > 0) {
        setPosko(fallbackPoskos[0].name);
      }
    }

    const nextFilteredPetugas = activePetugasMapped.filter(p => {
      if (!p.ulp) return false;
      const pUlp = p.ulp.toLowerCase();
      return pUlp === matchUlpObj?.id.toLowerCase() || pUlp === matchUlpObj?.name.toLowerCase();
    });

    if (nextFilteredPetugas.length > 0) {
      const defaultPetugasVal = nextFilteredPetugas[0].name;
      
      if (!isSerahManual) {
        const hasCurrentSerah = nextFilteredPetugas.some(p => p.name === selectedSerahOpt);
        if (!hasCurrentSerah) {
          setSelectedSerahOpt(defaultPetugasVal);
          setPetugasSerah(defaultPetugasVal);
        }
      }
      
      if (!isTerimaManual) {
        const hasCurrentTerima = nextFilteredPetugas.some(p => p.name === selectedTerimaOpt);
        if (!hasCurrentTerima) {
          setSelectedTerimaOpt(defaultPetugasVal);
          setPetugasTerima(defaultPetugasVal);
        }
      }
    }
  };

  // Handle individual material qty changes
  const handleQtyChange = (itemId: string, newQty: number) => {
    const qty = Math.max(0, newQty);
    setMaterials(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId] || { qty: 0, lokasi: '' },
        qty
      }
    }));
  };

  // Handle individual material location changes
  const handleLocationChange = (itemId: string, lokasi: string) => {
    setMaterials(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId] || { qty: 0, lokasi: '' },
        lokasi
      }
    }));
  };

  // Increment or decrement qty easily
  const adjustQty = (itemId: string, amount: number) => {
    const currentQty = materials[itemId]?.qty || 0;
    handleQtyChange(itemId, currentQty + amount);
  };

  // Step 1 Validation Helper
  const validateStep1 = (): boolean => {
    const finalSerah = petugasSerah.trim();
    const finalTerima = petugasTerima.trim();

    if (!timestamp.trim()) {
      alert('Timestamps (Tanggal & Waktu) harus diisi!');
      return false;
    }
    if (!ulp.trim()) {
      alert('Unit Layanan Pelanggan (ULP) harus dipilih!');
      return false;
    }
    if (!posko.trim()) {
      alert('Posko Layanan harus dipilih!');
      return false;
    }
    if (!shift.trim()) {
      alert('Waktu Shift Kerja harus dipilih!');
      return false;
    }
    if (!finalSerah) {
      alert('Nama Petugas Serah harus diisi!');
      return false;
    }
    if (!finalTerima) {
      alert('Nama Petugas Terima harus diisi!');
      return false;
    }
    return true;
  };

  // Handle Step 1 to Step 2 transition
  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verify first page info is complete
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    // Verify location is filled for each selected material
    const invalidMaterials = activeMaterials.filter(item => {
      const usage = materials[item.id];
      return usage && usage.qty > 0 && !usage.lokasi.trim();
    });

    if (invalidMaterials.length > 0) {
      alert(`Mohon isi lokasi pemasangan untuk material berikut:\n${invalidMaterials.map(m => `- ${m.name}`).join('\n')}`);
      // Auto-expand the category of the first invalid item
      setExpandedCategory(invalidMaterials[0].category);
      return;
    }

    const finalSerah = petugasSerah.trim();
    const finalTerima = petugasTerima.trim();

    // Build saved record structure
    const recordData: Omit<MaterialRecord, 'no'> = {
      id: editingRecord ? editingRecord.id : `record_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      ulp,
      posko,
      shift,
      petugasSerah: finalSerah,
      petugasTerima: finalTerima,
      materials,
      keterangan: keterangan.trim()
    };

    onSave(recordData);

    // Reset Form if not editing
    if (!editingRecord) {
      setKeterangan('');
      const resetMaterials: Record<string, MaterialUsage> = {};
      activeMaterials.forEach(item => {
        resetMaterials[item.id] = { qty: 0, lokasi: '' };
      });
      setMaterials(resetMaterials);
      
      const now = new Date();
      setTimestamp(now.toLocaleDateString('sv') + ' ' + now.toTimeString().substring(0, 5));
    }

    // Always reset to step 1 after save
    setCurrentStep(1);
  };

  // Quick stats of inputted items in the current form
  const getCategoryUsageCount = (cat: string) => {
    return activeMaterials
      .filter(item => item.category === cat)
      .reduce((acc, item) => acc + (materials[item.id]?.qty || 0), 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Form Title & Edit Banner */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 font-display">
            {editingRecord ? 'Edit Laporan Penggunaan Material' : 'Input Laporan Penggunaan Material'}
          </h2>
          <p className="text-xs text-slate-500">
            {editingRecord 
              ? `Memodifikasi rekor No. ${editingRecord.no} (${editingRecord.timestamp})` 
              : 'Isi formulir berikut untuk mendokumentasikan serah-terima material shift'}
          </p>
        </div>
        {editingRecord && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-medium hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal Edit
          </button>
        )}
      </div>

      {/* Elegant Step Navigation Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Step 1 Indicator Button */}
          <button
            type="button"
            onClick={() => {
              if (currentStep === 2) {
                setCurrentStep(1);
              }
            }}
            className="flex items-center gap-2.5 focus:outline-none text-left group cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep === 1 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}>
              {currentStep === 2 ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <div>
              <span className={`text-[10px] font-bold block uppercase tracking-wider ${
                currentStep === 1 ? 'text-blue-600' : 'text-emerald-600'
              }`}>Halaman 1</span>
              <span className="text-xs font-semibold text-slate-800 block">Informasi Serah Terima</span>
            </div>
          </button>

          {/* Line separator bar with animated fill */}
          <div className="flex-1 h-0.5 mx-4 bg-slate-100 relative">
            <div className={`absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ${
              currentStep === 2 ? 'w-full' : 'w-0'
            }`} />
          </div>

          {/* Step 2 Indicator Button */}
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1) {
                handleNextStep();
              }
            }}
            className="flex items-center gap-2.5 focus:outline-none text-left group cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
              currentStep === 2 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              '2'
            </div>
            <div>
              <span className={`text-[10px] font-bold block uppercase tracking-wider ${
                currentStep === 2 ? 'text-blue-600' : 'text-slate-400'
              }`}>Halaman 2</span>
              <span className="text-xs font-semibold text-slate-500 block">Input Material</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Form Fields Sections container */}
      <div className="transition-all duration-300">
        
        {/* ========================================================== */}
        {/* PAGE 1: Halaman Informasi Serah Terima Shift               */}
        {/* ========================================================== */}
        {currentStep === 1 && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 animate-fadeIn">
            
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Calendar className="h-4.5 w-4.5 text-blue-500" />
              <h3 className="text-sm font-semibold text-slate-800 font-display">Informasi Serah Terima Shift</h3>
            </div>

            {/* Timestamp */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Timestamps (Tanggal & Waktu)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="YYYY-MM-DD HH:mm"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setTimestamp(now.toLocaleDateString('sv') + ' ' + now.toTimeString().substring(0, 5));
                  }}
                  className="absolute right-2 top-2 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
                  title="Gunakan waktu sekarang"
                >
                  Sekarang
                </button>
              </div>
            </div>

            {/* ULP Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Unit Layanan Pelanggan (ULP)</label>
              <select
                value={ulp}
                onChange={(e) => handleUlpChange(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
              >
                {activeUlpsNormalized.filter((v, idx, self) => self.findIndex(p => p.id === v.id) === idx).map(opt => (
                  <option key={opt.id} value={opt.name}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Posko Selection (Filtered by selected ULP) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Posko Layanan</label>
              <select
                value={posko}
                onChange={(e) => setPosko(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
              >
                {displayPoskos.filter((v, idx, self) => self.findIndex(p => p.name === v.name) === idx).map(opt => (
                  <option key={opt.name} value={opt.name}>{opt.name}</option>
                ))}
              </select>
            </div>

            {/* Shift Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Waktu Shift Kerja</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
              >
                {Array.from(new Set(activeShifts)).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Officers Selection */}
            <div className="space-y-4 pt-1">
              
              {/* Petugas Serah (Pemberi) Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  Petugas Serah (Pemberi)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={selectedSerahOpt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSerahOpt(val);
                      if (val === 'MANUAL') {
                        setIsSerahManual(true);
                        setPetugasSerah('');
                      } else {
                        setIsSerahManual(false);
                        setPetugasSerah(val);
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
                  >
                    {displayPetugas.filter((v, idx, self) => self.findIndex(p => p.name === v.name) === idx).map(opt => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                    <option value="MANUAL">+ Ketik Nama Baru...</option>
                  </select>

                  {isSerahManual && (
                    <input
                      type="text"
                      placeholder="Masukkan Nama Petugas Serah Baru"
                      required
                      value={petugasSerah}
                      onChange={(e) => setPetugasSerah(e.target.value)}
                      className="w-full text-xs bg-blue-50/50 border border-blue-200 rounded-lg px-3 py-2.5 text-slate-800 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:font-normal"
                    />
                  )}
                </div>
              </div>

              {/* Petugas Terima (Penerima) Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  Petugas Terima (Penerima)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={selectedTerimaOpt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedTerimaOpt(val);
                      if (val === 'MANUAL') {
                        setIsTerimaManual(true);
                        setPetugasTerima('');
                      } else {
                        setIsTerimaManual(false);
                        setPetugasTerima(val);
                      }
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
                  >
                    {displayPetugas.filter((v, idx, self) => self.findIndex(p => p.name === v.name) === idx).map(opt => (
                      <option key={opt.name} value={opt.name}>{opt.name}</option>
                    ))}
                    <option value="MANUAL">+ Ketik Nama Baru...</option>
                  </select>

                  {isTerimaManual && (
                    <input
                      type="text"
                      placeholder="Masukkan Nama Petugas Terima Baru"
                      required
                      value={petugasTerima}
                      onChange={(e) => setPetugasTerima(e.target.value)}
                      className="w-full text-xs bg-blue-50/50 border border-blue-200 rounded-lg px-3 py-2.5 text-slate-800 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:font-normal"
                    />
                  )}
                </div>
              </div>

            </div>

            {/* General Remarks */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <FileText className="h-3 w-3 text-slate-400" />
                Keterangan Tambahan
              </label>
              <textarea
                rows={3}
                placeholder="Tambahkan catatan khusus, nomor surat penugasan (WO), rincian pekerjaan, atau material cadangan yang belum terdaftar..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Navigation buttons at the bottom of Page 1 */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10 px-8 py-3.5 rounded-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                Lanjut ke Input Material
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* PAGE 2: Halaman Input Material                            */}
        {/* ========================================================== */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            
            {/* Step 1 reference panel: Left Side (Col: 4) */}
            <div className="lg:col-span-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4 h-fit">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest font-display">Handover Shift Detail</h4>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  Ubah Info
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">ULP & Posko</span>
                  <span className="font-bold text-slate-800 block">{ulp}</span>
                  <span className="text-slate-500 font-semibold">{posko}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Waktu & Shift</span>
                  <span className="font-bold text-slate-800 block">{timestamp}</span>
                  <span className="text-slate-500 font-semibold">{shift}</span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-2">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Petugas Serah</span>
                    <span className="font-bold text-slate-800">{petugasSerah}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Petugas Terima</span>
                    <span className="font-bold text-slate-800">{petugasTerima}</span>
                  </div>
                </div>

                {keterangan.trim() && (
                  <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Keterangan Tambahan</span>
                    <span className="text-slate-600 italic block">"{keterangan}"</span>
                  </div>
                )}
              </div>
            </div>

            {/* Material Lists Panel: Right Side (Col: 8) */}
            <div className="lg:col-span-8 space-y-3">
              
              <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-3xs">
                <span className="text-xs font-semibold text-slate-700">Daftar Material Dipasang ({activeMaterials.length} Macam)</span>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2.5 py-1 rounded-full shadow-3xs">
                  {(Object.values(materials) as any[]).reduce((sum, item) => sum + (item.qty || 0), 0)} unit terisi
                </span>
              </div>

              {categories.map(cat => {
                const isExpanded = expandedCategory === cat;
                const catUsage = getCategoryUsageCount(cat);
                const listForCat = activeMaterials.filter(item => item.category === cat);

                return (
                  <div 
                    key={cat} 
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isExpanded ? 'border-blue-200 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Category Header Bar */}
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isExpanded ? '' : cat)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left select-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          cat === 'KWh Meter' ? 'bg-blue-500' :
                          cat === 'MCB' ? 'bg-emerald-500' :
                          cat === 'Fuse Link' ? 'bg-amber-500' :
                          cat === 'NH Fuse' ? 'bg-pink-500' : 'bg-purple-500'
                        }`} />
                        <span className="text-xs font-bold text-slate-700 font-display uppercase tracking-wider">{cat}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {catUsage > 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {catUsage} terpasang
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded items list */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50/20 divide-y divide-slate-100">
                        {listForCat.map(item => {
                          const usage = materials[item.id] || { qty: 0, lokasi: '' };
                          const hasValue = usage.qty > 0;

                          return (
                            <div 
                              key={item.id} 
                              className={`py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                                hasValue ? 'bg-blue-50/10 -mx-4 px-4' : ''
                              }`}
                            >
                              {/* Material Name Column */}
                              <div className="md:w-5/12 min-w-0">
                                <span className={`text-xs block font-bold truncate ${
                                  hasValue ? 'text-blue-700' : 'text-slate-700'
                                }`}>
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.category}
                                </span>
                              </div>

                              {/* Controls Column */}
                              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                
                                {/* Quantity controller - 44px touch targets on mobile */}
                                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs self-start md:self-auto shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => adjustQty(item.id, -1)}
                                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  
                                  <input
                                    type="number"
                                    min="0"
                                    value={usage.qty || ''}
                                    onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                                    className="w-12 text-center text-xs font-extrabold text-slate-800 outline-none border-none py-1"
                                    placeholder="0"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => adjustQty(item.id, 1)}
                                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Lokasi terpasang input */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder={hasValue ? "📍 Lokasi pemasangan wajib diisi..." : "Lokasi pemasangan (opsional)..."}
                                    value={usage.lokasi}
                                    required={hasValue}
                                    onChange={(e) => handleLocationChange(item.id, e.target.value)}
                                    className={`w-full text-xs border rounded-lg px-3 py-2.5 outline-none transition-all ${
                                      hasValue 
                                        ? usage.lokasi.trim() 
                                          ? 'bg-emerald-50/30 border-emerald-200 focus:border-emerald-400 text-slate-800 font-medium'
                                          : 'bg-amber-50/30 border-amber-300 focus:border-amber-400 placeholder-amber-600 text-slate-850 font-bold animate-pulse'
                                        : 'bg-white border-slate-200 focus:border-blue-500 focus:bg-white text-slate-700'
                                    }`}
                                  />
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Form Actions footer box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="w-full sm:w-auto text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Kembali
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Apakah Anda yakin ingin mengosongkan seluruh formulir?')) {
                        setKeterangan('');
                        const resetMaterials: Record<string, MaterialUsage> = {};
                        activeMaterials.forEach(item => {
                          resetMaterials[item.id] = { qty: 0, lokasi: '' };
                        });
                        setMaterials(resetMaterials);
                      }
                    }}
                    className="w-full sm:w-auto text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset Formulir
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10 px-8 py-3.5 rounded-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {editingRecord ? 'Simpan Perubahan Rekor' : 'Simpan Rekor Laporan'}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

    </form>
  );
}

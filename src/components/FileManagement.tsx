import React, { useState, useRef } from 'react';
import { MaterialRecord, MaterialItem } from '../types';
import { exportToCSV, exportToTSV, importFromCSV } from '../utils/csv';
import { FileDown, ClipboardCopy, UploadCloud, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface FileManagementProps {
  records: MaterialRecord[];
  onImport: (newRecords: MaterialRecord[], append: boolean) => void;
  onClearAll: () => void;
  materialsList?: MaterialItem[];
}

export default function FileManagement({ records, onImport, onClearAll, materialsList }: FileManagementProps) {
  const [dragActive, setDragActive] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle download of CSV
  const handleDownloadCSV = () => {
    if (records.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }
    const csvContent = exportToCSV(records, materialsList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('sv'); // YYYY-MM-DD
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Material_PLN_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Tab-Separated values for Excel pasting
  const handleCopyToClipboard = () => {
    if (records.length === 0) {
      alert('Tidak ada data untuk disalin!');
      return;
    }
    try {
      const tsvContent = exportToTSV(records, materialsList);
      navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert('Gagal menyalin ke clipboard. Silakan unduh file CSV.');
    }
  };

  // Drag and drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process imported CSV content
  const processCSVContent = (text: string) => {
    try {
      const parsed = importFromCSV(text, materialsList);
      if (parsed.length === 0) {
        setImportStatus({
          success: false,
          msg: 'Gagal mengimpor. Format CSV tidak valid atau tidak memiliki baris data yang valid.'
        });
        return;
      }

      // Show option modal/prompt to append or overwrite
      const append = confirm(
        `Berhasil memproses ${parsed.length} rekor laporan dari file CSV.\n\n` +
        `Klik "OK" untuk menggabungkan (APPEND) dengan data yang sudah ada.\n` +
        `Klik "Cancel" untuk menimpa (OVERWRITE) semua data saat ini.`
      );

      onImport(parsed, append);
      
      setImportStatus({
        success: true,
        msg: `Sukses mengimpor ${parsed.length} rekor material ke dalam sistem!`
      });
      
      setTimeout(() => setImportStatus(null), 5000);
    } catch (err) {
      setImportStatus({
        success: false,
        msg: 'Kesalahan saat mengurai file CSV. Pastikan file sesuai format.'
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            processCSVContent(event.target.result as string);
          }
        };
        reader.readAsText(file);
      } else {
        setImportStatus({
          success: false,
          msg: 'Hanya mendukung pengunggahan file berekstensi .csv!'
        });
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processCSVContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Box Left: Exports (Download CSV, Copy Excel) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6 flex flex-col justify-between">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800 font-display">Ekspor Rekapitulasi Material</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Unduh seluruh baris rekor laporan material dalam sistem ke spreadsheet Excel atau CSV yang siap dikirim untuk verifikasi administrasi PLN Unit.
          </p>
        </div>

        {/* Action button cards */}
        <div className="space-y-3">
          {/* Download CSV */}
          <button
            onClick={handleDownloadCSV}
            className="w-full p-4 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl transition-all text-left flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">Unduh Spreadsheet (.CSV)</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Kompatibel dengan Microsoft Excel & Google Sheets</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">
              CSV
            </span>
          </button>

          {/* Copy to Clipboard for Excel */}
          <button
            onClick={handleCopyToClipboard}
            className="w-full p-4 bg-slate-50 border border-slate-200 hover:border-purple-400 hover:bg-purple-50/20 rounded-xl transition-all text-left flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                <ClipboardCopy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">Salin Data untuk Excel</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Salin teks tabulasi lalu tempel (Paste) langsung ke Excel</span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              copied ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-50 text-purple-600'
            }`}>
              {copied ? 'Copied' : 'Salin'}
            </span>
          </button>
        </div>

        {/* Clear Data section */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-[11px] text-slate-400">Pembersihan database lokal & cloud</span>
          </div>
          <button
            onClick={onClearAll}
            className="text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Reset Semua Data
          </button>
        </div>

      </div>

      {/* Box Right: Import (Drag & Drop, Parse CSV) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4 flex flex-col">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-800 font-display">Impor Laporan Dari CSV</h3>
          <p className="text-xs text-slate-500">
            Unggah berkas rekaman material (.CSV) yang telah diekspor sebelumnya untuk dimuat kembali ke dalam aplikasi monitoring.
          </p>
        </div>

        {/* Drag and Drop Uploader */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`flex-1 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50/30'
              : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />

          <UploadCloud className={`h-10 w-10 mb-3 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
          <p className="text-xs font-bold text-slate-700">Tarik & Lepas berkas CSV di sini</p>
          <p className="text-[10px] text-slate-400 mt-1">Atau klik untuk memilih file dari komputer Anda</p>
          <p className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono mt-3 uppercase font-semibold">
            Format: UTF-8 CSV Only
          </p>
        </div>

        {/* Upload Status Card */}
        {importStatus && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 animate-fade-in ${
            importStatus.success
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            <div className="shrink-0 mt-0.5">
              {importStatus.success ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold block">{importStatus.success ? 'Berhasil!' : 'Kesalahan Impor'}</span>
              <span className="text-[10px] leading-relaxed block mt-0.5">{importStatus.msg}</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

import React, { useState } from 'react';
import { MaterialRecord, MATERIAL_LIST, MaterialUsage, MaterialItem } from '../types';
import { Search, Edit, Trash2, Eye, Filter, X, ArrowLeftRight, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';

interface MaterialTableProps {
  records: MaterialRecord[];
  onEdit: (record: MaterialRecord) => void;
  onDelete: (id: string) => void;
  materialsList?: MaterialItem[];
  onViewPdf?: (record: MaterialRecord) => void;
}

export default function MaterialTable({ records, onEdit, onDelete, materialsList, onViewPdf }: MaterialTableProps) {
  const activeMaterials = materialsList || MATERIAL_LIST;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterUlp, setFilterUlp] = useState('ALL');
  const [filterPosko, setFilterPosko] = useState('ALL');
  const [filterShift, setFilterShift] = useState('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selected record for details modal
  const [selectedRecord, setSelectedRecord] = useState<MaterialRecord | null>(null);

  // Unique filters lists
  const ulpOptions = Array.from(new Set(records.map(r => r.ulp)));
  const poskoOptions = Array.from(new Set(records.map(r => r.posko)));
  const shiftOptions = Array.from(new Set(records.map(r => r.shift)));

  // Filter records
  const filteredRecords = records.filter(rec => {
    const matchesSearch = 
      rec.petugasSerah.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.petugasTerima.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.timestamp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(rec.materials).some(m => m.lokasi.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesUlp = filterUlp === 'ALL' || rec.ulp === filterUlp;
    const matchesPosko = filterPosko === 'ALL' || rec.posko === filterPosko;
    const matchesShift = filterShift === 'ALL' || rec.shift === filterShift;

    return matchesSearch && matchesUlp && matchesPosko && matchesShift;
  });

  // Pagination index calculations
  const totalRows = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRecords.slice(indexOfFirstRow, indexOfLastRow);

  // Reset page when filters change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: 'ulp' | 'posko' | 'shift', val: string) => {
    if (type === 'ulp') setFilterUlp(val);
    if (type === 'posko') setFilterPosko(val);
    if (type === 'shift') setFilterShift(val);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterUlp('ALL');
    setFilterPosko('ALL');
    setFilterShift('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari petugas, tanggal, lokasi pemasangan, atau keterangan..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Clear Button */}
          {(searchTerm || filterUlp !== 'ALL' || filterPosko !== 'ALL' || filterShift !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 font-semibold hover:bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Hapus Semua Filter
            </button>
          )}

        </div>

        {/* Dropdown filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          
          {/* ULP Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Unit (ULP)</label>
            <select
              value={filterUlp}
              onChange={(e) => handleFilterChange('ulp', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Semua ULP ({ulpOptions.length})</option>
              {ulpOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Posko Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Posko</label>
            <select
              value={filterPosko}
              onChange={(e) => handleFilterChange('posko', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Semua Posko ({poskoOptions.length})</option>
              {poskoOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Shift Kerja</label>
            <select
              value={filterShift}
              onChange={(e) => handleFilterChange('shift', e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL">Semua Shift ({shiftOptions.length})</option>
              {shiftOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Spreadsheet Main Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Table helper info bar */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan <span className="font-bold text-slate-700">{totalRows === 0 ? 0 : indexOfFirstRow + 1}</span> - <span className="font-bold text-slate-700">{Math.min(indexOfLastRow, totalRows)}</span> dari <span className="font-bold text-slate-700">{totalRows}</span> baris rekor terfilter
          </span>
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 hidden sm:inline-flex">
            <ArrowLeftRight className="h-3 w-3" />
            Geser tabel ke samping untuk melihat seluruh material ({activeMaterials.length * 2 + 9} kolom)
          </span>
        </div>

        {/* Scrollable Spreadsheet Grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            
            {/* Headers Group */}
            <thead>
              {/* Primary Header Row */}
              <tr className="bg-slate-100/80 border-b border-slate-200 divide-x divide-slate-200">
                <th rowSpan={2} className="px-3 py-3 text-center text-xs font-bold text-slate-600 bg-slate-100">AKSI</th>
                <th rowSpan={2} className="px-3 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[50px]">NO.</th>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[130px]">TIMESTAMPS</th>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[120px]">ULP</th>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[120px]">POSKO</th>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[140px]">SHIFT</th>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[110px]">PETUGAS SERAH</th>
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[110px]">PETUGAS TERIMA</th>
                
                {/* Dynamically span 2 columns for each material */}
                {activeMaterials.map(item => (
                  <th 
                    key={item.id} 
                    colSpan={2} 
                    className="px-4 py-1.5 text-center text-[10px] font-bold text-slate-700 bg-slate-100 min-w-[200px]"
                  >
                    {item.name}
                  </th>
                ))}
                
                <th rowSpan={2} className="px-4 py-3 text-left text-xs font-bold text-slate-600 bg-slate-100 min-w-[180px]">KETERANGAN</th>
              </tr>

              {/* Secondary Location Headers Row */}
              <tr className="bg-slate-50 border-b border-slate-200 divide-x divide-slate-200">
                {activeMaterials.map(item => (
                  <React.Fragment key={item.id}>
                    <th className="px-3 py-1 text-center text-[9px] font-bold text-slate-500 bg-slate-50/50 min-w-[50px]">QTY</th>
                    <th className="px-4 py-1 text-left text-[9px] font-bold text-slate-500 bg-slate-50/50 min-w-[130px]">LOKASI TERPASANG</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* Body Records */}
            <tbody className="divide-y divide-slate-200">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={7 + (activeMaterials.length * 2) + 2} className="text-center py-12 text-slate-400 text-xs">
                    Tidak ditemukan data material yang cocok dengan filter aktif.
                  </td>
                </tr>
              ) : (
                currentRows.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors group divide-x divide-slate-200">
                    
                    {/* Actions Column (Fixed widths) */}
                    <td className="px-3 py-2 text-center whitespace-nowrap bg-white sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Lihat Detail Lengkap"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onViewPdf?.(rec)}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          title="Cetak Laporan / PDF"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(rec)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Edit Laporan"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus rekor laporan No. ${rec.no}?`)) {
                              onDelete(rec.id);
                            }
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Hapus Laporan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Metadata columns */}
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 font-mono">{rec.no}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-700 font-mono font-medium">{rec.timestamp}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-800 font-semibold">{rec.ulp}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{rec.posko}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 truncate max-w-[140px]" title={rec.shift}>
                      {rec.shift.split(' ')[0] || rec.shift}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-700 font-medium truncate max-w-[100px]">{rec.petugasSerah}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-700 font-medium truncate max-w-[100px]">{rec.petugasTerima}</td>

                    {/* Materials pairs dynamic cells */}
                    {activeMaterials.map(item => {
                      const usage = rec.materials[item.id] || { qty: 0, lokasi: '' };
                      const hasValue = usage.qty > 0;
                      
                      return (
                        <React.Fragment key={item.id}>
                          {/* Quantity Cell */}
                          <td className={`px-3 py-2 text-center text-xs font-bold font-mono min-w-[50px] ${
                            hasValue ? 'text-emerald-700 bg-emerald-50/50' : 'text-slate-300'
                          }`}>
                            {hasValue ? usage.qty : '-'}
                          </td>

                          {/* Location Cell */}
                          <td className={`px-4 py-2 text-xs font-mono min-w-[130px] ${
                            hasValue ? 'text-slate-700 bg-slate-50/30' : 'text-slate-300'
                          }`}>
                            {hasValue ? usage.lokasi : '-'}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* General Remarks */}
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[180px] truncate" title={rec.keterangan}>
                      {rec.keterangan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>

        {/* Table Footer with pagination control */}
        {totalRows > 0 && (
          <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Rows Per Page controller */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tampilkan baris:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-xs rounded px-2 py-1 text-slate-600 font-medium outline-none cursor-pointer"
              >
                {[5, 10, 25, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-xs text-slate-600 font-medium px-3">
                Halaman <span className="font-bold text-slate-850">{currentPage}</span> dari <span className="font-bold text-slate-850">{totalPages}</span>
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Details Dialog Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-display">Rincian Laporan Material PLN</h3>
                <p className="text-[10px] text-slate-400 font-mono">No. Rekor: {selectedRecord.no} • ID: {selectedRecord.id}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Officer Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Timestamps</span>
                  <span className="text-xs font-bold font-mono text-slate-700">{selectedRecord.timestamp}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Unit (ULP)</span>
                  <span className="text-xs font-bold text-slate-800">{selectedRecord.ulp}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Posko</span>
                  <span className="text-xs font-bold text-slate-800">{selectedRecord.posko}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Shift</span>
                  <span className="text-xs font-semibold text-slate-700">{selectedRecord.shift.split(' ')[0] || selectedRecord.shift}</span>
                </div>
              </div>

              {/* Handover names */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-100 p-3 rounded-lg bg-emerald-50/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Petugas Serah</span>
                  <span className="text-xs font-bold text-slate-800">{selectedRecord.petugasSerah}</span>
                </div>
                <div className="border border-slate-100 p-3 rounded-lg bg-blue-50/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Petugas Terima</span>
                  <span className="text-xs font-bold text-slate-800">{selectedRecord.petugasTerima}</span>
                </div>
              </div>

              {/* Materials Consumed (Filter only quantity > 0) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Material Terpasang Lapangan:</span>
                
                {(() => {
                  const usedItems = activeMaterials.filter(item => {
                    const usage = selectedRecord.materials[item.id];
                    return usage && usage.qty > 0;
                  });

                  if (usedItems.length === 0) {
                    return (
                      <p className="text-xs italic text-slate-400 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Tidak ada material terpasang dalam shift ini (hanya pencatatan serah terima shift kosong).
                      </p>
                    );
                  }

                  return (
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                      <div className="grid grid-cols-12 bg-slate-50/50 p-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <div className="col-span-6">Nama Material</div>
                        <div className="col-span-2 text-center">Jumlah</div>
                        <div className="col-span-4">Lokasi Terpasang</div>
                      </div>
                      
                      {usedItems.map(item => {
                        const usage = selectedRecord.materials[item.id];
                        return (
                          <div key={item.id} className="grid grid-cols-12 p-3 text-xs items-center hover:bg-slate-50/50 transition-colors">
                            <div className="col-span-6">
                              <span className="font-semibold text-slate-800 block">{item.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-100 rounded px-1.5 py-0.5 inline-block mt-0.5">{item.category}</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-mono">{usage?.qty || 0} Pcs</span>
                            </div>
                            <div className="col-span-4 text-slate-600 font-medium font-mono text-[11px] truncate" title={usage?.lokasi}>
                              📍 {usage?.lokasi || '-'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* General Remarks block */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Keterangan Tambahan:</span>
                <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-600 leading-relaxed font-mono whitespace-pre-line">
                  {selectedRecord.keterangan || <span className="italic text-slate-400">Tidak ada rincian keterangan tambahan yang dimasukkan.</span>}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
              <button
                onClick={() => {
                  onViewPdf?.(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                Cetak / PDF
              </button>
              <button
                onClick={() => {
                  onEdit(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Laporan
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-xs font-semibold bg-slate-800 text-white hover:bg-slate-950 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

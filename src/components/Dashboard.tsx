import React, { useState } from 'react';
import { MaterialRecord, MATERIAL_LIST, MaterialItem } from '../types';
import { BarChart3, PieChart, Activity, Map, Calendar, Layers, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  records: MaterialRecord[];
  materialsList?: MaterialItem[];
}

export default function Dashboard({ records, materialsList }: DashboardProps) {
  const [selectedUlp, setSelectedUlp] = useState<string>('SEMUA');
  const activeMaterials = materialsList || MATERIAL_LIST;

  // Filter records by selected ULP
  const filteredRecords = selectedUlp === 'SEMUA' 
    ? records 
    : records.filter(r => r.ulp === selectedUlp);

  // List of unique ULPs present in records for filter
  const uniqueUlps = Array.from(new Set(records.map(r => r.ulp)));

  // Calculate stats
  const totalRecords = filteredRecords.length;
  
  // Calculate total quantities and breakdown by category dynamically
  let totalMaterialsUsed = 0;
  const categories = Array.from(new Set(activeMaterials.map(m => m.category)));
  const categoryStats: Record<string, number> = {};
  categories.forEach(cat => {
    categoryStats[cat] = 0;
  });

  const materialStats: Record<string, { name: string; qty: number; category: string }> = {};
  activeMaterials.forEach(m => {
    materialStats[m.id] = { name: m.name, qty: 0, category: m.category };
  });

  filteredRecords.forEach(rec => {
    Object.entries(rec.materials).forEach(([matId, usage]) => {
      const qty = Number(usage.qty) || 0;
      if (qty > 0) {
        totalMaterialsUsed += qty;
        
        const matInfo = activeMaterials.find(m => m.id === matId);
        if (matInfo) {
          if (categoryStats[matInfo.category] !== undefined) {
            categoryStats[matInfo.category] += qty;
          } else {
            categoryStats[matInfo.category] = qty;
          }
          if (materialStats[matId]) {
            materialStats[matId].qty += qty;
          }
        }
      }
    });
  });

  // Get top 5 used materials
  const topMaterials = Object.values(materialStats)
    .filter(m => m.qty > 0)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Get records by shift
  const shiftCounts: Record<string, number> = {
    'Shift Pagi (08:00 - 16:00)': 0,
    'Shift Sore (16:00 - 00:00)': 0,
    'Shift Malam (00:00 - 08:00)': 0
  };
  filteredRecords.forEach(r => {
    if (r.shift in shiftCounts) {
      shiftCounts[r.shift]++;
    }
  });

  // Find most active ULP (in filtered or all)
  const ulpActivity: Record<string, number> = {};
  records.forEach(r => {
    ulpActivity[r.ulp] = (ulpActivity[r.ulp] || 0) + 1;
  });
  const mostActiveUlp = Object.keys(ulpActivity).length > 0
    ? Object.entries(ulpActivity).sort((a, b) => b[1] - a[1])[0][0]
    : '-';

  // Find most active Posko
  const poskoActivity: Record<string, number> = {};
  filteredRecords.forEach(r => {
    poskoActivity[r.posko] = (poskoActivity[r.posko] || 0) + 1;
  });
  const mostActivePosko = Object.keys(poskoActivity).length > 0
    ? Object.entries(poskoActivity).sort((a, b) => b[1] - a[1])[0][0]
    : '-';

  // Pie chart parameters
  const categoryColors: Record<string, string> = {
    'KWh Meter': '#3b82f6',      // Blue
    'MCB': '#10b981',            // Emerald
    'Fuse Link': '#f59e0b',       // Amber
    'NH Fuse': '#ec4899',         // Pink
    'Kabel & Aksesoris': '#8b5cf6' // Purple
  };

  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#06b6d4', '#14b8a6'];
  const getCatColor = (cat: string, index: number) => {
    return categoryColors[cat] || defaultColors[index % defaultColors.length];
  };

  const totalCatQty = Object.values(categoryStats).reduce((a, b) => a + b, 0);

  // For donut chart calculation
  let accumulatedAngle = 0;
  const donutData = categories.map((cat, idx) => {
    const qty = categoryStats[cat] || 0;
    const percentage = totalCatQty > 0 ? (qty / totalCatQty) * 100 : 0;
    const angle = totalCatQty > 0 ? (qty / totalCatQty) * 360 : 0;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      name: cat,
      qty,
      percentage: percentage.toFixed(1),
      startAngle,
      angle,
      color: getCatColor(cat, idx)
    };
  });

  return (
    <div className="space-y-6">
      {/* Filters and Subheader */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 font-display">Dashboard Analisis Material</h2>
          <p className="text-xs text-slate-500">Visualisasi data dan ringkasan penggunaan material kerja lapangan</p>
        </div>
        <div className="flex items-center gap-2 font-medium">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Filter Unit (ULP):</label>
          <select
            value={selectedUlp}
            onChange={(e) => setSelectedUlp(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
          >
            <option value="SEMUA">Semua ULP ({records.length} Rekor)</option>
            {uniqueUlps.map(ulp => (
              <option key={ulp} value={ulp}>
                {ulp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-xs">
          <Activity className="mx-auto h-12 w-12 text-slate-300 stroke-1 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 font-display">Belum ada data untuk dianalisis</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Gunakan tab "INPUT MATERIAL" untuk mencatatkan laporan material pertama Anda.
          </p>
        </div>
      ) : (
        <>
          {/* Bento Grid Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stat 1 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total Transaksi</p>
                <p className="text-2xl font-bold text-slate-800 font-display mt-0.5">{totalRecords}</p>
                <p className="text-[10px] text-slate-400 mt-1">Laporan serah terima shift</p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Material Terpasang</p>
                <p className="text-2xl font-bold text-slate-800 font-display mt-0.5">{totalMaterialsUsed}</p>
                <p className="text-[10px] text-slate-400 mt-1">Unit material terdistribusi</p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                <Map className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">ULP Teraktif</p>
                <p className="text-base font-bold text-slate-800 font-display truncate max-w-[150px] mt-1">{mostActiveUlp}</p>
                <p className="text-[10px] text-slate-400 mt-1">Berdasarkan total log sistem</p>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Posko Teraktif</p>
                <p className="text-base font-bold text-slate-800 font-display truncate max-w-[150px] mt-1">{mostActivePosko}</p>
                <p className="text-[10px] text-slate-400 mt-1">Berdasarkan filter aktif</p>
              </div>
            </div>
          </div>

          {/* Visual Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Box: Category Distribution Donut Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <PieChart className="h-4.5 w-4.5 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-800 font-display">Proporsi Kategori Material</h3>
              </div>

              {totalMaterialsUsed === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-slate-400">Tidak ada material terpasang dalam unit terfilter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                  {/* SVG Donut Chart */}
                  <div className="sm:col-span-5 flex justify-center">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {/* Background grey circle */}
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="transparent"
                          stroke="#f1f5f9"
                          strokeWidth="3.5"
                        />
                        
                        {/* Segment mapping */}
                        {(() => {
                          let strokeOffset = 0;
                          return donutData.map((seg, idx) => {
                            if (seg.qty === 0) return null;
                            const strokeDashArray = `${seg.percentage} ${100 - Number(seg.percentage)}`;
                            const offset = 100 - strokeOffset;
                            strokeOffset += Number(seg.percentage);
                            
                            return (
                              <circle
                                key={idx}
                                cx="18"
                                cy="18"
                                r="15.915"
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="3.5"
                                strokeDasharray={strokeDashArray}
                                strokeDashoffset={offset}
                                className="transition-all duration-500 hover:stroke-[4]"
                              />
                            );
                          });
                        })()}
                      </svg>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-slate-700 font-display">{totalMaterialsUsed}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total</span>
                      </div>
                    </div>
                  </div>

                  {/* Legends & Details */}
                  <div className="sm:col-span-7 space-y-2.5">
                    {donutData.map((seg, i) => {
                      if (seg.qty === 0) return null;
                      return (
                        <div key={i} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                            <span className="text-xs font-medium text-slate-600">{seg.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-800">{seg.qty} <span className="text-[10px] text-slate-400 font-normal">Pcs</span></span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1 ml-1.5 font-mono">{seg.percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Top 5 Materials Bar Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-800 font-display">Top 5 Penggunaan Material Terbanyak</h3>
              </div>

              {topMaterials.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-slate-400">Tidak ada material terpasang dalam unit terfilter</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topMaterials.map((item, idx) => {
                    // Calculate relative bar width
                    const maxQty = topMaterials[0].qty;
                    const percentWidth = maxQty > 0 ? (item.qty / maxQty) * 100 : 0;
                    
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-xs">{item.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded-sm font-mono uppercase">
                              {item.category}
                            </span>
                          </div>
                          <span className="font-bold text-slate-800 font-mono">
                            {item.qty} <span className="text-[10px] text-slate-400 font-normal">Pcs</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentWidth}%`,
                              backgroundColor: categoryColors[item.category] || defaultColors[idx % defaultColors.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Shift & Posko Activity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Shift Activity Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktivitas Laporan Berdasarkan Shift</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(shiftCounts).map(([shiftName, count]) => {
                  const shiftLabel = shiftName.split(' ')[1]; // "Pagi", "Sore", "Malam"
                  const maxCount = Math.max(...Object.values(shiftCounts));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={shiftName} className="bg-slate-50 p-4 rounded-xl text-center space-y-2 border border-slate-100">
                      <p className="text-[10px] text-slate-500 font-medium truncate">{shiftLabel}</p>
                      <p className="text-2xl font-bold text-slate-800 font-display">{count}</p>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mx-auto max-w-[60px]">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                      <p className="text-[9px] text-slate-400">Laporan shift</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Tips Box */}
            <div className="bg-blue-900 text-blue-100 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-y-8 translate-x-4 opacity-5 pointer-events-none">
                <BarChart3 className="w-64 h-64 text-white" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-800 text-blue-200 text-[10px] font-semibold rounded-full">
                  <ShieldCheck className="h-3 w-3" />
                  Tips Optimalisasi
                </div>
                <h4 className="text-sm font-semibold font-display text-white">Analisis Penggunaan Bulanan</h4>
                <p className="text-xs text-blue-200 leading-relaxed">
                  Laporan material membantu pemantauan stok di gudang ULP. Pastikan lokasi terpasang diinput secara akurat (seperti nama gardu atau ID pelanggan) guna memudahkan inspeksi lapangan berikutnya.
                </p>
              </div>
              <div className="text-xs text-blue-300 font-medium pt-2">
                * Ekspor data ke format Excel (TSV) di tab "Ekspor & Impor" untuk rekap bulanan PLN Pusat.
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

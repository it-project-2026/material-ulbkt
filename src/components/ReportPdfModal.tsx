import React, { useRef, useState } from 'react';
import { MaterialRecord, MATERIAL_LIST, MaterialItem } from '../types';
import { Download, Printer, X, FileText, Check, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { SignatureModal } from './SignatureModal';

interface ReportPdfModalProps {
  record: MaterialRecord;
  onClose: () => void;
  materialsList?: MaterialItem[];
}

export default function ReportPdfModal({ record, onClose, materialsList }: ReportPdfModalProps) {
  const activeMaterials = materialsList || MATERIAL_LIST;
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  const [sigDataSerah, setSigDataSerah] = useState<string | null>(null);
  const [sigDataTerima, setSigDataTerima] = useState<string | null>(null);
  const [popupState, setPopupState] = useState<'serah' | 'terima' | null>(null);

  // Helper to format date Indonesian style
  const formatDateIndo = (timestampStr: string) => {
    try {
      // Expect YYYY-MM-DD HH:mm or standard date string
      const [datePart] = timestampStr.split(' ');
      const dateObj = new Date(datePart);
      if (isNaN(dateObj.getTime())) return timestampStr;

      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      const dayName = days[dateObj.getDay()];
      const dayNum = dateObj.getDate();
      const monthName = months[dateObj.getMonth()];
      const yearNum = dateObj.getFullYear();

      return `${dayName}, ${dayNum} ${monthName} ${yearNum}`;
    } catch (e) {
      return timestampStr;
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 15;
      const contentWidth = pdfWidth - (2 * margin);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
      
      const filename = `LAPORAN_MATERIAL_YANTEK_${record.posko.replace(/\s+/g, '_')}_${record.ulp.replace(/\s+/g, '_')}_${record.timestamp.split(' ')[0]}.pdf`;
      pdf.save(filename);
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan gunakan tombol cetak printer sebagai alternatif.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    if (!printContent) return;

    // Create a printable iframe or temporary window
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>DAFTAR PEMAKAIAN MATERIAL MOBILE YANTEK</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              color: #000;
              background-color: #fff;
              margin: 20mm 15mm;
              font-size: 11px;
              line-height: 1.2;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .underline { text-decoration: underline; }
            
            .header-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .header-subtitle {
              font-size: 12px;
              margin-bottom: 12px;
            }
            
            .meta-section {
              margin-bottom: 15px;
              width: 100%;
            }
            .meta-row {
              display: flex;
              margin-bottom: 4px;
            }
            .meta-label {
              width: 220px;
              font-weight: bold;
            }
            .meta-val {
              flex: 1;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              border: 1.5px solid #000;
              padding: 5px 3px;
              font-weight: bold;
              font-size: 10px;
              background-color: #f2f2f2 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            td {
              border: 1px solid #000;
              padding: 4px 5px;
              font-size: 10px;
            }
            
            .col-no { width: 35px; text-align: center; }
            .col-name { text-align: left; }
            .col-qty { width: 85px; text-align: center; font-weight: bold; }
            .col-unit { width: 65px; text-align: center; }
            .col-loc { width: 180px; text-align: left; }
            .col-ket { width: 110px; text-align: left; }

            .footer-signature {
              margin-top: 35px;
              display: flex;
              justify-content: space-between;
              padding: 0 40px;
            }
            .sig-block {
              text-align: center;
              width: 220px;
            }
            .sig-space {
              height: 55px;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.parent.document.body.removeChild(iframe);
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top bar */}
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-yellow-400 rounded-xl text-slate-950">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">Laporan Cetak Material Selesai</h3>
              <p className="text-[11px] text-slate-400">Arsip Berita Acara Serah Terima Penggunaan Material Lapangan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Panel */}
        <div className="bg-slate-800/30 px-6 py-3 border-b border-slate-800 flex flex-wrap gap-2.5 items-center justify-between shrink-0">
          <p className="text-xs text-slate-300">
            Dokumen siap diunduh dalam format PDF resmi untuk laporan harian/shift.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak Printer
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className={`flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-xl transition-all cursor-pointer ${
                downloadSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 disabled:opacity-50'
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mengekspor PDF...
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  PDF Tersimpan!
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Download PDF Resmi
                </>
              )}
            </button>
          </div>
        </div>

        {/* Document Preview Scrollable */}
        <div className="p-6 overflow-y-auto bg-slate-950/40 flex justify-center items-start flex-1">
          
          {/* Printable standard size container matching A4 look */}
          <div className="bg-white text-black p-8 sm:p-12 w-full max-w-[794px] border border-slate-200 shadow-lg font-mono select-text relative" style={{ minWidth: '700px' }}>
            
            {/* The actual HTML/CSS structure to capture or print */}
            <div id="printable-report-area" ref={reportRef} style={{ backgroundColor: '#ffffff', color: '#000000', width: '100%', fontSize: '10px' }}>
              
              {/* Header Title */}
              <div className="text-center font-bold uppercase tracking-wide">
                <div style={{ fontSize: '12px' }} className="font-black underline">DAFTAR PEMAKAIAN MATERIAL MOBILE YANTEK</div>
                <div className="text-[10px] mt-0.5">
                  {record.shift.toUpperCase()} {record.posko.toUpperCase()} {record.ulp.toUpperCase()}
                </div>
                <div className="text-[9px] font-normal mt-0.5 mb-2">
                  {formatDateIndo(record.timestamp)}
                </div>
              </div>

              {/* Handover Details */}
              <div className="mb-2 space-y-0.5" style={{ fontSize: '9px' }}>
                <div className="flex">
                  <div className="w-[180px] font-bold">PETUGAS YANG MENYERAHKAN</div>
                  <div className="font-semibold">: {record.petugasSerah.toUpperCase()}</div>
                </div>
                <div className="flex">
                  <div className="w-[180px] font-bold">PETUGAS YANG MENERIMA</div>
                  <div className="font-semibold">: {record.petugasTerima.toUpperCase()}</div>
                </div>
              </div>

              {/* Grid Table */}
              <table className="w-full border-collapse" style={{ borderWidth: '1px', borderColor: '#000000', fontSize: '9px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottomWidth: '1px', borderColor: '#000000' }}>
                    <th style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'center', padding: '3px', fontWeight: 'bold', width: '25px' }}>NO</th>
                    <th style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'left', padding: '3px', fontWeight: 'bold' }}>MATERIAL</th>
                    <th style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'center', padding: '3px', fontWeight: 'bold', width: '80px' }}>MATERIAL TERPAKAI</th>
                    <th style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'center', padding: '3px', fontWeight: 'bold', width: '50px' }}>SATUAN</th>
                    <th style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'left', padding: '3px', fontWeight: 'bold', width: '150px' }}>LOKASI TERPASANG</th>
                    <th style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'left', padding: '3px', fontWeight: 'bold', width: '80px' }}>KET</th>
                  </tr>
                </thead>
                <tbody>
                  {activeMaterials.map((item, index) => {
                    const usage = record.materials[item.id] || { qty: 0, lokasi: '' };
                    const hasQty = usage.qty > 0;
                    
                    // Cable Twisted No 27 gets "Mtr", others get "Bh"
                    const isCable = item.id === 'kabel_twisted' || item.name.toLowerCase().includes('kabel twisted');
                    const unit = isCable ? 'Mtr' : 'Bh';

                    return (
                      <tr key={item.id} style={{ borderBottomWidth: '1px', borderColor: '#000000' }}>
                        <td style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'center', padding: '2px', fontWeight: 'bold' }}>{index + 1}</td>
                        <td style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'left', padding: '2px 4px', fontWeight: 'medium', fontSize: '9px', textTransform: 'uppercase' }}>{item.name}</td>
                        <td style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'center', padding: '2px', fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                          {hasQty ? usage.qty : ''}
                        </td>
                        <td style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'center', padding: '2px', color: '#374151' }}>{unit}</td>
                        <td style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'left', padding: '2px 4px', fontSize: '8.5px' }}>
                          {hasQty ? usage.lokasi : ''}
                        </td>
                        <td style={{ borderWidth: '1px', borderColor: '#000000', textAlign: 'left', padding: '2px 4px', fontSize: '8px' }}>
                          {index === activeMaterials.length - 1 && record.keterangan ? record.keterangan : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signatures and Keterangan Footer */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-center" style={{ fontSize: '10px' }}>
                <div>
                  <p className="font-bold">PETUGAS YANG MENYERAHKAN,</p>
                  <div 
                    className="h-16 rounded mt-1 mb-1 flex items-center justify-center cursor-pointer"
                    style={{ borderWidth: '1px', borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}
                    onClick={() => setPopupState('serah')}
                  >
                    {sigDataSerah ? <img src={sigDataSerah} alt="Signature Serah" className="h-full object-contain" /> : <span style={{ color: '#9ca3af' }}>Klik untuk tanda tangan</span>}
                  </div>
                  <p className="font-bold underline">({record.petugasSerah.toUpperCase()})</p>
                  <p className="text-[8px] font-mono mt-0" style={{ color: '#6b7280' }}>Petugas Serah Shift</p>
                </div>
                <div>
                  <p className="font-bold">PETUGAS YANG MENERIMA,</p>
                  <div 
                    className="h-16 rounded mt-1 mb-1 flex items-center justify-center cursor-pointer"
                    style={{ borderWidth: '1px', borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}
                    onClick={() => setPopupState('terima')}
                  >
                    {sigDataTerima ? <img src={sigDataTerima} alt="Signature Terima" className="h-full object-contain" /> : <span style={{ color: '#9ca3af' }}>Klik untuk tanda tangan</span>}
                  </div>
                  <p className="font-bold underline">({record.petugasTerima.toUpperCase()})</p>
                  <p className="text-[8px] font-mono mt-0" style={{ color: '#6b7280' }}>Petugas Terima Shift</p>
                </div>
              </div>

              <SignatureModal 
                isOpen={!!popupState}
                onClose={() => setPopupState(null)}
                title={popupState === 'serah' ? 'Tanda Tangan Petugas Penyerah' : 'Tanda Tangan Petugas Penerima'}
                onSave={(data) => {
                  if (popupState === 'serah') setSigDataSerah(data);
                  else setSigDataTerima(data);
                }}
              />

              {/* Document footer meta */}
              <div className="mt-4 pt-1 flex justify-between text-[7px]" style={{ borderTopWidth: '1px', borderTopStyle: 'dashed', borderColor: 'rgba(0,0,0,0.3)', color: '#9ca3af' }}>
                <span>LOGIMAT v2.1 • Generated Real-Time</span>
                <span>Ref ID: {record.id} • Timestamps: {record.timestamp}</span>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

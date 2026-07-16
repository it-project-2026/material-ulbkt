import React, { useRef, useState } from 'react';
import { MaterialRecord, MATERIAL_LIST, MaterialItem } from '../types';
import { Download, Printer, X, FileText, Check, Loader2, Eraser } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import SignatureCanvas from 'react-signature-canvas';

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
  
  const sigCanvasSerah = useRef<SignatureCanvas>(null);
  const sigCanvasTerima = useRef<SignatureCanvas>(null);

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
      // Capture with high quality
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High DPI scaling
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // Standard A4 width pixel equivalent at 72dpi is ~794px, 96dpi is ~794px
      });

      const imgData = canvas.toDataURL('image/png');
      
      // A4 page dimensions: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add margin if desired, or fit exactly to A4
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      
      let heightLeft = imgHeight - pageHeight;
      let position = -pageHeight;

      // Handle multi-page if any
      while (heightLeft >= 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
        position -= pageHeight;
      }

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
            <div id="printable-report-area" ref={reportRef} className="bg-white text-black w-full text-xs">
              
              {/* Header Title */}
              <div className="text-center font-bold uppercase tracking-wide">
                <div className="text-sm font-black underline" style={{ fontSize: '15px' }}>DAFTAR PEMAKAIAN MATERIAL MOBILE YANTEK</div>
                <div className="text-xs mt-1" style={{ fontSize: '12px' }}>
                  {record.shift.toUpperCase()} {record.posko.toUpperCase()} {record.ulp.toUpperCase()}
                </div>
                <div className="text-xs font-normal mt-1 mb-4" style={{ fontSize: '11px' }}>
                  {formatDateIndo(record.timestamp)}
                </div>
              </div>

              {/* Handover Details */}
              <div className="mb-4 space-y-1" style={{ fontSize: '11px' }}>
                <div className="flex">
                  <div className="w-[220px] font-bold">PETUGAS YANG MENYERAHKAN</div>
                  <div className="font-semibold">: {record.petugasSerah.toUpperCase()}</div>
                </div>
                <div className="flex">
                  <div className="w-[220px] font-bold">PETUGAS YANG MENERIMA</div>
                  <div className="font-semibold">: {record.petugasTerima.toUpperCase()}</div>
                </div>
              </div>

              {/* Grid Table */}
              <table className="w-full border-collapse border-[1.5px] border-black text-[10px]">
                <thead>
                  <tr className="bg-slate-100 border-b-[1.5px] border-black">
                    <th className="border border-black text-center p-1.5 font-bold w-[35px]" style={{ fontSize: '10px' }}>NO</th>
                    <th className="border border-black text-left p-1.5 font-bold" style={{ fontSize: '10px' }}>MATERIAL</th>
                    <th className="border border-black text-center p-1.5 font-bold w-[120px]" style={{ fontSize: '10px' }}>MATERIAL TERPAKAI</th>
                    <th className="border border-black text-center p-1.5 font-bold w-[65px]" style={{ fontSize: '10px' }}>SATUAN</th>
                    <th className="border border-black text-left p-1.5 font-bold w-[190px]" style={{ fontSize: '10px' }}>LOKASI TERPASANG</th>
                    <th className="border border-black text-left p-1.5 font-bold w-[100px]" style={{ fontSize: '10px' }}>KET</th>
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
                      <tr key={item.id} className="border-b border-black/80 hover:bg-slate-50">
                        <td className="border border-black/80 text-center p-1 font-semibold">{index + 1}</td>
                        <td className="border border-black/80 text-left px-2 py-1 font-medium text-[10px] uppercase">{item.name}</td>
                        <td className="border border-black/80 text-center p-1 font-bold bg-slate-50/20 text-[11px]">
                          {hasQty ? usage.qty : ''}
                        </td>
                        <td className="border border-black/80 text-center p-1 text-slate-700">{unit}</td>
                        <td className="border border-black/80 text-left px-2 py-1 font-normal text-[9.5px] truncate max-w-[190px]">
                          {hasQty ? usage.lokasi : ''}
                        </td>
                        <td className="border border-black/80 text-left px-2 py-1 font-normal text-[9px]">
                          {index === activeMaterials.length - 1 && record.keterangan ? record.keterangan : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signatures and Keterangan Footer */}
              <div className="mt-8 grid grid-cols-2 gap-8 text-center" style={{ fontSize: '11px' }}>
                <div>
                  <p className="font-bold">PETUGAS YANG MENYERAHKAN,</p>
                  <div className="h-20 border border-slate-300 rounded mt-1 mb-2 bg-slate-50 relative">
                    <SignatureCanvas 
                      ref={sigCanvasSerah} 
                      penColor='black' 
                      canvasProps={{width: 300, height: 80, className: 'sigCanvas w-full h-full'}} 
                    />
                    <button 
                      onClick={() => sigCanvasSerah.current?.clear()}
                      className="absolute top-1 right-1 p-1 bg-white/80 rounded hover:bg-white"
                      title="Hapus tanda tangan"
                    >
                      <Eraser className="h-3 w-3 text-slate-500" />
                    </button>
                  </div>
                  <p className="font-bold underline">({record.petugasSerah.toUpperCase()})</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Petugas Serah Shift</p>
                </div>
                <div>
                  <p className="font-bold">PETUGAS YANG MENERIMA,</p>
                  <div className="h-20 border border-slate-300 rounded mt-1 mb-2 bg-slate-50 relative">
                    <SignatureCanvas 
                      ref={sigCanvasTerima} 
                      penColor='black' 
                      canvasProps={{width: 300, height: 80, className: 'sigCanvas w-full h-full'}} 
                    />
                    <button 
                      onClick={() => sigCanvasTerima.current?.clear()}
                      className="absolute top-1 right-1 p-1 bg-white/80 rounded hover:bg-white"
                      title="Hapus tanda tangan"
                    >
                      <Eraser className="h-3 w-3 text-slate-500" />
                    </button>
                  </div>
                  <p className="font-bold underline">({record.petugasTerima.toUpperCase()})</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">Petugas Terima Shift</p>
                </div>
              </div>

              {/* Document footer meta */}
              <div className="mt-6 border-t border-dashed border-black/30 pt-2 flex justify-between text-[8px] text-slate-400 font-sans">
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

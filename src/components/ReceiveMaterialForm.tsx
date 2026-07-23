import React, { useState, useRef } from 'react';
import { Camera, X, ArrowLeft } from 'lucide-react';
import { MATERIAL_LIST, ULP_OPTIONS } from '../types';

interface ReceiveMaterialProps {
  onBack: () => void;
  onSave: (record: any) => void;
  ulpOptions?: (string | any)[] | null;
}

export default function ReceiveMaterialForm({ onBack, onSave, ulpOptions }: ReceiveMaterialProps) {
  const activeUlpsNormalized: any[] = (ulpOptions && ulpOptions.length > 0
    ? ulpOptions.map(opt => typeof opt === 'string' ? { id: opt, name: opt } : opt)
    : ULP_OPTIONS.map(name => ({ id: name, name }))); 

  const [ulp, setUlp] = useState(activeUlpsNormalized[0]?.name || '');
  const [pegawaiPenyerah, setPegawaiPenyerah] = useState('');
  const [petugasPenerima, setPetugasPenerima] = useState('');
  const [materials, setMaterials] = useState<Record<string, number>>({});
  const [foto, setFoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Gagal mengakses kamera.");
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      setFoto(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ulp,
      pegawaiPenyerah,
      petugasPenerima,
      materials,
      fotoTandaTerima: foto,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button onClick={onBack} className="flex items-center gap-2 mb-4 text-blue-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-xl font-bold mb-4">Terima Material dari PLN</h2>
        
        <div>
          <label className="block text-sm font-medium">ULP:</label>
          <select value={ulp} onChange={(e) => setUlp(e.target.value)} className="w-full border rounded p-2" required>
            {activeUlpsNormalized.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium">Tanggal & Jam:</label>
          <input type="text" value={new Date().toLocaleString()} disabled className="w-full border rounded p-2 bg-gray-100" />
        </div>

        <div>
          <label className="block text-sm font-medium">Nama Pegawai PLN Penyerah:</label>
          <input type="text" value={pegawaiPenyerah} onChange={(e) => setPegawaiPenyerah(e.target.value)} className="w-full border rounded p-2" required />
        </div>

        <div>
          <label className="block text-sm font-medium">Petugas Penerima:</label>
          <input type="text" value={petugasPenerima} onChange={(e) => setPetugasPenerima(e.target.value)} className="w-full border rounded p-2" required />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Foto Tanda Serah Terima:</label>
          {foto ? (
            <img src={foto} alt="Tanda Terima" className="w-full h-48 object-cover rounded" />
          ) : (
            <button type="button" onClick={startCamera} className="w-full h-48 bg-gray-100 flex flex-col items-center justify-center rounded border-dashed border-2">
              <Camera className="h-8 w-8 text-gray-400" />
              <span>Buka Kamera</span>
            </button>
          )}
        </div>

        <h3 className="text-lg font-bold mt-6">Input Material</h3>
        <div className="space-y-2">
          {MATERIAL_LIST.map(mat => (
            <div key={mat.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm">{mat.name}</span>
              <input 
                type="number" 
                min="0"
                placeholder="Qty"
                className="w-20 border rounded p-1"
                onChange={(e) => setMaterials({...materials, [mat.id]: Number(e.target.value)})}
              />
            </div>
          ))}
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Simpan Data</button>
      </form>

      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline className="w-full max-w-lg" />
          <div className="flex gap-4 mt-4">
            <button onClick={takePhoto} className="p-4 bg-white rounded-full"><Camera /></button>
            <button onClick={stopCamera} className="p-4 bg-red-500 text-white rounded-full"><X /></button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Eraser, Check } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title: string;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave, title }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="border border-gray-300 rounded mb-4">
          <SignatureCanvas 
            ref={sigCanvas} 
            penColor='black' 
            canvasProps={{width: 500, height: 200, className: 'sigCanvas w-full h-[200px]'}} 
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => sigCanvas.current?.clear()} className="px-4 py-2 border rounded hover:bg-gray-100 flex items-center gap-1">
            <Eraser className="h-4 w-4" /> Hapus
          </button>
          <button onClick={() => {
            const dataUrl = sigCanvas.current?.toDataURL();
            if (dataUrl) onSave(dataUrl);
            onClose();
          }} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 flex items-center gap-1">
            <Check className="h-4 w-4" /> Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

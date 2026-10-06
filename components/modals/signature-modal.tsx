'use client';
import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import { X, RotateCcw, Check } from 'lucide-react';
interface SignatureModalProps {
  employeeName: string; trainingName: string; certificateHash: string;
  onConfirm: (sig: string) => void; onClose: () => void;
}
export function SignatureModal({ employeeName, trainingName, certificateHash, onConfirm, onClose }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  useEffect(() => {
    if (!canvasRef.current) return;
    const c = canvasRef.current;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    padRef.current = new SignaturePad(c, { backgroundColor:'rgb(255,255,255)', penColor:'#1a1a2e', minWidth:1.5, maxWidth:3 });
    padRef.current.addEventListener('afterUpdateStroke', () => setIsEmpty(false));
    return () => { padRef.current?.off(); };
  }, []);
  const clear = () => { padRef.current?.clear(); setIsEmpty(true); };
  const confirm = () => { if (!padRef.current || padRef.current.isEmpty()) return; onConfirm(padRef.current.toDataURL('image/png')); };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Assinatura Digital</h2>
              <p className="text-xs text-slate-500 mt-0.5">{employeeName} · {trainingName}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400"/></button>
          </div>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs text-slate-500 mb-3 text-center">Assine no campo abaixo usando o mouse ou o dedo</p>
          <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50" style={{height:'180px'}}>
            <canvas ref={canvasRef} className="w-full h-full cursor-crosshair touch-none"/>
          </div>
          {isEmpty && <p className="text-xs text-slate-400 text-center mt-2">Campo em branco — assine acima</p>}
        </div>
        <div className="px-6 pb-4 flex gap-2 justify-between items-center">
          <div className="text-xs text-slate-400 font-mono">{certificateHash}</div>
          <div className="flex gap-2">
            <button onClick={clear} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"><RotateCcw className="w-3.5 h-3.5"/>Limpar</button>
            <button onClick={confirm} disabled={isEmpty} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"><Check className="w-3.5 h-3.5"/>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

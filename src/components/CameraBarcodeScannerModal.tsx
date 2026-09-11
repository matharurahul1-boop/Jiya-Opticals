import { t } from '../lib/i18n';
import type { IScannerControls } from '@zxing/browser';
import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Check, Scan, AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CameraBarcodeScannerModal: React.FC = () => {
  const { 
    showCameraScannerModal, 
    closeCameraScanner, 
    triggerBarcodeScan, 
    products, 
    selectedShopFilter 
  } = useApp();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const completedRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [retryCamera, setRetryCamera] = useState(0);

  // Filter products for quick demo scan chips
  const shopProducts = products.filter(
    (p) => selectedShopFilter === 'all' || !p.shopId || p.shopId === selectedShopFilter
  );

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.onended = () => { void ctx.close(); };
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const handleScanComplete = (code: string) => {
    if (!code.trim() || completedRef.current) return;
    completedRef.current = true;
    controlsRef.current?.stop();
    playBeep();
    triggerBarcodeScan(code.trim());
  };

  useEffect(() => {
    if (!showCameraScannerModal) return;
    let mounted = true;
    completedRef.current = false; setIsCameraActive(false); setCameraError(null); setManualCode('');
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Use HTTPS or localhost for camera scanning. A USB scanner can also type into the code field.');
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (!mounted || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 150 });
        const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' }, width: {ideal:1280}, height:{ideal:720} }, audio: false }, videoRef.current, (result, _error, scanControls) => {
          if (!mounted || completedRef.current || !result) return;
          scanControls.stop(); handleScanComplete(result.getText());
        });
        if (!mounted || completedRef.current) controls.stop();
        else { controlsRef.current=controls; setIsCameraActive(true); }
      } catch (error) { if (mounted) setCameraError(error instanceof Error ? error.message : 'Camera could not start. Use manual entry or a USB scanner.'); }
    };
    void start();
    return () => { mounted=false; controlsRef.current?.stop(); controlsRef.current=null; };
  }, [showCameraScannerModal, retryCamera]);

  if (!showCameraScannerModal) return null;

  return (
    <div 
      id="camera-scanner-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div 
        id="camera-scanner-card"
        className="bg-stone-900 text-stone-100 w-full max-w-lg rounded-2xl shadow-2xl border border-stone-700 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 bg-stone-800/90 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-base">{t("Barcode Scanner")}</h3>
              <p className="text-xs text-stone-400">{t("Align barcode or frame tag inside the frame")}</p>
            </div>
          </div>
          <button
            id="btn-close-camera-scanner"
            onClick={closeCameraScanner}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport / Viewfinder */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[320px] overflow-hidden flex items-center justify-center">
          <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${isCameraActive ? '' : 'hidden'}`}
            />
          {!isCameraActive && (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-12 h-12 text-stone-600 mx-auto animate-bounce" />
              <p className="text-sm text-stone-300">
                {cameraError ? cameraError : t("Initializing camera feed...")}
              </p>
              <p className="text-xs text-stone-400">
                {t("You can also use manual entry or a USB barcode/QR scanner. ")}</p>
              {cameraError && <button className="underline" onClick={() => setRetryCamera(n=>n+1)}>{t("Retry camera")}</button>}
            </div>
          )}

          {/* Optical Reticle Overlays */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-64 h-36 border-2 border-amber-400/80 rounded-xl relative flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-sm"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-sm"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-sm"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-sm"></div>

              {/* Laser scanline animation */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Manual Code Input & Quick Simulators */}
        <div className="p-4 bg-stone-800 space-y-4">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleScanComplete(manualCode);
            }}
            className="flex space-x-2"
          >
            <input
              id="input-manual-barcode"
              type="text"
              placeholder={t("Enter / scan barcode number...")}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-400 text-sm focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              id="btn-submit-manual-barcode"
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold rounded-xl text-sm flex items-center space-x-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{t("Apply")}</span>
            </button>
          </form>

          {/* Quick Demo Test Buttons */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {t("Quick Scan Available Inventory: ")}</div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
              {shopProducts.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  id={`btn-quick-scan-${p.barcode}`}
                  onClick={() => handleScanComplete(p.barcode)}
                  type="button"
                  className="px-2.5 py-1.5 bg-stone-700/80 hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-xs rounded-lg transition-all border border-stone-600 text-left flex items-center space-x-1.5"
                >
                  <span className="font-mono font-bold text-amber-300 group-hover:text-stone-950">
                    {p.barcode}
                  </span>
                  <span className="truncate max-w-[140px] text-stone-300">
                    - {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

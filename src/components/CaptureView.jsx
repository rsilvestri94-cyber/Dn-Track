import { useEffect, useRef, useState } from 'react';
import { Aperture, Camera, Check, Paperclip, Pencil, RotateCw, X } from 'lucide-react';
import { fileToOrientedURL, rotate90, captureFrame } from '../lib/image.js';
import { useToast } from '../context/ToastContext.jsx';
import { btnGhost, btnPrimary, card, sectionTitle } from '../lib/ui.js';

export default function CaptureView({ queue, onQueueChange, processing, progress, onProcessAll, onAddManual }) {
  const toast = useToast();
  const [camOpen, setCamOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInRef = useRef(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function openCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 2560 }, height: { ideal: 1920 } },
      });
      streamRef.current = stream;
      setCamOpen(true);
      // il video element viene montato dopo il render successivo
      requestAnimationFrame(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      });
    } catch (err) {
      toast('Fotocamera non disponibile (serve HTTPS o permesso negato). Usa "Carica foto".', 'err');
    }
  }

  function closeCam() {
    stopStream();
    setCamOpen(false);
  }

  function shoot() {
    if (!videoRef.current) return;
    const url = captureFrame(videoRef.current);
    onQueueChange((q) => [...q, { id: Date.now() + Math.random(), url }]);
    try {
      navigator.vibrate && navigator.vibrate(40);
    } catch (e) {}
    setFlash(false);
    requestAnimationFrame(() => setFlash(true));
  }

  async function handleFiles(e) {
    const files = [...e.target.files];
    e.target.value = '';
    for (const file of files) {
      const url = await fileToOrientedURL(file);
      onQueueChange((q) => [...q, { id: Date.now() + Math.random(), url }]);
    }
  }

  function removeQ(id) {
    onQueueChange((q) => q.filter((x) => x.id !== id));
  }

  async function rotateQ(id) {
    const item = queue.find((x) => x.id === id);
    if (!item) return;
    const url = await rotate90(item.url);
    onQueueChange((q) => q.map((x) => (x.id === id ? { ...x, url } : x)));
  }

  const last = queue[queue.length - 1];

  return (
    <div className={card}>
      <h2 className={sectionTitle}>1 · Acquisisci</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <button className={btnGhost} onClick={openCam}>
          <Camera size={16} /> Fotocamera
        </button>
        <label className={`${btnGhost} cursor-pointer`} htmlFor="fileIn">
          <Paperclip size={16} /> Carica foto
        </label>
        <input ref={fileInRef} id="fileIn" type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      </div>
      <button className={`${btnGhost} mt-2.5`} onClick={onAddManual}>
        <Pencil size={16} /> Inserimento manuale
      </button>

      {camOpen && (
        <div className="fixed inset-0 z-200 bg-black">
          <video ref={videoRef} playsInline muted className="block h-full w-full bg-black object-contain" />
          <div
            className={`pointer-events-none absolute inset-0 bg-white ${flash ? 'animate-flash' : 'opacity-0'}`}
            onAnimationEnd={() => setFlash(false)}
          />
          <div className="absolute inset-x-3 top-[calc(12px+env(safe-area-inset-top))] text-center text-xs font-extrabold tracking-wide text-[#93c5fd] [text-shadow:0_1px_4px_#000]">
            Fai entrare tutto il foglio: la foto viene raddrizzata da sola
          </div>
          {queue.length > 0 && (
            <div className="absolute top-[calc(12px+env(safe-area-inset-top))] right-3.5 flex h-8 items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 text-sm font-extrabold text-white shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
              <Camera size={15} /> {queue.length}
            </div>
          )}
          {last && (
            <img
              src={last.url}
              alt=""
              className="absolute bottom-24 left-3.5 h-16.5 w-16.5 rounded-xl border-2 border-white object-cover shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 flex gap-3 bg-[linear-gradient(transparent,rgba(0,0,0,0.55))] p-3.5 pb-[calc(14px+env(safe-area-inset-bottom))]">
            <button className={`${btnGhost} flex-1`} onClick={closeCam}>
              {queue.length ? (
                <>
                  <Check size={16} /> Fatto ({queue.length})
                </>
              ) : (
                <>
                  <X size={16} /> Chiudi
                </>
              )}
            </button>
            <button className={`${btnPrimary} flex-2`} onClick={shoot}>
              <Aperture size={18} /> Scatta
            </button>
          </div>
        </div>
      )}

      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        Inquadra <b>solo la metà superiore orizzontale</b> del foglio e riempi il riquadro blu. Per più dettaglio,{' '}
        <b>ruota il telefono in orizzontale</b>. Accumula più scatti, poi elabora tutto in blocco.
      </p>

      <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
        {queue.map((q) => (
          <div key={q.id} className="relative aspect-3/4 overflow-hidden rounded-lg border border-border bg-surface-2">
            <img src={q.url} alt="" className="h-full w-full object-cover" />
            <button
              className="absolute top-0.75 right-0.75 flex h-5.5 w-5.5 items-center justify-center rounded-full border-none bg-black/65 text-white"
              onClick={() => removeQ(q.id)}
            >
              <X size={13} />
            </button>
            <button
              className="absolute bottom-0.75 right-0.75 flex h-6 w-6 items-center justify-center rounded-full border-none bg-primary/85 text-white"
              title="Ruota 90°"
              onClick={() => rotateQ(q.id)}
            >
              <RotateCw size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="my-3.5 text-[13px] text-muted">{queue.length ? `${queue.length} in coda` : ''}</div>
      <button className={btnPrimary} disabled={queue.length === 0 || processing} onClick={onProcessAll}>
        {queue.length ? `Elabora tutte (${queue.length})` : 'Elabora tutte'}
      </button>
      {processing && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-[linear-gradient(90deg,var(--color-primary),#06b6d4)] transition-[width] duration-300" style={{ width: progress.pct + '%' }} />
          </div>
          <div className="mt-2 text-xs text-muted">{progress.txt}</div>
        </div>
      )}
    </div>
  );
}

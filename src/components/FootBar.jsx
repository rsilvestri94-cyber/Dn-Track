import { btnGhost, btnPrimary } from '../lib/ui.js';

export default function FootBar({ visible, onCancel, onConfirm, confirming }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[rgba(10,15,30,0.94)] px-4.5 py-3 backdrop-blur-lg">
      <div className="mx-auto grid max-w-205 grid-cols-2 gap-2.5">
        <button className={btnGhost} onClick={onCancel}>
          Annulla
        </button>
        <button className={btnPrimary} onClick={onConfirm} disabled={confirming}>
          {confirming ? 'Salvo…' : 'Conferma'}
        </button>
      </div>
    </div>
  );
}

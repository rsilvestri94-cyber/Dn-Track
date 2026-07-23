import { MapPin } from 'lucide-react';

const WH_LABELS = { foggia: 'Foggia 1180', pietra: 'Pietra 1330' };

export default function TopBar({ warehouse, onWarehouseChange, view, onViewChange }) {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 border-b border-border bg-[rgba(10,15,30,0.9)] px-4 py-3 backdrop-blur-lg">
      <div className="text-[19px] font-black tracking-wide text-primary">
        <span>DN Track</span>
        <small className="block text-[11px] font-semibold uppercase tracking-widest text-muted">Acquisizione DDT</small>
      </div>
      <div className="ml-2.5 inline-flex items-center gap-0.5 rounded-full border border-border bg-surface-2 p-[3px]">
        <MapPin size={14} className="ml-1.5 mr-1 opacity-75" />
        {Object.keys(WH_LABELS).map((w) => (
          <button
            key={w}
            className={`rounded-full px-2.5 py-1.5 text-xs font-extrabold tracking-wide ${warehouse === w ? 'bg-primary text-white' : 'text-muted'}`}
            onClick={() => onWarehouseChange(w)}
          >
            {w === 'foggia' ? 'Foggia' : 'Pietra'}
          </button>
        ))}
      </div>
      <div className="ml-auto flex gap-1 rounded-[10px] border border-border bg-surface p-[3px]">
        {[
          ['acq', 'Acquisisci'],
          ['ana', 'Anagrafica'],
          ['arch', 'Archivio'],
        ].map(([v, label]) => (
          <button
            key={v}
            className={`rounded-[7px] px-3.5 py-1.5 text-[13px] font-bold ${view === v ? 'bg-primary text-white' : 'text-muted'}`}
            onClick={() => onViewChange(v)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { WH_LABELS };

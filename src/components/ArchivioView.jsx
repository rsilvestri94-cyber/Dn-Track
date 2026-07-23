import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { WH_LABELS } from './TopBar.jsx';
import { btnGhost, card, sectionTitle } from '../lib/ui.js';

const chip = 'mr-1.5 inline-block rounded-md border border-border bg-surface px-1.75 py-px text-[11px] text-text';

export default function ArchivioView({ archive, onRefresh, loading }) {
  const [q, setQ] = useState('');
  const query = q.toLowerCase().trim();

  const list = useMemo(() => {
    if (!query) return archive;
    return archive.filter((r) => [r.dn, r.turbine, r.van, r.activity, r.sp, r.wtg, r.date, WH_LABELS[r.warehouse]].some((v) => String(v || '').toLowerCase().includes(query)));
  }, [archive, query]);

  return (
    <div className={card}>
      <h2 className={sectionTitle}>Archivio DN</h2>
      <p className="mt-0 text-xs leading-relaxed text-muted">DN salvate nell'archivio · tutti i magazzini. Cerca per DN, turbina, VAN o attività.</p>
      <div className="relative my-1.5">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input
          className="w-full rounded-field border border-border bg-surface-2 py-3 pr-3.5 pl-9.5 text-[15px] text-text outline-none focus:border-primary"
          placeholder="Cerca DN, turbina, VAN…"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="my-2.5 grid grid-cols-2 gap-2.5">
        <button className={btnGhost} onClick={onRefresh}>
          <RefreshCw size={15} /> Aggiorna
        </button>
      </div>
      <div className="my-3.5 text-[13px] text-muted">{archive.length ? `${list.length} DN` + (query ? ` su ${archive.length}` : '') : loading ? 'Carico…' : ''}</div>
      <div>
        {!archive.length && !loading && <div className="p-4.5 text-center text-sm text-muted">Archivio vuoto. Conferma qualche documento per popolarlo.</div>}
        {archive.length > 0 && !list.length && <div className="p-4.5 text-center text-sm text-muted">Nessuna DN trovata.</div>}
        {list
          .slice()
          .reverse()
          .map((r, i) => (
            <div key={r.dn + '-' + i} className="mb-2 rounded-field border border-border bg-surface-2 px-3.5 py-2.75">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="text-[15px] font-extrabold tracking-wide text-text">{r.dn || '—'}</span>
                <span className="text-xs whitespace-nowrap text-muted">{r.date}</span>
              </div>
              <div className="mt-0.75 text-sm font-semibold text-primary">
                {r.turbine || '—'}
                {r.wtg && <span className="text-xs font-semibold text-muted"> · WTG {r.wtg}</span>}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted">
                {r.warehouse && WH_LABELS[r.warehouse] && <span className={chip}>{WH_LABELS[r.warehouse]}</span>}
                <span className={chip}>VAN {r.van || '—'}</span>
                {r.sp && <span className={chip}>{r.sp}</span>}
                {r.activity || ''}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

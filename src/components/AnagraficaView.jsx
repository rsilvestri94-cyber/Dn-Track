import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { btnGhost, card, sectionTitle } from '../lib/ui.js';

const anaInput = 'rounded-lg border border-border bg-bg px-2.5 py-2.25 text-[13px] font-semibold text-text outline-none focus:border-primary';

function AnaRow({ t, onSave, onDelete }) {
  const [parco, setParco] = useState(t.parco || '');
  const [turbina, setTurbina] = useState(t.turbina || '');
  const [wtg, setWtg] = useState(t.wtg || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!parco.trim()) return;
    setSaving(true);
    await onSave({ row: t.row, parco: parco.trim(), turbina: turbina.trim(), wtg: wtg.trim() });
    setSaving(false);
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <input className={`${anaInput} min-w-30 flex-1`} value={parco} placeholder="Parco" onChange={(e) => setParco(e.target.value)} />
      <input className={`${anaInput} w-16`} value={turbina} placeholder="N." onChange={(e) => setTurbina(e.target.value)} />
      <input className={`${anaInput} w-29.5`} value={wtg} placeholder="Seriale WTG" onChange={(e) => setWtg(e.target.value)} />
      <button className="cursor-pointer rounded-lg border-none bg-primary px-3 py-2.25 text-xs font-bold text-white disabled:opacity-45" disabled={saving} onClick={save}>
        Salva
      </button>
      <button className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-2.25 text-muted" onClick={() => onDelete(t.row)}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function AnagraficaView({ registry, onSave, onDelete }) {
  const [newRows, setNewRows] = useState([]);

  function addNew() {
    setNewRows((r) => [{ row: 0, parco: '', turbina: '', wtg: '', _key: Date.now() }, ...r]);
  }

  const sorted = [...registry].sort((a, b) => (a.parco || '').localeCompare(b.parco || '') || ((parseInt(a.turbina) || 0) - (parseInt(b.turbina) || 0)));

  let lastPark = null;
  const blocks = [];
  for (const t of sorted) {
    if (t.parco !== lastPark) {
      blocks.push({ type: 'park', key: 'park-' + t.parco, name: t.parco });
      lastPark = t.parco;
    }
    blocks.push({ type: 'row', key: 'row-' + t.row, t });
  }

  return (
    <div className={card}>
      <h2 className={sectionTitle}>Anagrafica turbine</h2>
      <p className="mt-0 text-xs leading-relaxed text-muted">Parchi e turbine con il loro seriale WTG (chiave univoca SAP). Modifica, aggiungi o elimina. Un seriale = una riga.</p>
      <button className={`${btnGhost} mt-2 mb-1 w-auto px-4`} onClick={addNew}>
        <Plus size={16} /> Aggiungi turbina
      </button>
      <div>
        {newRows.map((t) => (
          <AnaRow
            key={t._key}
            t={t}
            onSave={async (data) => {
              await onSave(data);
              setNewRows((r) => r.filter((x) => x._key !== t._key));
            }}
            onDelete={() => setNewRows((r) => r.filter((x) => x._key !== t._key))}
          />
        ))}
        {!registry.length && !newRows.length && <div className="p-4.5 text-center text-sm text-muted">Nessuna turbina. Aggiungine una, o verifica il collegamento al foglio.</div>}
        {blocks.map((b) =>
          b.type === 'park' ? (
            <div key={b.key} className="mt-4 mb-2 border-b border-border pb-1.5 text-[13px] font-extrabold tracking-wide text-primary uppercase">
              {b.name || '(senza parco)'}
            </div>
          ) : (
            <AnaRow key={b.key} t={b.t} onSave={onSave} onDelete={onDelete} />
          ),
        )}
      </div>
    </div>
  );
}

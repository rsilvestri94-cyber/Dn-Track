import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { flags } from "../lib/parser.js";
import {
    btnGhost,
    card,
    fieldStateClasses,
    inputBase,
    sectionTitle,
} from "../lib/ui.js";

const TYPE_LABELS = { classic: "Classico", project: "Project", tools: "Tools" };
const TYPE_ON_CLASSES = {
    classic: "bg-primary text-white",
    project: "bg-project text-white",
    tools: "bg-new text-[#062033]",
};

const tagClasses = {
    err: "rounded-full bg-err-bg px-1.5 py-px text-[9px] font-extrabold tracking-wide text-err",
    warn: "rounded-full bg-warn-bg px-1.5 py-px text-[9px] font-extrabold tracking-wide text-warn",
};

function FieldInput({ row, fieldKey, label, onEdit }) {
    const st = flags(row)[fieldKey];
    if (st === "off") return null;
    const tag =
        st === "err" ? (
            <span className={tagClasses.err}>da completare</span>
        ) : st === "warn" ? (
            <span className={tagClasses.warn}>verifica</span>
        ) : null;
    const wide = fieldKey === "activity" ? " col-span-full" : "";
    return (
        <div className={`flex flex-col gap-1.25${wide}`}>
            <label className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">
                {label} {tag}
            </label>
            <input
                className={`${inputBase} ${fieldStateClasses[st] || ""}`}
                value={row[fieldKey] || ""}
                onChange={e => onEdit(row._id, fieldKey, e.target.value)}
            />
        </div>
    );
}

/** Select turbina raggruppato per parco (da anagrafica). Le turbine si aggiungono solo dalla pagina Anagrafica — qui solo scelta + refetch. */
function TurbineField({ row, registry, onEdit, onRefetchRegistry }) {
    const [refreshing, setRefreshing] = useState(false);

    const groups = useMemo(() => {
        const sorted = [...registry].sort(
            (a, b) =>
                (a.parco || "").localeCompare(b.parco || "") ||
                (parseInt(a.turbina) || 0) - (parseInt(b.turbina) || 0),
        );
        const byPark = {};
        sorted.forEach(t => {
            const name = (t.parco + " " + t.turbina).trim();
            (byPark[t.parco] = byPark[t.parco] || []).push({
                name,
                wtg: t.wtg,
                row: t.row,
            });
        });
        return byPark;
    }, [registry]);

    const allOptions = useMemo(() => Object.values(groups).flat(), [groups]);

    function handleSelect(e) {
        const v = e.target.value;
        const found = allOptions.find(o => o.name === v);
        onEdit(row._id, "turbine", v);
        if (found && found.wtg) onEdit(row._id, "wtg", found.wtg);
    }

    async function refetch() {
        if (!onRefetchRegistry || refreshing) return;
        setRefreshing(true);
        await onRefetchRegistry();
        setRefreshing(false);
    }

    const st = flags(row).turbine;
    const tag =
        st === "err" ? (
            <span className={tagClasses.err}>da completare</span>
        ) : null;
    const label = row.type === "project" ? "Turbine (parco)" : "Turbine";

    return (
        <div className="col-span-full flex flex-col gap-1.25">
            <label className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">
                {label} {tag}
            </label>
            <div className="flex gap-1.5">
                <select
                    className={`themed-select ${inputBase} min-w-0 flex-1 ${fieldStateClasses[st] || ""}`}
                    value={row.turbine || ""}
                    onChange={handleSelect}
                >
                    <option value="">— Seleziona turbina —</option>
                    {Object.entries(groups).map(([park, list]) => (
                        <optgroup
                            label={park || "(senza parco)"}
                            key={park}
                        >
                            {list.map(o => (
                                <option
                                    key={o.row || o.name}
                                    value={o.name}
                                >
                                    {o.name}
                                    {o.wtg ? ` · WTG ${o.wtg}` : ""}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <button
                    type="button"
                    title="Aggiorna elenco turbine dal foglio"
                    className="flex shrink-0 cursor-pointer items-center justify-center rounded-field border border-border bg-surface-2 px-3 text-text disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={refetch}
                    disabled={refreshing}
                >
                    <RefreshCw
                        size={16}
                        className={refreshing ? "animate-spin" : ""}
                    />
                </button>
            </div>
        </div>
    );
}

function TurbNote({ row }) {
    if (row.type !== "classic") return null;
    const w = row.wtg ? "WTG " + row.wtg : "nessun seriale";
    const base =
        "col-span-full -mt-1 rounded-[7px] px-2.25 py-1.5 text-[11px] font-semibold";
    switch (row._turbStatus) {
        case "fromRegistry":
            return (
                <div className={`${base} bg-ok-bg text-ok`}>
                    {"nome da anagrafica · " + w}
                </div>
            );
        case "mismatch":
            return (
                <div className={`${base} bg-warn-bg text-warn`}>
                    {'documento: "' +
                        (row._parsedTurbine || "") +
                        '" · uso anagrafica · ' +
                        w}
                </div>
            );
        case "baptize":
            return (
                <div className={`${base} bg-new-bg text-new`}>
                    {"nuovo seriale · " + w + " → salvo in anagrafica"}
                </div>
            );
        case "needName":
            return (
                <div className={`${base} bg-err-bg text-err`}>
                    {w +
                        " · non presente in archivio" +
                        " — inseriscila nell'anagrafica e clicca su aggiorna qui di fianco"}
                </div>
            );
        default:
            return row.wtg ? (
                <div className={`${base} bg-ok-bg text-ok`}>{w}</div>
            ) : null;
    }
}

function DupBanner({ row, archDN, whLabels }) {
    const d = archDN.get(String(row.dn || "").trim());
    if (!d) return null;
    const w =
        d.warehouse && whLabels[d.warehouse]
            ? whLabels[d.warehouse]
            : "archivio";
    const extra = [d.date, d.turbine].filter(Boolean).join(" · ");
    return (
        <div className="mx-3.5 mb-2.5 flex items-start gap-1.5 rounded-lg border border-[rgba(245,158,11,0.55)] bg-[rgba(245,158,11,0.14)] px-3 py-2.25 text-[12.5px] font-bold leading-snug text-[#fbbf24]">
            <TriangleAlert
                size={15}
                className="mt-px shrink-0"
            />
            <span>
                DN GIÀ presente ({w}){extra ? " · " + extra : ""}. Confermando
                la aggiungerai di nuovo.
            </span>
        </div>
    );
}

export default function ReviewView({
    rows,
    registry,
    onEdit,
    onSetType,
    onDelRow,
    onAddManual,
    archDN,
    whLabels,
    onRefetchRegistry,
}) {
    if (!rows.length) return null;
    return (
        <div className={card}>
            <h2 className={sectionTitle}>2 · Verifica e correggi</h2>
            <div>
                {rows.map((r, i) => (
                    <div
                        key={r._id}
                        className="mb-3.5 overflow-hidden rounded-card border border-border"
                    >
                        <div className="flex items-center gap-2.5 border-b border-border bg-surface-2 px-3.5 py-2.5">
                            <span className="text-[13px] font-extrabold text-muted">
                                #{i + 1}
                            </span>
                            <div className="ml-auto flex gap-1 rounded-lg bg-bg p-[3px]">
                                {Object.entries(TYPE_LABELS).map(
                                    ([t, label]) => (
                                        <button
                                            key={t}
                                            className={`cursor-pointer rounded-md border-none px-2.5 py-1.25 text-[11px] font-bold ${r.type === t ? TYPE_ON_CLASSES[t] : "bg-transparent text-muted"}`}
                                            onClick={() => onSetType(r._id, t)}
                                        >
                                            {label}
                                        </button>
                                    ),
                                )}
                            </div>
                            <button
                                className="cursor-pointer border-none bg-transparent p-1 text-muted"
                                onClick={() => onDelRow(r._id)}
                            >
                                <Trash2 size={17} />
                            </button>
                        </div>
                        <DupBanner
                            row={r}
                            archDN={archDN}
                            whLabels={whLabels}
                        />
                        <div className="grid grid-cols-2 gap-2.5 p-3.5 max-[520px]:grid-cols-1">
                            <FieldInput
                                row={r}
                                fieldKey="date"
                                label="Data (acquisizione)"
                                onEdit={onEdit}
                            />
                            <FieldInput
                                row={r}
                                fieldKey="dn"
                                label="DN"
                                onEdit={onEdit}
                            />
                            <FieldInput
                                row={r}
                                fieldKey="van"
                                label="VAN"
                                onEdit={onEdit}
                            />
                            <TurbineField
                                row={r}
                                registry={registry}
                                onEdit={onEdit}
                                onRefetchRegistry={onRefetchRegistry}
                            />
                            <TurbNote row={r} />
                            <FieldInput
                                row={r}
                                fieldKey="activity"
                                label={
                                    r.type === "project"
                                        ? "Activity (Reference)"
                                        : "Activity"
                                }
                                onEdit={onEdit}
                            />
                            <FieldInput
                                row={r}
                                fieldKey="sp"
                                label="SP (Project No)"
                                onEdit={onEdit}
                            />
                        </div>
                        <details className="px-3.5 pb-3">
                            <summary className="cursor-pointer text-[11px] text-muted">
                                testo letto (OCR)
                            </summary>
                            <pre className="mt-1.5 max-h-55 overflow-auto rounded-md bg-bg p-2 text-[11px] whitespace-pre-wrap text-muted">
                                {r._err
                                    ? "[ERRORE] " + r._err
                                    : r._raw || "(nessun testo restituito)"}
                            </pre>
                        </details>
                    </div>
                ))}
            </div>
            <button
                className={btnGhost}
                onClick={onAddManual}
            >
                <Plus size={16} /> Aggiungi riga manuale
            </button>
        </div>
    );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import TopBar, { WH_LABELS } from "./components/TopBar.jsx";
import CaptureView from "./components/CaptureView.jsx";
import ReviewView from "./components/ReviewView.jsx";
import AnagraficaView from "./components/AnagraficaView.jsx";
import ArchivioView from "./components/ArchivioView.jsx";
import FootBar from "./components/FootBar.jsx";
import { useToast } from "./context/ToastContext.jsx";
import { dataUrlParts } from "./lib/image.js";
import {
    applySerial,
    buildSerialMap,
    normTurbine,
    oggi,
    parseText,
    splitName,
} from "./lib/parser.js";
import {
    appendRows,
    deleteTurbina,
    getArchive,
    getTurbine,
    ocrImage,
    saveTurbina,
} from "./lib/gas.js";
import { card } from "./lib/ui.js";

export default function App() {
    const toast = useToast();
    const [warehouse, setWarehouse] = useState("foggia");
    const [view, setView] = useState("acq");

    const [queue, setQueue] = useState([]);
    const [rows, setRows] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ pct: 0, txt: "" });
    const [confirming, setConfirming] = useState(false);

    const [registry, setRegistry] = useState([]);
    const [archive, setArchive] = useState([]);
    const [archiveLoading, setArchiveLoading] = useState(false);

    const uid = useRef(0);
    const nextId = () => ++uid.current;

    const serialMap = useMemo(() => buildSerialMap(registry), [registry]);
    const archDN = useMemo(() => {
        const m = new Map();
        archive.forEach(r => {
            const k = String(r.dn || "").trim();
            if (k) m.set(k, r);
        });
        return m;
    }, [archive]);

    async function loadRegistry() {
        try {
            const j = await getTurbine();
            if (j && j.ok) setRegistry(j.turbine || []);
        } catch (e) {
            /* silenzioso: l'app funziona comunque */
        }
    }

    async function loadArchive(silent) {
        if (!silent) setArchiveLoading(true);
        try {
            const j = await getArchive(warehouse);
            if (j && j.ok) setArchive(j.rows || []);
            else throw new Error((j && j.error) || "errore");
        } catch (e) {
            if (!silent)
                toast("Impossibile leggere l'archivio: " + e.message, "err");
        } finally {
            setArchiveLoading(false);
        }
    }

    useEffect(() => {
        loadRegistry();
        loadArchive(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadArchive(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouse]);

    function handleWarehouseChange(w) {
        if (!WH_LABELS[w] || w === warehouse) return;
        setWarehouse(w);
        toast("Magazzino: " + WH_LABELS[w], "ok");
    }

    async function processAll() {
        if (!queue.length) return;
        setProcessing(true);
        const total = queue.length;
        const newRows = [];
        for (let i = 0; i < total; i++) {
            setProgress({
                pct: Math.round((i / total) * 100),
                txt: `Leggo documento ${i + 1} di ${total}…`,
            });
            let r;
            try {
                const { base64, mimeType } = dataUrlParts(queue[i].url);
                const j = await ocrImage(base64, mimeType);
                if (j && j.ok) {
                    const text = j.text || "";
                    r = parseText(text);
                    r._raw = text;
                } else {
                    r = parseText("");
                    r._err = (j && j.error) || "OCR fallito";
                }
            } catch (err) {
                r = parseText("");
                r._err = err.message;
            }
            if (r._err) toast("Doc " + (i + 1) + ": " + r._err, "err");
            r._id = nextId();
            if (!r.type) r.type = "classic";
            if (r.turbine) r.turbine = normTurbine(r.turbine);
            applySerial(r, serialMap);
            newRows.push(r);
        }
        setProgress({ pct: 100, txt: "" });
        setRows(old => [...old, ...newRows]);
        setQueue([]);
        setProcessing(false);
        toast(
            `${newRows.length} document${newRows.length === 1 ? "o" : "i"} pronti da verificare`,
            "ok",
        );
    }

    function editRow(id, key, val) {
        setRows(rs => rs.map(r => (r._id === id ? { ...r, [key]: val } : r)));
    }

    function setRowType(id, t) {
        setRows(rs =>
            rs.map(r => {
                if (r._id !== id) return r;
                const nr = { ...r, type: t };
                if (t === "project") {
                    if (nr.van !== "Project") nr._vanBackup = nr.van;
                    nr.van = "Project";
                } else if (nr.van === "Project") {
                    nr.van = nr._vanBackup || "";
                }
                applySerial(nr, serialMap);
                return nr;
            }),
        );
    }

    function delRow(id) {
        setRows(rs => rs.filter(r => r._id !== id));
    }

    function addManualRow() {
        setRows(rs => [
            ...rs,
            {
                _id: nextId(),
                type: "classic",
                dn: "",
                van: "",
                turbine: "",
                activity: "",
                sp: "",
                date: oggi(),
                wtg: "",
                _turbStatus: "ok",
            },
        ]);
    }

    function cancelRows() {
        if (!rows.length) return;
        if (confirm("Annullare? I dati non confermati verranno persi.")) {
            setRows([]);
            toast("Annullato");
        }
    }

    async function confirmRows() {
        if (!rows.length) return;
        setConfirming(true);
        try {
            for (const r of rows) {
                if (r.type === "classic" && r.wtg && r.turbine) {
                    const s = splitName(r.turbine);
                    await saveTurbina(s.parco, s.turbina, r.wtg);
                }
            }
            const payload = rows.map(r => ({
                date: r.date,
                dn: r.dn,
                van: r.van,
                wtg: r.wtg,
                turbine: r.turbine,
                activity: r.activity,
                sp: r.sp,
            }));
            const j = await appendRows(warehouse, payload);
            if (j && j.ok) {
                toast(
                    `Confermate ${j.inserted} righe → ${WH_LABELS[warehouse]}`,
                    "ok",
                );
                const miss = [];
                if (j.mrpCol === false) miss.push("MRP location");
                if (j.wtgCol === false) miss.push("WTG ID");
                if (j.spCol === false) miss.push("SO number");
                if (miss.length)
                    toast(
                        "Colonne non trovate: " +
                            miss.join(", ") +
                            " — non salvate",
                        "err",
                    );
                setRows([]);
                await loadRegistry();
                await loadArchive(true);
            } else throw new Error((j && j.error) || "errore");
        } catch (err) {
            toast("Salvataggio non riuscito: " + err.message, "err");
        }
        setConfirming(false);
    }

    async function handleSaveAna({ row, parco, turbina, wtg }) {
        if (!parco) {
            toast("Il parco è obbligatorio", "err");
            return;
        }
        try {
            const j = await saveTurbina(parco, turbina, wtg, row);
            if (j && j.ok) {
                toast("Salvato", "ok");
                await loadRegistry();
            } else throw new Error(j && j.error);
        } catch (e) {
            toast("Errore: " + e.message, "err");
        }
    }

    async function handleDeleteAna(row) {
        if (!row) return;
        if (!confirm("Eliminare questa turbina dall'anagrafica?")) return;
        try {
            const j = await deleteTurbina(row);
            if (j && j.ok) {
                toast("Eliminata");
                await loadRegistry();
            } else throw new Error(j && j.error);
        } catch (e) {
            toast("Errore: " + e.message, "err");
        }
    }

    const showEmpty = view === "acq" && !queue.length && !rows.length;
    const showFoot = view === "acq" && rows.length > 0;

    return (
        <>
            <TopBar
                warehouse={warehouse}
                onWarehouseChange={handleWarehouseChange}
                view={view}
                onViewChange={setView}
            />
            <div className="mx-auto max-w-205 p-4.5">
                {view === "acq" && (
                    <>
                        <CaptureView
                            queue={queue}
                            onQueueChange={setQueue}
                            processing={processing}
                            progress={progress}
                            onProcessAll={processAll}
                            onAddManual={addManualRow}
                        />
                        <ReviewView
                            rows={rows}
                            registry={registry}
                            onEdit={editRow}
                            onSetType={setRowType}
                            onDelRow={delRow}
                            onAddManual={addManualRow}
                            archDN={archDN}
                            whLabels={WH_LABELS}
                        />
                        {showEmpty && (
                            <div className={card}>
                                <div className="px-2.5 py-7.5 text-center text-sm text-muted">
                                    <FileText
                                        size={34}
                                        className="mx-auto mb-2.5"
                                    />
                                    Nessun documento in coda.
                                    <br />
                                    Scatta o carica una foto per iniziare.
                                </div>
                            </div>
                        )}
                    </>
                )}
                {view === "ana" && (
                    <AnagraficaView
                        registry={registry}
                        onSave={handleSaveAna}
                        onDelete={handleDeleteAna}
                    />
                )}
                {view === "arch" && (
                    <ArchivioView
                        archive={archive}
                        onRefresh={() => loadArchive()}
                        loading={archiveLoading}
                    />
                )}
            </div>
            <FootBar
                visible={showFoot}
                onCancel={cancelRows}
                onConfirm={confirmRows}
                confirming={confirming}
            />
        </>
    );
}

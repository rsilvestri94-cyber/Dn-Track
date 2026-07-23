/* ===== PARSER a due formati (validato su 9 DDT reali) ===== */
export const PARK_TABLE = {
  ORDONA: 'Ordona',
  'POGGIO IMPERIALE': 'Poggio Imperiale',
  'ORTA NOVA': 'Orta Nova',
  ORTANOVA: 'Orta Nova',
  VOLTURINO: 'Volturino',
  MANFREDONIA: 'Manfredonia',
  'SAN SEVERO': 'San Severo',
  LAMPINO: 'Lampino',
  SANTAGATA: "Sant'Agata",
  'ASCOLI SATRIANO': 'Ascoli Satriano',
  ASCOLI: 'Ascoli Satriano',
  'CERIGNOLA SUD': 'Cerignola Sud',
  CERIGNOLA: 'Cerignola Sud',
  MAZARA: 'Mazara',
  CASALBORE: 'Casalbore',
};

export const titleIt = (s) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const oggi = () => new Date().toLocaleDateString('it-IT');

export function detectType(t) {
  const u = t.toUpperCase().replace(/\s+/g, ' ');
  // Tools va controllato per primo: condivide "Delivery note"/"Reference number"/26300001 con Project,
  // ma solo i DDT Tools hanno "Tools Warehouse" / "Form Header" / un secondo campo "DDT Number".
  if (/TOOLS WAREHOUSE/.test(u) || /FORM HEADER/.test(u) || /\bDDT NUMBER\b/.test(u)) return 'tools';
  // il valore S26306xxx non è sempre adiacente all'etichetta "Customer Number" nel testo OCR
  // (Google a volte legge prima tutte le etichette e poi tutti i valori): non richiediamo adiacenza.
  if (/\bS?26306(?!0001)\d{3}\b/.test(u) || /DOCUMENTO DI TRASPORTO/.test(u)) return 'classic';
  if (/DELIVERY NOTE/.test(u) || /PROJECT NO/.test(u) || /REFERENCE NUMBER/.test(u) || /26300001/.test(u)) return 'project';
  return 'classic';
}

export function findDN(t) {
  // DDT SAP N: 9 cifre che iniziano per "80" (805xxxxxx, 806xxxxxx, ...)
  const m = t.replace(/\s+/g, ' ').match(/\b(80\d{7})\b/);
  return m ? m[1] : '';
}

/** Posizione nel testo dove inizia il blocco parco/turbina (serve solo come ancora per il fallback WTG). */
function findTurbinePos(text) {
  let pos = -1;
  for (const alias of Object.keys(PARK_TABLE)) {
    const re = new RegExp('\\b' + alias.replace(/ /g, '[ _]'), 'i');
    const m = text.match(re);
    if (m && (pos < 0 || m.index < pos)) pos = m.index;
  }
  if (pos < 0) {
    const m = text.match(/[A-Z][A-Za-z]+_[A-Za-z0-9_]+/);
    if (m) pos = m.index;
  }
  return pos;
}

/**
 * Estrae il valore del campo "Operation" (sul foglio Excel è la colonna Activity).
 *
 * L'OCR di Google Drive spesso NON mantiene etichetta e valore adiacenti su questo template:
 * a volte legge prima tutte le etichette e poi tutti i valori, a volte scrive il valore di
 * Operation PRIMA della propria etichetta, a volte "Turbine Description" è illeggibile
 * (scritte a mano depennate, valore spezzato su due righe) e perde l'unico marcatore forte
 * che lo identifica (l'underscore, es. "WEC_CAS14"). Nessun singolo punto di ancoraggio
 * funziona sempre da solo, quindi si provano DUE ancoraggi indipendenti — fine di "Turbine
 * Description" ed etichetta "Operation:" stessa — e si tiene il risultato più corto tra i
 * due: l'ancoraggio sbagliato finisce quasi sempre per inglobare anche il testo di altri
 * campi (più lungo), mentre quello giusto produce la frase breve reale.
 */
function findOperation(text) {
  // Alcuni DDT stampano il template in inglese (Delivery note/Page/CONDITIONS/Shipping/Delivery)
  // invece che in italiano: servono entrambi i set di marcatori. "Attn"/"MOB"/"Contrada" appartengono
  // al blocco indirizzo "Consegnare a" a destra, che l'OCR a volte incolla nello stesso paragrafo.
  const stops = /\b(CONDIZIONI|CONDITIONS|Consegnare a|PESO|Pagina|Page|Causale|Shipping|Incoterms|Delivery|Mittente|Attn|MOB|Contrada)\b/i;
  const flat = text.replace(/\s+/g, ' ');
  const pageValMatch = flat.match(/\b\d+\s+of\s+\d+\b/i);

  function segmentFrom(start) {
    if (start == null || start < 0) return '';
    const end = pageValMatch && pageValMatch.index >= start ? pageValMatch.index : flat.length;
    let seg = flat.slice(start, end);
    const s = seg.search(stops);
    if (s >= 0) seg = seg.slice(0, s);
    return seg.replace(/^\s*Operation:?\s*/i, '').trim();
  }

  const turbMatch = flat.match(/\b[A-Z][A-Za-z]*_[A-Za-z0-9_]+\b/);
  const opMatch = flat.match(/Operation:?\s*/i);

  const candidates = [];
  if (turbMatch) candidates.push(segmentFrom(turbMatch.index + turbMatch[0].length));
  if (opMatch) candidates.push(segmentFrom(opMatch.index + opMatch[0].length));

  const valid = candidates.filter(Boolean);
  if (!valid.length) return '';
  let best = valid.reduce((a, b) => (b.length < a.length ? b : a));

  // rete di sicurezza: un valore Operation reale è sempre una frase breve, mai un blocco indirizzo intero
  if (best.length > 80) best = best.slice(0, 80).trim();
  return best;
}

/** VAN nel blocco indirizzo dei DDT Tools/Project ("VAN SPECIAL 6820-...", niente "Customer Number Sxxxxx"). */
function findVanNearLabel(text) {
  const m = text.match(/\bVAN\b[^0-9\n]{0,25}(\d{3,5})\b/i);
  return m ? m[1] : '';
}

function findKnownPark(text) {
  const up = text.toUpperCase();
  let best = -1,
    name = '';
  for (const alias of Object.keys(PARK_TABLE)) {
    const re = new RegExp('\\b' + alias.replace(/ /g, '[ _]'), 'i');
    const m = up.match(re);
    if (m && (best < 0 || m.index < best)) {
      best = m.index;
      name = PARK_TABLE[alias];
    }
  }
  return name;
}

export function parseText(text) {
  const type = detectType(text);
  const flat = text.replace(/\s+/g, ' ');
  const out = { type, dn: findDN(text), date: oggi(), sp: '', van: '', turbine: '', activity: '', wtg: '' };
  if (type === 'classic') {
    let mc = flat.match(/\bS(\d{6,9})\b/);
    if (mc) out.van = mc[1].slice(-4);
    else {
      const mg = flat.match(/\b26306(\d{3})\b/);
      if (mg) out.van = '6' + mg[1];
    }
    // il nome turbina non si legge dal testo: arriva solo dall'anagrafica via WTG (vedi applySerial)
    const turbinePos = findTurbinePos(text);
    out.activity = findOperation(text);
    out.wtg = (flat.match(/\bWTG\s+(\d{3,6})\b/i) || [])[1] || '';
    if (!out.wtg && turbinePos > 0) {
      const all = text.slice(0, turbinePos).match(/\b\d{4,6}\b/g);
      if (all && all.length) out.wtg = all[all.length - 1];
    }
  } else if (type === 'tools') {
    out.van = findVanNearLabel(text);
    // turbina e activity dei Tools si inseriscono sempre a mano (vedi TurbineField / ReviewView)
  } else {
    out.van = 'Project';
    out.activity = (flat.match(/\b(451\d{7})\b/) || [])[1] || '';
    const sp = (flat.match(/\b(SP[-_ ]?\d{3,})\b/i) || [])[1] || '';
    out.sp = sp.replace(/[_ ]/, '-');
    out.turbine = findKnownPark(text);
  }
  if (!/^\d{4,7}$/.test(String(out.wtg || ''))) out.wtg = ''; // seriale WTG valido = 4-7 cifre
  return out;
}

/* ===== LOGICA SERIALE (lookup + battesimo) ===== */
export function splitName(name) {
  const m = (name || '').match(/^(.*?)\s+(\d+)$/);
  if (m) return { parco: m[1].trim(), turbina: String(parseInt(m[2], 10)) };
  return { parco: (name || '').trim(), turbina: '' };
}

export function normTurbine(name) {
  return String(name || '')
    .replace(/\s+0*(\d+)\s*$/, (_, n) => ' ' + parseInt(n, 10))
    .trim();
}

export function buildSerialMap(registry) {
  const serialMap = {};
  registry.forEach((t) => {
    if (t.wtg) serialMap[String(t.wtg)] = { parco: t.parco, turbina: t.turbina, name: (t.parco + ' ' + t.turbina).trim(), row: t.row };
  });
  return serialMap;
}

export function applySerial(r, serialMap) {
  r._turbStatus = 'ok';
  r._parsedTurbine = r.turbine;
  if (r.type !== 'classic') return r;
  if (!r.wtg) {
    if (!r.turbine) r._turbStatus = 'needName';
    return r;
  }
  const hit = serialMap[String(r.wtg)];
  if (hit) {
    r.turbine = hit.name;
    r._turbStatus = r._parsedTurbine && r._parsedTurbine !== hit.name ? 'mismatch' : 'fromRegistry';
  } else {
    r._turbStatus = r.turbine ? 'baptize' : 'needName';
  }
  return r;
}

export function flags(r) {
  const f = {};
  f.dn = /^80\d{7}$/.test(r.dn) ? 'ok' : r.dn ? 'warn' : 'err';
  f.turbine = r.turbine ? 'ok' : 'err';
  if (r.type === 'classic') {
    f.van = /^\d{4}$/.test(r.van) ? 'ok' : r.van ? 'warn' : 'err';
    f.activity = r.activity ? 'ok' : 'err';
    f.sp = 'off';
  } else if (r.type === 'tools') {
    f.van = /^\d{3,5}$/.test(r.van) ? 'ok' : r.van ? 'warn' : 'err';
    f.activity = r.activity ? 'ok' : 'err';
    f.sp = 'off';
  } else {
    f.van = r.van === 'Project' ? 'ok' : 'warn';
    f.activity = /^\d{6,}$/.test(r.activity) ? 'ok' : r.activity ? 'warn' : 'err';
    f.sp = r.sp ? 'ok' : 'warn';
  }
  f.date = 'ok';
  return f;
}

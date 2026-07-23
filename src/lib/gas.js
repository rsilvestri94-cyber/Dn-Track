export const GAS_URL = 'https://script.google.com/macros/s/AKfycbys-RVzzxEg3y7ZobmP7dzwvYahidO11pYHMblapO4wR8jkEJ8-UkbO7dOwPtVNhR_s/exec';

export async function gasPost(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export const getTurbine = () => gasPost({ action: 'getTurbine' });
export const saveTurbina = (parco, turbina, wtg, row) => gasPost({ action: 'saveTurbina', parco, turbina, wtg, ...(row ? { row } : {}) });
export const deleteTurbina = (row) => gasPost({ action: 'deleteTurbina', row });
export const getArchive = (warehouse) => gasPost({ action: 'getArchive', warehouse });
export const appendRows = (warehouse, rows) => gasPost({ action: 'append', warehouse, rows });
/** OCR via Google Drive (converte l'immagine in Google Doc ed estrae il testo), gratuito nella quota Workspace. */
export const ocrImage = (base64, mimeType) => gasPost({ action: 'ocr', image: base64, mimeType });

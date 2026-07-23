/** Scompone un dataURL nelle sue parti mimeType/base64, per l'invio all'OCR lato server. */
export function dataUrlParts(url) {
  const m = url.match(/^data:(.*?);base64,(.*)$/);
  return { mimeType: m ? m[1] : 'image/jpeg', base64: m ? m[2] : url.split(',')[1] };
}

/** Ruota un dataURL di 90° (usato dal pulsante "ruota" sulle miniature in coda). */
export function rotate90(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.height;
      c.height = img.width;
      const ctx = c.getContext('2d');
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

/** Applica EXIF + auto-raddrizza le foto caricate di lato (orizzontali), come fa lo scatto da fotocamera. */
export async function fileToOrientedURL(file) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const land = bmp.width > bmp.height; // più larga che alta = foglio coricato -> raddrizza
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (land) {
      c.width = bmp.height;
      c.height = bmp.width;
      ctx.translate(c.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(bmp, 0, 0);
    } else {
      c.width = bmp.width;
      c.height = bmp.height;
      ctx.drawImage(bmp, 0, 0);
    }
    bmp.close && bmp.close();
    return c.toDataURL('image/jpeg', 0.92);
  } catch (e) {
    return await new Promise((res, rej) => {
      const rd = new FileReader();
      rd.onload = (ev) => res(ev.target.result);
      rd.onerror = rej;
      rd.readAsDataURL(file);
    });
  }
}

/** Cattura un frame dal <video> raddrizzando se il telefono è in verticale. */
export function captureFrame(video) {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 960;
  const portrait = window.innerHeight >= window.innerWidth;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  if (portrait) {
    c.width = vh;
    c.height = vw;
    ctx.translate(c.width, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(video, 0, 0, vw, vh);
  } else {
    c.width = vw;
    c.height = vh;
    ctx.drawImage(video, 0, 0, vw, vh);
  }
  return c.toDataURL('image/jpeg', 0.92);
}

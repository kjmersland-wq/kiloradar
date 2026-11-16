/**
 * Reads the price from a photo of a shelf-edge label (paper or electronic) with Tesseract.js.
 * The OCR engine runs in the browser from KiloRadar's own server (/ocr): the photo never leaves the phone.
 *
 * The result is only a suggestion: the user always sees it next to the photo and confirms or corrects it
 * before anything is saved.
 */
import type { Worker as TessWorker } from 'tesseract.js';

export interface PriceCandidate {
  value: number;
  /** What was read, e.g. "24,90" */
  text: string;
  score: number;
  /** Height of the printed digits in the photo: a shelf price is the biggest number on the label */
  height: number;
  /** In how many reading passes this value was found */
  votes?: number;
  /** Built from two separately read parts (big digits + raised decimals): counts as two independent readings */
  composite?: boolean;
}

export interface PriceOcrResult {
  best: PriceCandidate | null;
  alternatives: PriceCandidate[];
  /** All text lines the engine read from the label (used to look for a store name). */
  lines: string[];
}

interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  lineText: string;
  /** Which reading pass produced this word (a value seen in several passes is more trustworthy) */
  pass?: number;
}

let workerPromise: Promise<TessWorker> | null = null;

async function getWorker(): Promise<TessWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, OEM } = await import('tesseract.js');
      return createWorker('eng', OEM.LSTM_ONLY, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr',
        langPath: '/ocr',
        gzip: true,
        cacheMethod: 'none',
      });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

// --- image preparation ---------------------------------------------------------------------------

function toCanvas(bitmap: ImageBitmap, rotate: 0 | 90 | 270): HTMLCanvasElement {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(2, Math.max(0.5, 2000 / longest));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = rotate ? h : w;
  canvas.height = rotate ? w : h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h);
  return canvas;
}

/** Grayscale with stretched contrast; optionally black/white (Otsu) and optionally inverted (light text on dark). */
function enhance(src: HTMLCanvasElement, mode: 'gray' | 'bw' | 'bw-inverted'): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d', { willReadFrequently: true });
  const sctx = src.getContext('2d', { willReadFrequently: true });
  if (!ctx || !sctx) return src;
  const img = sctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  const gray = new Uint8ClampedArray(d.length / 4);
  const hist = new Array(256).fill(0);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    gray[p] = g;
    hist[g]++;
  }
  const total = gray.length;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      hi = v;
      break;
    }
  }
  const span = Math.max(1, hi - lo);
  for (let p = 0; p < gray.length; p++) gray[p] = Math.max(0, Math.min(255, ((gray[p] - lo) * 255) / span));

  let threshold = 128;
  if (mode !== 'gray') {
    const h2 = new Array(256).fill(0);
    for (let p = 0; p < gray.length; p++) h2[gray[p]]++;
    let sum = 0;
    for (let v = 0; v < 256; v++) sum += v * h2[v];
    let wB = 0;
    let sumB = 0;
    let best = 0;
    for (let v = 0; v < 256; v++) {
      wB += h2[v];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += v * h2[v];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) {
        best = between;
        threshold = v;
      }
    }
  }
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let g = gray[p];
    if (mode !== 'gray') g = g > threshold ? 255 : 0;
    if (mode === 'bw-inverted') g = 255 - g;
    d[i] = d[i + 1] = d[i + 2] = g;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/**
 * Finds barcodes in the image and paints them over with the background colour. The vertical bars confuse the
 * text reader (the big price right next to a barcode then disappears), and the barcode is read separately anyway.
 * A barcode is recognised as a block with many thin stripes that look the same row after row.
 */
function maskBarcodes(src: HTMLCanvasElement): HTMLCanvasElement {
  const scale = Math.min(1, 700 / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  if (!sctx) return src;
  sctx.drawImage(src, 0, 0, w, h);
  const bw = enhance(small, 'bw');
  const px = bw.getContext('2d', { willReadFrequently: true })?.getImageData(0, 0, w, h).data;
  if (!px) return src;
  const dark = (x: number, y: number) => px[(y * w + x) * 4] < 128;

  const CW = 40;
  const CH = 10;
  const cols = Math.floor(w / CW);
  const rows = Math.floor(h / CH);
  const marked: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let transitions = 0;
      let same = 0;
      let compared = 0;
      for (let y = r * CH; y < (r + 1) * CH && y + 4 < h; y++) {
        for (let x = c * CW; x < (c + 1) * CW; x++) {
          if (x > c * CW && dark(x, y) !== dark(x - 1, y)) transitions++;
          compared++;
          if (dark(x, y) === dark(x, y + 4)) same++;
        }
      }
      marked[r][c] = compared > 0 && transitions / CH >= 8 && same / compared >= 0.93;
    }
  }

  // connected blocks of marked cells that are big enough to be a barcode
  const seen: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const boxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!marked[r][c] || seen[r][c]) continue;
      const stack = [[r, c]];
      seen[r][c] = true;
      let r0 = r, r1 = r, c0 = c, c1 = c;
      while (stack.length) {
        const [cr, cc] = stack.pop() as number[];
        r0 = Math.min(r0, cr); r1 = Math.max(r1, cr); c0 = Math.min(c0, cc); c1 = Math.max(c1, cc);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && marked[nr][nc] && !seen[nr][nc]) {
            seen[nr][nc] = true;
            stack.push([nr, nc]);
          }
        }
      }
      if (c1 - c0 + 1 >= 3 && r1 - r0 + 1 >= 3) boxes.push({ x0: c0 * CW, y0: r0 * CH, x1: (c1 + 1) * CW, y1: (r1 + 1) * CH });
    }
  }
  if (boxes.length === 0) return src;

  // background tone: the most common grey level of the picture
  const sd = sctx.getImageData(0, 0, w, h).data;
  const hist = new Array(256).fill(0);
  for (let i = 0; i < sd.length; i += 4) hist[Math.round(0.299 * sd[i] + 0.587 * sd[i + 1] + 0.114 * sd[i + 2])]++;
  const bg = hist.indexOf(Math.max(...hist));

  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const octx = out.getContext('2d', { willReadFrequently: true });
  if (!octx) return src;
  octx.drawImage(src, 0, 0);
  octx.fillStyle = `rgb(${bg},${bg},${bg})`;
  const m = CW; // margin: the quiet zone and the digits under the bars
  for (const b of boxes) {
    octx.fillRect((b.x0 - m) / scale, (b.y0 - CH) / scale, (b.x1 - b.x0 + 2 * m) / scale, (b.y1 - b.y0 + 2 * CH) / scale);
  }
  return out;
}

// --- reading prices from recognised words ----------------------------------------------------------

const UNIT_PRICE = /(\/\s?(kg|g|l|ltr|st|stk|pcs|100)|pr\.?\s?(kg|l|stk)|per\s?(kg|l|100)|kr\s?\/|€\s?\/|£\s?\/|\$\s?\/|\bkg\b|\bkilo)/i;
const BEFORE_PRICE = /(f[øo]r\b|ordin[æe]r|was\b|vorher|avant|antes|prev|statt|przed|f[öo]re)/i;

function clean(text: string): string {
  return text.replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, '');
}

function extract(words: OcrWord[]): { cands: PriceCandidate[]; maxH: number } {
  const found: PriceCandidate[] = [];
  const height = (w: OcrWord) => w.bbox.y1 - w.bbox.y0;
  const penalty = (w: OcrWord) => (UNIT_PRICE.test(w.lineText) ? 0.3 : BEFORE_PRICE.test(w.lineText) ? 0.5 : 1);
  const push = (value: number, text: string, score: number, h: number, composite = false) => {
    if (value >= 0.2 && value <= 9999) found.push({ value: Math.round(value * 100) / 100, text, score, height: h, composite });
  };

  const tokens = words
    .map((w) => ({ w, c: clean(w.text) }))
    .filter((t) => t.c.length > 0 && t.c.length <= 7 && /\d/.test(t.c));

  // How tall are the biggest printed numbers (not counting long codes such as the EAN under the barcode)?
  const maxH = tokens.filter((t) => t.c.length <= 6).reduce((m, t) => Math.max(m, height(t.w)), 0);

  // "24,90" or "24.90" read as one word
  for (const { w, c } of tokens) {
    if (/^\d{1,4}[.,]\d{2}$/.test(c)) {
      push(parseFloat(c.replace(',', '.')), c.replace('.', ','), height(w) * (w.confidence / 100) * penalty(w) * 1.2, height(w));
    }
  }
  // whole-krone prices written "24,-" / "24:-" / "24.-"
  for (const w of words) {
    const m = w.text.trim().match(/^(\d{1,4})\s?[,.:]\s?[-–—]$/);
    if (m) push(parseInt(m[1], 10), `${m[1]},00`, height(w) * (w.confidence / 100) * penalty(w) * 1.2, height(w));
  }

  // A digit string counts as reliably read when the engine was confident, or when two different passes
  // produced the same text at the same place (digit-only passes report no confidence at all).
  const overlap = (a: OcrWord['bbox'], b: OcrWord['bbox']) => {
    const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
    const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    const inter = ix * iy;
    const union = (a.x1 - a.x0) * (a.y1 - a.y0) + (b.x1 - b.x0) * (b.y1 - b.y0) - inter;
    return union > 0 ? inter / union : 0;
  };
  const reliable = (t: { w: OcrWord; c: string }) =>
    t.w.confidence >= 70 ||
    tokens.some((o) => o.w !== t.w && o.w.pass !== t.w.pass && o.c.replace(/[.,]/g, '') === t.c.replace(/[.,]/g, '') && overlap(o.w.bbox, t.w.bbox) > 0.5);

  // big integer with a small raised "90" next to it (common on Nordic labels): 24 + 90 -> 24,90
  const ints = tokens.filter((t) => /^\d{1,4}$/.test(t.c));
  for (const big of ints) {
    for (const small of ints) {
      if (big === small || small.c.length !== 2) continue;
      const hb = height(big.w);
      const hs = height(small.w);
      const gap = small.w.bbox.x0 - big.w.bbox.x1;
      const centerDelta = (small.w.bbox.y0 + small.w.bbox.y1) / 2 - (big.w.bbox.y0 + big.w.bbox.y1) / 2;
      // the engine sometimes reads "24" + raised "90" as one box that already covers the small digits: allow overlap
      // both parts must have been read with good confidence: a doubtful raised "90" is not worth guessing
      if (
        hs < hb * 0.85 &&
        gap > -hb * 0.7 &&
        gap < hb * 1.2 &&
        centerDelta < hb * 0.25 &&
        reliable(big) &&
        reliable(small)
      ) {
        push(
          parseInt(big.c, 10) + parseInt(small.c, 10) / 100,
          `${big.c},${small.c}`,
          hb * (Math.min(big.w.confidence, small.w.confidence) / 100) * penalty(big.w) * 1.1,
          hb,
          true
        );
      }
    }
  }

  // a lone integer is a weaker guess ("10 kr"): only offered as an alternative, never as the suggested price
  for (const t of ints) {
    if (t.c.length <= 3 && Number(t.c) >= 1) {
      push(parseInt(t.c, 10), t.c, height(t.w) * (t.w.confidence / 100) * penalty(t.w) * 0.25, height(t.w));
    }
  }
  return { cands: found, maxH };
}

const isDecimal = (c: PriceCandidate) => !/^\d+$/.test(c.text);

interface Tally {
  byValue: Map<number, PriceCandidate>;
  maxH: number;
}

/** Counts, once per reading pass, which values were found. A value seen in several passes is far more trustworthy. */
function tally(t: Tally, cands: PriceCandidate[], maxH: number): void {
  t.maxH = Math.max(t.maxH, maxH);
  const seen = new Set<number>();
  for (const c of cands) {
    const prev = t.byValue.get(c.value);
    const first = !seen.has(c.value);
    seen.add(c.value);
    if (!prev) t.byValue.set(c.value, { ...c, votes: c.composite ? 2 : 1 });
    else {
      if (c.score > prev.score) {
        prev.score = c.score;
        prev.height = c.height;
        prev.text = c.text;
      }
      if (first) prev.votes = (prev.votes ?? 1) + 1;
    }
  }
}

function result(t: Tally, lines: string[]): PriceOcrResult {
  const all = [...t.byValue.values()].sort((a, b) => (b.votes ?? 1) - (a.votes ?? 1) || b.score - a.score);
  // The price on a shelf label is the biggest number on it: a decimal price printed much smaller (the kilo
  // price, an old price) is never suggested as THE price, only offered as an alternative.
  const lead = all.find((c) => isDecimal(c) && c.height >= t.maxH * 0.5) ?? null;
  // Alternatives must also be among the bigger numbers: the kilo price or the weight ("750 g") are not offered.
  const rest = all.filter((c) => c !== lead && c.height >= t.maxH * 0.35 && (isDecimal(c) || c.score > 10));
  return { best: lead, alternatives: rest.slice(0, 3), lines };
}

interface TessData {
  blocks?: Array<{
    paragraphs: Array<{
      lines: Array<{ text: string; words: Array<{ text: string; confidence: number; bbox: OcrWord['bbox'] }> }>;
    }>;
  }> | null;
}

function wordsOf(data: TessData): OcrWord[] {
  const words: OcrWord[] = [];
  for (const b of data.blocks ?? []) {
    for (const p of b.paragraphs) {
      for (const l of p.lines) {
        for (const w of l.words) words.push({ text: w.text, confidence: w.confidence, bbox: w.bbox, lineText: l.text });
      }
    }
  }
  return words;
}

/**
 * Tries the photo as is, then with extra contrast, black/white, inverted (light digits on a dark electronic
 * display) and turned sideways. Several reading passes per variant; a price is suggested when it is found
 * in at least two passes, or, after everything has been tried, as the best single guess.
 */
export async function readPriceFromFile(file: File): Promise<PriceOcrResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  const worker = await getWorker();
  const { PSM } = await import('tesseract.js');

  const DIGITS = '0123456789.,:-';
  const sparse = { psm: PSM.SPARSE_TEXT, digitsOnly: false };
  const sparseDigits = { psm: PSM.SPARSE_TEXT, digitsOnly: true };
  const auto = { psm: PSM.AUTO, digitsOnly: false };
  const variants: Array<{ rotate: 0 | 90 | 270; mode: 'gray' | 'bw' | 'bw-inverted'; passes: Array<{ psm: string; digitsOnly: boolean }> }> = [
    { rotate: 0, mode: 'gray', passes: [sparse, sparseDigits, auto] },
    { rotate: 0, mode: 'bw', passes: [sparse, sparseDigits] },
    { rotate: 0, mode: 'bw-inverted', passes: [sparse, sparseDigits] },
    { rotate: 90, mode: 'gray', passes: [sparse, sparseDigits] },
    { rotate: 270, mode: 'gray', passes: [sparse, sparseDigits] },
  ];

  const started = Date.now();
  const t: Tally = { byValue: new Map(), maxH: 0 };
  const lineTexts = new Set<string>();
  try {
    for (const v of variants) {
      const canvas = enhance(maskBarcodes(toCanvas(bitmap, v.rotate)), v.mode);
      const pool: OcrWord[] = [];
      for (const pass of v.passes) {
        await worker.setParameters({
          tessedit_pageseg_mode: pass.psm as never,
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: pass.digitsOnly ? DIGITS : '',
        });
        const { data } = await worker.recognize(canvas, {}, { blocks: true, text: true });
        const passIndex = v.passes.indexOf(pass);
        const got = wordsOf(data as unknown as TessData).map((w) => ({ ...w, pass: passIndex }));
        pool.push(...got);
        got.forEach((w) => lineTexts.add(w.lineText.trim()));
        const { cands, maxH } = extract(pool); // words of all passes of this variant are combined
        tally(t, cands, maxH);
        const r = result(t, [...lineTexts]);
        if (r.best && (r.best.votes ?? 1) >= 2) return r;
        if (Date.now() - started > 25000) return r; // never keep the user waiting forever
      }
    }
  } finally {
    bitmap.close();
    await worker.setParameters({ tessedit_char_whitelist: '' }).catch(() => undefined);
  }
  return result(t, [...lineTexts]);
}

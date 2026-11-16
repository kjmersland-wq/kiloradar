/**
 * Barcode helpers for the photo-of-the-shelf-label flow.
 * - GTIN checksum validation so a misread code is never accepted
 * - normalisation to the form the catalogue uses (UPC-A and GTIN-14 become EAN-13)
 * - decoding a phone photo: scaled down, tried in several rotations and crops
 */

/** True when `code` is a valid GTIN-8/12/13/14 (digits only, correct check digit). */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop() as number;
  let sum = 0;
  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });
  return (10 - (sum % 10)) % 10 === check;
}

/** UPC-A (12) and GTIN-14 with a leading 0 become EAN-13, like Open Food Facts stores them. */
export function normalizeGtin(code: string): string {
  const digits = code.replace(/\D/g, '');
  if (digits.length === 12) return `0${digits}`;
  if (digits.length === 14 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/** Returns the normalised code when it is a valid GTIN, otherwise null. */
export function acceptGtin(raw: string): string | null {
  const code = normalizeGtin(raw);
  return isValidGtin(code) ? code : null;
}

const DETECTOR_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'code_128'];

type DetectorLike = { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> };

async function nativeDetector(): Promise<DetectorLike | null> {
  const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): DetectorLike; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (!BD) return null;
  try {
    const supported = BD.getSupportedFormats ? await BD.getSupportedFormats() : DETECTOR_FORMATS;
    const formats = DETECTOR_FORMATS.filter((f) => supported.includes(f));
    return formats.length ? new BD({ formats }) : null;
  } catch {
    return null;
  }
}

function drawVariant(
  bitmap: ImageBitmap,
  maxSide: number,
  rotate: 0 | 90 | 270,
  crop: { x: number; y: number; w: number; h: number },
  contrast: boolean
): HTMLCanvasElement {
  const sx = Math.round(bitmap.width * crop.x);
  const sy = Math.round(bitmap.height * crop.y);
  const sw = Math.round(bitmap.width * crop.w);
  const sh = Math.round(bitmap.height * crop.h);
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  const swap = rotate !== 0;
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  if (contrast) ctx.filter = 'grayscale(1) contrast(1.6)';
  ctx.drawImage(bitmap, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  return canvas;
}

/**
 * Reads a barcode from a photo (for example of a shelf-edge label, paper or electronic).
 * Tries the whole photo, then the centre, in three orientations, then again with extra contrast.
 * Only a code with a valid check digit is returned.
 */
export async function decodeBarcodeFromFile(file: File): Promise<string | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }

  const native = await nativeDetector();
  let zxing: import('@zxing/browser').BrowserMultiFormatReader | null = null;
  if (!native) {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
    const hints = new Map<unknown, unknown>([
      [DecodeHintType.TRY_HARDER, true],
      [
        DecodeHintType.POSSIBLE_FORMATS,
        [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.ITF, BarcodeFormat.CODE_128],
      ],
    ]);
    zxing = new BrowserMultiFormatReader(hints as never);
  }

  const decodeCanvas = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    try {
      if (native) {
        const found = await native.detect(canvas);
        for (const f of found) {
          const ok = f.rawValue ? acceptGtin(f.rawValue) : null;
          if (ok) return ok;
        }
        return null;
      }
      return acceptGtin((zxing as NonNullable<typeof zxing>).decodeFromCanvas(canvas).getText());
    } catch {
      return null; // nothing found in this variant
    }
  };

  const crops = [
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0.1, y: 0.2, w: 0.8, h: 0.6 },
    { x: 0.2, y: 0.3, w: 0.6, h: 0.4 },
  ];
  const rotations: Array<0 | 90 | 270> = [0, 90, 270];
  try {
    for (const contrast of [false, true]) {
      for (const crop of crops) {
        for (const rotate of rotations) {
          const code = await decodeCanvas(drawVariant(bitmap, 1800, rotate, crop, contrast));
          if (code) return code;
        }
      }
    }
    return null;
  } finally {
    bitmap.close();
  }
}

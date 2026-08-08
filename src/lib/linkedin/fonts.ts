/**
 * Shared Inter font buffers for satori / react-pdf (Vercel-safe, no network).
 */

import { readFileSync } from "fs";
import { join } from "path";

const fontsDir = join(process.cwd(), "public", "fonts");

let regular: Buffer | null = null;
let bold: Buffer | null = null;

export function getInterRegular(): Buffer {
  if (!regular) {
    regular = readFileSync(join(fontsDir, "Inter-Regular.woff"));
  }
  return regular;
}

export function getInterBold(): Buffer {
  if (!bold) {
    bold = readFileSync(join(fontsDir, "Inter-Bold.woff"));
  }
  return bold;
}

export function getInterRegularArrayBuffer(): ArrayBuffer {
  const buf = getInterRegular();
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

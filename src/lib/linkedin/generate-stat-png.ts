/**
 * Generate a PNG stat card for a LinkedIn profile using:
 *   satori  — JSX → SVG  (pure JS, Vercel-safe)
 *   @resvg/resvg-js — SVG → PNG buffer (native, server-only)
 *
 * Returns a Buffer containing the PNG bytes.
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "fs";
import { join } from "path";
import { StatCardTemplate, type StatCardStats } from "./stat-card-image";

const CARD_WIDTH = 800;
const CARD_HEIGHT = 480;

/** Load Inter font from local woff file. Cached in module scope. */
let interFontData: ArrayBuffer | null = null;
async function getInterFont(): Promise<ArrayBuffer> {
  if (interFontData) return interFontData;
  const fontPath = join(process.cwd(), "public", "fonts", "Inter-Regular.woff");
  const buffer = readFileSync(fontPath);
  interFontData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return interFontData;
}

export async function generateStatPng(
  profileName: string,
  stats: StatCardStats,
  month: string
): Promise<Buffer> {
  const fontData = await getInterFont();

  const element = StatCardTemplate({ profileName, stats, month });

  const svg = await satori(element, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: [
      {
        name: "Inter",
        data: fontData,
        weight: 400,
        style: "normal",
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

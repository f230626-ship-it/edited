/**
 * Generate a PNG stat card for a LinkedIn profile using:
 *   satori  — JSX → SVG  (pure JS, Vercel-safe)
 *   @resvg/resvg-js — SVG → PNG buffer (native, server-only)
 *
 * Returns a Buffer containing the PNG bytes.
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getInterRegularArrayBuffer } from "./fonts";
import { StatCardTemplate, type StatCardStats } from "./stat-card-image";

const CARD_WIDTH = 800;
const CARD_HEIGHT = 480;

export async function generateStatPng(
  profileName: string,
  stats: StatCardStats,
  month: string
): Promise<Buffer> {
  const fontData = getInterRegularArrayBuffer();
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

/**
 * Generate dashboard screenshots for LinkedIn outreach stats.
 * Uses @sparticuz/chromium for Vercel (Linux) + puppeteer-core.
 * Falls back to local Chrome on Windows/macOS dev.
 */

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REPORT_SECRET = process.env.CRON_SECRET;
const IS_VERCEL = !!process.env.VERCEL;

async function launchBrowser() {
  if (IS_VERCEL) {
    const execPath = await chromium.executablePath();
    return puppeteer.launch({
      args: chromium.args,
      executablePath: execPath,
      headless: true,
      defaultViewport: { width: 1400, height: 900, deviceScaleFactor: 2 },
    });
  }

  // Local dev: try common Chrome paths
  const localPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
  ];

  const fs = await import("fs");
  let execPath: string | undefined;
  for (const p of localPaths) {
    if (fs.existsSync(p)) { execPath = p; break; }
  }

  if (!execPath) {
    throw new Error("No Chrome binary found — set CHROME_PATH or install Chrome");
  }

  return puppeteer.launch({
    executablePath: execPath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });
}

async function screenshotPage(
  browser: Browser,
  url: string,
  selector: string
): Promise<Buffer | null> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
    console.log("[screenshot] Navigating to:", url);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });

    try {
      await page.waitForSelector(selector, { timeout: 15000 });
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }

    await new Promise((r) => setTimeout(r, 500));

    const screenshot = await page.screenshot({ type: "png", fullPage: true });
    console.log("[screenshot] Generated, size:", screenshot.length);
    return Buffer.from(screenshot);
  } catch (err) {
    console.error("[screenshot] Failed for", url, err);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Take all screenshots in a single browser session:
 * 1. All-profiles combined dashboard
 * 2. Per-profile individual dashboards
 *
 * Returns a Map of profileId -> base64 PNG string.
 * The all-profiles screenshot is keyed as "__all_profiles__".
 */
export async function takeAllScreenshots(
  profiles: { profileId: string; profileName: string }[],
  year: number,
  month: number
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  let browser;
  try {
    browser = await launchBrowser();

    // 1. All-profiles combined screenshot
    const allUrl = `${APP_URL}/linkedin-report-render/all?secret=${REPORT_SECRET}&year=${year}&month=${month}`;
    const allPng = await screenshotPage(browser, allUrl, "[data-report='true']");
    if (allPng) {
      result.set("__all_profiles__", allPng.toString("base64"));
      console.log("[screenshot] All-profiles screenshot OK");
    }

    // 2. Per-profile individual screenshots
    for (const p of profiles) {
      const url = `${APP_URL}/linkedin-report-render/${p.profileId}?secret=${REPORT_SECRET}&year=${year}&month=${month}`;
      const png = await screenshotPage(browser, url, "svg.recharts-surface, [data-report='true']");
      if (png) {
        result.set(p.profileId, png.toString("base64"));
        console.log(`[screenshot] ${p.profileName} screenshot OK`);
      } else {
        console.error(`[screenshot] ${p.profileName} (${p.profileId}) screenshot FAILED`);
      }
    }
  } catch (err) {
    console.error("[screenshot] Browser error:", err);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`[screenshot] Done: ${result.size}/${profiles.length + 1} screenshots captured`);
  return result;
}

/** Screenshot the all-profiles combined dashboard. */
export async function takeAllProfilesScreenshot(
  year: number,
  month: number
): Promise<Buffer | null> {
  let browser;
  try {
    browser = await launchBrowser();
    const url = `${APP_URL}/linkedin-report-render/all?secret=${REPORT_SECRET}&year=${year}&month=${month}`;
    return await screenshotPage(browser, url, "[data-report='true']");
  } finally {
    if (browser) await browser.close();
  }
}

/** Screenshot a single-profile dashboard. */
export async function takeDashboardScreenshot(
  profileId: string,
  year: number,
  month: number
): Promise<Buffer | null> {
  let browser;
  try {
    browser = await launchBrowser();
    const url = `${APP_URL}/linkedin-report-render/${profileId}?secret=${REPORT_SECRET}&year=${year}&month=${month}`;
    return await screenshotPage(browser, url, "svg.recharts-surface, [data-report='true']");
  } finally {
    if (browser) await browser.close();
  }
}

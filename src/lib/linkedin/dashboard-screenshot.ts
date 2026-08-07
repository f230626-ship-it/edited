/**
 * Generate dashboard screenshots for LinkedIn outreach stats.
 * Uses a single browser instance for all screenshots to avoid Chrome launch failures.
 */

import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const REPORT_SECRET = process.env.CRON_SECRET || "linkedin-cron-secret-2026";

async function launchBrowser() {
  return puppeteer.launch({
    executablePath: CHROME_PATH,
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
  browser: puppeteer.Browser,
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

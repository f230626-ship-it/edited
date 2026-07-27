/**
 * Approximate lat/lng for Sales Navigator regions so we can plot coverage overlap.
 * Coordinates are intentionally coarse — good enough for an overlap map, not GIS.
 */

export interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  region: "us" | "eu" | "uk" | "other";
}

const GEO_LOOKUP: Array<{ match: RegExp; point: Omit<GeoPoint, "name"> }> = [
  { match: /san francisco|bay area|sf bay/, point: { lat: 37.77, lng: -122.42, region: "us" } },
  { match: /san diego/, point: { lat: 32.72, lng: -117.16, region: "us" } },
  { match: /los angeles|greater los|la metro/, point: { lat: 34.05, lng: -118.24, region: "us" } },
  { match: /sacramento/, point: { lat: 38.58, lng: -121.49, region: "us" } },
  { match: /seattle|washington metro/, point: { lat: 47.61, lng: -122.33, region: "us" } },
  { match: /portland oregon|portland,?\s*or/, point: { lat: 45.52, lng: -122.68, region: "us" } },
  { match: /denver/, point: { lat: 39.74, lng: -104.99, region: "us" } },
  { match: /phoenix|pheonix/, point: { lat: 33.45, lng: -112.07, region: "us" } },
  { match: /las vegas/, point: { lat: 36.17, lng: -115.14, region: "us" } },
  { match: /salt lake/, point: { lat: 40.76, lng: -111.89, region: "us" } },
  { match: /austin/, point: { lat: 30.27, lng: -97.74, region: "us" } },
  { match: /dallas|fort worth/, point: { lat: 32.78, lng: -96.8, region: "us" } },
  { match: /houston/, point: { lat: 29.76, lng: -95.37, region: "us" } },
  { match: /chicago/, point: { lat: 41.88, lng: -87.63, region: "us" } },
  { match: /new york|nyc|manhattan/, point: { lat: 40.71, lng: -74.01, region: "us" } },
  { match: /boston/, point: { lat: 42.36, lng: -71.06, region: "us" } },
  { match: /miami/, point: { lat: 25.76, lng: -80.19, region: "us" } },
  { match: /atlanta/, point: { lat: 33.75, lng: -84.39, region: "us" } },
  { match: /california/, point: { lat: 36.78, lng: -119.42, region: "us" } },
  { match: /texas/, point: { lat: 31.0, lng: -100.0, region: "us" } },
  { match: /united states|\busa\b|\bus\b/, point: { lat: 39.8, lng: -98.5, region: "us" } },
  { match: /london/, point: { lat: 51.51, lng: -0.13, region: "uk" } },
  { match: /united kingdom|\buk\b|england/, point: { lat: 52.35, lng: -1.17, region: "uk" } },
  { match: /germany|berlin|munich/, point: { lat: 51.16, lng: 10.45, region: "eu" } },
  { match: /france|paris/, point: { lat: 46.23, lng: 2.21, region: "eu" } },
  { match: /netherlands|amsterdam/, point: { lat: 52.13, lng: 5.29, region: "eu" } },
  { match: /canada|toronto|vancouver/, point: { lat: 56.13, lng: -106.35, region: "other" } },
  { match: /australia|sydney|melbourne/, point: { lat: -25.27, lng: 133.77, region: "other" } },
  { match: /singapore/, point: { lat: 1.35, lng: 103.82, region: "other" } },
  { match: /dubai|uae/, point: { lat: 25.2, lng: 55.27, region: "other" } },
];

export function resolveGeoPoint(raw: string): GeoPoint | null {
  const name = raw.trim().toLowerCase();
  if (!name) return null;
  for (const entry of GEO_LOOKUP) {
    if (entry.match.test(name)) {
      return { name: raw.trim(), ...entry.point };
    }
  }
  // Deterministic pseudo-coords for unknown places so they still appear on the chart
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const lat = ((hash % 1400) / 1400) * 100 - 40;
  const lng = (((hash >> 8) % 2800) / 2800) * 280 - 140;
  return { name: raw.trim(), lat, lng, region: "other" };
}

export const PROFILE_COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#ef4444", // red
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#ec4899", // pink
  "#84cc16", // lime
  "#6366f1", // indigo
];

export function profileColor(profile: string, profiles: string[]): string {
  const idx = profiles.findIndex((p) => p.toLowerCase() === profile.toLowerCase());
  return PROFILE_COLORS[(idx >= 0 ? idx : Math.abs(hashStr(profile))) % PROFILE_COLORS.length];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

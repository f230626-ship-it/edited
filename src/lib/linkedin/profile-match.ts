/** Normalize LinkedIn / CRM profile names for fuzzy matching. */
export function normalizeProfileLabel(name: string | null | undefined): string {
  return (name || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * "Abdullah S." ↔ "Abdullah Shafiq", "Fiza S." ↔ "Fiza Shah", etc.
 * Same first token; last token is a single-letter initial of the other's last name.
 */
export function isAbbreviatedNameMatch(a: string, b: string): boolean {
  const at = normalizeProfileLabel(a).split(" ").filter(Boolean);
  const bt = normalizeProfileLabel(b).split(" ").filter(Boolean);
  if (at.length < 2 || bt.length < 2) return false;
  if (at[0] !== bt[0]) return false;
  const aLast = at[at.length - 1];
  const bLast = bt[bt.length - 1];
  if (aLast.length === 1 && bLast.startsWith(aLast)) return true;
  if (bLast.length === 1 && aLast.startsWith(bLast)) return true;
  return false;
}

/**
 * Match a ZIP owner display name (from Profile.csv) to a sales profile id.
 */
export function matchSalesProfileId(
  ownerName: string | null | undefined,
  profiles: { id: string; name: string }[]
): string | null {
  if (!ownerName || profiles.length === 0) return null;
  const owner = normalizeProfileLabel(ownerName);
  if (!owner) return null;

  for (const p of profiles) {
    if (normalizeProfileLabel(p.name) === owner) return p.id;
  }

  for (const p of profiles) {
    if (isAbbreviatedNameMatch(owner, p.name)) return p.id;
  }

  // Containment only when first names match (avoids accidental cross-matches)
  for (const p of profiles) {
    const pn = normalizeProfileLabel(p.name);
    if (!pn) continue;
    const ownerFirst = owner.split(" ")[0];
    const profileFirst = pn.split(" ")[0];
    if (!ownerFirst || ownerFirst !== profileFirst) continue;
    if (owner.includes(pn) || pn.includes(owner)) return p.id;
  }

  const ownerTokens = owner.split(" ").filter((t) => t.length > 1 && t !== "sam");
  for (const p of profiles) {
    const pn = normalizeProfileLabel(p.name);
    // Require full tokens (avoid "abdul" substring-matching inside "abdullah")
    const tokens = pn.split(" ").filter((t) => t.length > 1);
    const hits = tokens.filter((t) => ownerTokens.includes(t));
    if (hits.length >= Math.min(2, tokens.length) && hits.length >= 1) {
      // Prefer 2-token hits; allow single shared token only if it's not a common first name alone
      if (hits.length >= 2) return p.id;
    }
  }

  return null;
}

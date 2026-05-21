// Source classification for qualified CRE channel attribution (b-10).
// Classifies UTM/referrer against the qualified-channel allowlist for LeaseBrief.

export type QualifiedChannel =
  | "linkedin_cre"
  | "reddit_cre"
  | "biggerpockets"
  | "ccim"
  | "other_paid";

export interface AttributionProps {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
}

/**
 * Classify a landing visit against the qualified CRE channel allowlist.
 * Returns a QualifiedChannel if the visit matches, or null if it does not.
 *
 * Qualified channels (from experiment.yaml distribution plan and h-05):
 *   - LinkedIn job-title-targeted campaigns (utm_source: linkedin, utm_medium: cpc/paidsocial)
 *   - r/CommercialRealEstate (referrer: reddit.com or utm_source: reddit)
 *   - BiggerPockets commercial forums (referrer: biggerpockets.com or utm_source: biggerpockets)
 *   - CCIM Institute newsletter (referrer: ccim.com or utm_campaign contains "ccim")
 */
export function classifyChannel(props: AttributionProps): QualifiedChannel | null {
  const { utm_source = "", utm_medium = "", utm_campaign = "", referrer = "" } = props;

  const srcLower = utm_source.toLowerCase();
  const medLower = utm_medium.toLowerCase();
  const campLower = utm_campaign.toLowerCase();
  const refLower = referrer.toLowerCase();

  // LinkedIn CRE — paid social or CPC from LinkedIn
  if (
    srcLower === "linkedin" &&
    (medLower === "cpc" || medLower === "paidsocial" || medLower === "paid_social" || medLower === "paid")
  ) {
    return "linkedin_cre";
  }

  // Reddit CRE — r/CommercialRealEstate referrer or utm_source
  if (
    srcLower === "reddit" ||
    refLower.includes("reddit.com/r/commercialrealestate") ||
    refLower.includes("reddit.com/r/cre")
  ) {
    return "reddit_cre";
  }

  // BiggerPockets — commercial forums
  if (
    srcLower === "biggerpockets" ||
    refLower.includes("biggerpockets.com")
  ) {
    return "biggerpockets";
  }

  // CCIM — newsletter or ccim.com referrer
  if (
    campLower.includes("ccim") ||
    refLower.includes("ccim.com")
  ) {
    return "ccim";
  }

  // Other paid channels that are clearly paid traffic but unclassified above
  if (medLower === "cpc" || medLower === "paid" || medLower === "paidsocial") {
    return "other_paid";
  }

  return null;
}

/**
 * Build attribution props from browser-available signals.
 * Call this on the client side inside a useEffect (browser-only).
 */
export function buildAttributionProps(): AttributionProps {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
  };
}

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { classifyChannel, buildAttributionProps } from "./analytics-attribution";

describe("classifyChannel() — LinkedIn CRE", () => {
  it("classifies LinkedIn + cpc as linkedin_cre", () => {
    expect(
      classifyChannel({
        utm_source: "linkedin",
        utm_medium: "cpc",
        utm_campaign: "cre_broker_targeting",
      })
    ).toBe("linkedin_cre");
  });

  it("classifies LinkedIn + paidsocial as linkedin_cre", () => {
    expect(
      classifyChannel({ utm_source: "linkedin", utm_medium: "paidsocial" })
    ).toBe("linkedin_cre");
  });

  it("classifies LinkedIn + paid_social as linkedin_cre (alternate spelling)", () => {
    expect(
      classifyChannel({ utm_source: "linkedin", utm_medium: "paid_social" })
    ).toBe("linkedin_cre");
  });

  it("classifies LinkedIn + paid as linkedin_cre", () => {
    expect(
      classifyChannel({ utm_source: "linkedin", utm_medium: "paid" })
    ).toBe("linkedin_cre");
  });

  it("matches LinkedIn case-insensitively", () => {
    expect(
      classifyChannel({ utm_source: "LinkedIn", utm_medium: "CPC" })
    ).toBe("linkedin_cre");
  });

  it("does NOT classify LinkedIn organic (no paid medium) as linkedin_cre", () => {
    expect(
      classifyChannel({ utm_source: "linkedin", utm_medium: "organic" })
    ).not.toBe("linkedin_cre");
  });
});

describe("classifyChannel() — Reddit CRE", () => {
  it("classifies a reddit.com/r/CommercialRealEstate referrer as reddit_cre", () => {
    expect(
      classifyChannel({
        referrer: "https://www.reddit.com/r/CommercialRealEstate/comments/abc",
      })
    ).toBe("reddit_cre");
  });

  it("classifies a reddit.com/r/cre referrer as reddit_cre (short form)", () => {
    expect(
      classifyChannel({ referrer: "https://www.reddit.com/r/cre/" })
    ).toBe("reddit_cre");
  });

  it("classifies utm_source=reddit as reddit_cre", () => {
    expect(classifyChannel({ utm_source: "reddit" })).toBe("reddit_cre");
  });

  it("matches reddit referrer case-insensitively", () => {
    expect(
      classifyChannel({
        referrer: "https://WWW.REDDIT.COM/r/CommercialRealEstate",
      })
    ).toBe("reddit_cre");
  });
});

describe("classifyChannel() — BiggerPockets", () => {
  it("classifies a biggerpockets.com referrer as biggerpockets", () => {
    expect(
      classifyChannel({ referrer: "https://www.biggerpockets.com/forums/commercial" })
    ).toBe("biggerpockets");
  });

  it("classifies utm_source=biggerpockets as biggerpockets", () => {
    expect(classifyChannel({ utm_source: "biggerpockets" })).toBe("biggerpockets");
  });
});

describe("classifyChannel() — CCIM", () => {
  it("classifies a ccim.com referrer as ccim", () => {
    expect(classifyChannel({ referrer: "https://www.ccim.com/news" })).toBe("ccim");
  });

  it("classifies utm_campaign containing 'ccim' as ccim", () => {
    expect(
      classifyChannel({ utm_campaign: "ccim_newsletter_q2" })
    ).toBe("ccim");
  });

  it("matches ccim campaign case-insensitively", () => {
    expect(classifyChannel({ utm_campaign: "CCIM_Newsletter" })).toBe("ccim");
  });
});

describe("classifyChannel() — other_paid fallback", () => {
  it("classifies utm_medium=cpc with an unknown source as other_paid", () => {
    expect(
      classifyChannel({ utm_source: "twitter", utm_medium: "cpc" })
    ).toBe("other_paid");
  });

  it("classifies utm_medium=paid with an unknown source as other_paid", () => {
    expect(
      classifyChannel({ utm_source: "facebook", utm_medium: "paid" })
    ).toBe("other_paid");
  });

  it("classifies utm_medium=paidsocial with an unknown source as other_paid", () => {
    expect(
      classifyChannel({ utm_source: "tiktok", utm_medium: "paidsocial" })
    ).toBe("other_paid");
  });
});

describe("classifyChannel() — null (unqualified) result", () => {
  it("returns null for empty props (direct traffic)", () => {
    expect(classifyChannel({})).toBeNull();
  });

  it("returns null for organic referrer (google.com)", () => {
    expect(classifyChannel({ referrer: "https://www.google.com/" })).toBeNull();
  });

  it("returns null for utm_medium=organic", () => {
    expect(
      classifyChannel({ utm_source: "newsletter", utm_medium: "organic" })
    ).toBeNull();
  });

  it("returns null when only utm_campaign is set with no source/medium/referrer match", () => {
    expect(classifyChannel({ utm_campaign: "spring_promo" })).toBeNull();
  });

  it("returns null for an unrelated referrer host", () => {
    expect(classifyChannel({ referrer: "https://example.com/" })).toBeNull();
  });
});

describe("classifyChannel() — priority ordering", () => {
  it("prefers linkedin_cre over other_paid when both could match", () => {
    // utm_source=linkedin + utm_medium=cpc → linkedin_cre (specific wins over generic).
    expect(
      classifyChannel({ utm_source: "linkedin", utm_medium: "cpc" })
    ).toBe("linkedin_cre");
  });

  it("prefers reddit_cre over other_paid when reddit referrer is present alongside paid medium", () => {
    expect(
      classifyChannel({
        utm_medium: "cpc",
        referrer: "https://www.reddit.com/r/CommercialRealEstate",
      })
    ).toBe("reddit_cre");
  });

  it("prefers biggerpockets over other_paid when biggerpockets referrer is present alongside paid medium", () => {
    expect(
      classifyChannel({
        utm_medium: "cpc",
        referrer: "https://www.biggerpockets.com/forums/commercial",
      })
    ).toBe("biggerpockets");
  });

  it("prefers ccim over other_paid when ccim campaign is present alongside paid medium", () => {
    expect(
      classifyChannel({ utm_medium: "cpc", utm_campaign: "ccim_q2" })
    ).toBe("ccim");
  });
});

describe("buildAttributionProps()", () => {
  // We simulate a browser by patching `globalThis.window` and `globalThis.document`
  // for the duration of each test. The SUT guards with `typeof window === "undefined"`.

  const ORIGINAL_WINDOW = (globalThis as { window?: unknown }).window;
  const ORIGINAL_DOCUMENT = (globalThis as { document?: unknown }).document;

  function setBrowser(search: string, referrer: string) {
    (globalThis as { window: unknown }).window = { location: { search } };
    (globalThis as { document: unknown }).document = { referrer };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_WINDOW === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window: unknown }).window = ORIGINAL_WINDOW;
    }
    if (ORIGINAL_DOCUMENT === undefined) {
      delete (globalThis as { document?: unknown }).document;
    } else {
      (globalThis as { document: unknown }).document = ORIGINAL_DOCUMENT;
    }
  });

  it("returns {} when window is undefined (SSR-safe)", () => {
    // Ensure window is unset.
    delete (globalThis as { window?: unknown }).window;
    expect(buildAttributionProps()).toEqual({});
  });

  it("captures utm_source, utm_medium, utm_campaign from the URL", () => {
    setBrowser(
      "?utm_source=linkedin&utm_medium=cpc&utm_campaign=cre_broker",
      ""
    );
    const props = buildAttributionProps();
    expect(props.utm_source).toBe("linkedin");
    expect(props.utm_medium).toBe("cpc");
    expect(props.utm_campaign).toBe("cre_broker");
  });

  it("captures document.referrer when present", () => {
    setBrowser("", "https://www.reddit.com/r/CommercialRealEstate");
    const props = buildAttributionProps();
    expect(props.referrer).toBe("https://www.reddit.com/r/CommercialRealEstate");
  });

  it("returns undefined (not empty string) for missing URL params", () => {
    setBrowser("?utm_source=linkedin", "");
    const props = buildAttributionProps();
    expect(props.utm_source).toBe("linkedin");
    expect(props.utm_medium).toBeUndefined();
    expect(props.utm_campaign).toBeUndefined();
  });

  it("returns undefined (not empty string) for empty referrer", () => {
    setBrowser("?utm_source=linkedin", "");
    const props = buildAttributionProps();
    expect(props.referrer).toBeUndefined();
  });

  it("composes correctly so the props can be fed straight to classifyChannel()", () => {
    setBrowser(
      "?utm_source=linkedin&utm_medium=cpc",
      "https://www.reddit.com/r/CommercialRealEstate"
    );
    const props = buildAttributionProps();
    // Reddit referrer wins because the source rule's "reddit_cre" branch matches
    // the referrer regardless of LinkedIn utm fields being absent of a paid medium match.
    // Here LinkedIn + cpc also matches → expect linkedin_cre because that branch runs first.
    expect(classifyChannel(props)).toBe("linkedin_cre");
  });
});

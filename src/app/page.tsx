import { DEFAULT_VARIANT_SLUG, getVariantBySlug } from "@/lib/variants";
import { LandingPage } from "./_landing/LandingPage";

export default function RootPage() {
  const variant = getVariantBySlug(DEFAULT_VARIANT_SLUG);
  if (!variant) {
    throw new Error(
      `Default variant '${DEFAULT_VARIANT_SLUG}' missing from src/lib/variants.ts`,
    );
  }
  return <LandingPage variant={variant} />;
}

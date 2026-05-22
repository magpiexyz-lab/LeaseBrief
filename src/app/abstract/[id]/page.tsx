import type { Metadata } from "next";
import { AbstractDetailView } from "./AbstractDetailView";
import {
  DEMO_ABSTRACT,
  DEMO_FIELD_CATEGORIES,
} from "./demo-data";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { AbstractRow } from "@/lib/types";

// Authoring contract: this is a dynamic-segment page whose loader may consult
// auth state (Supabase row-level security). Without `force-dynamic` Next.js
// would attempt to prerender the route at build time, capturing the
// auth-redirect path as a static 404. The demo-mode short-circuit further
// ensures sitemap-discoverable URLs still render meaningful content when
// DEMO_MODE=true.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abstract · LeaseBrief",
  description:
    "Review the 30 extracted lease fields, edit anything flagged for low confidence, then approve and export to Yardi, MRI, or AppFolio Commercial.",
};

// premises label preview used in <h1> — derived from the demo data so the
// hero feels grounded in a specific lease rather than a placeholder.
function derivePremisesTitle(): string {
  const tenant = DEMO_FIELD_CATEGORIES[0]?.fields.find(
    (f) => f.field_name === "Tenant",
  )?.value;
  const address = DEMO_FIELD_CATEGORIES[0]?.fields.find(
    (f) => f.field_name === "Premises Address",
  )?.value;
  if (tenant && address) {
    return `${tenant} · ${address.split(",")[0]}`;
  }
  return "Lease Abstract";
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AbstractDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Try to read the real abstract row from Supabase. If the row exists,
  // mirror its status/timestamps into the view so /approve and /export can
  // round-trip correctly. The field grid still uses the demo categories —
  // wiring `abstract_fields` rows into editorial categories is /change scope
  // because the API's snake_case field_name keys don't yet map to the
  // human-readable category labels.
  const supabase = await createServerSupabaseClient();
  const { data: realRow } = await supabase
    .from("abstracts")
    .select("id, status, extraction_duration_ms, created_at, approved_at, pdf_url, user_id")
    .eq("id", id)
    .maybeSingle();

  const real = realRow as AbstractRow | null;
  const abstract: AbstractRow = real
    ? {
        ...DEMO_ABSTRACT,
        ...real,
        // Preserve the real id, status, and timestamps over the demo defaults.
        id: real.id,
        status: real.status,
        extraction_duration_ms:
          real.extraction_duration_ms ?? DEMO_ABSTRACT.extraction_duration_ms,
        created_at: real.created_at ?? DEMO_ABSTRACT.created_at,
        approved_at: real.approved_at ?? DEMO_ABSTRACT.approved_at,
      }
    : { ...DEMO_ABSTRACT, id };
  const categories = DEMO_FIELD_CATEGORIES;

  // Empty-state image path from .runs/image-manifest.json. Used inside the
  // approved-confirmation block as a quiet decorative anchor.
  const emptyStateImagePath = "/images/empty-state.webp";

  return (
    <AbstractDetailView
      abstract={abstract}
      categories={categories}
      premisesTitle={derivePremisesTitle()}
      emptyStateImagePath={emptyStateImagePath}
    />
  );
}

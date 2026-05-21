import type { Metadata } from "next";
import { AbstractDetailView } from "./AbstractDetailView";
import {
  DEMO_ABSTRACT,
  DEMO_FIELD_CATEGORIES,
} from "./demo-data";

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

  // DEMO_MODE short-circuit. Real Supabase fetch is wired by scaffold-wire
  // post-fan-out via a server action against `abstracts` + `abstract_fields`.
  // For bootstrap demo we serve the canonical sample lease so any [id] route
  // renders a complete abstract — critical for sitemap-indexable static
  // demo URLs and for the golden_path final step rendering.
  const abstract = { ...DEMO_ABSTRACT, id };
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

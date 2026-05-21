import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  VARIANTS,
  getVariantBySlug,
  listVariantSlugs,
} from "@/lib/variants";
import { LandingPage } from "../../_landing/LandingPage";

export function generateStaticParams() {
  return VARIANTS.map((v) => ({ variant: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ variant: string }>;
}): Promise<Metadata> {
  const { variant: slug } = await params;
  const variant = getVariantBySlug(slug);
  if (!variant) return {};
  return {
    title: `${variant.headline} — LeaseBrief`,
    description: variant.subheadline,
    openGraph: {
      title: variant.headline,
      description: variant.subheadline,
    },
  };
}

export default async function VariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant: slug } = await params;
  const variant = getVariantBySlug(slug);
  if (!variant) {
    notFound();
  }
  return <LandingPage variant={variant} />;
}

export const dynamicParams = false;

// Static check: listVariantSlugs() is used in tests to validate routing.
export const _allowedSlugs = listVariantSlugs();

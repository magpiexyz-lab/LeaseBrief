import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — LeaseBrief",
  description:
    "$19 per month for 50 lease abstracts. Replace one outsourced abstract — at $200-500 each — and the rest of the month pays for itself.",
};

export default function PricingPage() {
  return <PricingClient />;
}

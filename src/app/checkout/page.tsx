import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Opening secure checkout — LeaseBrief",
  description:
    "We're handing you off to our payment provider to finish your LeaseBrief Pro subscription.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutClient />
    </Suspense>
  );
}

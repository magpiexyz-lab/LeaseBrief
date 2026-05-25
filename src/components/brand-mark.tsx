// Shared brand wordmark — used by the landing-page header and the global
// NavBar so the logo is identical across marketing and authenticated routes.
// Form: serif "LB" with a brass underline beneath the L, followed by the
// "LeaseBrief" wordmark. Keeps the design language coherent.

export function Monogram({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-label="LeaseBrief"
      className="inline-flex items-end leading-none"
      style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: size }}
    >
      <span
        className="relative text-[var(--ink)]"
        style={{ letterSpacing: "-0.04em" }}
      >
        L
        <span
          aria-hidden
          className="absolute -bottom-1 left-0 h-[2px] w-[120%]"
          style={{ background: "var(--brass)" }}
        />
      </span>
      <span
        className="ml-[-0.05em] text-[var(--ink)]"
        style={{ fontSize: size * 1.08, letterSpacing: "-0.06em" }}
      >
        B
      </span>
    </span>
  );
}

// Full brand lockup — monogram + wordmark. Used in NavBar / landing top-bar.
export function BrandLockup({
  monogramSize = 24,
  wordmarkSize = 18,
}: {
  monogramSize?: number;
  wordmarkSize?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Monogram size={monogramSize} />
      <span
        className="font-display font-semibold tracking-tight text-[var(--ink)]"
        style={{ fontSize: wordmarkSize, letterSpacing: "-0.01em" }}
      >
        LeaseBrief
      </span>
    </span>
  );
}

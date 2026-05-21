const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

// Vercel's proxy appends the verified client IP as the LAST entry in the
// X-Forwarded-For chain. Entries BEFORE the last one are forwarded from the
// client (or upstream proxies) and are NOT trusted — an attacker can supply
// arbitrary `X-Forwarded-For: <random>` to inject a unique-per-request key,
// bypassing per-IP rate caps. Always derive the rate-limit key via this
// helper, never via the raw header value. (Issue #1361 / CVSS-medium.)
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const last = xff.split(",").at(-1)?.trim();
    if (last) return last;
  }
  return headers.get("x-real-ip") ?? "unknown";
}

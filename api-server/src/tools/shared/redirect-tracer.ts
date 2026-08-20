import { assertSafeUrl } from "./fetch-safe.js";

export type RedirectHop = {
  url: string;
  status: number;
  location?: string;
};

const META_REFRESH_RE =
  /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'\s>]+)/i;

export async function traceRedirects(
  url: string,
  maxHops = 10,
): Promise<{ hops: RedirectHop[]; finalUrl: string }> {
  const hops: RedirectHop[] = [];
  let current = url;

  for (let i = 0; i < maxHops; i++) {
    await assertSafeUrl(current);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "ScamHelpAI/1.0" },
      });
    } finally {
      clearTimeout(timeout);
    }

    const hop: RedirectHop = { url: current, status: response.status };
    const location = response.headers.get("location");

    if (location && response.status >= 300 && response.status < 400) {
      hop.location = location;
      hops.push(hop);
      current = new URL(location, current).toString();
      continue;
    }

    hops.push(hop);

    if (response.status < 300 || response.status >= 400) {
      const body = await response.text();
      const metaMatch = body.match(META_REFRESH_RE);
      if (metaMatch?.[1]) {
        const next = new URL(metaMatch[1], current).toString();
        hops.push({
          url: next,
          status: 0,
          location: "meta-refresh",
        });
        current = next;
        continue;
      }
    }

    break;
  }

  return { hops, finalUrl: current };
}

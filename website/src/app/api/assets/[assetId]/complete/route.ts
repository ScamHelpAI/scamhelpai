import {
  analyzerErrorMessage,
  getScamhelpApiBase,
} from "@/lib/scamhelp-api-base";

type RouteContext = { params: Promise<{ assetId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { assetId } = await context.params;

  const upstream = await fetch(
    `${getScamhelpApiBase()}/v1/assets/${encodeURIComponent(assetId)}/complete`,
    { method: "POST" },
  );

  const responseBody = await upstream.text();

  if (!upstream.ok) {
    return Response.json(
      { message: analyzerErrorMessage(upstream.status, responseBody) },
      { status: upstream.status },
    );
  }

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

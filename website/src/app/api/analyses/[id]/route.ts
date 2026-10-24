import {
  analyzerErrorMessage,
  getScamhelpApiBase,
} from "@/lib/scamhelp-api-base";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const upstream = await fetch(
    `${getScamhelpApiBase()}/v1/analyses/${encodeURIComponent(id)}`,
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

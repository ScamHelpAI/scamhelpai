import {
  analyzerErrorMessage,
  getScamhelpApiBase,
} from "@/lib/scamhelp-api-base";

export async function POST(request: Request) {
  const body = await request.text();

  const upstream = await fetch(`${getScamhelpApiBase()}/v1/assets/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

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

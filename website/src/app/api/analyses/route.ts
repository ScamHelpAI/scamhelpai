import {
  analyzerErrorMessage,
  getScamhelpApiBase,
} from "@/lib/scamhelp-api-base";

export async function POST(request: Request) {
  const body = await request.text();

  const send = () =>
    fetch(`${getScamhelpApiBase()}/v1/analyses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

  // The API's first request after sitting idle often fails with a 500 or a
  // dropped connection, and the server marks it failed, so one retry is safe.
  let upstream = await send().catch(() => null);
  if (!upstream || upstream.status >= 500) {
    upstream = await send();
  }

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

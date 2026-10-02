// Cloudflare Worker:
// Browser (GitHub Pages) -> this Worker -> Google Cloud Translation Basic v2
//
// Required Worker Secret:
//   GOOGLE_TRANSLATE_API_KEY
//
// Set it from the Cloudflare dashboard as a Secret,
// or with Wrangler:
//   npx wrangler secret put GOOGLE_TRANSLATE_API_KEY

const GOOGLE_ENDPOINT =
  "https://translation.googleapis.com/language/translate/v2";

const ALLOWED_ORIGIN =
  "https://mimiuuouuv1.github.io";

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function json(body, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (origin && origin !== ALLOWED_ORIGIN) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed." }, 403, origin);
    }

    if (request.method !== "POST") {
      return json({ error: "POST only." }, 405, origin);
    }

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: "Invalid JSON." }, 400, origin);
    }

    const q = typeof input.q === "string" ? input.q : "";
    const source = typeof input.source === "string" ? input.source : "";
    const target = typeof input.target === "string" ? input.target : "";
    const format = input.format === "html" ? "html" : "text";

    if (!q || !source || !target) {
      return json({ error: "q, source, and target are required." }, 400, origin);
    }

    if (!env.GOOGLE_TRANSLATE_API_KEY) {
      return json({ error: "Worker secret GOOGLE_TRANSLATE_API_KEY is not configured." }, 500, origin);
    }

    const url =
      `${GOOGLE_ENDPOINT}?key=${encodeURIComponent(env.GOOGLE_TRANSLATE_API_KEY)}`;

    let googleResponse;
    try {
      googleResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          q,
          source,
          target,
          format,
        }),
      });
    } catch {
      return json({ error: "Could not connect to Google Translation API." }, 502, origin);
    }

    const text = await googleResponse.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return json(
        { error: "Google API returned invalid JSON.", raw: text.slice(0, 500) },
        502,
        origin
      );
    }

    if (!googleResponse.ok) {
      return json(
        {
          error:
            data?.error?.message ||
            data?.error?.status ||
            `Google API HTTP ${googleResponse.status}`,
        },
        googleResponse.status,
        origin
      );
    }

    return json(data, 200, origin);
  },
};

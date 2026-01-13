import { NextRequest } from "next/server";

const PROXY_TARGET_URL =
  process.env.PROXY_TARGET_URL;

// Headers that should not be forwarded
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

// Headers to exclude from response (fetch auto-decompresses, so encoding headers cause issues)
const EXCLUDED_RESPONSE_HEADERS = new Set([
  ...HOP_BY_HOP_HEADERS,
  "content-encoding",
  "content-length",
]);

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxyRequest(
  request: NextRequest,
  { params }: RouteContext
): Promise<Response> {
  const resolvedParams = await params;
  const pathSegments = resolvedParams.path || [];
  const path = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "";

  const url = new URL(request.url);
  const queryString = url.search;

  const targetUrl = `${PROXY_TARGET_URL}${path}${queryString}`;

  // Forward headers, excluding hop-by-hop headers
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // Set the host header to the target host
  const targetUrlObj = new URL(targetUrl);
  headers.set("host", targetUrlObj.host);

  // Forward the request
  const fetchOptions: RequestInit & { duplex?: string } = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  // Forward body for methods that support it
  if (request.method !== "GET" && request.method !== "HEAD") {
    fetchOptions.body = request.body;
    fetchOptions.duplex = "half";
  }

  const response = await fetch(targetUrl, fetchOptions);

  // Build response headers, excluding problematic headers
  const responseHeaders = new Headers();
  for (const [key, value] of response.headers.entries()) {
    if (!EXCLUDED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;

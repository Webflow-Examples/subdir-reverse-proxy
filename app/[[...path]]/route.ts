import { NextRequest } from "next/server";

const PROXY_TARGET_URL = process.env.PROXY_TARGET_URL;

// Validate environment variable at startup
if (!PROXY_TARGET_URL) {
  throw new Error("PROXY_TARGET_URL environment variable is required");
}

let parsedTargetUrl: URL;
try {
  parsedTargetUrl = new URL(PROXY_TARGET_URL);
} catch {
  throw new Error("PROXY_TARGET_URL must be a valid URL");
}

if (!["http:", "https:"].includes(parsedTargetUrl.protocol)) {
  throw new Error("PROXY_TARGET_URL must use http or https protocol");
}

/**
 * Validates and sanitizes path segments to prevent path traversal attacks.
 * Returns null if the path contains malicious segments.
 */
function sanitizePath(segments: string[]): string | null {
  for (const segment of segments) {
    // Block path traversal attempts
    if (segment === ".." || segment === ".") {
      return null;
    }

    // Block null bytes
    if (segment.includes("\0")) {
      return null;
    }

    // Decode and check for encoded traversal attempts
    try {
      const decoded = decodeURIComponent(segment);
      if (decoded.includes("..") || decoded.includes("\0")) {
        return null;
      }
    } catch {
      // Invalid encoding - reject
      return null;
    }
  }

  return segments.length > 0 ? `/${segments.join("/")}` : "";
}

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

  // Validate and sanitize path to prevent SSRF/path traversal
  const sanitizedPath = sanitizePath(pathSegments);
  if (sanitizedPath === null) {
    return new Response("Bad Request", { status: 400 });
  }

  // Construct target URL safely using URL API
  const targetUrlObj = new URL(PROXY_TARGET_URL!);
  targetUrlObj.pathname =
    targetUrlObj.pathname.replace(/\/$/, "") + sanitizedPath;

  // Safely copy query parameters from the request
  const requestUrl = new URL(request.url);
  targetUrlObj.search = requestUrl.search;

  const targetUrl = targetUrlObj.toString();

  // Forward headers, excluding hop-by-hop headers
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // Set the host header to the target host
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

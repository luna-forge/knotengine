import { auth } from "@/auth";
import { type NextRequest, NextResponse } from "next/server";
import { getActiveOrganization } from "@/actions/organization";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5050";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

function parseCookieValue(
  cookieHeader: string,
  name: string,
): string | undefined {
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split("=");
    if (cookieName === name) {
      return valueParts.join("=");
    }
  }
  return undefined;
}

function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

async function proxy(req: NextRequest) {
  let oauthId: string | undefined;

  try {
    const session = await auth();
    oauthId = session?.user?.oauthId as string | undefined;
  } catch {
    // auth() may fail in route handlers
  }

  if (!oauthId) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const token =
        parseCookieValue(cookieHeader, "next-auth.session-token") ||
        parseCookieValue(cookieHeader, "__Secure-next-auth.session-token");
      if (token) {
        const payload = decodeJWTPayload(token);
        oauthId = payload?.oauthId as string | undefined;
      }
    }
  }

  if (!oauthId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const path = req.nextUrl.pathname.replace(/^\/api/, "");
  const search = req.nextUrl.search;
  const targetUrl = `${API_BASE_URL}${path}${search}`;

  const headers = new Headers(req.headers);
  headers.set("x-oauth-id", oauthId);
  headers.set("x-internal-secret", INTERNAL_SECRET!);

  const activeOrgId = await getActiveOrganization();
  if (activeOrgId) {
    headers.set("x-active-org-id", activeOrgId);
  }

  headers.delete("host");
  headers.delete("connection");
  headers.delete("cookie");
  headers.delete("x-api-key");

  const init: RequestInit = {
    method: req.method,
    headers,
    // @ts-expect-error - Required for passing body correctly in newer Node/Next versions
    duplex: "half",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const blob = await req.blob();
    init.body = blob;
  }

  try {
    const backendRes = await fetch(targetUrl, init);
    const data = await backendRes.blob();

    if (!backendRes.ok) {
      const text = await data.text();
      const body =
        text && text.trim()
          ? text
          : JSON.stringify({ error: `Backend returned ${backendRes.status}` });
      return new NextResponse(body, {
        status: backendRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new NextResponse(data, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: backendRes.headers,
    });
  } catch (err) {
    console.error("Proxy Error:", err);
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
const DEFAULT_CHECKOUT_HOST =
  process.env.CHECKOUT_HOST || "checkout.knotengine.com";

async function resolveOrgByDomain(domain: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/internal/domain/${domain}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") || "";

  if (hostname === DEFAULT_CHECKOUT_HOST || hostname.startsWith("localhost")) {
    return NextResponse.next();
  }

  const orgData = await resolveOrgByDomain(hostname);

  if (!orgData || !orgData.verified) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const response = NextResponse.rewrite(url);

  response.headers.set("x-custom-domain", hostname);
  response.headers.set("x-org-id", orgData.organizationId);
  response.headers.set("x-org-name", orgData.name);
  response.headers.set("x-org-brand-color", orgData.brandColor || "#ffffff");

  return response;
}

export const config = {
  matcher: [
    "/checkout/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

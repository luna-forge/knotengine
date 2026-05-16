"use server";

import { cookies } from "next/headers";

export async function setActiveOrganization(organizationId: string) {
  const cookieStore = await cookies();
  cookieStore.set("knot_active_org", organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getActiveOrganization() {
  const cookieStore = await cookies();
  return cookieStore.get("knot_active_org")?.value || null;
}

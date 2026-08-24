import type { NextRequest } from "next/server";
import { readSession } from "@/lib/auth";

export type AppRole = "user" | "admin";

export function getDemoRole(request: NextRequest): AppRole {
  return readSession(request)?.role ?? "user";
}

export function isAdmin(request: NextRequest) {
  return readSession(request)?.role === "admin";
}

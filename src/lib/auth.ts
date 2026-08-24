import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import type { AppRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "pottery_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

export type Session = { userId: number; role: AppRole; expiresAt: number };

function getSecret() {
  return process.env.AUTH_SECRET || process.env.CRON_SECRET || "development-only-auth-secret";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSession(userId: number, role: AppRole) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const value = `${userId}.${role}.${expiresAt}`;
  return `${value}.${sign(value)}`;
}

export function readSession(request: NextRequest): Session | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const [userIdText, role, expiresAtText, signature] = raw.split(".");
  if ((role !== "user" && role !== "admin") || !expiresAtText || !signature) return null;
  const userId = Number(userIdText);
  if (!Number.isSafeInteger(userId) || userId < 1) return null;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;

  const expected = sign(`${userIdText}.${role}.${expiresAtText}`);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  return { userId, role, expiresAt };
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true, role: true } });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, role: user.role as AppRole };
}

import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";
import * as db from "../db";
import type { User } from "../../drizzle/schema";

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = new TextEncoder().encode(
  ENV.sessionSecret || "default-secret-change-in-production"
);
const JWT_ALG = "HS256";
const TOKEN_EXPIRY = "7d";
const COOKIE_NAME = "auth_token";

export async function createToken(user: User): Promise<string> {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALG],
    });
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: any, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookie(res: any) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: "lax",
    path: "/",
  });
}

export async function getUserFromToken(
  token: string | undefined
): Promise<User | null> {
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await db.getUserByEmail(payload.email);
  return user || null;
}

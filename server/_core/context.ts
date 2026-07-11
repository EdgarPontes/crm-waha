import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserById } from "../db";
import { ENV } from "./env";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "default-secret-change-in-production");

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function verifyAuthToken(token: string | undefined): Promise<{ id: number; email: string; role: string } | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    return payload as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Get token from cookie
    const cookies = opts.req.headers.cookie;
    let token: string | undefined;

    if (cookies) {
      const match = cookies.match(/auth_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    // Also check Authorization header
    if (!token) {
      const authHeader = opts.req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    const payload = await verifyAuthToken(token);
    if (payload) {
      const dbUser = await getUserById(payload.id);
      if (dbUser) {
        user = dbUser;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import {
  createLocalUser,
  verifyLocalUser,
  getUserByEmail,
  updateUserPassword,
  updateUserLastSignedIn,
  setUserEmailVerified,
} from "../db";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";

const JWT_SECRET = new TextEncoder().encode(
  ENV.sessionSecret || "default-secret-change-in-production"
);
const JWT_EXPIRY = "7d";

function createToken(user: { id: number; email: string; role: string }) {
  return new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(JWT_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; email: string; role: string };
  } catch {
    return null;
  }
}

export const authRouter = router({
  // Register new user
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(2).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await createLocalUser(
        input.email,
        input.password,
        input.name
      );
      if (!user) {
        throw new Error("Failed to create user");
      }

      const token = createToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      const cookieOptions = {
        httpOnly: true,
        secure: ENV.isProduction,
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      };

      ctx.res.cookie("auth_token", token, cookieOptions);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      };
    }),

  // Login user
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await verifyLocalUser(input.email, input.password);
      if (!user) {
        throw new Error("Invalid email or password");
      }

      const token = createToken({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      const cookieOptions = {
        httpOnly: true,
        secure: ENV.isProduction,
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      };

      ctx.res.cookie("auth_token", token, cookieOptions);

      // Update last signed in
      await updateUserLastSignedIn(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      };
    }),

  // Logout user
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie("auth_token", {
      httpOnly: true,
      secure: ENV.isProduction,
      sameSite: "lax",
      path: "/",
    });
    return { success: true };
  }),

  // Get current user
  me: publicProcedure.query(async ({ ctx }) => {
    // Get token from cookie header
    const cookies = ctx.req.headers.cookie;
    let token: string | undefined;

    if (cookies) {
      const match = cookies.match(/auth_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    // Also check Authorization header
    if (!token) {
      const authHeader = ctx.req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await getUserByEmail(payload.email as string);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }),

  // Change password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user!;

      // Verify current password
      const verified = await verifyLocalUser(user.email, input.currentPassword);
      if (!verified) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      await updateUserPassword(user.id, input.newPassword);

      return { success: true };
    }),

  // Request password reset (placeholder - would send email in production)
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user) {
        // Don't reveal if user exists
        return { success: true };
      }

      // In production, generate reset token and send email
      // For now, just return success
      return { success: true };
    }),

  // Reset password with token (placeholder)
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      // In production, verify token and update password
      // For now, just return success
      return { success: true };
    }),
});

import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be less than 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
  .refine(
    (val) => !val.startsWith("_") && !val.endsWith("_"),
    "Username cannot start or end with underscore"
  );

const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(254, "Email must be less than 254 characters")
  .toLowerCase();

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema
});

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required"),
  username: z.string().min(1, "Username is required").trim()
});

export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, "Token is required")
    .regex(/^[a-zA-Z0-9]+$/, "Invalid token format")
});

export const resendVerificationSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  email: emailSchema
});

export const confirmResetPasswordSchema = z.object({
  password: passwordSchema,
  token: z
    .string()
    .min(1, "Token is required")
    .regex(/^[a-zA-Z0-9]+$/, "Invalid token format")
});

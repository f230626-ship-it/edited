import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(
    passwordRegex,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  );

export const loginSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
  })
  .strict();

export const requestResetSchema = z
  .object({
    email: z.string().email("Invalid email address"),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .strict();

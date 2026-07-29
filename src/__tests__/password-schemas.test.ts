/**
 * Unit tests for password validation schemas in src/lib/auth/schemas.ts
 *
 * Covers:
 *  - passwordSchema validates min 12 chars + upper/lower/number/symbol
 *  - loginSchema validates email + password
 *  - signupSchema validates email + password + fullName
 *  - Edge cases: empty strings, missing fields, exact-length boundaries
 */

import {
  passwordSchema,
  loginSchema,
  signupSchema,
  requestResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/lib/auth/schemas";

// ─── passwordSchema ────────────────────────────────────────────────────────

describe("passwordSchema", () => {
  test("accepts a strong password: 8+ chars with upper/lower/number/symbol", () => {
    const result = passwordSchema.safeParse("SecureP@ss123");
    expect(result.success).toBe(true);
  });

  test("accepts exactly 8 characters with all requirements", () => {
    const result = passwordSchema.safeParse("Aa1@bcde");
    expect(result.success).toBe(true);
  });

  test("accepts a long password with all requirements", () => {
    const result = passwordSchema.safeParse("ThisIsAVeryLongAndSecureP@ssw0rd!");
    expect(result.success).toBe(true);
  });

  test("rejects a password shorter than 8 characters", () => {
    const result = passwordSchema.safeParse("Sh1@rt");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].message).toContain("at least 8 characters");
  });

  test("rejects a password missing uppercase letter", () => {
    const result = passwordSchema.safeParse("lowercase123@");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].message).toContain("uppercase");
  });

  test("rejects a password missing lowercase letter", () => {
    const result = passwordSchema.safeParse("UPPERCASE123@");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].message).toContain("lowercase");
  });

  test("rejects a password missing a number", () => {
    const result = passwordSchema.safeParse("NoNumbersHere@");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].message).toContain("number");
  });

  test("rejects a password missing a special character", () => {
    const result = passwordSchema.safeParse("NoSpecialChar123");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].message).toContain("special character");
  });

  test("rejects an empty string", () => {
    const result = passwordSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  test("accepts various special characters: !@#$%^&*()", () => {
    const chars = "!@#$%^&*()";
    for (const char of chars) {
      const pw = `Passw0rd${char}123`;
      const result = passwordSchema.safeParse(pw);
      expect(result.success).toBe(true);
    }
  });

  test("rejects password with only letters and numbers (no symbol)", () => {
    const result = passwordSchema.safeParse("Password1234");
    expect(result.success).toBe(false);
  });
});

// ─── loginSchema ───────────────────────────────────────────────────────────

describe("loginSchema", () => {
  test("accepts valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "anyPasswordHere",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "somePassword",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toContain("email");
  });

  test("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toContain("password");
  });

  test("rejects extra unknown fields (strict schema)", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "pass",
      extraField: "not allowed",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing email field", () => {
    const result = loginSchema.safeParse({ password: "pass" });
    expect(result.success).toBe(false);
  });
});

// ─── signupSchema ──────────────────────────────────────────────────────────

describe("signupSchema", () => {
  test("accepts valid email, strong password, and full name", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "SecureP@ss123",
      fullName: "John Doe",
    });
    expect(result.success).toBe(true);
  });

  test("rejects weak password (fails passwordSchema)", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "weak",
      fullName: "John Doe",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toContain("password");
  });

  test("rejects full name shorter than 2 characters", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "SecureP@ss123",
      fullName: "A",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toContain("fullName");
    expect(result.error.issues[0].message).toContain("at least 2 characters");
  });

  test("accepts exactly 2-character full name", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "SecureP@ss123",
      fullName: "Jo",
    });
    expect(result.success).toBe(true);
  });

  test("rejects extra unknown fields (strict schema)", () => {
    const result = signupSchema.safeParse({
      email: "new@example.com",
      password: "SecureP@ss123",
      fullName: "John Doe",
      unknownField: "bad",
    });
    expect(result.success).toBe(false);
  });
});

// ─── requestResetSchema ────────────────────────────────────────────────────

describe("requestResetSchema", () => {
  test("accepts a valid email", () => {
    const result = requestResetSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  test("rejects an invalid email", () => {
    const result = requestResetSchema.safeParse({ email: "bad-email" });
    expect(result.success).toBe(false);
  });

  test("rejects extra fields (strict)", () => {
    const result = requestResetSchema.safeParse({
      email: "user@example.com",
      extra: "nope",
    });
    expect(result.success).toBe(false);
  });
});

// ─── resetPasswordSchema ───────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  test("accepts a strong password", () => {
    const result = resetPasswordSchema.safeParse({ password: "NewP@ssw0rd123" });
    expect(result.success).toBe(true);
  });

  test("rejects a weak password", () => {
    const result = resetPasswordSchema.safeParse({ password: "weak" });
    expect(result.success).toBe(false);
  });
});

// ─── changePasswordSchema ──────────────────────────────────────────────────

describe("changePasswordSchema", () => {
  test("accepts current password + strong new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldPass",
      newPassword: "NewSecureP@ss123",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing currentPassword", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "NewSecureP@ss123",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toContain("currentPassword");
  });

  test("rejects weak newPassword", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldPass",
      newPassword: "weak",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0].path).toContain("newPassword");
  });
});

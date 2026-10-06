import { z } from "zod";

const email = z
  .string()
  .trim()
  .pipe(z.email({ message: "Please enter a valid email address." }));
const password = z
  .string()
  .min(8, { message: "Password must be at least 8 characters." })
  .max(128, { message: "Password must be no more than 128 characters." });

const currentPassword = z
  .string()
  .min(1, { message: "Please enter your password." })
  .max(128, { message: "Password must be no more than 128 characters." });
export const loginSchema = z.object({ email, password: currentPassword });
export const registerSchema = z
  .object({
    email,
    display_name: z.string().trim().max(200, { message: "Display name must be no more than 200 characters." }),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export const changePasswordSchema = z
  .object({
    current_password: currentPassword,
    new_password: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const emailSchema = z.object({ email });
export const verificationSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Please enter the 6-digit code.") });
export const resetPasswordSchema = z
  .object({ new_password: password, confirmPassword: z.string() })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

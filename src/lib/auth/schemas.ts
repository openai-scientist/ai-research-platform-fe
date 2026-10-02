import { z } from "zod";

const email = z
  .string()
  .trim()
  .pipe(z.email({ message: "Please enter a valid email address." }));
const password = z
  .string()
  .min(8, { message: "Password must be at least 8 characters." })
  .max(128, { message: "Password must be no more than 128 characters." });

export const loginSchema = z.object({ email, password });
export const registerSchema = z
  .object({
    email,
    display_name: z.string().trim(),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export const changePasswordSchema = z
  .object({
    current_password: password,
    new_password: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

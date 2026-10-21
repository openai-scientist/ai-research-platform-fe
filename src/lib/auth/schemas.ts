import { z } from "zod";

const email = z
  .string()
  .trim()
  .pipe(z.email({ message: "Please enter a valid email address." }));

export const emailSchema = z.object({ email });
export const verificationSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Please enter the 6-digit code.") });
export const onboardingSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, { message: "Please enter your name." })
    .max(200, { message: "Your name must be no more than 200 characters." }),
});

import type { Metadata } from "next";

import { ForgotPasswordForm } from "../_components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password · ResearchLab AI" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center px-4 py-12 sm:px-0">
      <ForgotPasswordForm />
    </div>
  );
}

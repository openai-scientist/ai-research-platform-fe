import Link from "next/link";
import { redirect } from "next/navigation";

import { Globe } from "lucide-react";
import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";
import { getRoleHomePath } from "@/lib/auth/auth-config";
import { getAuthenticatedUser } from "@/server/auth";

import { RegisterForm } from "../_components/register-form";

export const metadata: Metadata = {
  title: "Register · ResearchLab AI",
  description: "Create an account for the ResearchLab AI AI Research Experimentation Platform.",
};

export default async function RegisterPage() {
  const user = await getAuthenticatedUser();
  if (user) redirect(getRoleHomePath(user.role));
  return (
    <>
      <div className="mx-auto flex w-full max-w-[350px] flex-col justify-center px-4 py-24 sm:px-0">
        <RegisterForm />
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link prefetch={false} className="text-foreground" href="/auth/login">
            Login
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}

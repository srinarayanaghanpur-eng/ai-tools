import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to TOOLVERSE AI." };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

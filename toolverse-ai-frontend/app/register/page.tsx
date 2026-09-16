import type { Metadata } from "next";
import { RegisterForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Create account", description: "Create a TOOLVERSE AI account." };

export default function RegisterPage() {
  return <RegisterForm />;
}

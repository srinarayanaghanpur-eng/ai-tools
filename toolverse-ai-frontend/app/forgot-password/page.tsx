import type { Metadata } from "next";
import { ForgotForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return <ForgotForm />;
}

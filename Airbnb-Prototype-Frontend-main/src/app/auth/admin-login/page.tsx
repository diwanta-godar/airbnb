import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Admin login",
};

export default function AdminLoginPage() {
  return (
    <div className="page-shell flex items-center justify-center px-4 md:px-6">
      <Suspense fallback={<div className="text-muted">Loading...</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}

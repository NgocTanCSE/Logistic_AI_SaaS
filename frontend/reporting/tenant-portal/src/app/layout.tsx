"use client";

import "./globals.css";
import "./styles/layout-tokens.css"; // editorial layout tokens (typography/motion/shadow) — colors kept per portal
import { AuthProvider } from "@/lib/auth-context";
import AppShell from "@/components/AppShell";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-ink antialiased">
        <GoogleOAuthProvider clientId={googleClientId}>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}

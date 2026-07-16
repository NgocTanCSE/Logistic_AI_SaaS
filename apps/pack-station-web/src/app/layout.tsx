import type { Metadata } from "next";
import { AuthProvider } from "../lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pack Station Kiosk",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`bg-background text-white antialiased overflow-hidden`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

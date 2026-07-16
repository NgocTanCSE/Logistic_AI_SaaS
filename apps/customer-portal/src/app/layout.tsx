import type { Metadata } from "next";
import { Header } from "../components/Header";
import { AuthProvider } from "../lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartLogi Customer Portal",
  description: "Track your packages in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`bg-background text-white antialiased min-h-screen flex flex-col`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none z-[-1]"></div>
        <AuthProvider>
          <Header />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

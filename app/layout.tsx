import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "GitPulse - GitHub Repository Analytics Dashboard",
  description: "Track and analyze GitHub repository metrics, activity, and health.",
};

import { Header } from "@/frontend/components/layout/header";
import { SessionProvider } from "@/frontend/components/providers/session-provider";
import { UserProvider } from "@/frontend/lib/user-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistMono.variable} font-mono antialiased min-h-screen flex flex-col bg-background text-foreground`}
      >
        <SessionProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <UserProvider>
            <Header />
            <main className="flex-1 flex flex-col">{children}</main>
          </UserProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

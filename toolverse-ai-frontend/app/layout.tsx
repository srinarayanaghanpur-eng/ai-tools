import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider, PaletteProvider, PrefsProvider, ThemeProvider, ToastProvider } from "@/components/providers";
import { Navbar, MobileBottomNav } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CommandPalette } from "@/components/ToolSearch";
import { ToastHost } from "@/components/ui";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "TOOLVERSE AI — Every Tool. One Place.",
    template: "%s · TOOLVERSE AI",
  },
  description:
    "Powerful AI tools, converters, PDF utilities and productivity tools built for everyday work.",
  openGraph: {
    type: "website",
    siteName: "TOOLVERSE AI",
    title: "TOOLVERSE AI — Every Tool. One Place.",
    description: "AI tools, converters, PDF utilities and productivity tools for everyday work.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOOLVERSE AI — Every Tool. One Place.",
    description: "AI tools, converters, PDF utilities and productivity tools for everyday work.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <PrefsProvider>
              <ToastProvider>
                <PaletteProvider>
                  <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
                  >
                    Skip to content
                  </a>
                  <Navbar />
                  <main id="main" className="min-h-[70vh] pb-20 md:pb-0">
                    {children}
                  </main>
                  <Footer />
                  <MobileBottomNav />
                  <CommandPalette />
                  <ToastHost />
                </PaletteProvider>
              </ToastProvider>
            </PrefsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

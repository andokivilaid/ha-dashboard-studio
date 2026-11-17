import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-stack", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ha-dashboard-studio.vercel.app"),
  title: {
    default: "HA Dashboard Studio — browse and build Home Assistant dashboards",
    template: "%s · HA Dashboard Studio",
  },
  description:
    "A searchable gallery of real Home Assistant Lovelace dashboards, plus an AI builder that renders them live with mock or read-only live data.",
  openGraph: {
    title: "HA Dashboard Studio",
    description:
      "Browse real Home Assistant dashboards and build your own with an AI that can see what it renders.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d10" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <head>
        {/* Material Design Icons, self-hosted: the renderer needs the full set. */}
        <link rel="stylesheet" href="/mdi/materialdesignicons.min.css" />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <SiteNav />
          <main className="flex-1 flex flex-col">{children}</main>
          <SiteFooter />
          <Toaster position="bottom-right" toastOptions={{ style: { fontSize: 13 } }} />
        </ThemeProvider>
      </body>
    </html>
  );
}

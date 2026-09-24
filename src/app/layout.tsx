import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ThemeCustomProvider } from "@/lib/theme";
import { LocaleProvider } from "@/i18n/LocaleProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tana Betting",
  description: "Tana Betting - Sports betting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ThemeCustomProvider>
            <LocaleProvider>
              <TooltipProvider>
                {children}
                <Toaster richColors position="top-right" />
              </TooltipProvider>
            </LocaleProvider>
          </ThemeCustomProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Header from "@/components/Header";

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
  weight:   ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title:       "StreamFlex — Stream Movies & Shows",
  description: "Watch movies, web series and anime. Powered by StreamFlex.",
  keywords:    "streaming, movies, web series, anime, free, hd",
  themeColor:  "#0E0E11",
  openGraph: {
    title:       "StreamFlex",
    description: "Watch movies, web series and anime for free.",
    type:        "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="no-scrollbar">
        <Providers>
          <Header />
          <main className="relative z-0 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
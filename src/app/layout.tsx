import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Streamflex",
  description: "Streaming Service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#141414] text-white no-scrollbar">
        <Providers>
           {/* Header is inside Providers so it can access Auth/Player context */}
          <Header /> 
          <main className="relative z-0 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
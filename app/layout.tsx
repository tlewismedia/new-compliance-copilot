import type { Metadata } from "next";
import { Geist, Instrument_Serif, Sumana } from "next/font/google";
import "./globals.css";
import { BackgroundLayers } from "./_components/background-layers";
import { Sidebar } from "./_components/sidebar";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});

const serif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
});

const logo = Sumana({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "Compliance Copilot",
  description:
    "An adaptive RAG compliance copilot — grounded answers, cited sources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${serif.variable} ${logo.variable} min-h-screen text-[#2a2f2c] antialiased`}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <div className="relative flex min-h-screen">
          <BackgroundLayers />
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

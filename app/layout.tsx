import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { BackgroundLayers } from "./_components/background-layers";
import { Sidebar } from "./_components/sidebar";
import { Header } from "./_components/header";

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
        className={`${geist.variable} ${serif.variable} min-h-screen text-[#2a2f2c] antialiased`}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <div className="relative flex min-h-screen">
          <BackgroundLayers />
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <Header />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}

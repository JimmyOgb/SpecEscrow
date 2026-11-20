import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecEscrow | Autonomous Bounty Adjudication on GenLayer",
  description: "Production-ready open source and freelance bounty escrow platform where GenLayer Intelligent Contracts automatically adjudicate GitHub PR deliverables against acceptance rubrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}

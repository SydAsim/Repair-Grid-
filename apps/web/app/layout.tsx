import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepairGrid — Autonomous Community Maintenance Network",
  description: "Autonomous operations layer between residents, maintenance teams, and community operators powered by Strands Agents and AWS Bedrock.",
  keywords: ["autonomous maintenance", "strands agents", "aws bedrock", "smart city", "civic operations"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

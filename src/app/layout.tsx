import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CSI Operations | Student Branch Management",
  description: "Operations and Event Management Platform for CSI Student Branch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-csi-bg text-csi-text flex text-[18px]`}>
        <Navbar />
        <main className="flex-1 ml-60 px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

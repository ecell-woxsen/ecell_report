import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "E-Cell Weekly Reports | Woxsen University",
  description:
    "The official E-Cell weekly report and operations platform for Woxsen University. Track department progress, manage tasks, and drive accountability.",
  keywords: ["E-Cell", "Woxsen", "Weekly Reports", "Operations"],
  icons: {
    icon: "/ecell-logo.png",
    apple: "/ecell-logo.png",
  },
  openGraph: {
    title: "E-Cell Weekly Reports | Woxsen University",
    description:
      "The official E-Cell weekly report and operations platform for Woxsen University.",
    images: ["/ecell-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Karla, Libre_Baskerville } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const libre = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Lantern Stay | Vacation Home Rental in Kathmandu",
    template: "%s | The Lantern Stay",
  },
  description:
    "Vacation home rental in Kathmandu. Book a cozy stay with The Lantern Stay.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${karla.variable} ${libre.variable} antialiased`}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}

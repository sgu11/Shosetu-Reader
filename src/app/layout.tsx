import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_JP } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const uiFont = Noto_Sans_KR({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const readerFont = Noto_Serif_JP({
  variable: "--font-reader",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Shosetu Reader",
  description: "Calm web reader for Syosetu novels with resume and translation flows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${uiFont.variable} ${readerFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        {children}
      </body>
    </html>
  );
}

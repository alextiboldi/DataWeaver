import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataWeaver",
  description: "Raw data to insight",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

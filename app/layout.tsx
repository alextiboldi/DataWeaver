import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataWeaver",
  description: "Raw data to insight",
  other: {
    "theme-color": "#F5F5F5",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className="antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-black focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}

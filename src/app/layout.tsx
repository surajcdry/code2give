import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lemontree InsightEngine",
  description: "Food insecurity data intelligence platform — Morgan Stanley Code to Give 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}

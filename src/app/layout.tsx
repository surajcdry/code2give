import type { Metadata } from "next";
import "./globals.css";
import GoogleMapsProvider from "@/components/providers/GoogleMapsProvider";

export const metadata: Metadata = {
  title: "Lemon-Aid",
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
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
      </body>
    </html>
  );
}
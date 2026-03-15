"use client"; // This must be a client component to handle the login state

import { useState } from "react";
import type { Metadata } from "next";
import "./globals.css";
import GoogleMapsProvider from "@/components/providers/GoogleMapsProvider";
import { ChatBot } from "@/components/TempBot";

export const metadata: Metadata = {
  title: "Lemon-Aid",
  description: "Food insecurity data intelligence platform — Morgan Stanley Code to Give 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (role: UserRole) => {
    // Note: To share this 'role' with your sidebar, you should ideally 
    // wrap this in a Context Provider or save to localStorage.
    setIsLoggedIn(true);
  };

  return (
    <html lang="en">
      <body className={`antialiased`}>
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
        {/* Floating ChatBot */}
        <ChatBot />
      </body>
    </html>
  );
}
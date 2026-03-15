"use client"; // This must be a client component to handle the login state

import { useState } from "react";
import type { Metadata } from "next";
import "./globals.css";
import GoogleMapsProvider from "@/components/providers/GoogleMapsProvider";
import { ChatBot } from "@/components/TempBot";
import { User, ShieldCheck, Heart, Building2, Users, MapPin } from "lucide-react";

// --- Types & Config ---
type UserRole = "internal" | "client" | "government" | "donor" | "provider";

const roleLabels: Record<UserRole, string> = {
  internal: "Lemontree Team",
  client: "Community Member",
  government: "Government Agency",
  donor: "Donor",
  provider: "Food Pantry",
};

// --- Login Screen Sub-component ---
function LoginScreen({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const personas: { role: UserRole; icon: React.ElementType; desc: string }[] = [
    { role: "internal", icon: ShieldCheck, desc: "System Admin & Staff" },
    { role: "client", icon: Users, desc: "Community Member" },
    { role: "government", icon: Building2, desc: "City & State Officials" },
    { role: "donor", icon: Heart, desc: "Philanthropic Partners" },
    { role: "provider", icon: MapPin, desc: "Pantry & Soup Kitchens" },
  ];

  return (
    <div className="min-h-screen bg-[#FFCC10] flex flex-col items-center justify-center p-6 text-gray-900">
      {/* Add Google Fonts for the logo and headers */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;700;900&display=swap" rel="stylesheet" />
      
      <div className="mb-12 text-center">
        <img src="/lemontreeLogo.png" alt="Logo" className="h-20 w-20 mx-auto mb-4" />
        <h1 className="text-5xl font-black tracking-tighter uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
          LemonAid
        </h1>
        <p className="text-gray-800 font-medium mt-2">Select your persona to enter the dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-7xl w-full">
        {personas.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.role}
              onClick={() => onLogin(p.role)}
              className="bg-white p-8 rounded-3xl border-2 border-transparent hover:border-black transition-all shadow-xl hover:-translate-y-2 flex flex-col items-center text-center group"
            >
              <div className="bg-gray-100 p-4 rounded-2xl mb-4 group-hover:bg-[#FFCC10] transition-colors">
                <Icon className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="font-black text-gray-900 uppercase text-sm tracking-tight mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                {roleLabels[p.role]}
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase">{p.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Root Layout ---
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
      <head>
        <title>Lemon-Aid</title>
        <meta name="description" content="Food insecurity data intelligence platform — Morgan Stanley Code to Give 2026" />
      </head>
      {/* suppressHydrationWarning added to handle extension-injected attributes */}
      <body className="antialiased" suppressHydrationWarning>
        {!isLoggedIn ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <GoogleMapsProvider>
            {children}
            <ChatBot />
          </GoogleMapsProvider>
        )}
      </body>
    </html>
  );
}
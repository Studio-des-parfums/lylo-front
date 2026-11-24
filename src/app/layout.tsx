import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { SessionProvider } from "@/context/SessionContext";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LiveKitSession from "@/components/livekit/LiveKitSession";
import DevNavigator from "@/components/dev/DevNavigator";
import { activeBrand } from "@/lib/brand";
import "./globals.css";

const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: `${activeBrand.name} | AI-Powered Perfumery`,
  description:
    "Discover your perfect scent with Rose, your AI personal perfumer. Luxury fragrances crafted with cutting-edge technology.",
  icons: {
    icon: activeBrand.logo,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" data-brand={activeBrand.theme} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${garamond.variable} bg-background-light text-text-dark h-screen overflow-y-auto lg:overflow-hidden antialiased`}
        suppressHydrationWarning
      >
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <LanguageProvider>
            <AuthProvider>
              <SessionProvider>
                <LiveKitSession>
                  {children}
                  <DevNavigator />
                </LiveKitSession>
              </SessionProvider>
            </AuthProvider>
          </LanguageProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}

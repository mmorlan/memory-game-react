import type { Metadata } from "next";
import "./globals.css";
import AmplifyProvider from "./components/AmplifyProvider";
import { AuthProvider } from "./hooks/useAuth";
import { GameSettingsProvider } from "./hooks/useGameSettings";
import Header from "./components/Header";
import InstructionsModal from "./components/InstructionsModal";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Pairanoia",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body>
        <AmplifyProvider>
          <AuthProvider>
            <GameSettingsProvider>
              <Header />
              <InstructionsModal />
              {children}
            </GameSettingsProvider>
          </AuthProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}

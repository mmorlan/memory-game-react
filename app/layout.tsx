import type { Metadata } from "next";
import "./globals.css";
import AmplifyProvider from "./components/AmplifyProvider";
import { AuthProvider } from "./hooks/useAuth";
import { GameSettingsProvider } from "./hooks/useGameSettings";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "Pairanoia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AmplifyProvider>
          <AuthProvider>
            <GameSettingsProvider>
              <Header />
              {children}
            </GameSettingsProvider>
          </AuthProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}

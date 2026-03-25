import type { Metadata } from "next";
import "./globals.css";
import AmplifyProvider from "./components/AmplifyProvider";
import { AuthProvider } from "./hooks/useAuth";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "Memory Game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AmplifyProvider>
          <AuthProvider>
            <Header />
            {children}
          </AuthProvider>
        </AmplifyProvider>
      </body>
    </html>
  );
}

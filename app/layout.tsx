import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Verso Arcano", template: "%s · Verso Arcano" },
  description: "Seu grimório de campanha, onde a magia toma a forma de versos.",
  icons: { icon: "/sigil.svg" },
};

export default function Root({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontakta NCD AB för en kostnadsfri konsultation. Vi erbjuder BIM-modellering, byggritningar, projektledning och drönardokumentation.",
};

export default function KontaktLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

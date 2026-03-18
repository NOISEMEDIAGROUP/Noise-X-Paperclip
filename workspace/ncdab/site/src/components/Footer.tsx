import Link from "next/link";
import Image from "next/image";

const services = [
  { name: "BIM/Revit-modellering", href: "/tjanster/bim-modellering" },
  { name: "Byggritningar", href: "/tjanster/byggritningar" },
  { name: "Projektledning", href: "/tjanster/projektledning" },
  { name: "Drönardokumentation", href: "/tjanster/dronarfotografering" },
];

const company = [
  { name: "Projekt", href: "/projekt" },
  { name: "Om oss", href: "/om-oss" },
  { name: "Kontakt", href: "/kontakt" },
  { name: "Begär offert", href: "/offertforfragan" },
];

export default function Footer() {
  return (
    <footer className="bg-primary-950 text-white/60">
      {/* Accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/logo-white.jpg"
                alt="NCD AB"
                width={40}
                height={40}
                className="h-9 w-auto rounded"
              />
              <span className="text-xl font-bold text-white tracking-wide">
                NCD<span className="text-accent-400">AB</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6">
              Byggkonsulter i Gällivare med expertis inom BIM, ritningar och
              projektledning. Skandinavisk kvalitet i varje projekt.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white">Tjänster</h3>
            <ul className="mt-4 space-y-2.5">
              {services.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm hover:text-accent-400 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white">Företaget</h3>
            <ul className="mt-4 space-y-2.5">
              {company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm hover:text-accent-400 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white">Kontakt</h3>
            <div className="mt-4 space-y-2.5 text-sm">
              <p>info@ncdab.se</p>
              <p>Gällivare, Sverige</p>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} NCD AB. Alla rättigheter förbehållna.
          </p>
          <div className="flex gap-6 text-xs text-white/40">
            <Link href="/kontakt" className="hover:text-accent-400 transition-colors">
              Integritetspolicy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

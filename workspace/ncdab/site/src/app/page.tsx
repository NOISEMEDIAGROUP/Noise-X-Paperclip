import Link from "next/link";

const services = [
  {
    title: "BIM/Revit-modellering",
    description:
      "3D-modeller som ger full kontroll över projektet från start till mål. Vi skapar detaljerade BIM-modeller för arkitekter och entreprenörer.",
    href: "/tjanster#bim",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
      </svg>
    ),
  },
  {
    title: "Byggritningar",
    description:
      "Teknisk dokumentation och ritningar som uppfyller alla krav. Från konceptskisser till produktionsritningar.",
    href: "/tjanster#ritningar",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: "Projektledning",
    description:
      "Professionell samordning av byggprojekt. Vi håller tidsplaner, budget och kvalitet under kontroll.",
    href: "/tjanster#projektledning",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    title: "Drönardokumentation",
    description:
      "Flygfotografering och inspektioner med drönare. Effektiv dokumentation av byggarbetsplatser och framsteg.",
    href: "/tjanster#dronar",
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
];

const stats = [
  { value: "15+", label: "Års erfarenhet" },
  { value: "200+", label: "Genomförda projekt" },
  { value: "50+", label: "Nöjda kunder" },
  { value: "100%", label: "Engagemang" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-primary-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-400 opacity-80" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-36">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-widest uppercase text-primary-200">
              Svenskt byggkonsultföretag
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Byggkonsulter ni kan lita&nbsp;på
            </h1>
            <p className="mt-6 text-lg leading-8 text-primary-100">
              NCD AB erbjuder BIM-modellering, byggritningar, projektledning och
              drönardokumentation. Vi hjälper er genom hela byggprocessen — från
              idé till färdigt projekt.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/kontakt"
                className="rounded-md bg-accent-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-accent-600 transition-colors"
              >
                Kontakta oss
              </Link>
              <Link
                href="/tjanster"
                className="rounded-md bg-white/10 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Våra tjänster
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-steel-50 border-b border-steel-200">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary-500">{stat.value}</p>
                <p className="mt-1 text-sm text-steel-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services overview */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-steel-800 sm:text-4xl">
              Våra tjänster
            </h2>
            <p className="mt-4 text-lg text-steel-500">
              Helhetslösningar för bygg- och fastighetsprojekt
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-xl border border-steel-200 p-6 hover:shadow-lg hover:border-primary-200 transition-all"
              >
                <div className="text-primary-500 group-hover:text-primary-600 transition-colors">
                  {service.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-steel-800">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-steel-500 leading-6">
                  {service.description}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary-500 group-hover:text-primary-600">
                  Läs mer
                  <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why NCD */}
      <section className="bg-steel-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-steel-800 sm:text-4xl">
                Varför välja NCD AB?
              </h2>
              <p className="mt-4 text-lg text-steel-500 leading-8">
                Med gedigen erfarenhet inom bygg- och fastighetsbranschen levererar
                vi lösningar som skapar verkligt värde för våra kunder.
              </p>
              <dl className="mt-10 space-y-6">
                {[
                  {
                    title: "Teknisk expertis",
                    description:
                      "Certifierade inom BIM och Revit med djup kunskap om svenska byggstandarder och regelverk.",
                  },
                  {
                    title: "Personligt engagemang",
                    description:
                      "Vi är en del av ert team. Tillgängliga, lyhörda och engagerade i varje projekts framgång.",
                  },
                  {
                    title: "Heltäckande tjänster",
                    description:
                      "Från BIM-modellering och ritningar till projektledning och drönarinspektion — allt under ett tak.",
                  },
                ].map((item) => (
                  <div key={item.title} className="relative pl-10">
                    <dt className="text-base font-semibold text-steel-800">
                      <span className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500">
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </span>
                      {item.title}
                    </dt>
                    <dd className="mt-1 text-sm text-steel-500 leading-6">
                      {item.description}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 p-8 lg:p-12">
              <div className="aspect-[4/3] rounded-xl bg-white/60 border border-primary-200 flex items-center justify-center">
                <div className="text-center p-8">
                  <svg className="mx-auto h-16 w-16 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                  </svg>
                  <p className="mt-4 text-sm text-primary-400">Projektbild</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-2xl bg-primary-500 px-8 py-16 text-center sm:px-16">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Redo att starta ert nästa projekt?
            </h2>
            <p className="mt-4 text-primary-100">
              Hör av er så berättar vi hur vi kan hjälpa er.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kontakt"
                className="rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-600 transition-colors"
              >
                Begär offert
              </Link>
              <Link
                href="/om-oss"
                className="rounded-md bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Läs mer om oss
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

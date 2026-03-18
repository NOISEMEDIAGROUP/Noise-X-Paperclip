import Link from "next/link";
import Image from "next/image";
import ScrollReveal from "@/components/ScrollReveal";

const services = [
  {
    title: "BIM/Revit-modellering",
    description:
      "3D-modeller som ger full kontroll över projektet från start till mål. Vi skapar detaljerade BIM-modeller för arkitekter och entreprenörer.",
    href: "/tjanster/bim-modellering",
    image: "/images/bim-construction.jpg",
    imageAlt: "Futuristisk byggarbetsplats med holografiska digitala ritningar",
  },
  {
    title: "Byggritningar",
    description:
      "Teknisk dokumentation och ritningar som uppfyller alla krav. Från konceptskisser till produktionsritningar.",
    href: "/tjanster/byggritningar",
    image: "/images/architect-blueprints.jpg",
    imageAlt: "Arkitekt granskar ritningar med 3D-rendering på skärmen",
  },
  {
    title: "Projektledning",
    description:
      "Professionell samordning av byggprojekt. Vi håller tidsplaner, budget och kvalitet under kontroll.",
    href: "/tjanster/projektledning",
    image: "/images/project-management.jpg",
    imageAlt: "Projektplaneringskontor med Gantt-schema och ritningar",
  },
];

const stats = [
  { value: "15+", label: "Års erfarenhet" },
  { value: "200+", label: "Genomförda projekt" },
  { value: "50+", label: "Nöjda kunder" },
  { value: "100%", label: "Engagemang" },
];

const processSteps = [
  {
    step: "01",
    title: "Rådgivning",
    description: "Vi lyssnar på era behov och analyserar projektets förutsättningar.",
  },
  {
    step: "02",
    title: "Projektering",
    description: "Vi tar fram BIM-modeller, ritningar och teknisk dokumentation.",
  },
  {
    step: "03",
    title: "Genomförande",
    description: "Vi samordnar och leder projektet mot uppsatta mål.",
  },
  {
    step: "04",
    title: "Leverans",
    description: "Kvalitetssäkrad leverans med fullständig dokumentation.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero — full-screen with northern landscape */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <Image
          src="/images/northern-landscape.jpg"
          alt="Norrländskt landskap — berg, älv och tallskog"
          fill
          className="object-cover"
          priority
          quality={85}
        />
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/70 via-primary-900/50 to-primary-900/80" />
        {/* Subtle geometric accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <Image
            src="/images/logo-white.jpg"
            alt="NCD AB logotyp"
            width={80}
            height={80}
            className="mx-auto mb-8 rounded-lg shadow-2xl"
          />
          <p className="text-sm font-medium tracking-[0.25em] uppercase text-accent-400">
            Byggkonsulter i Gällivare
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl leading-tight">
            Modern byggteknik,
            <br />
            <span className="text-accent-400">nordisk precision</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg leading-8 text-white/80">
            NCD AB erbjuder BIM-modellering, byggritningar och projektledning.
            Vi hjälper er genom hela byggprocessen — från idé till färdigt projekt.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/kontakt"
              className="rounded-md bg-accent-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-accent-400 transition-all hover:shadow-accent-500/25"
            >
              Kontakta oss
            </Link>
            <Link
              href="/tjanster"
              className="rounded-md border border-white/30 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
            >
              Våra tjänster
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="h-6 w-6 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-primary-900 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 py-12 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-accent-400">{stat.value}</p>
                <p className="mt-1 text-sm text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services — image-driven cards */}
      <section className="bg-primary-900 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-accent-400">
                Vad vi erbjuder
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Våra tjänster
              </h2>
              <p className="mt-4 mx-auto max-w-xl text-lg text-white/60">
                Helhetslösningar för bygg- och fastighetsprojekt
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {services.map((service, i) => (
              <ScrollReveal key={service.title} delay={i * 100}>
                <Link
                  href={service.href}
                  className="group block rounded-2xl overflow-hidden bg-primary-800/50 border border-white/5 hover:border-accent-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent-500/10"
                >
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.imageAlt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-900/60 to-transparent" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white group-hover:text-accent-400 transition-colors">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-sm text-white/60 leading-6">
                      {service.description}
                    </p>
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-accent-400 group-hover:text-accent-300">
                      Läs mer
                      <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* About — split layout with kitchen/interior image */}
      <section className="bg-steel-50 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 items-center">
            <ScrollReveal>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="/images/kitchen-interior.jpg"
                    alt="Modernt skandinaviskt kök — vit, ek, svarta accenter"
                    width={700}
                    height={500}
                    className="w-full h-auto object-cover"
                  />
                </div>
                {/* Decorative accent element */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 border-2 border-accent-400/30 rounded-xl -z-10" />
                <div className="absolute -top-4 -left-4 w-16 h-16 border-2 border-warm-400/30 rounded-xl -z-10" />
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-accent-600">
                  Om NCD AB
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
                  Varför välja oss?
                </h2>
                <p className="mt-4 text-lg text-steel-600 leading-8">
                  Med gedigen erfarenhet inom bygg- och fastighetsbranschen levererar
                  vi lösningar som skapar verkligt värde. Vi kombinerar teknisk expertis
                  med skandinavisk kvalitetstradition.
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
                        "Från BIM-modellering och ritningar till projektledning — allt under ett tak.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="relative pl-10">
                      <dt className="text-base font-semibold text-steel-900">
                        <span className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500">
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                        {item.title}
                      </dt>
                      <dd className="mt-1 text-sm text-steel-600 leading-6">
                        {item.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Portfolio showcase — facade drawing */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-primary-900" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20 items-center">
            <ScrollReveal>
              <div>
                <p className="text-sm font-medium tracking-[0.2em] uppercase text-accent-400">
                  Våra leveranser
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Kvalitet i varje detalj
                </h2>
                <p className="mt-4 text-lg text-white/70 leading-8">
                  Våra ritningar och modeller håller högsta standard. Vi levererar
                  komplett teknisk dokumentation som arkitekter, konstruktörer och
                  entreprenörer kan lita på.
                </p>
                <Link
                  href="/projekt"
                  className="mt-8 inline-flex items-center text-sm font-semibold text-accent-400 hover:text-accent-300 transition-colors"
                >
                  Se våra projekt
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <Image
                  src="/images/facade-drawing.jpg"
                  alt="Arkitektonisk fasadritning med planritning"
                  width={700}
                  height={500}
                  className="w-full h-auto object-cover"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Process timeline */}
      <section className="bg-steel-50 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-accent-600">
                Hur vi arbetar
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-steel-900 sm:text-4xl">
                Vår process
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {processSteps.map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 100}>
                <div className="relative text-center p-6">
                  {/* Connector line (hidden on last item and mobile) */}
                  {i < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-accent-400/40 to-transparent" />
                  )}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-900 text-accent-400 text-lg font-bold shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-steel-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-steel-600 leading-6">
                    {item.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <Image
          src="/images/northern-landscape.jpg"
          alt=""
          fill
          className="object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-primary-900/85" />
        <div className="relative mx-auto max-w-3xl px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Redo att starta ert nästa projekt?
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Hör av er så berättar vi hur vi kan hjälpa er att förverkliga era visioner.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/offertforfragan"
                className="rounded-md bg-accent-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-accent-400 transition-all hover:shadow-accent-500/25"
              >
                Begär offert
              </Link>
              <Link
                href="/om-oss"
                className="rounded-md border border-white/30 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-all"
              >
                Läs mer om oss
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

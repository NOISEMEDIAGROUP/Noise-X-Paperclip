"use client";

import { useState } from "react";

const projectTypes = [
  "BIM/Revit-modellering",
  "Byggritningar",
  "Projektledning",
  "Drönardokumentation",
  "Helhetslösning",
  "Annat",
];

export default function KontaktPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: integrate with form backend (e.g. Formspree, Resend, or API route)
    setSubmitted(true);
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-primary-500 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Kontakta oss
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-100">
            Berätta om ert projekt så återkommer vi med en kostnadsfri
            konsultation.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Contact form */}
            <div>
              <h2 className="text-2xl font-bold text-steel-800">
                Skicka en förfrågan
              </h2>
              <p className="mt-2 text-steel-500">
                Fyll i formuläret så hör vi av oss inom en arbetsdag.
              </p>

              {submitted ? (
                <div className="mt-8 rounded-xl border border-primary-200 bg-primary-50 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-semibold text-steel-800">
                    Tack för din förfrågan!
                  </h3>
                  <p className="mt-2 text-steel-500">
                    Vi har tagit emot ditt meddelande och återkommer så snart som
                    möjligt.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-steel-700"
                    >
                      Namn <span className="text-accent-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="mt-1 block w-full rounded-md border border-steel-300 px-4 py-2.5 text-steel-800 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      placeholder="Förnamn Efternamn"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-steel-700"
                    >
                      E-post <span className="text-accent-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="mt-1 block w-full rounded-md border border-steel-300 px-4 py-2.5 text-steel-800 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      placeholder="namn@foretag.se"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-steel-700"
                    >
                      Telefon
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="mt-1 block w-full rounded-md border border-steel-300 px-4 py-2.5 text-steel-800 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      placeholder="070-123 45 67"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="projectType"
                      className="block text-sm font-medium text-steel-700"
                    >
                      Typ av projekt <span className="text-accent-500">*</span>
                    </label>
                    <select
                      id="projectType"
                      name="projectType"
                      required
                      className="mt-1 block w-full rounded-md border border-steel-300 px-4 py-2.5 text-steel-800 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Välj typ av projekt
                      </option>
                      {projectTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-steel-700"
                    >
                      Meddelande <span className="text-accent-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      className="mt-1 block w-full rounded-md border border-steel-300 px-4 py-2.5 text-steel-800 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      placeholder="Beskriv ert projekt och vad ni behöver hjälp med..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-md bg-primary-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors sm:w-auto"
                  >
                    Skicka förfrågan
                  </button>
                </form>
              )}
            </div>

            {/* Contact info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-steel-800">
                  Kontaktuppgifter
                </h2>
                <dl className="mt-6 space-y-6">
                  <div className="flex gap-4">
                    <svg className="h-6 w-6 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <div>
                      <dt className="text-sm font-medium text-steel-700">
                        E-post
                      </dt>
                      <dd className="mt-1 text-steel-600">
                        <a
                          href="mailto:info@ncdab.se"
                          className="hover:text-primary-500 transition-colors"
                        >
                          info@ncdab.se
                        </a>
                      </dd>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <svg className="h-6 w-6 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    <div>
                      <dt className="text-sm font-medium text-steel-700">
                        Telefon
                      </dt>
                      <dd className="mt-1 text-steel-600">
                        <a
                          href="tel:+46701234567"
                          className="hover:text-primary-500 transition-colors"
                        >
                          070-123 45 67
                        </a>
                      </dd>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <svg className="h-6 w-6 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    <div>
                      <dt className="text-sm font-medium text-steel-700">
                        Adress
                      </dt>
                      <dd className="mt-1 text-steel-600">
                        Exempelgatan 1<br />
                        123 45 Stockholm
                      </dd>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <svg className="h-6 w-6 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>
                      <dt className="text-sm font-medium text-steel-700">
                        Öppettider
                      </dt>
                      <dd className="mt-1 text-steel-600">
                        Måndag–fredag: 08:00–17:00
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Map placeholder */}
              <div className="rounded-2xl bg-gradient-to-br from-steel-100 to-steel-200 aspect-[16/10] flex items-center justify-center">
                <div className="text-center p-8">
                  <svg className="mx-auto h-12 w-12 text-steel-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                  </svg>
                  <p className="mt-3 text-sm text-steel-500">Karta</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project, ServiceType } from "@/lib/projects";
import { serviceLabels, serviceColors } from "@/lib/projects";

const filterOptions: { value: ServiceType | "alla"; label: string }[] = [
  { value: "alla", label: "Alla projekt" },
  { value: "bim", label: "BIM/Revit" },
  { value: "ritningar", label: "Byggritningar" },
  { value: "projektledning", label: "Projektledning" },
  { value: "dronar", label: "Drönare" },
];

export function ProjectGallery({ projects }: { projects: Project[] }) {
  const [activeFilter, setActiveFilter] = useState<ServiceType | "alla">(
    "alla"
  );

  const filtered =
    activeFilter === "alla"
      ? projects
      : projects.filter((p) => p.serviceType === activeFilter);

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-12">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setActiveFilter(opt.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === opt.value
                ? "bg-primary-500 text-white"
                : "bg-steel-100 text-steel-600 hover:bg-steel-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {filtered.map((project) => (
          <Link
            key={project.slug}
            href={`/projekt/${project.slug}`}
            className="group rounded-xl border border-steel-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all"
          >
            {/* Placeholder image area */}
            <div className="aspect-[16/9] bg-gradient-to-br from-primary-100 to-steel-100 flex items-center justify-center">
              <div className="text-center p-6">
                <svg
                  className="mx-auto h-12 w-12 text-primary-300 group-hover:text-primary-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                  />
                </svg>
                <p className="mt-2 text-xs text-primary-400">Projektfoto</p>
              </div>
            </div>

            {/* Card body */}
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${serviceColors[project.serviceType]}`}
                >
                  {project.serviceLabel}
                </span>
                <span className="text-xs text-steel-400">{project.year}</span>
              </div>
              <h3 className="text-lg font-semibold text-steel-800 group-hover:text-primary-500 transition-colors">
                {project.title}
              </h3>
              <p className="mt-2 text-sm text-steel-500 leading-6 line-clamp-2">
                {project.shortDescription}
              </p>
              <div className="mt-4 flex items-center text-sm text-steel-400">
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                  />
                </svg>
                {project.location}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-steel-400 py-12">
          Inga projekt hittades för vald kategori.
        </p>
      )}
    </>
  );
}

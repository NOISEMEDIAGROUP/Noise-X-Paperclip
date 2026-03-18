export type ServiceType = "bim" | "ritningar" | "projektledning" | "dronar";

export interface Project {
  slug: string;
  title: string;
  location: string;
  year: string;
  serviceType: ServiceType;
  serviceLabel: string;
  shortDescription: string;
  description: string;
  highlights: string[];
  scope: string;
  client: string;
  duration: string;
}

export const serviceLabels: Record<ServiceType, string> = {
  bim: "BIM/Revit-modellering",
  ritningar: "Byggritningar",
  projektledning: "Projektledning",
  dronar: "Drönardokumentation",
};

export const serviceColors: Record<ServiceType, string> = {
  bim: "bg-primary-100 text-primary-700",
  ritningar: "bg-accent-100 text-accent-700",
  projektledning: "bg-steel-200 text-steel-700",
  dronar: "bg-primary-50 text-primary-600",
};

export const projects: Project[] = [
  {
    slug: "kvarteret-hammaren",
    title: "Kvarteret Hammaren — Bostadskvarter i Solna",
    location: "Solna, Stockholm",
    year: "2025",
    serviceType: "bim",
    serviceLabel: "BIM/Revit-modellering",
    shortDescription:
      "Komplett BIM-modellering av ett flerbostadshus med 120 lägenheter i fyra huskroppar. Samordning av arkitekt-, konstruktions- och installationsmodeller.",
    description:
      "NCD AB ansvarade för den fullständiga BIM-samordningen av Kvarteret Hammaren, ett nyproduktionsprojekt med 120 bostadsrätter fördelade på fyra huskroppar i centrala Solna. Vi skapade detaljerade Revit-modeller för alla discipliner och genomförde kollisionskontroller i varje projektfas. Modellerna användes som underlag för mängdning, tidplanering (4D) och kostnadskalkyl (5D), vilket gav byggherren full insyn i projektet redan innan spadtaget.",
    highlights: [
      "120 lägenheter i fyra huskroppar",
      "Fullständig BIM-samordning (LOD 300–400)",
      "Kollisionskontroll med Navisworks",
      "4D-tidplanering och 5D-mängdning",
    ],
    scope: "BIM-samordning, Revit-modellering, kollisionskontroll",
    client: "Solna Bostäder AB",
    duration: "14 månader",
  },
  {
    slug: "ostersunds-skola",
    title: "Östersunds Kulturskola — Ombyggnad",
    location: "Östersund",
    year: "2024",
    serviceType: "ritningar",
    serviceLabel: "Byggritningar",
    shortDescription:
      "Framtagning av kompletta bygghandlingar för ombyggnad av en kulturskola från 1960-talet till moderna undervisningslokaler med nya ventilations- och tillgänglighetskrav.",
    description:
      "Den befintliga kulturskolan i Östersund behövde anpassas till dagens krav på tillgänglighet, brandskydd och inneklimat. NCD AB tog fram samtliga bygghandlingar — från relationsritningar baserade på uppmätning till fullständiga bygglovshandlingar och produktionsritningar. Vi samarbetade nära med kommunens fastighetsbolag och säkerställde att alla handlingar uppfyllde Boverkets byggregler (BBR) och Plan- och bygglagen (PBL).",
    highlights: [
      "Uppmätning och relationsritningar av befintligt hus",
      "Bygglovshandlingar enligt BBR och PBL",
      "A-, K- och VVS-ritningar",
      "Tillgänglighetsanpassning till moderna krav",
    ],
    scope: "Bygglovsritningar, produktionsritningar, relationshandlingar",
    client: "Östersunds kommun",
    duration: "8 månader",
  },
  {
    slug: "logistikpark-jonkoping",
    title: "Logistikpark Jönköping — Nybyggnation",
    location: "Jönköping",
    year: "2025",
    serviceType: "projektledning",
    serviceLabel: "Projektledning",
    shortDescription:
      "Projektledning av nybyggnation av en 12 000 m² logistikanläggning. Samordning av 14 underentreprenörer och ansvar för tidplan, budget och kvalitet.",
    description:
      "NCD AB utsågs till projektledare för uppförandet av en modern logistikanläggning i Jönköping. Projektet omfattade 12 000 m² lager- och kontorsyta med höga krav på energieffektivitet (Miljöbyggnad Silver). Vi samordnade 14 underentreprenörer, ledde byggmöten, hanterade ändrings- och tilläggsarbeten (ÄTA) och ansvarade för övergripande tidplan och ekonomisk uppföljning. Projektet slutfördes inom budget och två veckor före tidplan.",
    highlights: [
      "12 000 m² lager- och kontorsyta",
      "Miljöbyggnad Silver-certifiering",
      "14 samordnade underentreprenörer",
      "Färdigställt under budget och före tidplan",
    ],
    scope: "Projektledning, byggledning, samordning",
    client: "Jönköping Logistik AB",
    duration: "18 månader",
  },
  {
    slug: "bro-inspektion-vasteras",
    title: "Broinspektion E18 — Västerås",
    location: "Västerås",
    year: "2024",
    serviceType: "dronar",
    serviceLabel: "Drönardokumentation",
    shortDescription:
      "Drönarbaserad inspektion och fotodokumentation av tre broar längs E18. Ortofoto, 3D-punktmoln och skaderapporter som underlag för underhållsplanering.",
    description:
      "Trafikverket behövde uppdaterad tillståndsbedömning av tre vägbroar vid Västerås. NCD AB genomförde flygfotografering med drönare utrustad med högupplöst kamera och LiDAR-sensor. Vi levererade georefererade ortofoto, 3D-punktmoln och detaljerade skaderapporter med klassificering enligt Trafikverkets BaTMan-system. Resultaten användes som beslutsunderlag för underhållsplanering och budgetering av reparationsåtgärder.",
    highlights: [
      "Tre broar inspekterade med drönare",
      "Georefererade ortofoto och 3D-punktmoln",
      "Skaderapporter enligt BaTMan-klassificering",
      "Underlag för underhållsplanering",
    ],
    scope: "Drönarflygning, fotogrammetri, tillståndsrapportering",
    client: "Trafikverket",
    duration: "3 veckor",
  },
];

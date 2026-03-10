import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { marketplaceApi, type MarketplaceListing } from "../api/marketplace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Star,
  Download,
  Users,
  Store,
  Shield,
  Zap,
  Package,
} from "lucide-react";

const TYPES = [
  { value: "", label: "All" },
  { value: "team_blueprint", label: "Team Blueprints" },
  { value: "agent_blueprint", label: "Agents" },
  { value: "skill", label: "Skills" },
  { value: "governance_template", label: "Governance" },
] as const;

const CATEGORIES = [
  "Software Development",
  "Marketing & Growth",
  "Content & Media",
  "Research & Analysis",
  "Operations",
  "Sales",
  "Finance & Legal",
  "Creative",
  "General Purpose",
];

function ListingCard({ listing, onClick }: { listing: MarketplaceListing; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {listing.type === "team_blueprint" ? (
            <Users className="h-4 w-4" />
          ) : listing.type === "skill" ? (
            <Zap className="h-4 w-4" />
          ) : listing.type === "governance_template" ? (
            <Shield className="h-4 w-4" />
          ) : (
            <Package className="h-4 w-4" />
          )}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {listing.type.replace(/_/g, " ")}
        </span>
      </div>

      <h3 className="font-semibold leading-tight">{listing.title}</h3>
      {listing.tagline && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{listing.tagline}</p>
      )}

      <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
        {listing.agentCount != null && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {listing.agentCount}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          {listing.installCount}
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          {listing.starCount}
        </span>
        <span className="ml-auto font-semibold text-foreground">
          {listing.priceCents === 0 ? "Free" : `$${(listing.priceCents / 100).toFixed(0)}`}
        </span>
      </div>
    </button>
  );
}

export function Marketplace() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<"popular" | "recent" | "stars">("popular");

  const { data: listings, isLoading } = useQuery({
    queryKey: ["marketplace", "listings", { type, search, sort }],
    queryFn: () =>
      marketplaceApi.listListings({
        type: type || undefined,
        search: search || undefined,
        sort,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ["marketplace", "stats"],
    queryFn: () => marketplaceApi.getStats(),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">ClipMart</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Download a company. Browse pre-built AI team blueprints, agents, and skills.
        </p>
        {stats && (
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{stats.listings}</strong> blueprints</span>
            <span><strong className="text-foreground">{stats.installs}</strong> installs</span>
            <span><strong className="text-foreground">{stats.creators}</strong> creators</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search blueprints, agents, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <Button
              key={t.value}
              variant={type === t.value ? "default" : "outline"}
              size="sm"
              onClick={() => setType(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["popular", "recent", "stars"] as const).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSort(s)}
            >
              {s === "popular" ? "Popular" : s === "recent" ? "New" : "Top Rated"}
            </Button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading...</div>
      ) : !listings?.length ? (
        <div className="py-20 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No listings yet. Be the first to publish!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => navigate(`/marketplace/${listing.slug}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

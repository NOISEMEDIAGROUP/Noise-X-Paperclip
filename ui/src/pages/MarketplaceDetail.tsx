import { useState } from "react";
import { useParams, useNavigate } from "@/lib/router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { marketplaceApi } from "../api/marketplace";
import { useCompany } from "../context/CompanyContext";
import { Button } from "@/components/ui/button";
import {
  Star,
  Download,
  Users,
  ArrowLeft,
  Check,
  Package,
  Zap,
  Shield,
  Clock,
} from "lucide-react";

export function MarketplaceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { companies, selectedCompany } = useCompany();
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["marketplace", "listing", slug],
    queryFn: () => marketplaceApi.getListing(slug!),
    enabled: !!slug,
  });

  const starMutation = useMutation({
    mutationFn: () => marketplaceApi.toggleStar(listing!.id),
  });

  const handleInstall = async () => {
    if (!listing) return;
    setInstalling(true);
    try {
      const result = await marketplaceApi.installListing(
        listing.id,
        selectedCompany?.id,
      );
      setInstalled(true);
      if (result.companyId) {
        setTimeout(() => navigate("/"), 1500);
      }
    } catch {
      // error handled by UI
    } finally {
      setInstalling(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-muted-foreground">Listing not found</p>
      </div>
    );
  }

  const rating = listing.ratingAvg != null ? (listing.ratingAvg / 10).toFixed(1) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/marketplace")}
        className="mb-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to ClipMart
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {listing.type.replace(/_/g, " ")}
          </span>
          <h1 className="mt-1 text-2xl font-bold">{listing.title}</h1>
          {listing.tagline && (
            <p className="mt-1 text-sm text-muted-foreground">{listing.tagline}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            {listing.agentCount != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {listing.agentCount} agents
              </span>
            )}
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" /> {listing.installCount} installs
            </span>
            {rating && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" /> {rating} ({listing.reviewCount})
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="text-xl font-bold">
            {listing.priceCents === 0 ? "Free" : `$${(listing.priceCents / 100).toFixed(0)}`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => starMutation.mutate()}
            >
              <Star className="mr-1 h-3 w-3" /> {listing.starCount}
            </Button>
            <Button
              size="sm"
              onClick={handleInstall}
              disabled={installing || installed}
            >
              {installed ? (
                <><Check className="mr-1 h-3 w-3" /> Installed</>
              ) : installing ? (
                "Installing..."
              ) : (
                <><Download className="mr-1 h-3 w-3" /> Install</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tags */}
      {listing.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1">
          {listing.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2">
          {/* Description */}
          {listing.description && (
            <div className="mb-6 rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">About</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.description}</p>
            </div>
          )}

          {/* README */}
          {listing.readmeMarkdown && (
            <div className="mb-6 rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold">Documentation</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                <pre className="whitespace-pre-wrap text-xs">{listing.readmeMarkdown}</pre>
              </div>
            </div>
          )}

          {/* Reviews */}
          {listing.reviews.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Reviews ({listing.reviews.length})</h2>
              <div className="space-y-3">
                {listing.reviews.map((review) => (
                  <div key={review.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{review.authorDisplayName}</span>
                      <span className="flex items-center text-yellow-500">
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </span>
                    </div>
                    {review.title && <p className="mt-1 text-sm font-medium">{review.title}</p>}
                    {review.body && <p className="mt-0.5 text-xs text-muted-foreground">{review.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Adapters */}
          {listing.compatibleAdapters.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compatible Adapters
              </h3>
              <div className="flex flex-wrap gap-1">
                {listing.compatibleAdapters.map((a) => (
                  <span key={a} className="rounded bg-muted px-2 py-0.5 text-xs">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Versions */}
          {listing.versions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Versions
              </h3>
              <div className="space-y-2">
                {listing.versions.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium">v{v.version}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {listing.categories.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
              </h3>
              <div className="flex flex-wrap gap-1">
                {listing.categories.map((c) => (
                  <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

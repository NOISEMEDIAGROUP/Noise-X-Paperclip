import { Link, useLocation, useParams } from "@/lib/router";
import { SearchX } from "lucide-react";

export function NotFoundPage() {
  const location = useLocation();
  const { companyPrefix } = useParams<{ companyPrefix?: string }>();
  const home = companyPrefix ? `/${companyPrefix}/dashboard` : "/";

  return (
    <div className="mx-auto max-w-2xl py-10 px-6">
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="mb-4 flex items-center gap-3">
          <SearchX className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Page not found</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          We could not find <span className="font-mono text-foreground">{location.pathname}</span>
          {companyPrefix ? ` in company ${companyPrefix}.` : "."}
        </p>
        <div className="mt-5">
          <Link to={home} className="text-sm font-medium underline underline-offset-2">
            Go back to {companyPrefix ? `${companyPrefix} dashboard` : "home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

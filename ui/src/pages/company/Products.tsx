import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "../../api/products";
import { queryKeys } from "../../lib/queryKeys";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";

export function ProductsPage() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: selectedCompany?.name ?? "Company", href: "/dashboard" }, { label: "Products" }]);
  }, [selectedCompany?.name, setBreadcrumbs]);

  const listQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.products.list(selectedCompanyId) : ["products", "none"],
    queryFn: () => productsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  useEffect(() => {
    if (!selectedProductId && listQuery.data?.length) {
      setSelectedProductId(listQuery.data[0].id);
    }
  }, [listQuery.data, selectedProductId]);

  const selectedProduct = useMemo(() => (listQuery.data ?? []).find((item: any) => item.id === selectedProductId) ?? null, [listQuery.data, selectedProductId]);

  const analyticsQuery = useQuery({
    queryKey: selectedCompanyId && selectedProductId ? queryKeys.products.analytics(selectedCompanyId, selectedProductId) : ["products", "analytics", "none"],
    queryFn: () => productsApi.analytics(selectedCompanyId!, selectedProductId!),
    enabled: Boolean(selectedCompanyId && selectedProductId),
  });

  const create = useMutation({
    mutationFn: () => productsApi.create(selectedCompanyId!, { slug, name, productType: "newsletter", primaryChannel: "email" }),
    onSuccess: (product) => {
      setName("");
      setSlug("");
      setSelectedProductId(product.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.list(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) return null;
  if (listQuery.isLoading) return <div className="text-sm text-muted-foreground">Loading products...</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage product lines and inspect product-scoped analytics.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr,1.4fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-medium">Create product</div>
            <input className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm" placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <button className="rounded-md border border-border px-3 py-2 text-sm" onClick={() => create.mutate()} disabled={!name.trim() || !slug.trim() || create.isPending}>Create product</button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-medium">Product catalog</div>
            {(listQuery.data ?? []).map((product: any) => (
              <button key={product.id} onClick={() => setSelectedProductId(product.id)} className={`w-full rounded-md border px-3 py-3 text-left ${selectedProductId === product.id ? "border-foreground bg-muted/50" : "border-border"}`}>
                <div className="font-medium">{product.name}</div>
                <div className="text-xs text-muted-foreground">{product.productType} · {product.primaryChannel} · {product.status}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          {!selectedProduct ? (
            <div className="text-sm text-muted-foreground">Select a product to inspect analytics.</div>
          ) : analyticsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading analytics...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{selectedProduct.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedProduct.slug} · {selectedProduct.productType}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border/70 p-4"><div className="text-xs text-muted-foreground uppercase">Subscribers</div><div className="mt-2 text-2xl font-semibold">{analyticsQuery.data?.subscribers?.total ?? 0}</div></div>
                <div className="rounded-lg border border-border/70 p-4"><div className="text-xs text-muted-foreground uppercase">Paid</div><div className="mt-2 text-2xl font-semibold">{analyticsQuery.data?.subscribers?.paid ?? 0}</div></div>
                <div className="rounded-lg border border-border/70 p-4"><div className="text-xs text-muted-foreground uppercase">MRR</div><div className="mt-2 text-2xl font-semibold">${((analyticsQuery.data?.revenue?.mrrCents ?? 0) / 100).toFixed(0)}</div></div>
                <div className="rounded-lg border border-border/70 p-4"><div className="text-xs text-muted-foreground uppercase">Health</div><div className="mt-2 text-2xl font-semibold capitalize">{analyticsQuery.data?.health?.currentStatus ?? "healthy"}</div></div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border/70 p-4">
                  <div className="mb-3 text-sm font-medium">Subscriber breakdown</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between"><span>Total</span><span>{analyticsQuery.data?.subscribers?.total ?? 0}</span></div>
                    <div className="flex items-center justify-between"><span>Pending</span><span>{analyticsQuery.data?.subscribers?.pending ?? 0}</span></div>
                    <div className="flex items-center justify-between"><span>Paid</span><span>{analyticsQuery.data?.subscribers?.paid ?? 0}</span></div>
                    <div className="flex items-center justify-between"><span>Unsubscribed</span><span>{analyticsQuery.data?.subscribers?.unsubscribed ?? 0}</span></div>
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 p-4">
                  <div className="mb-3 text-sm font-medium">Revenue summary</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between"><span>MRR</span><span>${((analyticsQuery.data?.revenue?.mrrCents ?? 0) / 100).toFixed(0)}</span></div>
                    <div className="flex items-center justify-between"><span>Total revenue</span><span>${((analyticsQuery.data?.revenue?.totalRevenueCents ?? 0) / 100).toFixed(0)}</span></div>
                    <div className="flex items-center justify-between"><span>Total users</span><span>{analyticsQuery.data?.users?.totalUsers ?? 0}</span></div>
                    <div className="flex items-center justify-between"><span>Churned</span><span>{analyticsQuery.data?.users?.churned ?? 0}</span></div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border/70 p-4">
                  <div className="mb-3 text-sm font-medium">Recent revenue events</div>
                  <div className="space-y-3">
                    {((analyticsQuery.data?.revenue?.recentEvents ?? []) as Array<any>).length === 0 && <div className="text-sm text-muted-foreground">No revenue events yet.</div>}
                    {((analyticsQuery.data?.revenue?.recentEvents ?? []) as Array<any>).map((event) => (
                      <div key={event.id} className="rounded-md border border-border/60 px-3 py-3 text-sm">
                        <div className="font-medium">{event.eventType}</div>
                        <div className="text-xs text-muted-foreground">{event.customerEmail ?? "Unknown customer"} · ${((event.amountCents ?? 0) / 100).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 p-4">
                  <div className="mb-3 text-sm font-medium">Recent health checks</div>
                  <div className="space-y-3">
                    {((analyticsQuery.data?.health?.checks24h ?? []) as Array<any>).length === 0 && <div className="text-sm text-muted-foreground">No health checks yet.</div>}
                    {((analyticsQuery.data?.health?.checks24h ?? []) as Array<any>).map((check) => (
                      <div key={check.id} className="rounded-md border border-border/60 px-3 py-3 text-sm">
                        <div className="font-medium capitalize">{check.status}</div>
                        <div className="text-xs text-muted-foreground break-all">{check.endpointUrl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

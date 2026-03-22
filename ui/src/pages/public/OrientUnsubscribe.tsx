import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useParams } from "@/lib/router";

export function OrientUnsubscribePage() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { document.title = 'Unsubscribe · Orient Weekly · Paperclip'; }, []);
  const unsubscribe = useMutation({ mutationFn: async () => { const response = await fetch(`/api/public/newsletter/${companyPrefix}/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? 'Failed to unsubscribe'); return body; }, onSuccess:()=>{ setError(null); setMessage('You\'ve been unsubscribed successfully.'); }, onError:(e)=>setError(e instanceof Error ? e.message : 'Failed to unsubscribe') });
  if (!companyPrefix) return null;
  return <div className="min-h-screen bg-slate-950 px-6 py-12 text-white"><div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur"><h1 className="text-3xl font-semibold">Unsubscribe</h1><p className="mt-2 text-sm text-white/70">Enter the email address you want removed from Orient Weekly.</p><div className="mt-6 space-y-3"><input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm" /><button onClick={()=>unsubscribe.mutate()} disabled={!email.trim() || unsubscribe.isPending} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-900 disabled:opacity-60">Unsubscribe</button></div>{message && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div>}{error && <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div>}</div></div>;
}

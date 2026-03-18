'use client';

import Link from 'next/link';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
          <p className="text-slate-400">
            We're confident you'll love your brand. If not, we'll refund you — no questions asked.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="prose prose-invert max-w-none">
          {/* Main Policy */}
          <div className="rounded-lg bg-slate-800 border border-slate-700 p-8 space-y-8">
            {/* Overview */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">30-Day Money-Back Guarantee</h2>
              <p className="text-slate-300 leading-relaxed">
                If you're not satisfied with your brand kit for any reason, we'll give you a full refund within 30 days of purchase. No questions. No hassle.
              </p>
              <p className="text-slate-300 leading-relaxed mt-4">
                We stand behind our product because we believe it works. And if it doesn't work for you, we don't want your money.
              </p>
            </section>

            {/* How to Request */}
            <section className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-white mb-4">How to Request a Refund</h2>
              <ol className="list-decimal list-inside space-y-3 text-slate-300">
                <li className="ml-2">
                  <span className="ml-1">Email us at <a href="mailto:support@diybrand.app" className="text-blue-400 hover:text-blue-300">support@diybrand.app</a></span>
                </li>
                <li className="ml-2">
                  <span className="ml-1">Include your order number or the email you used to purchase</span>
                </li>
                <li className="ml-2">
                  <span className="ml-1">Let us know if you'd like feedback (optional)</span>
                </li>
                <li className="ml-2">
                  <span className="ml-1">We'll process your refund within 2-3 business days</span>
                </li>
                <li className="ml-2">
                  <span className="ml-1">The refund appears in your account 3-5 business days after processing</span>
                </li>
              </ol>
            </section>

            {/* Timeline */}
            <section className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-white mb-4">Refund Timeline</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      1
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Purchase Day</h3>
                    <p className="text-sm text-slate-400 mt-1">You have 30 days from today to request a refund</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      2
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Email Us</h3>
                    <p className="text-sm text-slate-400 mt-1">Send refund request to support@diybrand.app</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      3
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">We Process (2-3 business days)</h3>
                    <p className="text-sm text-slate-400 mt-1">Refund issued to original payment method</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      4
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Appears in Account (3-5 business days)</h3>
                    <p className="text-sm text-slate-400 mt-1">Total timeline: ~1 week from refund request</p>
                  </div>
                </div>
              </div>
            </section>

            {/* What's Covered */}
            <section className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-white mb-4">What's Covered by the Guarantee</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-slate-700/50 p-4">
                  <h3 className="font-semibold text-white mb-2">✅ You Can Refund If:</h3>
                  <ul className="text-sm text-slate-300 space-y-2">
                    <li>• You're not satisfied with the brand kit</li>
                    <li>• The logos don't match your vision</li>
                    <li>• Colors or fonts aren't right</li>
                    <li>• You changed your mind</li>
                    <li>• You ran into technical issues</li>
                    <li>• Any reason, no explanation needed</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-slate-700/50 p-4">
                  <h3 className="font-semibold text-white mb-2">ℹ️ Note:</h3>
                  <p className="text-sm text-slate-300">
                    We offer refunds within 30 days of purchase. If you request a refund after 30 days, we may not be able to help. Contact us anyway — we'll see what we can do.
                  </p>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-white mb-4">Refund FAQs</h2>
              <div className="space-y-4">
                <details className="rounded-lg bg-slate-700/30 p-4 cursor-pointer group">
                  <summary className="font-semibold text-white flex justify-between items-center">
                    <span>Will I lose access to my brand files after refund?</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="text-slate-300 mt-3 text-sm">
                    Yes. After refund, your download links expire. Download your files before requesting a refund if you want to keep them.
                  </p>
                </details>

                <details className="rounded-lg bg-slate-700/30 p-4 cursor-pointer group">
                  <summary className="font-semibold text-white flex justify-between items-center">
                    <span>Can I get a partial refund?</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="text-slate-300 mt-3 text-sm">
                    No, it's all or nothing. Either we refund your full purchase or you keep it. This keeps things simple.
                  </p>
                </details>

                <details className="rounded-lg bg-slate-700/30 p-4 cursor-pointer group">
                  <summary className="font-semibold text-white flex justify-between items-center">
                    <span>What if I used my brand somewhere already?</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="text-slate-300 mt-3 text-sm">
                    That's fine. You can still get a refund. The guarantee is about satisfaction, not usage. If you're not happy, we'll refund you.
                  </p>
                </details>

                <details className="rounded-lg bg-slate-700/30 p-4 cursor-pointer group">
                  <summary className="font-semibold text-white flex justify-between items-center">
                    <span>How will you refund me?</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="text-slate-300 mt-3 text-sm">
                    Back to your original payment method. If you paid with a credit card, it goes back to that card. If PayPal, it goes back to PayPal.
                  </p>
                </details>

                <details className="rounded-lg bg-slate-700/30 p-4 cursor-pointer group">
                  <summary className="font-semibold text-white flex justify-between items-center">
                    <span>I'm past 30 days. Can I still get a refund?</span>
                    <span className="group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="text-slate-300 mt-3 text-sm">
                    Probably not, but ask anyway. Email us with your situation and we'll consider it. Our policy is 30 days, but we're human.
                  </p>
                </details>
              </div>
            </section>

            {/* CTA */}
            <section className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-white mb-4">Questions?</h2>
              <p className="text-slate-300 mb-6">
                If your situation doesn't fit neatly into this policy, just email us. We'll do what's right.
              </p>
              <div className="flex gap-4 flex-wrap">
                <a
                  href="mailto:support@diybrand.app"
                  className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Email Support
                </a>
                <Link
                  href="/faq"
                  className="inline-block px-6 py-2 border border-slate-600 text-white rounded-lg hover:border-slate-500 transition-colors font-medium"
                >
                  Back to FAQ
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

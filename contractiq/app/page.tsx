import Link from 'next/link'

const FEATURES = [
  {
    icon: '📄',
    title: 'Upload any NDA or MSA',
    description: 'Drag and drop your PDF. We extract every key term in under 30 seconds.',
  },
  {
    icon: '🎯',
    title: 'Page-level attribution',
    description: 'Every extracted term links back to the exact page it came from. Verify in one click.',
  },
  {
    icon: '📊',
    title: 'Confidence scoring',
    description: 'Know exactly which terms to double-check. Green, amber, and red confidence badges on every result.',
  },
  {
    icon: '💬',
    title: 'Chat with your contract',
    description: 'Ask plain-English questions. Get answers grounded strictly in the document — with page citations.',
  },
]

const PLANS = [
  {
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    features: ['5 contract analyses', 'NDA + MSA support', 'Chat included', 'Full features'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$19',
    period: 'per month',
    features: ['10 analyses/month', 'NDA + MSA support', 'Chat included', 'Email support'],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Growth',
    price: '$49',
    period: 'per month',
    features: ['40 analyses/month', 'Custom key terms', 'CSV/PDF export', 'Priority support'],
    cta: 'Get Started',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-brand-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-primary">ContractIQ</span>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="btn-ghost text-sm">
              Sign In
            </Link>
            <Link href="/sign-up" className="btn-primary text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-white to-brand-surface">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8">
          <span>🚀</span>
          <span>NDA &amp; MSA review in under 15 minutes</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 max-w-3xl leading-tight mb-6">
          Understand any contract{' '}
          <span className="text-brand-primary">without a lawyer</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl leading-relaxed mb-10">
          ContractIQ extracts every key term from your NDA or MSA, tells you exactly where
          it lives in the document, scores its confidence, and lets you ask questions in
          plain English — all in under 30 seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/sign-up" className="btn-primary px-8 py-4 text-base">
            Start Free — No credit card required
          </Link>
          <Link href="/sign-in" className="btn-secondary px-8 py-4 text-base">
            Sign In
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-400">
          $19/month after trial · Less than 5 minutes of lawyer time
        </p>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-brand-border bg-white py-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-gray-900">≤ 30s</div>
            <div className="text-sm text-gray-500 mt-1">Key terms extracted P95</div>
          </div>
          <div className="hidden sm:block w-px h-10 bg-brand-border" />
          <div>
            <div className="text-3xl font-bold text-gray-900">≥ 88%</div>
            <div className="text-sm text-gray-500 mt-1">F1 accuracy on NDA terms</div>
          </div>
          <div className="hidden sm:block w-px h-10 bg-brand-border" />
          <div>
            <div className="text-3xl font-bold text-gray-900">$0.25</div>
            <div className="text-sm text-gray-500 mt-1">Max cost per analysis</div>
          </div>
          <div className="hidden sm:block w-px h-10 bg-brand-border" />
          <div>
            <div className="text-3xl font-bold text-gray-900">90 → 15 min</div>
            <div className="text-sm text-gray-500 mt-1">Review time reduction</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-brand-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Everything you need to review a contract confidently
          </h2>
          <p className="text-gray-500 text-center mb-16 max-w-xl mx-auto">
            Purpose-built for NDA and MSA review. No legal training required.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-white border-t border-brand-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-16">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Upload your PDF', desc: 'Select NDA or MSA, drag in your contract. Up to 20 pages / 10 MB.' },
              { step: '02', title: 'AI extracts key terms', desc: 'GPT-4o identifies every material clause with page attribution and confidence scores.' },
              { step: '03', title: 'Review and chat', desc: 'Browse the key terms panel, ask questions, correct anything off, and export.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-brand-primary text-white font-bold flex items-center justify-center text-lg mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-brand-surface border-t border-brand-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-500 mb-16">Start free. Upgrade when you need more.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`card p-8 flex flex-col ${p.highlight ? 'ring-2 ring-brand-primary' : ''}`}
              >
                {p.highlight && (
                  <div className="inline-flex self-center px-3 py-0.5 rounded-full bg-brand-primary text-white text-xs font-semibold mb-4">
                    Most popular
                  </div>
                )}
                <div className="text-lg font-bold text-gray-900 mb-1">{p.name}</div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold text-gray-900">{p.price}</span>
                  <span className="text-gray-400 text-sm pb-1">/ {p.period}</span>
                </div>
                <ul className="mt-6 mb-8 space-y-3 text-left flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-brand-secondary font-bold">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={p.highlight ? 'btn-primary' : 'btn-secondary'}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-brand-primary text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to stop guessing what you're signing?</h2>
        <p className="text-blue-100 mb-8 max-w-xl mx-auto">
          Join founders and freelancers who review contracts in minutes, not hours.
        </p>
        <Link href="/sign-up" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-brand-primary font-bold text-base hover:bg-blue-50 transition-colors">
          Get Started Free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border bg-white py-8 px-6 text-center">
        <div className="text-sm text-gray-400">
          © 2026 ContractIQ · Powered by OpenAI GPT-4o ·{' '}
          <span className="text-xs">
            ContractIQ is an AI-assisted review tool, not legal advice.
            Always verify critical terms with a qualified lawyer.
          </span>
        </div>
      </footer>
    </div>
  )
}

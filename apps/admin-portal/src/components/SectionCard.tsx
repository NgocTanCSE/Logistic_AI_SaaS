type SectionCardProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

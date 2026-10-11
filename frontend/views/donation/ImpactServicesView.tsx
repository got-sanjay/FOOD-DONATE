import { Bike, CalendarHeart, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Service = {
  title: string
  description: string
  icon: LucideIcon
  tone: string
}

const services: Service[] = [
  {
    title: 'Instant Pickup',
    description: 'Fresh leftovers collected by a local pickup team within 30 minutes.',
    icon: Bike,
    tone: 'bg-primary text-foreground',
  },
  {
    title: 'Event Surplus',
    description: 'Weddings, conferences & parties — redirect bulk food to shelters fast.',
    icon: CalendarHeart,
    tone: 'bg-brand-orange/10 text-brand-orange',
  },
]

export function ImpactServicesView() {
  return (
    <section id="services" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            What we do
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            Our Impact Services
          </h2>
        </div>
        <p className="max-w-md text-pretty text-muted-foreground">
          Every service is built to move good food from where it&apos;s extra to where it&apos;s
          needed — safely and quickly.
        </p>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {services.map((service) => (
          <li key={service.title}>
            <a
              href="#donate"
              className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-start justify-between">
                <span className={`flex size-12 items-center justify-center rounded-2xl ${service.tone}`}>
                  <service.icon className="size-6" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-6 text-lg font-bold">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export const ImpactServices = ImpactServicesView

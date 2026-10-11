import Image from 'next/image'
import { DonationCardView } from './DonationCardView'

const stats = [
  { value: '2.4M+', label: 'Meals rescued' },
  { value: '850+', label: 'Verified NGOs' },
  { value: '30 min', label: 'Avg. pickup' },
]

export function HeroSectionView() {
  return (
    <section className="relative overflow-hidden bg-secondary">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-12 md:px-8 md:py-20 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-semibold shadow-sm">
              <span className="size-2 rounded-full bg-brand-green" aria-hidden="true" />
              Zero food waste, one pickup at a time
            </span>
            <h1 className="isolate mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Surplus food? <br className="hidden sm:block" />
              <span className="relative inline-block">
                Rescue it
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-full bg-primary md:h-4"
                />
              </span>{' '}
              in minutes.
            </h1>
          </div>

          <DonationCardView />

          <dl className="flex flex-wrap gap-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                <dd className="text-2xl font-extrabold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute inset-6 -z-0 rounded-[3rem] bg-primary/30 blur-3xl"
          />
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-background p-4 shadow-sm">
            <Image
              src="/images/hero-delivery.png"
              alt="Illustration of a delivery rider on a yellow scooter carrying a food box across a city map between pickup and drop-off pins"
              width={1408}
              height={768}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

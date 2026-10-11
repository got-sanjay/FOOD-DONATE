import { SiteHeaderView } from '@/frontend/views/shared/SiteHeaderView'
import { HeroSectionView } from '@/frontend/views/donation/HeroSectionView'
import { ImpactServicesView } from '@/frontend/views/donation/ImpactServicesView'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeaderView showNavigation={false} />
      <main>
        <HeroSectionView />
        <ImpactServicesView />
      </main>
    </div>
  )
}

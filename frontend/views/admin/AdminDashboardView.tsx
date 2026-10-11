'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Building2, CheckCircle2, ClipboardList, MapPin, Plus, RefreshCw, ShieldCheck, Truck } from 'lucide-react'
import type { DonationFoodItem } from '@/lib/donation'

type AdminNgo = {
  id: string
  name: string
  region: string
  isActive: boolean
  reviewStatus: 'pending' | 'approved' | 'rejected'
  createdAt: string
}
type AdminDonation = {
  id: string
  pickupAddress: string
  foodType: string
  quantity: number
  quantityUnit: string
  foodItems: DonationFoodItem[]
  region: string
  status: string
  createdAt: string
  selectedNgoId: string | null
}
type AdminData = {
  ngos: AdminNgo[]
  donations: AdminDonation[]
  summary: { region: string; status: string; count: number }[]
}

const statusLabels: Record<string, string> = {
  broadcasting: 'Open', accepted: 'Accepted', in_progress: 'In progress', completed: 'Completed', expired: 'Expired', cancelled: 'Cancelled',
}

function regionKey(region: string) {
  return region.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
}

function regionLabel(region: string) {
  return region
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en')
    .replace(/(^|[\s-])\p{L}/gu, (character) => character.toLocaleUpperCase('en'))
}

function statusStyle(status: string) {
  if (status === 'completed') return 'bg-brand-green/10 text-brand-green'
  if (status === 'in_progress' || status === 'accepted') return 'bg-brand-blue/10 text-brand-blue'
  if (status === 'broadcasting') return 'bg-[#FFC107]/20 text-foreground'
  return 'bg-muted text-muted-foreground'
}

export function AdminDashboardView({ username }: { username: string }) {
  const router = useRouter()
  const [data, setData] = useState<AdminData>({ ngos: [], donations: [], summary: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [regionFilter, setRegionFilter] = useState('All regions')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [newName, setNewName] = useState('')
  const [newRegion, setNewRegion] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingNgo, setSavingNgo] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    try {
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const result = await response.json()
      if (response.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!response.ok) throw new Error(result.error || 'Could not load admin data.')
      setData(result as AdminData)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load admin data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => { void loadData() }, [loadData])

  const regions = useMemo(() => {
    const uniqueRegions = new Map<string, string>()
    for (const region of [...data.summary.map((item) => item.region), ...data.ngos.map((item) => item.region)]) {
      const key = regionKey(region)
      if (key && !uniqueRegions.has(key)) uniqueRegions.set(key, regionLabel(region))
    }
    return Array.from(uniqueRegions.values()).sort((a, b) => a.localeCompare(b))
  }, [data])
  const filteredDonations = useMemo(() => data.donations.filter((item) =>
    (regionFilter === 'All regions' || regionKey(item.region) === regionKey(regionFilter)) &&
    (statusFilter === 'All statuses' || item.status === statusFilter),
  ), [data.donations, regionFilter, statusFilter])
  const regionalStats = useMemo(() => {
    const statsByRegion = new Map<string, { region: string; total: number; open: number; active: number; completed: number }>()
    for (const region of regions) {
      statsByRegion.set(regionKey(region), { region, total: 0, open: 0, active: 0, completed: 0 })
    }
    for (const item of data.summary) {
      const key = regionKey(item.region)
      const stats = statsByRegion.get(key)
      if (!stats) continue
      stats.total += item.count
      if (item.status === 'broadcasting') stats.open += item.count
      if (item.status === 'accepted' || item.status === 'in_progress') stats.active += item.count
      if (item.status === 'completed') stats.completed += item.count
    }
    return Array.from(statsByRegion.values())
  }, [data.summary, regions])
  const counts = useMemo(() => ({
    requests: data.summary.reduce((total, item) => total + item.count, 0),
    open: data.summary.filter((item) => item.status === 'broadcasting').reduce((total, item) => total + item.count, 0),
    progress: data.summary.filter((item) => item.status === 'accepted' || item.status === 'in_progress').reduce((total, item) => total + item.count, 0),
    completed: data.summary.filter((item) => item.status === 'completed').reduce((total, item) => total + item.count, 0),
  }), [data.summary])

  async function createNgo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingNgo(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/ngos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, region: newRegion, password: newPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not create NGO account.')
      setNewName('')
      setNewRegion('')
      setNewPassword('')
      setMessage(`Created ${result.ngo.name}; share the initial password securely with that NGO.`)
      await loadData(true)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create NGO account.')
    } finally {
      setSavingNgo(false)
    }
  }

  async function updateNgo(ngo: AdminNgo, patch: Partial<Pick<AdminNgo, 'region' | 'isActive' | 'reviewStatus'>>) {
    setSavingId(ngo.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch(`/api/admin/ngos/${ngo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update NGO.')
      setData((current) => ({ ...current, ngos: current.ngos.map((item) => item.id === ngo.id ? result.ngo : item) }))
      setMessage(patch.reviewStatus === 'approved'
        ? `${result.ngo.name} approved and added to the NGO directory.`
        : patch.reviewStatus === 'rejected'
          ? `${result.ngo.name} registration rejected.`
          : `${result.ngo.name} settings saved.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update NGO.')
    } finally {
      setSavingId(null)
    }
  }

  async function signOut() {
    await fetch('/api/admin-auth/logout', { method: 'POST' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <section className="overflow-hidden rounded-[2rem] bg-secondary p-6 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">Operations control center</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">FoodRescue admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">Signed in as {username}. Monitor regions, manage NGO access and review request outcomes.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadData(true)} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-60">
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh
            </button>
            <button type="button" onClick={signOut} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background">Sign out</button>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<ClipboardList className="size-5" />} label="All requests" value={counts.requests} />
          <Metric icon={<Activity className="size-5" />} label="Open broadcasts" value={counts.open} />
          <Metric icon={<Truck className="size-5" />} label="Accepted / in progress" value={counts.progress} />
          <Metric icon={<CheckCircle2 className="size-5" />} label="Completed" value={counts.completed} />
        </div>
      </section>

      {error && <p role="alert" className="mt-5 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-2xl border border-brand-green/30 bg-brand-green/5 p-4 text-sm font-semibold text-brand-green">{message}</p>}

      <section aria-labelledby="ngo-review-title" className="mt-10">
        <div className="overflow-hidden rounded-[2rem] border border-[#FFC107]/40 bg-gradient-to-br from-[#FFC107]/15 via-card to-brand-green/5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.3)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-6 py-6 md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">Approval queue</p>
              <h2 id="ngo-review-title" className="mt-1 text-2xl font-extrabold md:text-3xl">NGO registrations to review</h2>
              <p className="mt-1 text-sm text-muted-foreground">Review each organization’s region before granting access.</p>
            </div>
            <span className="flex size-16 items-center justify-center rounded-2xl bg-[#FFC107]/25 text-3xl font-black tabular-nums" aria-label={`${data.ngos.filter((ngo) => ngo.reviewStatus === 'pending').length} registrations pending`}>
              {data.ngos.filter((ngo) => ngo.reviewStatus === 'pending').length}
            </span>
          </div>
          <div className="p-5 md:p-8">
            {loading ? <EmptyState text="Loading NGO registrations..." /> : data.ngos.filter((ngo) => ngo.reviewStatus === 'pending').length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 px-6 py-10 text-center">
                <ShieldCheck className="mx-auto size-9 text-brand-green" aria-hidden="true" />
                <p className="mt-3 text-base font-bold">You’re all caught up</p>
                <p className="mt-1 text-sm text-muted-foreground">No NGO registrations are waiting for approval.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.ngos.filter((ngo) => ngo.reviewStatus === 'pending').map((ngo) => (
                  <article key={ngo.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-green/10"><Building2 className="size-6 text-brand-green" aria-hidden="true" /></span>
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-extrabold">{ngo.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(ngo.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#FFC107]/25 px-3 py-1 text-xs font-bold">Pending</span>
                    </div>
                    <p className="mt-5 flex items-center gap-2 rounded-xl bg-muted/70 px-4 py-3 text-sm font-semibold">
                      <MapPin className="size-4 shrink-0 text-brand-blue" aria-hidden="true" />{ngo.region}
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button type="button" onClick={() => void updateNgo(ngo, { reviewStatus: 'approved' })} disabled={savingId === ngo.id} className="flex-1 rounded-xl bg-brand-green px-4 py-3 text-sm font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50">{savingId === ngo.id ? 'Saving...' : 'Approve NGO'}</button>
                      <button type="button" onClick={() => void updateNgo(ngo, { reviewStatus: 'rejected' })} disabled={savingId === ngo.id} className="rounded-xl border border-border px-5 py-3 text-sm font-bold transition-colors hover:bg-muted disabled:opacity-50">Reject</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="region-stats-title" className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">Regional operations</p><h2 id="region-stats-title" className="mt-1 text-2xl font-extrabold">Requests by region</h2></div>
          <span className="text-xs text-muted-foreground">Based on donor-entered pickup regions</span>
        </div>
        {regionalStats.length === 0 ? <EmptyState text="Regional summaries will appear when donation requests arrive." /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {regionalStats.map((stat) => (
              <button key={stat.region} type="button" onClick={() => setRegionFilter(stat.region)} className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-brand-blue/40">
                <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-extrabold"><MapPin className="size-4 text-brand-green" aria-hidden="true" />{stat.region}</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold">{stat.total} total</span></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><span className="rounded-xl bg-[#FFC107]/15 p-2"><b className="block text-base">{stat.open}</b>Open</span><span className="rounded-xl bg-brand-blue/10 p-2"><b className="block text-base">{stat.active}</b>In progress</span><span className="rounded-xl bg-brand-green/10 p-2"><b className="block text-base">{stat.completed}</b>Completed</span></div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="requests-title" className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">Live service overview</p><h2 id="requests-title" className="mt-1 text-2xl font-extrabold">Donation requests</h2></div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="admin-region-filter">Filter by region</label>
            <select id="admin-region-filter" value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)} className="rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold"><option>All regions</option>{regions.map((region) => <option key={region}>{region}</option>)}</select>
            <label className="sr-only" htmlFor="admin-status-filter">Filter by status</label>
            <select id="admin-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold"><option>All statuses</option>{Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select>
          </div>
        </div>
        {loading ? <EmptyState text="Loading operations data..." /> : filteredDonations.length === 0 ? <EmptyState text="No requests match the current filters." /> : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Food / quantity</th><th className="px-4 py-3">Region / pickup</th><th className="px-4 py-3">Assigned NGO</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reported</th></tr></thead>
              <tbody className="divide-y divide-border">
                {filteredDonations.map((item) => {
                  const assignedNgo = data.ngos.find((ngo) => ngo.id === item.selectedNgoId)
                  return <tr key={item.id} className="align-top"><td className="px-4 py-4"><ul className="space-y-2">{item.foodItems.map((food, index) => <li key={`${food.foodType}-${index}`}><span className="font-bold">{food.foodType}</span><span className="mt-0.5 block text-xs text-muted-foreground">{food.quantity} {food.quantityUnit}</span><span className="block text-xs text-muted-foreground">Use by {new Date(food.expiresAt).toLocaleString()}</span></li>)}</ul></td><td className="px-4 py-4"><span className="font-semibold">{item.region}</span><span className="mt-1 block max-w-sm text-xs text-muted-foreground">{item.pickupAddress}</span></td><td className="px-4 py-4">{assignedNgo?.name ?? 'Unassigned'}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(item.status)}`}>{statusLabels[item.status] ?? item.status}</span></td><td className="px-4 py-4 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td></tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="ngo-management-title" className="mt-10">
        <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Access management</p><h2 id="ngo-management-title" className="mt-1 text-2xl font-extrabold">NGO directory</h2></div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            {loading ? <EmptyState text="Loading NGO accounts..." /> : data.ngos.filter((ngo) => ngo.reviewStatus !== 'pending').length === 0 ? <EmptyState text="No approved NGO accounts yet." /> : (
              <table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">NGO</th><th className="px-4 py-3">Region</th><th className="px-4 py-3">Review</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-border">{data.ngos.filter((ngo) => ngo.reviewStatus !== 'pending').map((ngo) => <NgoRow key={ngo.id} ngo={ngo} saving={savingId === ngo.id} onSave={updateNgo} />)}</tbody></table>
            )}
          </div>
          <form onSubmit={createNgo} className="h-fit rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-brand-green/10"><Plus className="size-4 text-brand-green" aria-hidden="true" /></span><h3 className="font-extrabold">Add NGO account</h3></div>
            <label className="mt-4 block text-xs font-bold">Organization name<input value={newName} onChange={(event) => setNewName(event.target.value)} minLength={2} maxLength={100} required className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium" /></label>
            <label className="mt-3 block text-xs font-bold">Region<input value={newRegion} onChange={(event) => setNewRegion(event.target.value)} minLength={2} maxLength={100} required className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium" /></label>
            <label className="mt-3 block text-xs font-bold">Initial password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={128} required className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-medium" /></label>
            <button type="submit" disabled={savingNgo} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-extrabold text-background disabled:opacity-60"><Building2 className="size-4" aria-hidden="true" />{savingNgo ? 'Creating...' : 'Create NGO account'}</button>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Passwords are stored as scrypt hashes. Deliver the initial password to the organization privately.</p>
          </form>
        </div>
      </section>
      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" aria-hidden="true" />Admin data and mutations require a signed administrator session.</p>
    </main>
  )
}

export { AdminDashboardView as AdminDashboard }

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-border/70 bg-background/75 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">{icon}</span><p className="mt-4 text-2xl font-extrabold tabular-nums">{value}</p><p className="mt-0.5 text-xs font-semibold text-muted-foreground">{label}</p></div>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{text}</div>
}

function NgoRow({ ngo, saving, onSave }: { ngo: AdminNgo; saving: boolean; onSave: (ngo: AdminNgo, patch: Partial<Pick<AdminNgo, 'region' | 'isActive' | 'reviewStatus'>>) => Promise<void> }) {
  const [region, setRegion] = useState(ngo.region)
  return <tr className="align-middle"><td className="px-4 py-4"><span className="font-bold">{ngo.name}</span><span className="mt-1 block text-xs text-muted-foreground">Added {new Date(ngo.createdAt).toLocaleDateString()}</span></td><td className="px-4 py-4"><label className="sr-only" htmlFor={`region-${ngo.id}`}>Region for {ngo.name}</label><input id={`region-${ngo.id}`} value={region} onChange={(event) => setRegion(event.target.value)} maxLength={100} className="w-40 rounded-lg border border-input bg-background px-2.5 py-2 text-sm" /></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${ngo.reviewStatus === 'approved' ? 'bg-brand-green/10 text-brand-green' : 'bg-destructive/10 text-destructive'}`}>{ngo.reviewStatus === 'approved' ? 'Approved' : 'Rejected'}</span></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${ngo.isActive ? 'bg-brand-green/10 text-brand-green' : 'bg-muted text-muted-foreground'}`}>{ngo.isActive ? 'Active' : 'Disabled'}</span></td><td className="px-4 py-4"><div className="flex gap-2"><button type="button" onClick={() => void onSave(ngo, { region })} disabled={saving || region.trim().length < 2} className="rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50">{saving ? 'Saving...' : 'Save region'}</button><button type="button" onClick={() => void onSave(ngo, { isActive: !ngo.isActive })} disabled={saving} className="rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background disabled:opacity-50">{ngo.isActive ? 'Disable' : 'Enable'}</button></div></td></tr>
}

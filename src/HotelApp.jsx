import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, ArrowUpRight, BedDouble, Bell, Building2, CalendarDays, Check, ChevronRight, CreditCard, Download, LayoutDashboard, LogOut, Menu, Plus, RefreshCw, Search, Settings2, Users, WalletCards, X } from 'lucide-react'
import { api } from './api.js'

const pages = [['Overview', LayoutDashboard], ['Reservations', CalendarDays], ['Rooms', BedDouble], ['Guests', Users], ['Payments', WalletCards], ['Reports', Activity], ['Settings', Settings2]]
const label = (value = '') => value.replaceAll('-', ' ').replace(/^\w/, (letter) => letter.toUpperCase())
const dateLabel = (value) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const plusDay = (value) => { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10) }
const money = (minor, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((minor || 0) / 100)
const paymentStatus = (r) => r.paidMinor >= r.totalMinor ? 'Paid' : r.paidMinor > 0 ? 'Partial' : 'Pending'
const emptyGuest = { name: '', email: '', phone: '', notes: '' }

function csvExport(name, rows) {
  if (!rows.length) return
  const columns = Object.keys(rows[0])
  const quote = (value) => { let text = String(value ?? ''); if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"` }
  const url = URL.createObjectURL(new Blob(['\uFEFF' + [columns.join(','), ...rows.map((row) => columns.map((key) => quote(row[key])).join(','))].join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `${name}.csv`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function Avatar({ name = '' }) { return <span className="avatar avatar-violet">{name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span> }
function Status({ value }) { return <span className={`status status-${value.toLowerCase().replaceAll(' ', '-')}`}><i />{label(value)}</span> }
function Empty({ text = 'No records yet.' }) { return <div className="empty-state"><CalendarDays size={24} /><strong>{text}</strong></div> }
function Alert({ children }) { return children ? <div className="error-banner" role="alert">{children}</div> : null }
function Modal({ title, onClose, children }) {
  useEffect(() => { const listener = (event) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></header>{children}</section></div>
}
function Login({ onLogin, onSignup, initialError }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [currency, setCurrency] = useState('INR')
  const [error, setError] = useState(initialError || '')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (mode === 'login') await onLogin({ email, password })
      else await onSignup({ name, email, password, propertyName, timezone, currency })
    } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
  return <main className="login-screen"><div className="login-brand"><Building2 /> HotelPro</div><section className="login-card"><span className="login-icon"><BedDouble size={28} /></span><h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1><p>{mode === 'login' ? 'Sign in to your hotel workspace.' : 'Set up your property and administrator account.'}</p><form onSubmit={submit} className="modal-form"><Alert>{error}</Alert>{mode === 'signup' && <><label>Your name<input autoFocus required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label><label>Hotel or property name<input required minLength={2} maxLength={120} autoComplete="organization" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} /></label></>}<label>Email<input autoFocus={mode === 'login'} required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<input required minLength={mode === 'signup' ? 12 : 1} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />{mode === 'signup' && <small className="field-hint">At least 12 characters. This email is your sign-in name; no inbox is required.</small>}</label>{mode === 'signup' && <div className="form-grid"><label>Time zone<select required value={timezone} onChange={(e) => setTimezone(e.target.value)}><option value="Asia/Kolkata">India (Asia/Kolkata)</option><option value="America/New_York">Eastern US</option><option value="America/Chicago">Central US</option><option value="America/Denver">Mountain US</option><option value="America/Los_Angeles">Pacific US</option><option value="Europe/London">London</option><option value="Europe/Paris">Central Europe</option><option value="Asia/Dubai">Dubai</option><option value="Asia/Singapore">Singapore</option><option value="Australia/Sydney">Sydney</option><option value="UTC">UTC</option></select></label><label>Currency<select required value={currency} onChange={(e) => setCurrency(e.target.value)}>{[['INR','INR · Indian rupee'],['USD','USD · US dollar'],['EUR','EUR · Euro'],['GBP','GBP · British pound']].map(([code, text]) => <option key={code} value={code}>{text}</option>)}</select></label></div>}<button className="button button-primary" disabled={busy}>{busy ? (mode === 'login' ? 'Signing in…' : 'Creating workspace…') : (mode === 'login' ? 'Sign in' : 'Create workspace')}</button></form><small>{mode === 'login' ? 'New to HotelPro? ' : 'Already have an account? '}<button className="login-toggle" type="button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>{mode === 'login' ? 'Create a workspace' : 'Sign in'}</button></small></section></main>
}

export default function App() {
  const [user, setUser] = useState(null)
  const [data, setData] = useState(null)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState('Overview')
  const [mobile, setMobile] = useState(false)
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const version = useRef(0)
  const pending = useRef(false)
  const notify = (message) => { setToast(message) }
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) }, [toast])
  const refresh = useCallback(async () => {
    const current = ++version.current
    try {
      const state = await api('/state')
      if (current === version.current) { setData(state); setError('') }
      return state
    } catch (failure) {
      if (current === version.current) {
        setError(failure.message)
        if (failure.status === 401) { setUser(null); setData(null); setModal(null) }
      }
      throw failure
    }
  }, [])
  useEffect(() => {
    let active = true
    api('/auth/me').then(async ({ user: current }) => { if (active) { setUser(current); await refresh() } }).catch((failure) => { if (active && failure.status !== 401) setError(failure.message) }).finally(() => { if (active) setBooting(false) })
    return () => { active = false; version.current++ }
  }, [refresh])
  useEffect(() => {
    if (!user) return
    const sync = () => { if (!document.hidden && !pending.current) refresh().catch(() => {}) }
    const timer = setInterval(sync, 10000)
    window.addEventListener('focus', sync)
    return () => { clearInterval(timer); window.removeEventListener('focus', sync) }
  }, [user, refresh])
  async function login(credentials) {
    const result = await api('/auth/login', { method: 'POST', body: credentials })
    setUser(result.user); setError(''); setPage('Overview')
    await refresh()
  }
  async function signup(details) {
    const result = await api('/auth/signup', { method: 'POST', body: details })
    setUser(result.user); setError(''); setPage('Overview')
    await refresh()
  }
  async function logout() {
    try { await api('/auth/logout', { method: 'POST', body: {} }); version.current++; setUser(null); setData(null); setModal(null); setError('') } catch (failure) { setError(failure.message) }
  }
  async function mutate(path, method, body, success) {
    if (pending.current) throw new Error('Please wait for the current update to finish.')
    pending.current = true; setBusy(true); version.current++
    try {
      const result = await api(path, { method, body })
      try { await refresh() } catch { notify('Saved. The latest data could not be loaded; refresh to update the screen.'); return result }
      notify(success); return result
    } catch (failure) {
      if (failure.status === 401) { setUser(null); setData(null); setModal(null) }
      throw failure
    } finally { pending.current = false; setBusy(false) }
  }
  async function statusChange(reservation, status) {
    try { await mutate(`/reservations/${reservation._id}/status`, 'PATCH', { status }, 'Reservation updated.'); setModal(null) } catch (failure) { setError(failure.message) }
  }
  if (booting) return <div className="loading-screen"><Building2 size={32} /><p>Opening your workspace…</p></div>
  if (!user) return <Login onLogin={login} onSignup={signup} initialError={error} />
  if (!data) return <div className="loading-screen"><Alert>{error || 'Loading hotel data…'}</Alert><button className="button button-primary" onClick={() => refresh().catch(() => {})}>Retry</button><button className="button button-secondary" onClick={logout}>Sign out</button></div>
  const manager = ['admin', 'manager'].includes(user.role)
  const navigate = (next) => { setPage(next); setMobile(false) }
  const reservation = modal?.type === 'reservation' ? data.reservations.find((r) => r._id === modal.id) : null
  const exportRows = () => {
    let rows
    if (page === 'Rooms') rows = data.rooms.map((r) => ({ room: r.number, type: r.type, floor: r.floor, capacity: r.capacity, nightlyRate: r.nightlyRateMinor / 100, currency: data.property.currency, readiness: r.operationalStatus }))
    else if (page === 'Guests') rows = data.guests.map(({ name, email, phone, notes }) => ({ name, email, phone, notes }))
    else if (page === 'Payments') rows = data.payments.map((p) => ({ reservation: p.reservationReference, amount: p.amountMinor / 100, currency: p.currency, method: p.method, reference: p.reference, receivedAt: p.createdAt }))
    else rows = data.reservations.map((r) => ({ reference: r.reference, guest: r.guestName, room: r.roomNumber, checkIn: r.checkIn, checkOut: r.checkOut, status: r.status, total: r.totalMinor / 100, paid: r.paidMinor / 100, currency: r.currency }))
    if (!rows.length) return notify('There are no records to export.')
    csvExport(`hotelpro-${page.toLowerCase()}-${data.metrics.today}`, rows)
  }
  return <div className="app-shell">
    <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Building2 size={20} /></span><span>hotel<span className="brand-pro">pro</span></span><button className="mobile-close icon-button" onClick={() => setMobile(false)} aria-label="Close menu"><X size={18} /></button></div>
      <button className="property-switch" onClick={() => navigate('Settings')}><span className="property-icon"><Building2 size={19} /></span><span className="property-name"><strong>{data.property.name}</strong><small>{data.property.timezone}</small></span><ChevronRight size={16} /></button>
      <div className="sidebar-scroll"><div className="nav-label">WORKSPACE</div>{pages.map(([name, Icon]) => <button className={`nav-item ${page === name ? 'active' : ''}`} key={name} onClick={() => navigate(name)}><Icon size={18} /><span>{name}</span></button>)}</div>
      <div className="account-row"><Avatar name={user.name} /><div className="account-copy"><strong>{user.name}</strong><small>{label(user.role)}</small></div><button className="icon-button" title="Sign out" aria-label="Sign out" onClick={logout}><LogOut size={18} /></button></div>
    </aside>
    {mobile && <button className="nav-scrim" onClick={() => setMobile(false)} aria-label="Close navigation" />}
    <main className="main-area"><header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobile(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumb"><span>{data.property.name}</span><span>/</span><strong>{page}</strong></div><div className="topbar-right"><span className="today-label">{error ? 'Updates interrupted' : 'Updates every 10 seconds'}</span><button className="icon-button" disabled={busy} onClick={() => refresh().catch(() => {})} aria-label="Refresh data"><RefreshCw size={17} /></button><button className="icon-button" onClick={() => setModal({ type: 'activity' })} aria-label="Recent activity"><Bell size={18} /></button></div></header>
      <div className="content-wrap"><div className="page-heading"><div><div className="eyebrow">{dateLabel(data.metrics.today)}</div><h1>{page === 'Overview' ? `Welcome, ${user.name.split(' ')[0]}` : page}</h1><p>{page === 'Overview' ? 'Your hotel’s operations, updated from the database.' : `Manage your hotel’s ${page.toLowerCase()}.`}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={exportRows}><Download size={16} /> Export</button><button className="button button-primary" disabled={busy} onClick={() => setModal({ type: 'booking' })}><Plus size={17} /> New reservation</button></div></div>
        <Alert>{error}</Alert>
        {page === 'Overview' && <Overview data={data} navigate={navigate} open={(r) => setModal({ type: 'reservation', id: r._id })} />}
        {page === 'Reservations' && <Reservations rows={data.reservations} open={(r) => setModal({ type: 'reservation', id: r._id })} />}
        {page === 'Rooms' && <Rooms data={data} manager={manager} busy={busy} edit={(room) => setModal({ type: 'room', room })} add={() => setModal({ type: 'room' })} change={async (room, operationalStatus) => { try { await mutate(`/rooms/${room._id}`, 'PATCH', { operationalStatus }, 'Room readiness updated.') } catch (failure) { setError(failure.message) } }} />}
        {page === 'Guests' && <Guests data={data} add={() => setModal({ type: 'guest' })} open={(guest) => setModal({ type: 'guestDetail', guest })} />}
        {page === 'Payments' && <Payments data={data} record={(row) => setModal({ type: 'payment', reservation: row })} />}
        {page === 'Reports' && <Reports data={data} />}
        {page === 'Settings' && <Settings data={data} user={user} manager={manager} mutate={mutate} addStaff={() => setModal({ type: 'staff' })} />}
        <footer className="page-footer"><span>{data.property.name} · {data.property.currency}</span><span>Last refreshed {new Date(data.syncedAt).toLocaleTimeString()}</span></footer>
      </div>
    </main>
    {modal?.type === 'booking' && <Modal title="New reservation" onClose={() => setModal(null)}><BookingForm data={data} mutate={mutate} close={() => setModal(null)} /></Modal>}
    {modal?.type === 'room' && <Modal title={modal.room ? `Edit room ${modal.room.number}` : 'Add room'} onClose={() => setModal(null)}><RoomForm room={modal.room} currency={data.property.currency} mutate={mutate} close={() => setModal(null)} /></Modal>}
    {modal?.type === 'guest' && <Modal title={modal.guest ? 'Edit guest' : 'Add guest'} onClose={() => setModal(null)}><GuestForm guest={modal.guest} mutate={mutate} close={() => setModal(null)} /></Modal>}
    {modal?.type === 'payment' && <Modal title="Record a received payment" onClose={() => setModal(null)}><PaymentForm reservation={data.reservations.find((r) => r._id === modal.reservation._id) || modal.reservation} mutate={mutate} close={() => setModal(null)} /></Modal>}
    {modal?.type === 'staff' && <Modal title="Create staff account" onClose={() => setModal(null)}><StaffForm mutate={mutate} close={() => setModal(null)} /></Modal>}
    {reservation && <Modal title={reservation.reference} onClose={() => setModal(null)}><div className="detail-panel"><div className="detail-person"><Avatar name={reservation.guestName} /><div><strong>{reservation.guestName}</strong><small>{reservation.guestEmail}</small></div><Status value={reservation.status} /></div><div className="detail-grid"><Detail label="Room" value={`${reservation.roomNumber} · ${reservation.roomType}`} /><Detail label="Guests" value={reservation.guests} /><Detail label="Check-in" value={dateLabel(reservation.checkIn)} /><Detail label="Check-out" value={dateLabel(reservation.checkOut)} /><Detail label="Total" value={money(reservation.totalMinor, reservation.currency)} /><Detail label="Balance" value={money(reservation.totalMinor - reservation.paidMinor, reservation.currency)} /></div><div className="modal-actions detail-actions">{reservation.status === 'confirmed' && <><button className="button button-secondary" disabled={busy || reservation.paidMinor > 0} onClick={() => { if (window.confirm('Cancel this reservation?')) statusChange(reservation, 'cancelled') }}>Cancel stay</button><button className="button button-primary" disabled={busy || data.metrics.today < reservation.checkIn || data.metrics.today >= reservation.checkOut} onClick={() => statusChange(reservation, 'checked-in')}>Check in</button></>}{reservation.status === 'checked-in' && <button className="button button-primary" disabled={busy || reservation.paidMinor < reservation.totalMinor} onClick={() => statusChange(reservation, 'checked-out')}>Check out</button>}{reservation.status !== 'cancelled' && reservation.paidMinor < reservation.totalMinor && <button className="button button-secondary" onClick={() => setModal({ type: 'payment', reservation })}><CreditCard size={15} /> Record payment</button>}</div><p className="form-hint">Check-in requires a vacant, ready room during the booked dates. Check-out requires a settled balance.</p></div></Modal>}
    {modal?.type === 'guestDetail' && <Modal title={modal.guest.name} onClose={() => setModal(null)}><div className="detail-panel"><div className="detail-grid"><Detail label="Email" value={modal.guest.email} /><Detail label="Phone" value={modal.guest.phone || '—'} /></div><p>{modal.guest.notes || 'No notes recorded.'}</p><h3>Reservation history</h3>{data.reservations.filter((r) => r.guestId === modal.guest._id).map((r) => <button className="history-row" key={r._id} onClick={() => setModal({ type: 'reservation', id: r._id })}><span>{r.reference} · {dateLabel(r.checkIn)}</span><Status value={r.status} /></button>)}<div className="modal-actions"><button className="button button-primary" onClick={() => setModal({ type: 'guest', guest: modal.guest })}>Edit contact details</button></div></div></Modal>}
    {modal?.type === 'activity' && <Modal title="Recent activity" onClose={() => setModal(null)}><div className="activity-list">{data.activity.map((item) => <article key={item._id}><strong>{item.description}</strong><small>{item.actorName} · {new Date(item.createdAt).toLocaleString()}</small></article>)}{!data.activity.length && <Empty text="No activity recorded yet." />}</div></Modal>}
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
  </div>
}

function Detail({ label: name, value }) { return <div><small>{name.toUpperCase()}</small><strong>{value}</strong></div> }
function Stat({ title, value, icon: Icon, hint }) { return <section className="stat-card"><span className="stat-icon stat-violet"><Icon size={19} /></span><div className="stat-title">{title}</div><div className="stat-value">{value}</div><div className="stat-bottom">{hint}</div></section> }
function Overview({ data, navigate, open }) {
  const { metrics: m, property: p } = data
  const upcoming = data.reservations.filter((r) => r.status === 'confirmed' && r.checkOut > m.today).sort((a, b) => a.checkIn.localeCompare(b.checkIn)).slice(0, 5)
  return <><div className="stat-grid"><Stat title="Occupancy" value={`${m.occupancy}%`} icon={BedDouble} hint={`${m.occupied} of ${data.rooms.length} rooms checked in`} /><Stat title="Arrivals today" value={m.arrivals} icon={CalendarDays} hint="Confirmed guests expected today" /><Stat title="Departures due" value={m.departures} icon={LogOut} hint="Including overdue check-outs" /><Stat title="Payments recorded" value={money(m.collectedMinor, p.currency)} icon={WalletCards} hint="Total received payments" /></div><div className="overview-grid"><section className="panel occupancy-panel"><div className="panel-heading"><div><h2>Booked room nights</h2><p>Last seven days · based on recorded reservations</p></div></div><div className="live-chart">{m.week.map((point) => <div key={point.date}><span>{point.percent}%</span><div className="live-chart-track"><i style={{ height: `${point.percent}%` }} /></div><small>{new Date(`${point.date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</small></div>)}</div></section><section className="panel arrivals-panel"><div className="panel-heading"><div><h2>Room readiness</h2><p>Current operational status</p></div><button className="text-link" onClick={() => navigate('Rooms')}>Manage <ChevronRight size={15} /></button></div>{['available', 'cleaning', 'maintenance'].map((status) => <div className="readiness-row" key={status}><Status value={status} /><strong>{data.rooms.filter((r) => r.operationalStatus === status && !data.reservations.some((b) => b.roomId === r._id && b.status === 'checked-in')).length}</strong></div>)}<div className="readiness-row"><span>Outstanding balance</span><strong>{money(m.outstandingMinor, p.currency)}</strong></div></section></div><section className="panel booking-panel"><div className="panel-heading"><div><h2>Upcoming arrivals</h2><p>Confirmed stays from your reservation records.</p></div><button className="text-link" onClick={() => navigate('Reservations')}>View all <ChevronRight size={15} /></button></div><ReservationTable rows={upcoming} open={open} /></section></>
}
function ReservationTable({ rows, open }) {
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Guest / reference</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Payment</th><th /></tr></thead><tbody>{rows.map((r) => <tr key={r._id}><td><strong className="table-main">{r.guestName}</strong><small className="table-sub">{r.reference}</small></td><td>{r.roomNumber} · {r.roomType}</td><td>{dateLabel(r.checkIn)}</td><td>{dateLabel(r.checkOut)}</td><td><Status value={r.status} /></td><td><Status value={paymentStatus(r)} /></td><td><button className="button button-secondary table-button" onClick={() => open(r)}>Open</button></td></tr>)}</tbody></table>{!rows.length && <Empty text="No reservations to show." />}</div>
}
function Reservations({ rows, open }) {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('all')
  const filtered = rows.filter((r) => (status === 'all' || status === r.status) && `${r.guestName} ${r.guestEmail} ${r.reference} ${r.roomNumber}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="panel listing-panel"><div className="simple-toolbar"><label className="search-field"><Search size={16} /><input placeholder="Search guest, room or reference…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><select className="control-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Reservation status"><option value="all">All reservations</option>{['confirmed', 'checked-in', 'checked-out', 'cancelled'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select><span>{filtered.length} reservations</span></div><ReservationTable rows={filtered} open={open} /></section>
}
function Rooms({ data, manager, busy, edit, add, change }) {
  const [query, setQuery] = useState('')
  const rows = data.rooms.filter((room) => `${room.number} ${room.type}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="panel listing-panel"><div className="simple-toolbar"><label className="search-field"><Search size={16} /><input placeholder="Search rooms…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>{manager && <button className="button button-primary" onClick={add}><Plus size={16} />Add room</button>}</div><div className="room-grid">{rows.map((room) => { const occupied = data.reservations.some((r) => r.roomId === room._id && r.status === 'checked-in'); return <article className="room-card" key={room._id}><div className="room-card-top"><span className="room-number">{room.number}</span>{manager && <button className="text-link" onClick={() => edit(room)}>Edit details</button>}</div><strong>{room.type}</strong><small>Floor {room.floor} · Up to {room.capacity} guests</small><p>{money(room.nightlyRateMinor, data.property.currency)} / night</p><div className="room-card-bottom"><Status value={occupied ? 'occupied' : room.operationalStatus} /><select aria-label={`Readiness for room ${room.number}`} className="room-status-select" value={room.operationalStatus} disabled={occupied || busy} onChange={(e) => change(room, e.target.value)}>{['available', 'cleaning', 'maintenance'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></div></article> })}</div>{!rows.length && <Empty text="No rooms found. Add your inventory to start taking reservations." />}</section>
}
function Guests({ data, open, add }) {
  const [query, setQuery] = useState('')
  const rows = data.guests.filter((g) => `${g.name} ${g.email} ${g.phone}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="panel listing-panel"><div className="simple-toolbar"><label className="search-field"><Search size={16} /><input placeholder="Search guests…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><button className="button button-primary" onClick={add}><Plus size={16} />Add guest</button></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Guest</th><th>Email</th><th>Phone</th><th>Reservations</th><th /></tr></thead><tbody>{rows.map((g) => <tr key={g._id}><td><div className="guest-cell"><Avatar name={g.name} /><strong>{g.name}</strong></div></td><td>{g.email}</td><td>{g.phone || '—'}</td><td>{data.reservations.filter((r) => r.guestId === g._id && r.status !== 'cancelled').length}</td><td><button className="button button-secondary" onClick={() => open(g)}>View profile</button></td></tr>)}</tbody></table></div>{!rows.length && <Empty text="No guests found." />}</section>
}
function Payments({ data, record }) {
  const pending = data.reservations.filter((r) => r.status !== 'cancelled' && r.paidMinor < r.totalMinor)
  return <><div className="payment-summary"><Stat title="Received payments" value={money(data.metrics.collectedMinor, data.property.currency)} icon={CreditCard} hint={`${data.payments.length} ledger entries`} /><Stat title="Outstanding" value={money(data.metrics.outstandingMinor, data.property.currency)} icon={WalletCards} hint={`${pending.length} unsettled reservations`} /></div><section className="panel listing-panel"><div className="simple-toolbar"><div><h2>Received payment ledger</h2><p>Record money collected outside HotelPro. This app does not charge cards.</p></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Reservation</th><th>Guest</th><th>Method / reference</th><th>Received</th><th>Recorded at</th></tr></thead><tbody>{data.payments.map((p) => <tr key={p._id}><td>{p.reservationReference}</td><td>{p.guestName}</td><td>{label(p.method)}<small className="table-sub">{p.reference || 'Cash receipt'}</small></td><td>{money(p.amountMinor, p.currency)}</td><td>{new Date(p.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div>{!data.payments.length && <Empty text="No payments recorded." />}<div className="pending-box"><strong>Outstanding reservations</strong>{pending.map((r) => <div className="pending-row" key={r._id}><span>{r.guestName}<small>{r.reference}</small></span><strong>{money(r.totalMinor - r.paidMinor, r.currency)}</strong><button className="button button-secondary" onClick={() => record(r)}>Record received payment</button></div>)}{!pending.length && <p>No outstanding balances.</p>}</div></section></>
}
function Reports({ data }) {
  const groups = [...new Set(data.rooms.map((r) => r.type))]
  const rows = data.reservations.filter((r) => r.status !== 'cancelled')
  return <><div className="stat-grid"><Stat title="Reservations" value={rows.length} icon={CalendarDays} hint="Excluding cancellations" /><Stat title="Registered guests" value={data.guests.length} icon={Users} hint="Guest records in the database" /><Stat title="Booked value" value={money(rows.reduce((sum, r) => sum + r.totalMinor, 0), data.property.currency)} icon={WalletCards} hint="Recorded reservation totals" /><Stat title="Current occupancy" value={`${data.metrics.occupancy}%`} icon={BedDouble} hint="Guests currently checked in" /></div><section className="panel report-panel"><div className="panel-heading"><div><h2>Reservations by room type</h2><p>All recorded stays, excluding cancellations</p></div></div>{groups.map((group) => { const count = rows.filter((r) => r.roomType === group).length; const percent = rows.length ? Math.round(count / rows.length * 100) : 0; return <div className="mix-row" key={group}><div><strong>{group}</strong><span>{count} reservations</span><b>{percent}%</b></div><div className="mix-track"><span style={{ width: `${percent}%` }} /></div></div> })}{!groups.length && <Empty text="Add room inventory to see reports." />}</section></>
}

function useSave(mutate, close) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  async function save(path, method, body, message) { setSaving(true); setError(''); try { await mutate(path, method, body, message); close?.() } catch (failure) { setError(failure.message) } finally { setSaving(false) } }
  return { saving, error, save }
}
function Actions({ saving, disabled = false, text = 'Save' }) { return <div className="modal-actions"><button className="button button-primary" type="submit" disabled={saving || disabled}>{saving ? 'Saving…' : text}</button></div> }
function GuestFields({ value, set }) { return <><label>Guest name<input required minLength={2} maxLength={100} value={value.name} onChange={(e) => set({ ...value, name: e.target.value })} /></label><div className="form-grid"><label>Email<input required type="email" maxLength={160} value={value.email} onChange={(e) => set({ ...value, email: e.target.value })} /></label><label>Phone<input maxLength={30} value={value.phone} onChange={(e) => set({ ...value, phone: e.target.value })} /></label></div></> }
function BookingForm({ data, mutate, close }) {
  const [guest, setGuest] = useState({ ...emptyGuest })
  const [form, setForm] = useState({ checkIn: data.metrics.today, checkOut: plusDay(data.metrics.today), guests: 1, roomId: '' })
  const [available, setAvailable] = useState([]); const [loading, setLoading] = useState(false); const [availabilityError, setAvailabilityError] = useState('')
  const [requestId] = useState(() => crypto.randomUUID())
  const { saving, error, save } = useSave(mutate, close)
  useEffect(() => {
    let active = true; setLoading(true); setAvailabilityError(''); setAvailable([])
    if (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn) { setLoading(false); setAvailabilityError('Choose a check-out date after check-in.'); return }
    const query = new URLSearchParams({ checkIn: form.checkIn, checkOut: form.checkOut, guests: form.guests })
    api(`/availability?${query}`).then(({ rooms }) => { if (active) { setAvailable(rooms); setForm((current) => ({ ...current, roomId: rooms.some((r) => r._id === current.roomId) ? current.roomId : '' })) } }).catch((failure) => { if (active) setAvailabilityError(failure.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [form.checkIn, form.checkOut, form.guests])
  const room = available.find((r) => r._id === form.roomId)
  const nights = (Date.parse(form.checkOut) - Date.parse(form.checkIn)) / 86400000
  return <form className="modal-form" onSubmit={(e) => { e.preventDefault(); save('/reservations', 'POST', { ...form, guest, requestId }, 'Reservation created.') }}><Alert>{error || availabilityError}</Alert><label>Existing guest (optional)<select defaultValue="" onChange={(e) => { const found = data.guests.find((g) => g._id === e.target.value); setGuest(found ? { name: found.name, email: found.email, phone: found.phone || '', notes: found.notes || '' } : { ...emptyGuest }) }}><option value="">New guest</option>{data.guests.map((g) => <option key={g._id} value={g._id}>{g.name} · {g.email}</option>)}</select></label><GuestFields value={guest} set={setGuest} /><div className="form-grid"><label>Check-in<input required type="date" min={data.metrics.today} value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value, roomId: '' })} /></label><label>Check-out<input required type="date" min={form.checkIn ? plusDay(form.checkIn) : data.metrics.today} value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value, roomId: '' })} /></label></div><label>Number of guests<input required type="number" min={1} max={12} value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value), roomId: '' })} /></label><label>Available room<select required disabled={loading} value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}><option value="">{loading ? 'Checking availability…' : 'Select a room'}</option>{available.map((r) => <option key={r._id} value={r._id}>{r.number} · {r.type} · {money(r.nightlyRateMinor, data.property.currency)}/night</option>)}</select></label>{!loading && !available.length && !availabilityError && <p className="form-hint">No rooms are available for these dates and guest count.</p>}{room && <div className="quote-box">{nights} night{nights === 1 ? '' : 's'} × {money(room.nightlyRateMinor, data.property.currency)}<strong>{money(nights * room.nightlyRateMinor, data.property.currency)}</strong></div>}<p className="form-hint">Room availability and the stored nightly rate are checked again when you save.</p><Actions saving={saving} disabled={loading || !room} text="Create reservation" /></form>
}
function RoomForm({ room, currency, mutate, close }) {
  const [value, setValue] = useState({ number: room?.number || '', type: room?.type || '', floor: room?.floor ?? 1, capacity: room?.capacity ?? 2, nightlyRate: room ? String(room.nightlyRateMinor / 100) : '', operationalStatus: room?.operationalStatus || 'available' })
  const { saving, error, save } = useSave(mutate, close)
  const set = (key) => (event) => setValue({ ...value, [key]: event.target.value })
  return <form className="modal-form" onSubmit={(e) => { e.preventDefault(); save(room ? `/rooms/${room._id}` : '/rooms', room ? 'PATCH' : 'POST', room ? { number: value.number, type: value.type, floor: value.floor, capacity: value.capacity, nightlyRate: value.nightlyRate } : value, 'Room saved.') }}><Alert>{error}</Alert><div className="form-grid"><label>Room number<input required maxLength={10} value={value.number} onChange={set('number')} /></label><label>Room type<input required minLength={2} maxLength={80} value={value.type} onChange={set('type')} /></label><label>Floor<input required type="number" min={0} max={100} value={value.floor} onChange={set('floor')} /></label><label>Capacity<input required type="number" min={1} max={12} value={value.capacity} onChange={set('capacity')} /></label></div><label>Nightly rate ({currency})<input required type="number" min="0.01" step="0.01" value={value.nightlyRate} onChange={set('nightlyRate')} /></label><p className="form-hint">New rates apply to future bookings. Existing reservations keep their original price.</p><Actions saving={saving} text={room ? 'Save room' : 'Add room'} /></form>
}
function GuestForm({ guest, mutate, close }) {
  const [value, setValue] = useState(guest ? { name: guest.name, email: guest.email, phone: guest.phone || '', notes: guest.notes || '' } : { ...emptyGuest })
  const { saving, error, save } = useSave(mutate, close)
  return <form className="modal-form" onSubmit={(e) => { e.preventDefault(); save(guest ? `/guests/${guest._id}` : '/guests', guest ? 'PATCH' : 'POST', value, 'Guest saved.') }}><Alert>{error}</Alert><GuestFields value={value} set={setValue} /><label>Notes<textarea maxLength={1000} value={value.notes} onChange={(e) => setValue({ ...value, notes: e.target.value })} /></label><Actions saving={saving} /></form>
}
function PaymentForm({ reservation, mutate, close }) {
  const balance = reservation.totalMinor - reservation.paidMinor
  const [value, setValue] = useState({ amount: (balance / 100).toFixed(2), method: 'cash', reference: '', requestId: crypto.randomUUID() })
  const { saving, error, save } = useSave(mutate, close)
  return <form className="modal-form" onSubmit={(e) => { e.preventDefault(); save(`/reservations/${reservation._id}/payment`, 'POST', value, 'Received payment recorded.') }}><Alert>{error}</Alert><p>{reservation.reference} · {reservation.guestName}</p><div className="quote-box">Outstanding balance<strong>{money(balance, reservation.currency)}</strong></div><label>Amount received ({reservation.currency})<input required type="number" min="0.01" step="0.01" max={balance / 100} value={value.amount} onChange={(e) => setValue({ ...value, amount: e.target.value })} /></label><label>Method<select value={value.method} onChange={(e) => setValue({ ...value, method: e.target.value })}><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank-transfer">Bank transfer</option><option value="external-card">External card terminal</option></select></label><label>Transaction / receipt reference<input required={value.method !== 'cash'} maxLength={120} value={value.reference} onChange={(e) => setValue({ ...value, reference: e.target.value })} /></label><label className="checkbox-label"><input required type="checkbox" />I confirm this payment has already been received.</label><p className="form-hint">This creates a ledger entry. It does not initiate a transfer or charge a card.</p><Actions saving={saving} disabled={balance <= 0} text="Record received payment" /></form>
}
function StaffForm({ mutate, close }) {
  const [value, setValue] = useState({ name: '', email: '', password: '', role: 'frontdesk' })
  const { saving, error, save } = useSave(mutate, close)
  const set = (key) => (event) => setValue({ ...value, [key]: event.target.value })
  return <form className="modal-form" onSubmit={(e) => { e.preventDefault(); save('/staff', 'POST', value, 'Staff account created.') }}><Alert>{error}</Alert><label>Name<input required minLength={2} value={value.name} onChange={set('name')} /></label><label>Email<input required type="email" value={value.email} onChange={set('email')} /></label><label>Password<input required type="password" autoComplete="new-password" minLength={12} maxLength={72} value={value.password} onChange={set('password')} /></label><label>Role<select value={value.role} onChange={set('role')}><option value="frontdesk">Front desk</option><option value="manager">Manager</option></select></label><Actions saving={saving} text="Create account" /></form>
}
function Settings({ data, user, manager, mutate, addStaff }) {
  const p = data.property
  const [value, setValue] = useState({ name: p.name, email: p.email, phone: p.phone || '', address: p.address || '', timezone: p.timezone, currency: p.currency, checkInTime: p.checkInTime, checkOutTime: p.checkOutTime })
  const { saving, error, save } = useSave(mutate)
  const [staffError, setStaffError] = useState('')
  const set = (key) => (event) => setValue({ ...value, [key]: event.target.value })
  return <div className="settings-stack"><form className="panel settings-content" onSubmit={(e) => { e.preventDefault(); save('/property', 'PUT', value, 'Property settings saved.') }}><div className="settings-title"><div><h2>Property profile and policies</h2><p>Changes are shared with your hotel staff.</p></div>{manager && <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>}</div><Alert>{error}</Alert><fieldset disabled={!manager || saving} className="settings-fields"><label>Property name<input required minLength={2} value={value.name} onChange={set('name')} /></label><label>Email<input required type="email" value={value.email} onChange={set('email')} /></label><label>Phone<input value={value.phone} onChange={set('phone')} /></label><label>Time zone<input required value={value.timezone} onChange={set('timezone')} placeholder="Asia/Kolkata" /></label><label className="full-field">Address<input value={value.address} onChange={set('address')} /></label><label>Check-in time<input required type="time" value={value.checkInTime} onChange={set('checkInTime')} /></label><label>Check-out time<input required type="time" value={value.checkOutTime} onChange={set('checkOutTime')} /></label><label>Currency<input readOnly value={value.currency} /></label></fieldset></form>{user.role === 'admin' && <section className="panel listing-panel"><div className="simple-toolbar"><div><h2>Staff access</h2><p>Inactive accounts cannot sign in or continue using existing sessions.</p></div><button className="button button-primary" onClick={addStaff}><Plus size={15} />Add staff</button></div><Alert>{staffError}</Alert><div className="table-scroll"><table className="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th /></tr></thead><tbody>{data.staff.map((member) => <tr key={member.id}><td>{member.name}</td><td>{member.email}</td><td>{label(member.role)}</td><td>{member.active ? 'Active' : 'Inactive'}</td><td>{member.role !== 'admin' && <button className="button button-secondary" onClick={async () => { setStaffError(''); try { await mutate(`/staff/${member.id}`, 'PATCH', { active: !member.active }, 'Staff access updated.') } catch (failure) { setStaffError(failure.message) } }}>{member.active ? 'Deactivate' : 'Activate'}</button>}</td></tr>)}</tbody></table></div></section>}</div>
}


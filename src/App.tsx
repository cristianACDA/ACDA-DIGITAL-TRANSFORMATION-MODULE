import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { METHODOLOGY_VERSION } from './constants/acda.constants'
import EBITWidget from './components/EBITWidget'
import ClientIntake from './pages/ClientIntake'
import MaturityRisk from './pages/MaturityRisk'
import Dashboard from './pages/Dashboard'
import CockpitLayout from './layouts/CockpitLayout'
import CockpitPage from './pages/Cockpit/CockpitPage'
import ValidationPage from './pages/Cockpit/ValidationPage'
import Diagnostic90s from './pages/ClientDeliverables/Diagnostic90s'
import Strategy10min from './pages/ClientDeliverables/Strategy10min'
import AIReadiness from './pages/ClientDeliverables/AIReadiness'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',         icon: '◉' },
  { to: '/intake',    label: 'Date Client',        icon: '🏢' },
  { to: '/maturity',  label: 'Maturitate & Risc',  icon: '📊' },
  { to: '/cockpit',   label: 'Cockpit',            icon: '📋' },
] as const

export default function App() {
  return (
    <div className="min-h-screen bg-page font-sans text-text-body">

      <header className="bg-page border-b border-border-subtle sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between gap-4 h-16">
            <NavLink to="/dashboard" className="flex items-center gap-3 flex-shrink-0">
              <img
                src="/logo-acda.png"
                alt="ACDA"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <div className="leading-tight">
                <p className="text-[11px] text-text-secondary">Platformă de Consultanță</p>
                <p className="text-[15px] font-semibold text-text-primary tracking-tight">ACDA Dashboard</p>
              </div>
            </NavLink>

            <div className="flex items-center gap-3 min-w-0">
              <EBITWidget />
              <span className="flex-shrink-0 text-[11px] bg-subtle text-text-muted px-2 py-0.5 rounded-sm font-mono">
                {METHODOLOGY_VERSION}
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 -mb-px">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'text-text-primary border-accent-primary'
                      : 'text-text-secondary border-transparent hover:text-text-primary'
                  }`
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/"          element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/intake"    element={<ClientIntake />} />
        <Route path="/maturity"  element={<MaturityRisk />} />
        <Route path="/cockpit"   element={<CockpitLayout />}>
          <Route index             element={<Navigate to="/cockpit/1" replace />} />
          <Route path="validation" element={<ValidationPage />} />
          <Route path=":pageNum"   element={<CockpitPage />} />
        </Route>
        <Route path="/deliverables/diagnostic" element={<Diagnostic90s />} />
        <Route path="/deliverables/strategy"   element={<Strategy10min />} />
        <Route path="/deliverables/ai-readiness" element={<AIReadiness />} />
        <Route path="*"          element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

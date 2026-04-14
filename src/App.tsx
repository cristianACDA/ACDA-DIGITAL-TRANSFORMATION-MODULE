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
    <div className="min-h-screen bg-[#F6F9FC] font-sans">

      <header className="bg-[#071F80] px-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between gap-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded bg-white flex items-center justify-center font-black text-sm shadow"
              style={{ color: '#071F80' }}>
              AI
            </div>
            <div>
              <p className="text-xs text-white/50 leading-none">Platformă de Consultanță</p>
              <p className="text-sm font-bold text-white leading-tight">ACDA Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            <EBITWidget />
            <span className="flex-shrink-0 text-xs bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full font-mono">
              {METHODOLOGY_VERSION}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 py-1.5">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-white text-[#071F80] shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
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

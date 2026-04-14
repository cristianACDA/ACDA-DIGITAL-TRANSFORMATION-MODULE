import { Navigate, useParams } from 'react-router-dom'
import { PAGINI_COCKPIT } from '../../contracts/agent-contracts'
import PageShell from './PageShell'
import ClientOverview from './pages/01_ClientOverview'
import EBITBaselinePage from './pages/02_EBITBaseline'
import MaturitateACDA from './pages/03_MaturitateACDA'
import ValueStream from './pages/04_ValueStream'
import ProblemFraming from './pages/05_ProblemFraming'
import TechnologyLandscape from './pages/06_TechnologyLandscape'
import OpportunityMap from './pages/07_OpportunityMap'
import Prioritizare from './pages/08_Prioritizare'
import StrategieTransformare from './pages/09_StrategieTransformare'
import ImplementationRoadmap from './pages/10_ImplementationRoadmap'
import PreviewRaport from './pages/11_PreviewRaport'
import ChestionarClient from './pages/12_ChestionarClient'

const PAGES: Record<number, () => React.ReactElement> = {
  1: ClientOverview,
  2: EBITBaselinePage,
  3: MaturitateACDA,
  4: ValueStream,
  5: ProblemFraming,
  6: TechnologyLandscape,
  7: OpportunityMap,
  8: Prioritizare,
  9: StrategieTransformare,
  10: ImplementationRoadmap,
  11: PreviewRaport,
  12: ChestionarClient,
}

export default function CockpitPage() {
  const { pageNum } = useParams<{ pageNum: string }>()
  const num = Number(pageNum)

  if (!Number.isInteger(num) || num < 1 || num > PAGINI_COCKPIT.length) {
    return <Navigate to="/cockpit/1" replace />
  }

  const Component = PAGES[num]
  return (
    <PageShell pageNum={num}>
      <Component />
    </PageShell>
  )
}

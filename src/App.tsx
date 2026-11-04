import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BootSplashGate } from './components/BootSplashGate'
import { RouteLoadBoundary, RouteLoading } from './components/RouteLoading'
import { AppProvider } from './context/AppContext'
import { Home } from './screens/Home'
import { GlobalStyle } from './styles/GlobalStyle'

const History = lazy(() =>
  import('./screens/History').then((module) => ({ default: module.History })),
)
const LiveMatch = lazy(() =>
  import('./screens/LiveMatch').then((module) => ({ default: module.LiveMatch })),
)
const Marketing = lazy(() =>
  import('./screens/Marketing').then((module) => ({ default: module.Marketing })),
)
const MatchSummary = lazy(() =>
  import('./screens/MatchSummary').then((module) => ({ default: module.MatchSummary })),
)
const NewMatch = lazy(() =>
  import('./screens/NewMatch').then((module) => ({ default: module.NewMatch })),
)
const Profiles = lazy(() =>
  import('./screens/Profiles').then((module) => ({ default: module.Profiles })),
)
const Settings = lazy(() =>
  import('./screens/Settings').then((module) => ({ default: module.Settings })),
)
const WatchLive = lazy(() =>
  import('./screens/WatchLive').then((module) => ({ default: module.WatchLive })),
)
const WatchMatch = lazy(() =>
  import('./screens/WatchMatch').then((module) => ({ default: module.WatchMatch })),
)

export default function App() {
  return (
    <AppProvider>
      <BootSplashGate>
        <GlobalStyle />
        <BrowserRouter>
          <RouteLoadBoundary>
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<Marketing />} />
                <Route path="/app" element={<Home />} />
                <Route path="/new" element={<NewMatch />} />
                <Route path="/match/:matchId" element={<LiveMatch />} />
                <Route path="/match/:matchId/summary" element={<MatchSummary />} />
                <Route path="/history" element={<History />} />
                <Route path="/profiles" element={<Profiles />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/watch" element={<WatchMatch />} />
                <Route path="/watch/live" element={<WatchLive />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </RouteLoadBoundary>
        </BrowserRouter>
      </BootSplashGate>
    </AppProvider>
  )
}

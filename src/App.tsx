import { Route, Routes } from 'react-router'
import { Home } from './screens/Home'
import { Play } from './screens/Play'
import { Results } from './screens/Results'
import { Stats } from './screens/Stats'
import { Archive } from './screens/Archive'
import { ClaimPage } from './screens/ClaimPage'
import { NotFound } from './screens/NotFound'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play" element={<Play />} />
      <Route path="/results" element={<Results />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/c/:id" element={<ClaimPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

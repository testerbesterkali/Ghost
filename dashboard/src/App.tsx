import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Events from './pages/Events';
import Patterns from './pages/Patterns';
import Ghosts from './pages/Ghosts';
import Executions from './pages/Executions';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/events" element={<Events />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/ghosts" element={<Ghosts />} />
          <Route path="/executions" element={<Executions />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

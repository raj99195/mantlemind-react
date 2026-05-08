import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AnimatedGrid from './components/AnimatedGrid';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentDetail from './pages/AgentDetail';
import Portfolio from './pages/Portfolio';
import { Transactions, Onboarding, Settings } from './pages/OtherPages';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedGrid />
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agent-detail" element={<AgentDetail />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { AdminPage } from './pages/AdminPage';
import { MockLocationControls } from './components/dev/MockLocationControls';

function App() {
  return (
    <ConfigProvider>
      <GameProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <MockLocationControls />
      </GameProvider>
    </ConfigProvider>
  );
}

export default App;

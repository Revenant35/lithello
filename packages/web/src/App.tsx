import { Navigate, Route, Routes } from 'react-router';
import { GuestOnlyRoute } from './components/GuestOnlyRoute';
import { PlayerProvider } from './components/PlayerProvider';
import { RequireAuthRoute } from './components/RequireAuthRoute';
import { RequireNoPlayerRoute } from './components/RequireNoPlayerRoute';
import { RequirePlayerRoute } from './components/RequirePlayerRoute';
import { GameView } from './views/GameView';
import { HomeView } from './views/HomeView';
import { LobbyView } from './views/LobbyView';
import { OnboardingView } from './views/OnboardingView';
import { SignInView } from './views/SignInView';
import { SignUpView } from './views/SignUpView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route element={<RequireAuthRoute />}>
        {/* Loads the player once so both guards below decide without refetching. */}
        <Route element={<PlayerProvider />}>
          <Route element={<RequireNoPlayerRoute />}>
            <Route path="/onboarding" element={<OnboardingView />} />
          </Route>
          <Route element={<RequirePlayerRoute />}>
            <Route path="/home" element={<HomeView />} />
            <Route path="/lobby/:lobbyId" element={<LobbyView />} />
            <Route path="/game/:gameId" element={<GameView />} />
          </Route>
        </Route>
      </Route>
      <Route element={<GuestOnlyRoute />}>
        <Route path="/signin" element={<SignInView />} />
        <Route path="/signup" element={<SignUpView />} />
      </Route>
    </Routes>
  );
}

export default App;

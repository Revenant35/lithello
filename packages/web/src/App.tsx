import { Route, Routes } from 'react-router';
import { GuestOnlyRoute } from './components/GuestOnlyRoute';
import { RequireAuthRoute } from './components/RequireAuthRoute';
import { HomeView } from './views/HomeView';
import { LobbyView } from './views/LobbyView';
import { SignInView } from './views/SignInView';
import { SignUpView } from './views/SignUpView';

function App() {
  return (
    <Routes>
      <Route element={<RequireAuthRoute />}>
        <Route path="/home" element={<HomeView />} />
        <Route path="/lobby/:lobbyId" element={<LobbyView />} />
      </Route>
      <Route element={<GuestOnlyRoute />}>
        <Route path="/signin" element={<SignInView />} />
        <Route path="/signup" element={<SignUpView />} />
      </Route>
    </Routes>
  );
}

export default App;

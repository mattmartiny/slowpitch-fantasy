import { useState } from "react";
import { useAuth } from "./auth/useAuth";
import Login from "./components/Login";
import {AuthedApp} from "./AuthedApp"


export default function App() {
  const [authDirty, setAuthDirty] = useState(0);
const { auth, setAuth } = useAuth(authDirty);

  if (auth === undefined) {
    return <div>Loading…</div>;
  }

  if (auth === null) {
    return <Login onSuccess={() => setAuthDirty(d => d + 1)} />;
  }

  return (


  <AuthedApp
    auth={auth}
    setAuth={setAuth}
  />
)}

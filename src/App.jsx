import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      return null;
    }

    try {
      return { token, user: JSON.parse(storedUser) };
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
  });

  useEffect(() => {
    if (!session) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return;
    }

    localStorage.setItem("token", session.token);
    localStorage.setItem("user", JSON.stringify(session.user));
  }, [session]);

  const handleLogout = () => setSession(null);

  const handleUserUpdate = (updatedUser) => {
    setSession((current) => {
      if (!current) return current;
      return { ...current, user: { ...current.user, ...updatedUser } };
    });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={setSession} />
            )
          }
        />
        <Route
          path="/register"
          element={
            session ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register onRegister={setSession} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            session ? (
              <Dashboard token={session.token} user={session.user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Gallery from "./pages/Gallery";

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link
              to="/"
              className="flex items-center gap-2 font-semibold tracking-tight text-slate-900"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                E
              </span>
              EventSnap
            </Link>
            <nav className="text-sm font-medium text-slate-600">
              <Link to="/" className="transition hover:text-indigo-600">
                Dashboard
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gallery/cluster/:clusterId" element={<Gallery />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

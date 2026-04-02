import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Admin from "./pages/Admin"
import Display from "./pages/Display"
import Player from "./pages/Player"

function Home() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Quiz RED</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Link to="/admin">ADMIN</Link>
        <Link to="/display">DISPLAY</Link>
        <Link to="/player">PLAYER</Link>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/display" element={<Display />} />
        <Route path="/player" element={<Player />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
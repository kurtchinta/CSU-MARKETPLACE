import './index.css'
import { Route, Routes } from "react-router";
import HomePage from "./pages/LandingPage.tsx";

function App() {
  return (
    <div>
      <div>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App

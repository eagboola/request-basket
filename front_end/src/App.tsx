import { BrowserRouter, Routes, Route } from "react-router-dom";  
import Home from './components/Home';
import Basket from './components/Basket';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/baskets/:url" element={<Basket />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
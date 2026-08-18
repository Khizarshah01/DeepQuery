import { BrowserRouter,Route, Routes } from "react-router";
import Auth from "./pages/Auth";
import Conversation from "./pages/Conversation";
export function App() {
  return (
     <BrowserRouter>
     <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/local" element={<Conversation />} />
        <Route path="/" element={<Conversation />} />
     </Routes>
     </BrowserRouter>
  );
}

export default App;

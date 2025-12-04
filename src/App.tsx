import React from 'react';
import AppRouter from "./routes";
import {BrowserRouter} from "react-router-dom";
import NavBar from "./components/NavBar";

function App() {
  return (
      <BrowserRouter>
          <NavBar />
          <AppRouter></AppRouter>
      </BrowserRouter>
  );
}

export default App;

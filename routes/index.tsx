import { Route, Routes } from "react-router-dom"

import  LoginForm  from "./pages/LoginForm"
import  HomePage  from "./pages/HomePage"
import '../tailwind.css'


export const Routing = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginForm />} />
  </Routes>
)
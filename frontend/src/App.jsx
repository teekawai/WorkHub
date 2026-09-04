import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Register from './pages/Register'
import Login from './pages/Login'
import { Route, Routes } from 'react-router-dom'
import { ROUTE_PATH } from './routes/route'
import NavBar from './components/NavBar'
import ProtectedRoute from './routes/protectedRoutes'
function App() {
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser")))

  return (
    <>
      <Routes>
        <Route path={ROUTE_PATH.AUTH.REGISTER} element={<Register setCurrentUser={setCurrentUser} />}></Route>
        <Route path={ROUTE_PATH.AUTH.LOGIN} element={<Login setCurrentUser={setCurrentUser} />}></Route>
        <Route path={ROUTE_PATH.FINDER.HOME } element={<ProtectedRoute role="finder"><NavBar currentUser={currentUser}/></ProtectedRoute>}></Route>
        <Route path={ROUTE_PATH.EMPLOYER.HOME } element={<ProtectedRoute role="employer"><NavBar currentUser={currentUser}/></ProtectedRoute>}></Route>
        <Route path='/' element ={<NavBar currentUser={currentUser} /> }></Route>        
      </Routes>

    </>
  )
}

export default App

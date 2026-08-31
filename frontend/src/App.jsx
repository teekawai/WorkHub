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
function App() {
  const [count, setCount] = useState(0)
  const currentUser = JSON.parse(localStorage.getItem("currentUser"))

  return (
    <>
      <Routes>
        <Route path={ROUTE_PATH.AUTH.REGISTER} element={<Register />}></Route>
        <Route path={ROUTE_PATH.AUTH.LOGIN} element={<Login />}></Route>
        <Route path={ROUTE_PATH.FINDER.HOME } element={<NavBar currentUser={currentUser}/>}></Route>
        <Route path={ROUTE_PATH.EMPLOYER.HOME } element={<NavBar currentUser={currentUser}/>}></Route>
        <Route path='/' element ={<NavBar currentUser={currentUser} /> }></Route>        
      </Routes>

    </>
  )
}

export default App

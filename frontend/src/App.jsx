import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTE_PATH } from './routes/route'
import ProtectedRoute from './routes/protectedRoutes'

import NavBar from './components/shared/NavBar'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import FinderHome from './pages/finder/FinderHome'
import EmployerHome from './pages/employer/EmployerHome'
import GeneralUserHome from './pages/GeneralUserHome'

function App() {
  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem('currentUser'))
  )
  const Direct =({currentUser})=>{
    if(!currentUser){
      return <GeneralUserHome currentUser={currentUser} />
    }
    if(currentUser.role =="finder"){
      return <Navigate to={ROUTE_PATH.FINDER.HOME} replace/>
    }
    if(currentUser.role =="employer"){
      return <Navigate to={ROUTE_PATH.EMPLOYER.HOME} replace/>
    }
  }
  return (
    <Routes>
      {/* Auth */}
      <Route path={ROUTE_PATH.AUTH.REGISTER} element={<Register setCurrentUser={setCurrentUser} />} />
      <Route path={ROUTE_PATH.AUTH.LOGIN}    element={<Login    setCurrentUser={setCurrentUser} />} />

      {/* Finder */}
      <Route
        path={ROUTE_PATH.FINDER.HOME}
        element={
          <ProtectedRoute role="finder">
            <FinderHome currentUser={currentUser} />
          </ProtectedRoute>
        }
      />
      <Route
        path={"/"}
        element={<Direct currentUser={currentUser}/>
        }
      />

      {/* Employer */}
      <Route
        path={ROUTE_PATH.EMPLOYER.HOME}
        element={
          <ProtectedRoute role="employer">
            <EmployerHome currentUser={currentUser} />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App

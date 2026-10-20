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
import FinderLayout from './components/finder/FinderLayout'
import FinderProfile from './pages/finder/FinderProfile'
import FinderApplications from './pages/finder/FinderApplications'

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

      {/* Finder workspace: layout có sidebar, các trang con render vào <Outlet /> */}
      <Route
        element={
          <ProtectedRoute role="finder">
            <FinderLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTE_PATH.FINDER.PROFILE} element={<FinderProfile />} />
        <Route path={ROUTE_PATH.FINDER.APPLICATIONS} element={<FinderApplications />} />
      </Route>

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

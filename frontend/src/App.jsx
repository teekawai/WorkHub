import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTE_PATH } from './routes/route'
import ProtectedRoute from './routes/protectedRoutes'
import { useAuth } from './context/AuthContext'

import NavBar from './components/shared/NavBar'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import FinderHome from './pages/finder/FinderHome'
import EmployerHome from './pages/employer/EmployerHome'
import GeneralUserHome from './pages/GeneralUserHome'
import FinderLayout from './components/finder/FinderLayout'
import FinderProfile from './pages/finder/FinderProfile'
import FinderApplications from './pages/finder/FinderApplications'
import EmployerLayout from './components/employer/EmployerLayout'
import EmployerProfile from './pages/employer/EmployerProfile'

function App() {
  //currentUser giờ lấy từ AuthContext (nguồn chân lý duy nhất) thay vì tự giữ state + đọc localStorage ở đây
  const { currentUser } = useAuth()
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
      <Route path={ROUTE_PATH.AUTH.REGISTER} element={<Register />} />
      <Route path={ROUTE_PATH.AUTH.LOGIN}    element={<Login />} />

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

      {/* Employer workspace: layout có sidebar, các trang con render vào <Outlet /> */}
      <Route
        element={
          <ProtectedRoute role="employer">
            <EmployerLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTE_PATH.EMPLOYER.PROFILE} element={<EmployerProfile />} />
      </Route>
    </Routes>
  )
}

export default App

import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTE_PATH } from './routes/route'
import ProtectedRoute from './routes/protectedRoutes'
import { useAuth } from './context/useAuth'

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
import MyJobs from './pages/employer/MyJobs'
import MyJobDetail from './pages/employer/MyJobDetail'
import JobForm from './pages/employer/JobForm'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './components/admin/AdminLayout'
import AdminEmployers from './pages/admin/AdminEmployers'
import JobListing from './pages/finder/JobListing'
import JobDetail from './pages/finder/JobDetail'
import homeOf from './utils/homeOf'

//khai báo ngoài App: nếu tạo trong App thì mỗi lần App render lại React coi là component mới, gỡ và dựng lại cả trang chủ
const Direct =({currentUser})=>{
  if(!currentUser){
    return <GeneralUserHome currentUser={currentUser} />
  }
  return <Navigate to={homeOf(currentUser.role)} replace/>
}

function App() {
  //currentUser giờ lấy từ AuthContext (nguồn chân lý duy nhất) thay vì tự giữ state + đọc localStorage ở đây
  const { currentUser } = useAuth()
  return (
    <Routes>
      {/* Auth */}
      <Route path={ROUTE_PATH.AUTH.REGISTER} element={<Register />} />
      <Route path={ROUTE_PATH.AUTH.LOGIN}    element={<Login />} />

      {/* Tìm việc + Chi tiết: công khai, cả khách */}
      <Route path={ROUTE_PATH.FINDER.JOBS} element={<JobListing />} />
      <Route path={ROUTE_PATH.FINDER.JOB_DETAIL} element={<JobDetail />} />

      {/* Admin: đăng nhập riêng, các trang còn lại nằm trong AdminLayout */}
      <Route path={ROUTE_PATH.ADMIN.LOGIN} element={<AdminLogin />} />
      <Route
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTE_PATH.ADMIN.EMPLOYERS} element={<AdminEmployers />} />
      </Route>

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
        <Route path={ROUTE_PATH.EMPLOYER.JOBS} element={<MyJobs />} />
        <Route path={ROUTE_PATH.EMPLOYER.JOB_NEW} element={<JobForm />} />
        <Route path={ROUTE_PATH.EMPLOYER.JOB_DETAIL} element={<MyJobDetail />} />
        <Route path={ROUTE_PATH.EMPLOYER.JOB_EDIT} element={<JobForm />} />
        <Route path={ROUTE_PATH.EMPLOYER.JOB_REPOST} element={<JobForm />} />
      </Route>
    </Routes>
  )
}

export default App

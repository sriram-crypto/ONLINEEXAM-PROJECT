// SAHASRAPATH MUI layouts
import { Navigate } from "react-router-dom";
import Dashboard from "layouts/dashboard";
import Profile from "layouts/profile";
import AdminPanel from "layouts/admin/AdminPanel";
import StudentPanel from "layouts/student/StudentPanel";
import ViewProfile from "layouts/student/ViewProfile";
import MyExam from "layouts/student/myexam";
import MyResults from "layouts/student/MyResults";
import MyPractice from "layouts/student/MyPractice";
import MyExamResult from "layouts/student/MyExamResult";
import ExamResult from "layouts/student/ExamResult";
import TeacherPanel from "layouts/teacher/TeacherPanel";
import SuperAdminPanel from "layouts/superadmin/SuperAdminPanel";
import ParentPanel from "layouts/parent/ParentPanel";
import EnrollStudent from "layouts/enroll-student";
import HomePage from "../src/HomePage";
import Cart from "layouts/cart/Cart";

// SAHASRAPATH MUI components
import ArgonBox from "components/ArgonBox";

// Import PrivateRoute
import PrivateRoute from "./PrivateRoute";

const defaultIcon = <span />;

const routes = [
  {
    type: "route",
    name: "Home",
    key: "home",
    route: "/",
    icon: defaultIcon,
    allowedRoles: null,
    component: <HomePage />,
  },
  {
    type: "route",
    name: "Dashboard",
    key: "dashboard",
    route: "/dashboard",
    icon: <ArgonBox component="i" color="primary" fontSize="14px" className="ni ni-tv-2" />,
    allowedRoles: ["superadmin", "admin", "teacher", "student", "parent"],
    component: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },
  {
    type: "route",
    name: "Super Admin Panel",
    key: "super-admin-panel",
    route: "/super-admin-panel",
    icon: <ArgonBox component="i" color="error" fontSize="14px" className="ni ni-key-25" />,
    allowedRoles: ["superadmin"],
    component: (
      <PrivateRoute requiredRole="superadmin">
        <SuperAdminPanel />
      </PrivateRoute>
    ),
  },
  {
    type: "route",
    name: "Admin Panel",
    key: "admin-panel",
    route: "/admin-panel",
    icon: <ArgonBox component="i" color="info" fontSize="14px" className="ni ni-settings" />,
    allowedRoles: ["admin"],
    component: (
      <PrivateRoute requiredRole="admin">
        <AdminPanel />
      </PrivateRoute>
    ),
  },
  {
    type: "route",
    name: "Student Panel",
    key: "student-panel",
    route: "/student-panel",
    icon: <ArgonBox component="i" color="success" fontSize="14px" className="ni ni-hat-3" />,
    allowedRoles: ["student"],
    component: (
      <PrivateRoute requiredRole="student">
        <StudentPanel />
      </PrivateRoute>
    ),
  },
  // Hidden routes (not shown in sidebar)
  {
    type: "hidden",
    name: "View Profile",
    key: "student-profile",
    route: "/student/profile",
    icon: defaultIcon,
    component: (
      <PrivateRoute requiredRole="student">
        <ViewProfile />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    name: "My Exams",
    key: "student-myexam",
    route: "/student/myexam",
    icon: defaultIcon,
    component: (
      <PrivateRoute requiredRole="student">
        <MyExam />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    name: "My Results",
    key: "student-myresults",
    route: "/student/myresults",
    icon: defaultIcon,
    component: (
      <PrivateRoute requiredRole="student">
        <MyResults />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    name: "My Practice",
    key: "student-mypractice",
    route: "/student/mypractice",
    icon: defaultIcon,
    component: (
      <PrivateRoute requiredRole="student">
        <MyPractice />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    name: "Exam Result",
    key: "student-examresult",
    route: "/student/myexam/result",
    icon: defaultIcon,
    component: (
      <PrivateRoute requiredRole="student">
        <MyExamResult />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    name: "Old Exam Result",
    key: "student-old-examresult",
    route: "/student/examresult",
    icon: defaultIcon,
    component: (
      <PrivateRoute requiredRole="student">
        <ExamResult />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    name: "Enroll Student",
    key: "enroll-student",
    route: "/enroll-student",
    icon: defaultIcon,
    allowedRoles: ["superadmin", "admin", "teacher", "student"],
    component: <EnrollStudent />,
  },
  {
    type: "hidden",
    name: "Cart",
    key: "cart",
    route: "/cart",
    icon: defaultIcon,
    allowedRoles: ["superadmin", "admin", "teacher", "student"],
    component: (
      <PrivateRoute>
        <Cart />
      </PrivateRoute>
    ),
  },
  {
    type: "route",
    name: "Teacher Panel",
    key: "teacher-panel",
    route: "/teacher-panel",
    icon: <ArgonBox component="i" color="primary" fontSize="14px" className="ni ni-badge" />,
    allowedRoles: ["teacher"],
    component: (
      <PrivateRoute requiredRole="teacher">
        <TeacherPanel />
      </PrivateRoute>
    ),
  },
  {
    type: "route",
    name: "Parent Panel",
    key: "parent-panel",
    route: "/parent-panel",
    icon: <ArgonBox component="i" color="info" fontSize="14px" className="ni ni-single-02" />,
    allowedRoles: ["parent"],
    component: (
      <PrivateRoute requiredRole="parent">
        <ParentPanel />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    title: "Account Pages",
    key: "account-pages",
  },
  {
    type: "hidden",
    name: "Profile",
    key: "profile",
    route: "/profile",
    icon: <ArgonBox component="i" color="dark" fontSize="14px" className="ni ni-single-02" />,
    allowedRoles: ["superadmin", "admin", "teacher", "student", "parent"],
    component: (
      <PrivateRoute>
        <Profile />
      </PrivateRoute>
    ),
  },
  {
    type: "hidden",
    name: "Sign In",
    key: "sign-in",
    route: "/authentication/sign-in",
    icon: <ArgonBox component="i" color="warning" fontSize="14px" className="ni ni-single-copy-04" />,
    allowedRoles: null,
    component: <Navigate to="/" replace />,
  },
  {
    type: "hidden",
    name: "Sign Up",
    key: "sign-up",
    route: "/authentication/sign-up",
    icon: <ArgonBox component="i" color="info" fontSize="14px" className="ni ni-collection" />,
    allowedRoles: null,
    component: <Navigate to="/" replace />,
  },
 
].map(route => ({
  ...route,
  icon: route.icon || defaultIcon
}));

export default routes;

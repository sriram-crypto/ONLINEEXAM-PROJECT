/**
=========================================================
* SAHASRAPATH MUI - v3.0.1
=========================================================

* Product Page: https://www.creative-tim.com/product/argon-dashboard-material-ui
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useEffect, useState } from "react";

// react-router-dom components
import { useLocation, NavLink, useNavigate } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

// SAHASRAPATH MUI components
import ArgonBox from "components/ArgonBox";
import ArgonTypography from "components/ArgonTypography";

// SAHASRAPATH MUI example components
import SidenavItem from "examples/Sidenav/SidenavItem";
import SidenavFooter from "examples/Sidenav/SidenavFooter";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

// SAHASRAPATH MUI context
import { useArgonController, setMiniSidenav } from "context";

function Sidenav({ color, brand, brandName, routes, ...rest }) {
  const [controller, dispatch] = useArgonController();
  const { miniSidenav, darkSidenav, layout } = controller;
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const itemName = pathname.split("/").slice(1)[0];
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  // Get user role from localStorage
  const [userRole, setUserRole] = useState("");
  
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole((user.role || "").toLowerCase());
  }, []);

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  const studentQuickAccess = [
    { name: "Overview", route: "/student-panel", icon: "dashboard_customize" },
    { name: "Profile", route: "/student/profile", icon: "person" },
    { name: "My Exams", route: "/student/myexam", icon: "fact_check" },
    { name: "Results", route: "/student/myresults", icon: "bar_chart" },
    { name: "Practice", route: "/student/mypractice", icon: "quiz" },
    { name: "Course Enrollment", route: "/student-panel#student-course-enrollment", icon: "school" },
  ];

  const superAdminQuickAccess = [
    { name: "Overview", route: "/super-admin-panel", icon: "dashboard_customize" },
    { name: "Setup", route: "/super-admin-panel?view=setup", icon: "settings" },
    { name: "Edit Setup", route: "/super-admin-panel?view=edit-delete-setup", icon: "edit_note" },
    { name: "View Users", route: "/super-admin-panel?view=view", icon: "groups" },
    { name: "Activate Users", route: "/super-admin-panel?view=activate", icon: "toggle_on" },
    { name: "Exam Reports", route: "/super-admin-panel?view=exam-report", icon: "assignment" },
    { name: "Packages", route: "/super-admin-panel?view=packages", icon: "inventory_2" },
    { name: "Approvals", route: "/super-admin-panel?view=user-approvals", icon: "verified_user" },
    { name: "DB Tables", route: "/super-admin-panel?view=database", icon: "storage" },
  ];

  const adminQuickAccess = [
    { name: "Overview", route: "/admin-panel", icon: "dashboard_customize" },
    { name: "Add Question", route: "/admin-panel?view=add-question", icon: "add_circle" },
    { name: "Bulk Users", route: "/admin-panel?view=bulk-users", icon: "upload_file" },
    { name: "View Users", route: "/admin-panel?view=users", icon: "groups" },
    { name: "Manage Exams", route: "/admin-panel?view=exams", icon: "assignment" },
    { name: "Parent Requests", route: "/admin-panel?view=parent-requests", icon: "family_restroom" },
    { name: "Student Analytics", route: "/admin-panel?view=student-analytics", icon: "insights" },
  ];

  const teacherQuickAccess = [
    { name: "Overview", route: "/teacher-panel", icon: "dashboard_customize" },
    { name: "Manage Exams", route: "/teacher-panel?view=manage", icon: "assignment" },
    { name: "Add Questions", route: "/teacher-panel?view=add-question", icon: "add_circle" },
    { name: "Worksheets", route: "/teacher-panel?view=worksheets", icon: "description" },
    { name: "Question Paper", route: "/teacher-panel?view=question-paper", icon: "post_add" },
    { name: "Submissions", route: "/teacher-panel?view=submissions", icon: "bar_chart" },
    { name: "Parent Requests", route: "/teacher-panel?view=parent-requests", icon: "family_restroom" },
    { name: "Student Analytics", route: "/teacher-panel?view=student-analytics", icon: "insights" },
  ];

  const parentQuickAccess = [
    { name: "Overview", route: "/parent-panel", icon: "family_restroom" },
    { name: "Ward Links", route: "/parent-panel#parent-link-form", icon: "person_add" },
    { name: "ML Alerts", route: "/parent-panel#parent-ml-alerts", icon: "psychology" },
    { name: "Results", route: "/parent-panel#parent-results", icon: "bar_chart" },
    { name: "Meetings", route: "/parent-panel#parent-meeting-form", icon: "event_available" },
  ];

  const isRouteActive = (route) => {
    const [routeWithoutHash, routeHash] = route.split("#");
    const [routePath, routeQuery] = routeWithoutHash.split("?");
    if (routeHash && location.hash !== `#${routeHash}`) return false;
    if (routeQuery) return pathname === routePath && search.includes(routeQuery);
    return pathname === routePath || pathname.startsWith(`${routePath}/`);
  };

  const isQuickAccessActive = (item) => {
    if (["/super-admin-panel", "/admin-panel", "/teacher-panel", "/parent-panel", "/student-panel"].includes(item.route)) {
      return pathname === item.route && !search && !location.hash;
    }
    return isRouteActive(item.route);
  };

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = routes
    .filter(({ allowedRoles }) => {
      // If no allowedRoles specified or user not logged in, show the route
      if (!allowedRoles || !userRole) return true;
      // Check if user's role is in the allowed roles
      return allowedRoles.includes(userRole);
    })
    .map(({ type, name, icon, title, key, href, route }) => {
      let returnValue;

      // Custom route for Profile in student panel
      const isStudentProfile = name === "Profile" && userRole === "student";

      if (type === "route") {
        if (href) {
          returnValue = (
            <Link href={href} key={key} target="_blank" rel="noreferrer">
              <SidenavItem
                name={name}
                icon={icon}
                active={key === itemName}
              />
            </Link>
          );
        } else if (isStudentProfile) {
          returnValue = (
            <NavLink to="/student/profile" key={key}>
              <SidenavItem name={name} icon={icon} active={key === itemName} />
            </NavLink>
          );
        } else {
          returnValue = (
            <NavLink to={route} key={key}>
              <SidenavItem name={name} icon={icon} active={key === itemName} />
            </NavLink>
          );
        }
      } else if (type === "title") {
        returnValue = (
          <ArgonTypography
            key={key}
            color={darkSidenav ? "white" : "dark"}
            display="block"
            variant="caption"
            fontWeight="bold"
            textTransform="uppercase"
            opacity={0.6}
            pl={3}
            mt={2}
            mb={1}
            ml={1}
          >
            {title}
          </ArgonTypography>
        );
      } else if (type === "divider") {
        returnValue = <Divider key={key} light={darkSidenav} />;
      }

      return returnValue;
    });

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setLogoutDialogOpen(true);
  };

  const handleConfirmLogout = () => {
    [
      "token",
      "user",
      "student_name",
      "name",
      "class",
      "roll_number",
      "school_name",
      "student_photo",
    ].forEach((key) => localStorage.removeItem(key));

    try {
      sessionStorage.clear();
    } catch (error) {
      // Session storage can be unavailable in strict browser modes.
    }

    setLogoutDialogOpen(false);
    closeSidenav();
    navigate("/", { replace: true });
  };

  return (
    <>
    <SidenavRoot {...rest} variant="permanent" ownerState={{ darkSidenav, miniSidenav, layout }}>
      <ArgonBox pt={3} pb={1} px={4} textAlign="center">
        <ArgonBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          width="100%"
        >
          {brand && (
            <ArgonBox component="img" src={brand} alt="Argon Logo" width="2.5rem" mb={1} />
          )}
          <ArgonBox
            width="100%"
            sx={(theme) => sidenavLogoLabel(theme, { miniSidenav })}
          >
            <ArgonTypography
              component="h6"
              variant="button"
              fontWeight="medium"
              color={darkSidenav ? "white" : "dark"}
              sx={{ textAlign: 'center', width: '100%' }}
            >
              {brandName}
            </ArgonTypography>
          </ArgonBox>
        </ArgonBox>
      </ArgonBox>
      <Divider light={darkSidenav} />
      <List>{renderRoutes}</List>

      {userRole === "student" && (
        <>
          <Divider light={darkSidenav} sx={{ my: 1 }} />
          <ArgonBox
            px={3}
            pt={1}
            pb={0.5}
            sx={({ breakpoints, transitions }) => ({
              opacity: miniSidenav ? 0 : 1,
              transition: transitions.create("opacity", {
                easing: transitions.easing.easeInOut,
                duration: transitions.duration.standard,
              }),
              [breakpoints.down("xl")]: {
                opacity: 1,
              },
            })}
          >
            <ArgonTypography
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              color={darkSidenav ? "white" : "text"}
              opacity={0.72}
            >
              Student Quick Access
            </ArgonTypography>
          </ArgonBox>
          <List>
            {studentQuickAccess.map((item) => (
              <NavLink to={item.route} key={item.route} style={{ textDecoration: "none" }}>
                <SidenavItem
                  name={item.name}
                  icon={<Icon>{item.icon}</Icon>}
                  active={isQuickAccessActive(item)}
                />
              </NavLink>
            ))}
          </List>
        </>
      )}

      {userRole === "superadmin" && (
        <>
          <Divider light={darkSidenav} sx={{ my: 1 }} />
          <ArgonBox
            px={3}
            pt={1}
            pb={0.5}
            sx={({ breakpoints, transitions }) => ({
              opacity: miniSidenav ? 0 : 1,
              transition: transitions.create("opacity", {
                easing: transitions.easing.easeInOut,
                duration: transitions.duration.standard,
              }),
              [breakpoints.down("xl")]: {
                opacity: 1,
              },
            })}
          >
            <ArgonTypography
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              color={darkSidenav ? "white" : "text"}
              opacity={0.72}
            >
              Super Admin Menu
            </ArgonTypography>
          </ArgonBox>
          <List>
            {superAdminQuickAccess.map((item) => (
              <NavLink to={item.route} key={item.route} style={{ textDecoration: "none" }}>
                <SidenavItem
                  name={item.name}
                  icon={<Icon>{item.icon}</Icon>}
                  active={isQuickAccessActive(item)}
                />
              </NavLink>
            ))}
          </List>
        </>
      )}

      {userRole === "admin" && (
        <>
          <Divider light={darkSidenav} sx={{ my: 1 }} />
          <ArgonBox
            px={3}
            pt={1}
            pb={0.5}
            sx={({ breakpoints, transitions }) => ({
              opacity: miniSidenav ? 0 : 1,
              transition: transitions.create("opacity", {
                easing: transitions.easing.easeInOut,
                duration: transitions.duration.standard,
              }),
              [breakpoints.down("xl")]: {
                opacity: 1,
              },
            })}
          >
            <ArgonTypography
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              color={darkSidenav ? "white" : "text"}
              opacity={0.72}
            >
              Admin Menu
            </ArgonTypography>
          </ArgonBox>
          <List>
            {adminQuickAccess.map((item) => (
              <NavLink to={item.route} key={item.route} style={{ textDecoration: "none" }}>
                <SidenavItem
                  name={item.name}
                  icon={<Icon>{item.icon}</Icon>}
                  active={isQuickAccessActive(item)}
                />
              </NavLink>
            ))}
          </List>
        </>
      )}

      {userRole === "teacher" && (
        <>
          <Divider light={darkSidenav} sx={{ my: 1 }} />
          <ArgonBox
            px={3}
            pt={1}
            pb={0.5}
            sx={({ breakpoints, transitions }) => ({
              opacity: miniSidenav ? 0 : 1,
              transition: transitions.create("opacity", {
                easing: transitions.easing.easeInOut,
                duration: transitions.duration.standard,
              }),
              [breakpoints.down("xl")]: {
                opacity: 1,
              },
            })}
          >
            <ArgonTypography
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              color={darkSidenav ? "white" : "text"}
              opacity={0.72}
            >
              Teacher Menu
            </ArgonTypography>
          </ArgonBox>
          <List>
            {teacherQuickAccess.map((item) => (
              <NavLink to={item.route} key={item.route} style={{ textDecoration: "none" }}>
                <SidenavItem
                  name={item.name}
                  icon={<Icon>{item.icon}</Icon>}
                  active={isQuickAccessActive(item)}
                />
              </NavLink>
            ))}
          </List>
        </>
      )}

      {userRole === "parent" && (
        <>
          <Divider light={darkSidenav} sx={{ my: 1 }} />
          <ArgonBox
            px={3}
            pt={1}
            pb={0.5}
            sx={({ breakpoints, transitions }) => ({
              opacity: miniSidenav ? 0 : 1,
              transition: transitions.create("opacity", {
                easing: transitions.easing.easeInOut,
                duration: transitions.duration.standard,
              }),
              [breakpoints.down("xl")]: {
                opacity: 1,
              },
            })}
          >
            <ArgonTypography
              variant="caption"
              fontWeight="bold"
              textTransform="uppercase"
              color={darkSidenav ? "white" : "text"}
              opacity={0.72}
            >
              Parent Menu
            </ArgonTypography>
          </ArgonBox>
          <List>
            {parentQuickAccess.map((item) => (
              <NavLink to={item.route} key={item.route} style={{ textDecoration: "none" }}>
                <SidenavItem
                  name={item.name}
                  icon={<Icon>{item.icon}</Icon>}
                  active={isQuickAccessActive(item)}
                />
              </NavLink>
            ))}
          </List>
        </>
      )}

      {/* Log Out Option */}
      <List>
        <NavLink to="/" onClick={handleLogoutClick} style={{ textDecoration: 'none' }}>
          <SidenavItem name="Log Out" icon={<Icon>logout</Icon>} active={false} />
        </NavLink>
      </List>

      <ArgonBox pt={1} mt="auto" mb={2} mx={2}>
        <SidenavFooter />
      </ArgonBox>
    </SidenavRoot>

    <Dialog
      open={logoutDialogOpen}
      onClose={() => setLogoutDialogOpen(false)}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(15, 23, 42, 0.54)",
          backdropFilter: "blur(8px)",
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: "18px",
          width: "min(460px, calc(100% - 32px))",
          overflow: "hidden",
          boxShadow: "0 24px 70px rgba(15, 23, 42, 0.28)",
          border: "1px solid rgba(148, 163, 184, 0.22)",
        },
      }}
    >
      <ArgonBox
        sx={{
          height: 7,
          background: "linear-gradient(90deg, #2563eb, #0f766e, #f59e0b)",
        }}
      />
      <DialogTitle
        sx={{
          px: 3,
          pt: 3,
          pb: 1,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <ArgonBox
          sx={{
            width: 50,
            height: 50,
            borderRadius: "14px",
            display: "grid",
            placeItems: "center",
            color: "#ffffff",
            background: "linear-gradient(135deg, #2563eb, #0f766e)",
            boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
          }}
        >
          <Icon fontSize="medium">logout</Icon>
        </ArgonBox>
        <ArgonBox>
          <ArgonTypography component="span" variant="caption" fontWeight="bold" color="text" textTransform="uppercase">
            Secure sign out
          </ArgonTypography>
          <ArgonTypography component="h2" variant="h5" fontWeight="bold" color="dark" m={0}>
            Log out of ExamPulse?
          </ArgonTypography>
        </ArgonBox>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1, pb: 0 }}>
        <ArgonTypography variant="body2" color="text" sx={{ lineHeight: 1.75 }}>
          Your active session and temporary exam data on this device will be cleared. Saved login email preferences will remain available.
        </ArgonTypography>
        <ArgonBox
          sx={{
            mt: 2,
            p: 2,
            borderRadius: "12px",
            background: "rgba(241, 245, 249, 0.92)",
            border: "1px solid rgba(203, 213, 225, 0.82)",
            display: "grid",
            gap: 1,
          }}
        >
          {[
            ["lock", "Session tokens will be removed"],
            ["history", "Temporary exam state will be cleared"],
            ["verified_user", "Your account data stays safe"],
          ].map(([icon, label]) => (
            <ArgonBox key={label} sx={{ display: "flex", alignItems: "center", gap: 1, color: "#475569" }}>
              <Icon fontSize="small" sx={{ color: "#0f766e" }}>{icon}</Icon>
              <ArgonTypography variant="caption" fontWeight="medium" color="text">
                {label}
              </ArgonTypography>
            </ArgonBox>
          ))}
        </ArgonBox>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          pt: 3,
          pb: 3,
          gap: 1.2,
          flexDirection: { xs: "column-reverse", sm: "row" },
        }}
      >
        <Button
          onClick={() => setLogoutDialogOpen(false)}
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: "10px",
            fontWeight: 800,
            textTransform: "none",
            py: 1.1,
            color: "#334155",
            borderColor: "rgba(100, 116, 139, 0.42)",
            "&:hover": {
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.06)",
            },
          }}
        >
          Stay Logged In
        </Button>
        <Button
          onClick={handleConfirmLogout}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: "10px",
            fontWeight: 800,
            textTransform: "none",
            py: 1.1,
            background: "linear-gradient(135deg, #2563eb, #0f766e)",
            boxShadow: "0 12px 24px rgba(15, 118, 110, 0.24)",
            "&:hover": {
              background: "linear-gradient(135deg, #1d4ed8, #0f766e)",
              boxShadow: "0 14px 28px rgba(15, 118, 110, 0.28)",
            },
          }}
        >
          Log Out
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  brand: "",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Employees from './pages/Employees';
import EmployeeDetail from './pages/EmployeeDetail';
import OrganizationChart from './pages/OrganizationChart';

import Requests from './pages/Requests';
import Attendance from './pages/Attendance';
import CalendarPage from './pages/CalendarPage';
import WorkSchedules from './pages/WorkSchedules';
import PublicHolidays from './pages/PublicHolidays';
import AttendanceTracking from './pages/AttendanceTracking';
import Reports from './pages/Reports';
import SystemHealth from './pages/admin/SystemHealth';
import AttendanceDebugger from './pages/admin/AttendanceDebugger';
import FiscalCalendarSettings from './pages/admin/FiscalCalendarSettings';
import ServiceControl from './pages/ServiceControl';
import MealOrders from './pages/admin/MealOrders';
import SubstituteManagement from './pages/SubstituteManagement';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasAccess = permissions.some(perm => hasPermission(perm));

    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
          <h2 className="text-xl font-bold text-red-500 mb-2">Erişim Reddedildi</h2>
          <p>Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz.</p>
          <code className="bg-slate-100 px-2 py-1 rounded mt-2 text-xs">{permissions.join(' veya ')}</code>
        </div>
      );
    }
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="profile" element={<Profile />} />

            {/* Employees - Requires PAGE_EMPLOYEES_VIEW */}
            <Route path="employees" element={<ProtectedRoute requiredPermission="PAGE_EMPLOYEES_VIEW"><Employees /></ProtectedRoute>} />
            <Route path="employees/:id" element={<ProtectedRoute requiredPermission="PAGE_EMPLOYEES_VIEW"><EmployeeDetail /></ProtectedRoute>} />

            {/* Organization Chart - Requires PAGE_ORG_CHART_VIEW */}
            <Route path="organization-chart" element={<ProtectedRoute requiredPermission="PAGE_ORG_CHART_VIEW"><OrganizationChart /></ProtectedRoute>} />

            {/* Attendance - No permission required (everyone can access) */}
            <Route path="attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="attendance-tracking" element={<ProtectedRoute><AttendanceTracking /></ProtectedRoute>} />

            {/* Calendar - No permission required (everyone can access) */}
            <Route path="calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />

            {/* Work Schedules - Requires PAGE_WORK_CALENDAR_VIEW */}
            <Route path="work-schedules" element={<ProtectedRoute requiredPermission="PAGE_WORK_CALENDAR_VIEW"><WorkSchedules /></ProtectedRoute>} />
            <Route path="public-holidays" element={<ProtectedRoute requiredPermission="PAGE_WORK_CALENDAR_VIEW"><PublicHolidays /></ProtectedRoute>} />

            {/* Requests - No permission required (everyone can access) */}
            <Route path="requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />

            {/* Substitute Management - Managers with REQUEST_*_MANAGE permissions */}
            <Route path="substitute-management" element={<ProtectedRoute requiredPermission={['REQUEST_ANNUAL_LEAVE_MANAGE', 'REQUEST_OVERTIME_MANAGE', 'REQUEST_CARDLESS_ENTRY_MANAGE', 'REQUEST_EXTERNAL_DUTY_MANAGE']}><SubstituteManagement /></ProtectedRoute>} />

            {/* Reports - Requires PAGE_REPORTS_VIEW */}
            <Route path="reports" element={<ProtectedRoute requiredPermission="PAGE_REPORTS_VIEW"><Reports /></ProtectedRoute>} />

            {/* Admin Pages */}
            <Route path="admin/system-health" element={<ProtectedRoute requiredPermission="SYSTEM_ADMIN_ACCESS"><SystemHealth /></ProtectedRoute>} />
            <Route path="admin/service-control" element={<ProtectedRoute requiredPermission="SYSTEM_ADMIN_ACCESS"><ServiceControl /></ProtectedRoute>} />

            {/* Meal Orders - Requires PAGE_MEAL_TRACKING_VIEW */}
            <Route path="meal-orders" element={<ProtectedRoute requiredPermission="PAGE_MEAL_TRACKING_VIEW"><MealOrders /></ProtectedRoute>} />
            {/* <Route path="admin/fiscal-calendar" element={<ProtectedRoute requiredPermission="ATTENDANCE_MANAGE_FISCAL"><FiscalCalendarSettings /></ProtectedRoute>} /> */}
            <Route path="debug/attendance" element={<ProtectedRoute requiredPermission="SYSTEM_ADMIN_ACCESS"><AttendanceDebugger /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
// Trigger Rebuild 2026-01-07

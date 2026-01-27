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

            {/* Employees - Requires page.employees.access */}
            <Route path="employees" element={<ProtectedRoute requiredPermission="page.employees.access"><Employees /></ProtectedRoute>} />
            <Route path="employees/:id" element={<ProtectedRoute requiredPermission="page.employees.access"><EmployeeDetail /></ProtectedRoute>} />

            {/* Organization Chart - Requires page.organization.view */}
            <Route path="organization-chart" element={<ProtectedRoute requiredPermission="page.organization.view"><OrganizationChart /></ProtectedRoute>} />

            {/* Attendance - No permission required (everyone can access) */}
            <Route path="attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="attendance-tracking" element={<ProtectedRoute><AttendanceTracking /></ProtectedRoute>} />

            {/* Calendar - No permission required (everyone can access) */}
            <Route path="calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />

            {/* Work Schedules - Requires page.work_calendar.access */}
            <Route path="work-schedules" element={<ProtectedRoute requiredPermission="page.work_calendar.access"><WorkSchedules /></ProtectedRoute>} />
            <Route path="public-holidays" element={<ProtectedRoute requiredPermission="page.work_calendar.access"><PublicHolidays /></ProtectedRoute>} />

            {/* Requests - No permission required (everyone can access) */}
            <Route path="requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />

            {/* Substitute Management - Managers with request management permissions */}
            <Route path="substitute-management" element={<ProtectedRoute requiredPermission={['request.annual_leave.manage', 'request.overtime.manage', 'request.cardless_entry.manage']}><SubstituteManagement /></ProtectedRoute>} />

            {/* Reports - Requires page.reports.access */}
            <Route path="reports" element={<ProtectedRoute requiredPermission="page.reports.access"><Reports /></ProtectedRoute>} />

            {/* Admin Pages */}
            <Route path="admin/system-health" element={<ProtectedRoute requiredPermission="admin.full_access"><SystemHealth /></ProtectedRoute>} />
            <Route path="admin/service-control" element={<ProtectedRoute requiredPermission="admin.full_access"><ServiceControl /></ProtectedRoute>} />

            {/* Meal Orders - Requires page.meal_tracking.access */}
            <Route path="meal-orders" element={<ProtectedRoute requiredPermission="page.meal_tracking.access"><MealOrders /></ProtectedRoute>} />
            {/* <Route path="admin/fiscal-calendar" element={<ProtectedRoute requiredPermission="admin.full_access"><FiscalCalendarSettings /></ProtectedRoute>} /> */}

            <Route path="debug/attendance" element={<ProtectedRoute requiredPermission="admin.full_access"><AttendanceDebugger /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
// Trigger Rebuild 2026-01-07

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

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <h2 className="text-xl font-bold text-red-500 mb-2">Erişim Reddedildi</h2>
        <p>Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz.</p>
        <code className="bg-slate-100 px-2 py-1 rounded mt-2 text-xs">{requiredPermission}</code>
      </div>
    );
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

            <Route path="employees" element={<ProtectedRoute requiredPermission="EMPLOYEE_VIEW_LIST"><Employees /></ProtectedRoute>} />
            <Route path="employees/:id" element={<ProtectedRoute requiredPermission="EMPLOYEE_VIEW_DETAIL"><EmployeeDetail /></ProtectedRoute>} />

            <Route path="organization-chart" element={<ProtectedRoute><OrganizationChart /></ProtectedRoute>} />


            <Route path="attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="attendance-tracking" element={<ProtectedRoute requiredPermission="ATTENDANCE_VIEW_TEAM"><AttendanceTracking /></ProtectedRoute>} />

            <Route path="calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="work-schedules" element={<ProtectedRoute requiredPermission="SCHEDULE_MANAGE"><WorkSchedules /></ProtectedRoute>} />
            <Route path="public-holidays" element={<ProtectedRoute requiredPermission="SETTINGS_MANAGE_HOLIDAYS"><PublicHolidays /></ProtectedRoute>} />

            <Route path="requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute requiredPermission="REPORT_VIEW_ALL"><Reports /></ProtectedRoute>} />
            <Route path="admin/system-health" element={<ProtectedRoute requiredPermission="SYSTEM_MANAGE"><SystemHealth /></ProtectedRoute>} />
            <Route path="admin/service-control" element={<ProtectedRoute requiredPermission="SYSTEM_MANAGE"><ServiceControl /></ProtectedRoute>} />
            <Route path="admin/fiscal-calendar" element={<ProtectedRoute requiredPermission="ATTENDANCE_MANAGE_FISCAL"><FiscalCalendarSettings /></ProtectedRoute>} />
            <Route path="debug/attendance" element={<ProtectedRoute requiredPermission="SYSTEM_MANAGE"><AttendanceDebugger /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
// Trigger Rebuild 2026-01-07

import React, { Suspense } from 'react'; // trigger redeploy
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';

const lazyRetry = (importFn) =>
  React.lazy(() => {
    const key = 'lazy-retry-' + importFn.toString().slice(0, 50);
    const hasRefreshed = JSON.parse(sessionStorage.getItem(key) || 'false');
    return importFn()
      .then((component) => {
        sessionStorage.removeItem(key);
        return component;
      })
      .catch((error) => {
        if (!hasRefreshed) {
          sessionStorage.setItem(key, 'true');
          window.location.reload();
          return new Promise(() => {});
        }
        throw error;
      });
  });

const Dashboard = lazyRetry(() => import('./pages/Dashboard'));
const Profile = lazyRetry(() => import('./pages/Profile'));
const Employees = lazyRetry(() => import('./pages/Employees'));
const EmployeeDetail = lazyRetry(() => import('./pages/EmployeeDetail'));
const OrganizationChart = lazyRetry(() => import('./pages/OrganizationChart'));
const Requests = lazyRetry(() => import('./pages/Requests'));
const Attendance = lazyRetry(() => import('./pages/Attendance'));
const CalendarPage = lazyRetry(() => import('./pages/CalendarPage'));
const WorkSchedules = lazyRetry(() => import('./pages/WorkSchedules'));
const PublicHolidays = lazyRetry(() => import('./pages/PublicHolidays'));
const AttendanceTracking = lazyRetry(() => import('./pages/AttendanceTracking'));
const Reports = lazyRetry(() => import('./pages/Reports'));
const SystemHealth = lazyRetry(() => import('./pages/admin/SystemHealth'));
const AttendanceDebugger = lazyRetry(() => import('./pages/admin/AttendanceDebugger'));
const ServiceControl = lazyRetry(() => import('./pages/ServiceControl'));
const MealOrders = lazyRetry(() => import('./pages/admin/MealOrders'));
const SubstituteManagement = lazyRetry(() => import('./pages/SubstituteManagement'));
const CompanyDirectory = lazyRetry(() => import('./pages/CompanyDirectory'));
const DataManagement = lazyRetry(() => import('./pages/admin/DataManagement'));
const ProgramManagement = lazyRetry(() => import('./pages/admin/ProgramManagement'));
const Feedback = lazyRetry(() => import('./pages/Feedback'));
const HealthReports = lazyRetry(() => import('./pages/admin/HealthReports'));
const SpecialLeaves = lazyRetry(() => import('./pages/admin/SpecialLeaves'));
const RequestAnalytics = lazyRetry(() => import('./pages/RequestAnalytics'));
const HelpLibrary = lazyRetry(() => import('./pages/HelpLibrary'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
  </div>
);

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
            <Route index element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ProtectedRoute>} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />

            {/* Employees - Requires PAGE_EMPLOYEES */}
            <Route path="employees" element={<ProtectedRoute requiredPermission="PAGE_EMPLOYEES"><Suspense fallback={<PageLoader />}><Employees /></Suspense></ProtectedRoute>} />
            <Route path="employees/:id" element={<ProtectedRoute requiredPermission="PAGE_EMPLOYEES"><Suspense fallback={<PageLoader />}><EmployeeDetail /></Suspense></ProtectedRoute>} />

            {/* Organization Chart - Requires PAGE_ORG_CHART */}
            <Route path="organization-chart" element={<ProtectedRoute requiredPermission="PAGE_ORG_CHART"><Suspense fallback={<PageLoader />}><OrganizationChart /></Suspense></ProtectedRoute>} />

            {/* Attendance - No permission required (everyone can access) */}
            <Route path="attendance" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Attendance /></Suspense></ProtectedRoute>} />
            <Route path="attendance-tracking" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AttendanceTracking /></Suspense></ProtectedRoute>} />

            {/* Calendar - No permission required (everyone can access) */}
            <Route path="calendar" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CalendarPage /></Suspense></ProtectedRoute>} />

            {/* Company Directory - No permission required (everyone can access) */}
            <Route path="company-directory" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CompanyDirectory /></Suspense></ProtectedRoute>} />

            {/* Work Schedules - Requires PAGE_WORK_SCHEDULES */}
            <Route path="work-schedules" element={<ProtectedRoute requiredPermission="PAGE_WORK_SCHEDULES"><Suspense fallback={<PageLoader />}><WorkSchedules /></Suspense></ProtectedRoute>} />
            <Route path="public-holidays" element={<ProtectedRoute requiredPermission="PAGE_WORK_SCHEDULES"><Suspense fallback={<PageLoader />}><PublicHolidays /></Suspense></ProtectedRoute>} />

            {/* Requests - No permission required (everyone can access) */}
            <Route path="requests" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Requests /></Suspense></ProtectedRoute>} />

            {/* Substitute Management - Free for everyone now */}
            <Route path="substitute-management" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><SubstituteManagement /></Suspense></ProtectedRoute>} />

            {/* Feedback & Complaints - No permission required (everyone can access) */}
            <Route path="feedback" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Feedback /></Suspense></ProtectedRoute>} />

            {/* Reports - Requires PAGE_REPORTS */}
            <Route path="reports" element={<ProtectedRoute requiredPermission="PAGE_REPORTS"><Suspense fallback={<PageLoader />}><Reports /></Suspense></ProtectedRoute>} />

            {/* Request Analytics - Requires PAGE_REPORTS */}
            <Route path="request-analytics" element={<ProtectedRoute requiredPermission="PAGE_REPORTS"><Suspense fallback={<PageLoader />}><RequestAnalytics /></Suspense></ProtectedRoute>} />

            {/* Admin Pages */}
            <Route path="admin/system-health" element={<ProtectedRoute requiredPermission="PAGE_SYSTEM_HEALTH"><Suspense fallback={<PageLoader />}><SystemHealth /></Suspense></ProtectedRoute>} />
            <Route path="admin/service-control" element={<ProtectedRoute requiredPermission="PAGE_SYSTEM_HEALTH"><Suspense fallback={<PageLoader />}><ServiceControl /></Suspense></ProtectedRoute>} />

            {/* Meal Orders - Requires PAGE_MEAL_ORDERS */}
            <Route path="meal-orders" element={<ProtectedRoute requiredPermission="PAGE_MEAL_ORDERS"><Suspense fallback={<PageLoader />}><MealOrders /></Suspense></ProtectedRoute>} />

            {/* Health Reports - Requires PAGE_HEALTH_REPORTS */}
            <Route path="health-reports" element={<ProtectedRoute requiredPermission="PAGE_HEALTH_REPORTS"><Suspense fallback={<PageLoader />}><HealthReports /></Suspense></ProtectedRoute>} />

            {/* Special Leaves - Requires PAGE_SPECIAL_LEAVES */}
            <Route path="special-leaves" element={<ProtectedRoute requiredPermission="PAGE_SPECIAL_LEAVES"><Suspense fallback={<PageLoader />}><SpecialLeaves /></Suspense></ProtectedRoute>} />

            <Route path="system-data-management" element={<ProtectedRoute requiredPermission="PAGE_DATA_MANAGEMENT"><Suspense fallback={<PageLoader />}><DataManagement /></Suspense></ProtectedRoute>} />

            <Route path="debug/attendance" element={<ProtectedRoute requiredPermission="PAGE_DEBUG"><Suspense fallback={<PageLoader />}><AttendanceDebugger /></Suspense></ProtectedRoute>} />

            {/* External Program Management */}
            <Route path="program-management" element={<ProtectedRoute requiredPermission="PAGE_PROGRAM_MANAGEMENT"><Suspense fallback={<PageLoader />}><ProgramManagement /></Suspense></ProtectedRoute>} />

            {/* Help Library - No permission required */}
            <Route path="help" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <HelpLibrary />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* 404 - Sayfa Bulunamadı */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
                <h2 className="text-4xl font-bold text-slate-300 mb-4">404</h2>
                <p className="text-lg font-medium text-slate-600 mb-2">Sayfa Bulunamadı</p>
                <p className="text-sm">Aradığınız sayfa mevcut değil veya kaldırılmış olabilir.</p>
              </div>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

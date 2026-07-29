import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SearchProvider } from './context/SearchContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';
import { getDashboardPath } from './utils/authRoutes';

// Auth Pages
import RegisterPage from './pages/auth/Registration';
import CertificateTemplateEditor from './pages/Admins/components/CertificateTemplateEditor';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AccountNotice from './pages/auth/AccountNotice';

// Layouts
const TutorLayout = lazy(() => import('./layouts/TutorLayout'));
const LearnerLayout = lazy(() => import('./layouts/LearnerLayout'));
const InsAdminLayout = lazy(() => import('./layouts/InsAdminLayout'));
const PlatformAdminLayout = lazy(() => import('./layouts/PlatformAdminLayout'));

// Dashboard Pages
const LearnerDashboard = lazy(() => import('./pages/learner/LearnerDashboard'));
const TutorDashboard = lazy(() => import('./pages/tutor/TutorDashboard'));
const TutorApprovalProfile = lazy(() => import('./pages/tutor/TutorApprovalProfile'));
const VerifyCertificate = lazy(() => import('./pages/public/VerifyCertificate'));
const InsAdminDashboard = lazy(() => import('./pages/Admins/ins_admin/InsAdminDashboard'));
const InsAdminBatches = lazy(() => import('./pages/Admins/ins_admin/InsAdminBatches'));
const PlatformDashboard = lazy(() => import('./pages/Admins/Platform_Admin/PlatformDashboard'));

// Tutor Pages
const TutorCourses = lazy(() => import('./pages/tutor/TutorCourses'));
const TutorStudents = lazy(() => import('./pages/tutor/TutorStudents'));
const TutorAnalytics = lazy(() => import('./pages/tutor/TutorAnalytics'));
const TutorEarnings = lazy(() => import('./pages/tutor/TutorEarnings'));
const TutorReviews = lazy(() => import('./pages/tutor/TutorReviews'));
const TutorMessages = lazy(() => import('./pages/tutor/TutorMessages'));
const TutorSettings = lazy(() => import('./pages/tutor/TutorSettings'));
const CourseEditor = lazy(() => import('./pages/tutor/CourseEditor'));
const ScheduleLiveClass = lazy(() => import('./pages/tutor/ScheduleLiveClass'));
const ManageSessions = lazy(() => import('./pages/tutor/ManageSessions'));
const GradeCentre = lazy(() => import('./pages/tutor/GradeCentre'));
const TutorDiscussions = lazy(() => import('./pages/tutor/TutorDiscussions'));
const TutorDiscussionPlayer = lazy(() => import('./pages/tutor/TutorDiscussionPlayer'));

// Learner Pages
const MyLearning = lazy(() => import('./pages/learner/MyLearning'));
const JoinInstitution = lazy(() => import('./pages/learner/JoinInstitution'));
const Catalogue = lazy(() => import('./pages/learner/Catalogue'));
const Assignments = lazy(() => import('./pages/learner/Assignments'));
const Notes = lazy(() => import('./pages/learner/Notes'));
const Certificates = lazy(() => import('./pages/learner/Certificates'));
const LearnerSettings = lazy(() => import('./pages/learner/LearnerSettings'));
const CourseDetail = lazy(() => import('./pages/learner/CourseDetail'));
const PaymentScreen = lazy(() => import('./pages/learner/PaymentScreen'));
const PaymentSuccess = lazy(() => import('./pages/learner/PaymentSuccess'));
const PaymentFailure = lazy(() => import('./pages/learner/PaymentFailure'));
const PaymentHistory = lazy(() => import('./pages/learner/PaymentHistory'));
const Wishlist = lazy(() => import('./pages/learner/Wishlist'));
const UpcomingLiveSessions = lazy(() => import('./pages/learner/UpcomingLiveSessions'));
const LiveSessionJoin = lazy(() => import('./pages/learner/LiveSessionJoin'));

// Institutional Admin Pages
const InsAdminCourses = lazy(() => import('./pages/Admins/ins_admin/InsAdminCourses'));
const InsAdminBulkEnrollment = lazy(() => import('./pages/Admins/ins_admin/InsAdminBulkEnrollment'));
const InsAdminTransactions = lazy(() => import('./pages/Admins/ins_admin/InsAdminTransactions'));
const InsAdminRevenue = lazy(() => import('./pages/Admins/ins_admin/InsAdminRevenue'));
const InsAdminReports = lazy(() => import('./pages/Admins/ins_admin/InsAdminReports'));
const InsAdminLogs = lazy(() => import('./pages/Admins/ins_admin/InsAdminLogs'));
const InsAdminSettings = lazy(() => import('./pages/Admins/ins_admin/InsAdminSettings'));
const InsAdminTutorAssignments = lazy(() => import('./pages/Admins/ins_admin/InsAdminTutorAssignments'));
const InsAdminCertificates = lazy(() => import('./pages/Admins/ins_admin/InsAdminCertificates'));
const TutorAttendance = lazy(() => import('./pages/tutor/TutorAttendance'));

// New Features
const Profile = lazy(() => import('./pages/profile/Profile'));
const NotificationHistory = lazy(() => import('./pages/profile/NotificationHistory'));
const UserManagement = lazy(() => import('./pages/adminUsermanagement/UserManagement'));

// Platform Admin Pages
const PlatformTutors = lazy(() => import('./pages/Admins/Platform_Admin/PlatformTutors'));
const PlatformInstitutions = lazy(() => import('./pages/Admins/Platform_Admin/PlatformInstitutions'));
const PlatformCourses = lazy(() => import('./pages/Admins/Platform_Admin/PlatformCourses'));
const PlatformAnalytics = lazy(() => import('./pages/Admins/Platform_Admin/PlatformAnalytics'));
const PlatformRevenue = lazy(() => import('./pages/Admins/Platform_Admin/PlatformRevenue'));
const PlatformSettings = lazy(() => import('./pages/Admins/Platform_Admin/PlatformSettings'));
const PlatformRefunds = lazy(() => import('./pages/Admins/Platform_Admin/PlatformRefunds'));
const PlatformCertificates = lazy(() => import('./pages/Admins/Platform_Admin/PlatformCertificates'));
const PlatformPlaceholder = lazy(() => import('./pages/Admins/Platform_Admin/PlatformPlaceholder'));
const DiscussionModeration = lazy(() => import('./pages/Admins/Platform_Admin/DiscussionModeration'));

// Support System Pages
const TicketList = lazy(() => import('./components/support/TicketList'));
const CreateTicket = lazy(() => import('./components/support/CreateTicket'));
const TicketDetail = lazy(() => import('./components/support/TicketDetail'));
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
import { 
  Layers, ClipboardList, Wallet, FileText, 
  MessageSquare, Megaphone, Monitor, Award
} from 'lucide-react';

// Module 03 Lazy Imports
const CoursePlayer = lazy(() => import('./pages/learner/CoursePlayer'));
const PreviewPlayer = lazy(() => import('./pages/learner/PreviewPlayer'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider>
          <Toaster 
            position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '14px',
              fontWeight: '500',
              padding: '16px 24px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
          }}
        />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Authentication Routes - Unified login */}
          <Route path="/verify/:certificateNumber" element={<VerifyCertificate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/learner-login" element={<Navigate to="/login" replace />} />
          <Route path="/tutor-login" element={<Navigate to="/login" replace />} />
          <Route path="/admin-login" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<AccountNotice type="verify-email" />} />
          <Route path="/pending-approval" element={<AccountNotice type="pending-approval" />} />
          <Route path="/tutor-rejected" element={<AccountNotice type="tutor-rejected" />} />
          <Route path="/tutor-approval" element={
            <ProtectedRoute
              element={<TutorApprovalProfile />}
              allowedRoles={['tutor']}
              redirectTo="/login"
              requiredStatus={null}
            />
          } />
          <Route path="/account-suspended" element={<AccountNotice type="account-suspended" />} />
          <Route path="/unauthorized" element={<AccountNotice type="unauthorized" />} />
          <Route path="/institution-setup-required" element={<AccountNotice type="institution-setup-required" />} />
          
          {/* Learner Portal with Layout and Outlet */}
          {/* Learner Portal - Mixed Public/Private */}
          <Route path="/learner-dashboard" element={<LearnerLayout />}>
            {/* Publicly Accessible Pages */}
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="catalogue/:id" element={<CourseDetail />} />
            <Route path="catalogue/:courseId/preview/:lessonId" element={
              <Suspense fallback={<PageLoader />}>
                <PreviewPlayer />
              </Suspense>
            } />

            {/* Protected Pages */}
            <Route index element={
              <ProtectedRoute 
                element={<LearnerDashboard />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="learning" element={
              <ProtectedRoute 
                element={<MyLearning />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="assignments" element={
              <ProtectedRoute 
                element={<Assignments />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="notes" element={
              <ProtectedRoute 
                element={<Notes />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="certificates" element={
              <ProtectedRoute 
                element={<Certificates />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
             <Route path="settings" element={
              <ProtectedRoute 
                element={<LearnerSettings />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="notifications" element={
              <ProtectedRoute 
                element={<NotificationHistory />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="wishlist" element={
              <ProtectedRoute 
                element={<Wishlist />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="live-sessions" element={
              <ProtectedRoute
                element={<UpcomingLiveSessions />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="support" element={
              <ProtectedRoute 
                element={<TicketList basePath="/learner-dashboard/support" />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="support/new" element={
              <ProtectedRoute 
                element={<CreateTicket basePath="/learner-dashboard/support" />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="support/:id" element={
              <ProtectedRoute 
                element={<TicketDetail basePath="/learner-dashboard/support" />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="live-sessions/:sessionId" element={
              <ProtectedRoute
                element={<LiveSessionJoin />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="payment/:courseId" element={
              <ProtectedRoute
                element={<PaymentScreen />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="payment-success/:orderId" element={
              <ProtectedRoute
                element={<PaymentSuccess />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="payment-failure/:courseId" element={
              <ProtectedRoute
                element={<PaymentFailure />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="payment-history" element={
              <ProtectedRoute
                element={<PaymentHistory />}
                allowedRoles={['learner']}
                redirectTo="/login"
              />
            } />
            <Route path="join-institution" element={<Navigate to="/dashboard" replace />} />
            <Route path="player/:courseId/:lessonId" element={
              <ProtectedRoute 
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CoursePlayer />
                  </Suspense>
                }
                allowedRoles={['learner', 'tutor']}
                redirectTo="/login"
              />
            } />
          </Route>
          
          {/* Tutor Portal with Layout and Outlet */}
          <Route 
            path="/tutor-dashboard" 
            element={
              <ProtectedRoute 
                element={<TutorLayout />}
                allowedRoles={['tutor']}
                redirectTo="/login"
              />
            }
          >
            <Route index element={<TutorDashboard />} />
            <Route path="courses" element={<TutorCourses />} />
            <Route path="courses/new" element={<CourseEditor />} />
            <Route path="courses/edit/:id" element={<CourseEditor />} />
            <Route path="live-sessions/schedule" element={<ScheduleLiveClass />} />
            <Route path="live-sessions/manage" element={<ManageSessions />} />
            <Route path="grade-centre" element={<GradeCentre />} />
            <Route path="discussions" element={<TutorDiscussions />} />
            <Route path="discussions/:courseId/:lessonId" element={<TutorDiscussionPlayer />} />
            <Route path="students" element={<TutorStudents />} />
            <Route path="analytics" element={<TutorAnalytics />} />
            <Route path="earnings" element={<TutorEarnings />} />
            <Route path="reviews" element={<TutorReviews />} />
            <Route path="messages" element={<TutorMessages />} />
            <Route path="settings" element={<TutorSettings />} />
            <Route path="support" element={<TicketList basePath="/tutor-dashboard/support" />} />
            <Route path="support/new" element={<CreateTicket basePath="/tutor-dashboard/support" />} />
            <Route path="support/:id" element={<TicketDetail basePath="/tutor-dashboard/support" />} />
            <Route path="attendance" element={<TutorAttendance />} />
            <Route path="join-institution" element={<Navigate to="/dashboard" replace />} />
            <Route path="notifications" element={<NotificationHistory />} />
          </Route>
          
          {/* Institutional Admin Portal with Layout and Outlet */}
          <Route 
            path="/ins-admin" 
            element={
              <ProtectedRoute 
                element={<InsAdminLayout />}
                allowedRoles={['admin', 'super_admin', 'institution_admin']}
                redirectTo="/login"
              />
            } 
          >
            <Route index element={<InsAdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="batches" element={<InsAdminBatches />} />
            <Route path="courses" element={<InsAdminCourses />} />
            <Route path="bulk-enrollment" element={<InsAdminBulkEnrollment />} />
            <Route path="transactions" element={<InsAdminTransactions />} />
            <Route path="revenue" element={<InsAdminRevenue />} />
            <Route path="reports" element={<InsAdminReports />} />
            <Route path="logs" element={<InsAdminLogs />} />
            <Route path="settings" element={<InsAdminSettings />} />
            <Route path="tutor-assignments" element={<InsAdminTutorAssignments />} />
            <Route path="discussion-moderation" element={<DiscussionModeration />} />
            <Route path="attendance" element={<TutorAttendance />} />
            <Route path="notifications" element={<NotificationHistory />} />
            <Route path="certificates" element={<InsAdminCertificates />} />
            <Route path="support" element={<TicketList basePath="/ins-admin/support" />} />
            <Route path="support/new" element={<CreateTicket basePath="/ins-admin/support" />} />
            <Route path="support/:id" element={<TicketDetail basePath="/ins-admin/support" />} />
            <Route path="certificates/create" element={<CertificateTemplateEditor mode="institution" />} />
            <Route path="certificates/edit/:id" element={<CertificateTemplateEditor mode="institution" />} />
          </Route>

          {/* Platform Admin Portal with Layout and Outlet */}
          <Route 
            path="/platform-admin" 
            element={
              <ProtectedRoute 
                element={<PlatformAdminLayout />}
                allowedRoles={['platform_owner', 'super_admin', 'platform_admin']}
                redirectTo="/login"
              />
            } 
          >
            <Route index element={<PlatformDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="tutors" element={<PlatformTutors />} />
            <Route path="institutions" element={<PlatformInstitutions />} />
            <Route path="courses" element={<PlatformCourses />} />
            <Route path="categories" element={<PlatformPlaceholder title="Categories" icon={Layers} />} />
            <Route path="enrollments" element={<PlatformPlaceholder title="Enrollments" icon={ClipboardList} />} />
            <Route path="analytics" element={<PlatformAnalytics />} />
            <Route path="revenue" element={<PlatformRevenue />} />
            <Route path="refunds" element={<PlatformRefunds />} />
            <Route path="certificates" element={<PlatformCertificates />} />
            <Route path="certificates/create" element={<CertificateTemplateEditor mode="platform" />} />
            <Route path="certificates/edit/:id" element={<CertificateTemplateEditor mode="platform" />} />
            <Route path="reports" element={<PlatformPlaceholder title="Reports" icon={FileText} />} />
            <Route path="support" element={<TicketList basePath="/platform-admin/support" />} />
            <Route path="support/new" element={<CreateTicket basePath="/platform-admin/support" />} />
            <Route path="support/:id" element={<TicketDetail basePath="/platform-admin/support" />} />
            <Route path="announcements" element={<PlatformPlaceholder title="Announcements" icon={Megaphone} />} />
            <Route path="settings" element={<PlatformSettings />} />
            <Route path="logs" element={<PlatformPlaceholder title="System Logs" icon={Monitor} />} />
            <Route path="notifications" element={<NotificationHistory />} />
          </Route>

          {/* Backward compatibility redirects */}
          <Route path="/admin-dashboard" element={<Navigate to="/ins-admin" replace />} />
          <Route path="/platform-dashboard" element={<Navigate to="/platform-admin" replace />} />
          <Route path="/tutor/settings" element={<TutorSettingsRedirect />} />
          
          {/* Generic Dashboard Route - Redirects based on role */}
          <Route 
            path="/dashboard" 
            element={<DashboardRouter />}
          />
          
          {/* Feature Routes */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute 
                element={<Profile />}
                allowedRoles={['learner', 'tutor', 'admin', 'institution_admin', 'platform_admin', 'super_admin', 'platform_owner']}
                redirectTo="/login"
              />
            } 
          />
          
          <Route path="/admin/users" element={<Navigate to="/platform-admin/users" replace />} />
          
          {/* Fallback - 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

/**
 * DashboardRouter Component - Redirects to appropriate dashboard based on user role
 */
function DashboardRouter() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading Dashboard</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to={getDashboardPath(user)} replace />;
}

function TutorSettingsRedirect() {
  const location = useLocation();
  return <Navigate to={`/tutor-dashboard/settings${location.search}`} replace />;
}

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FullPageLoader } from '../components/ui/Loader';
import AdminLayout from '../layouts/AdminLayout';
import PublicLayout from '../layouts/PublicLayout';
import RecruiterLayout from '../layouts/RecruiterLayout';
import UserLayout from '../layouts/UserLayout';
import { ROLES } from '../utils/constants';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import RoleRoute from './RoleRoute';

const lazyPage = (loader) => lazy(loader);

// Public
const Home = lazyPage(() => import('../pages/public/Home'));
const About = lazyPage(() => import('../pages/public/About'));
const NotFound = lazyPage(() => import('../pages/public/NotFound'));
const Unauthorized = lazyPage(() => import('../pages/public/Unauthorized'));

// Auth
const Login = lazyPage(() => import('../pages/auth/Login'));
const Register = lazyPage(() => import('../pages/auth/Register'));
const ForgotPassword = lazyPage(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazyPage(() => import('../pages/auth/ResetPassword'));

// User
const UserDashboard = lazyPage(() => import('../pages/user/Dashboard'));
const Profile = lazyPage(() => import('../pages/user/Profile'));
const EditProfile = lazyPage(() => import('../pages/user/EditProfile'));
const Resume = lazyPage(() => import('../pages/user/Resume'));
const Skills = lazyPage(() => import('../pages/user/Skills'));
const Jobs = lazyPage(() => import('../pages/user/Jobs'));
const JobDetails = lazyPage(() => import('../pages/user/JobDetails'));
const SavedJobs = lazyPage(() => import('../pages/user/SavedJobs'));
const Applications = lazyPage(() => import('../pages/user/Applications'));
const ApplicationDetails = lazyPage(() => import('../pages/user/ApplicationDetails'));
const Interviews = lazyPage(() => import('../pages/user/Interviews'));
const Videos = lazyPage(() => import('../pages/user/Videos'));
const Messages = lazyPage(() => import('../pages/user/Messages'));
const Notifications = lazyPage(() => import('../pages/user/Notifications'));

// Recruiter
const RecruiterDashboard = lazyPage(() => import('../pages/recruiter/Dashboard'));
const RecruiterCompany = lazyPage(() => import('../pages/recruiter/Company'));
const RecruiterJobs = lazyPage(() => import('../pages/recruiter/Jobs'));
const RecruiterCreateJob = lazyPage(() => import('../pages/recruiter/CreateJob'));
const RecruiterEditJob = lazyPage(() => import('../pages/recruiter/EditJob'));
const RecruiterApplications = lazyPage(() => import('../pages/recruiter/Applications'));
const RecruiterInterviews = lazyPage(() => import('../pages/recruiter/Interviews'));

// Admin
const AdminDashboard = lazyPage(() => import('../pages/admin/Dashboard'));
const AdminUsers = lazyPage(() => import('../pages/admin/Users'));
const AdminRecruiters = lazyPage(() => import('../pages/admin/Recruiters'));
const AdminJobs = lazyPage(() => import('../pages/admin/Jobs'));
const AdminReports = lazyPage(() => import('../pages/admin/Reports'));
const AdminSettings = lazyPage(() => import('../pages/admin/Settings'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        {/* Open to everyone */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Guests only */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          {/* Job seeker */}
          <Route element={<RoleRoute allowedRoles={[ROLES.USER]} />}>
            <Route element={<UserLayout />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/saved-jobs" element={<SavedJobs />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/applications/:id" element={<ApplicationDetails />} />
              <Route path="/interviews" element={<Interviews />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
          </Route>

          {/* Recruiter */}
          <Route element={<RoleRoute allowedRoles={[ROLES.RECRUITER]} />}>
            <Route element={<RecruiterLayout />}>
              <Route path="/recruiter" element={<Navigate to="/recruiter/dashboard" replace />} />
              <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
              <Route path="/recruiter/company" element={<RecruiterCompany />} />
              <Route path="/recruiter/jobs" element={<RecruiterJobs />} />
              <Route path="/recruiter/jobs/create" element={<RecruiterCreateJob />} />
              <Route path="/recruiter/jobs/:id/edit" element={<RecruiterEditJob />} />
              <Route path="/recruiter/applications" element={<RecruiterApplications />} />
              <Route path="/recruiter/interviews" element={<RecruiterInterviews />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/recruiters" element={<AdminRecruiters />} />
              <Route path="/admin/jobs" element={<AdminJobs />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

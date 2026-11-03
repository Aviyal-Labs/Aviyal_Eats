import { createElement } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import OwnerLayout from '../layouts/OwnerLayout';
import AdminLayout from '../layouts/AdminLayout';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedRoute from '../routes/ProtectedRoute';
import RoleRoute from '../routes/RoleRoute';
import ApprovalGate from '../routes/ApprovalGate';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import OwnerDashboardPage from '../pages/owner/OwnerDashboardPage';
import PendingApprovalPage from '../pages/owner/PendingApprovalPage';
import RejectedRestaurantPage from '../pages/owner/RejectedRestaurantPage';
import EditRejectedRestaurantPage from '../pages/owner/EditRejectedRestaurantPage';
import OwnerProfilePage from '../pages/owner/OwnerProfilePage';
import OwnerSettingsPage from '../pages/owner/OwnerSettingsPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import PendingRestaurantsPage from '../pages/admin/PendingRestaurantsPage';
import AllRestaurantsPage from '../pages/admin/AllRestaurantsPage';
import RestaurantDetailsPage from '../pages/admin/RestaurantDetailsPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';
import LoadingPage from '../pages/system/LoadingPage';
import ForbiddenPage from '../pages/system/ForbiddenPage';
import NotFoundPage from '../pages/system/NotFoundPage';

const element = (Component, props, ...children) => createElement(Component, props, ...children);
const Providers = () => element(AuthProvider, null, element(Outlet));

export const router = createBrowserRouter([
  { element: element(Providers), children: [
    { element: element(AuthLayout), children: [
      { path: '/login', element: element(LoginPage) },
      { path: '/register', element: element(RegisterPage) },
      { path: '/verify-email', element: element(VerifyEmailPage) },
      { path: '/forgot-password', element: element(ForgotPasswordPage) },
      { path: '/reset-password', element: element(ResetPasswordPage) },
    ] },
    { element: element(ProtectedRoute, null, element(RoleRoute, { role: 'OWNER' }, element(OwnerLayout))), children: [
      { path: '/owner', element: element(Navigate, { to: '/owner/dashboard', replace: true }) },
      { path: '/owner/dashboard', element: element(ApprovalGate, { allowed: ['APPROVED'] }, element(OwnerDashboardPage)) },
      { path: '/owner/pending', element: element(ApprovalGate, { allowed: ['PENDING'] }, element(PendingApprovalPage)) },
      { path: '/owner/rejected', element: element(ApprovalGate, { allowed: ['REJECTED'] }, element(RejectedRestaurantPage)) },
      { path: '/owner/restaurant/edit', element: element(ApprovalGate, { allowed: ['REJECTED'] }, element(EditRejectedRestaurantPage)) },
      { path: '/owner/profile', element: element(OwnerProfilePage) },
      { path: '/owner/settings', element: element(OwnerSettingsPage) },
    ] },
    { element: element(ProtectedRoute, null, element(RoleRoute, { role: 'SUPER_ADMIN' }, element(AdminLayout))), children: [
      { path: '/admin', element: element(AdminDashboardPage) },
      { path: '/admin/restaurants/pending', element: element(PendingRestaurantsPage) },
      { path: '/admin/restaurants', element: element(AllRestaurantsPage) },
      { path: '/admin/restaurants/:id', element: element(RestaurantDetailsPage) },
      { path: '/admin/restaurants/', element: element(AllRestaurantsPage) },
      { path: '/admin/settings', element: element(AdminSettingsPage) },
    ] },
    { path: '/loading', element: element(LoadingPage) },
    { path: '/forbidden', element: element(ForbiddenPage) },
    { path: '*', element: element(NotFoundPage) },
  ] },
]);

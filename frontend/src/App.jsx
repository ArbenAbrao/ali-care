import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loading from './components/Loading';

const Landing = lazy(() => import('./pages/Landing'));
const EmployeeReport = lazy(() => import('./pages/EmployeeReport'));
const Login = lazy(() => import('./pages/Login'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Employees = lazy(() => import('./pages/Employees'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/report/:token" element={<EmployeeReport />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="complaints" element={<Complaints />} />
          <Route path="employees" element={<Employees />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
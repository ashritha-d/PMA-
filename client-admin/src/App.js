import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLayout from './components/AdminLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Properties = lazy(() => import('./pages/Properties'));
const PropertyForm = lazy(() => import('./pages/PropertyForm'));
const Categories = lazy(() => import('./pages/Categories'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Payments = lazy(() => import('./pages/Payments'));
const Users = lazy(() => import('./pages/Users'));
const Inquiries = lazy(() => import('./pages/Inquiries'));
const Reviews = lazy(() => import('./pages/Reviews'));
const CMS = lazy(() => import('./pages/CMS'));
const Reports = lazy(() => import('./pages/Reports'));

const Loading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <div className="spinner" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAdminAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/properties" element={<Properties />} />
                    <Route path="/properties/new" element={<PropertyForm />} />
                    <Route path="/properties/edit/:id" element={<PropertyForm />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/inquiries" element={<Inquiries />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/cms" element={<CMS />} />
                    <Route path="/reports" element={<Reports />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' } }} />
      </BrowserRouter>
    </AdminAuthProvider>
  );
}

export default App;

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import DoctorList from './pages/DoctorList';
import DoctorProfile from './pages/DoctorProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Patient Pages
import PatientDashboard from './pages/PatientDashboard';
import MyAppointments from './pages/MyAppointments';
import HealthProfile from './pages/HealthProfile';

// Shared Consultation Room
import AppointmentDetail from './pages/AppointmentDetail';

// Doctor Pages
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorSchedule from './pages/DoctorSchedule';
import DoctorAppointments from './pages/DoctorAppointments';
import WritePrescription from './pages/WritePrescription';

// Admin Pages
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<DoctorList />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Shared Consultation Detail & Chat */}
          <Route
            path="/appointments/:id"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                <AppointmentDetail />
              </ProtectedRoute>
            }
          />

          {/* Patient Routes */}
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/health-profile"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <HealthProfile />
              </ProtectedRoute>
            }
          />

          {/* Doctor Routes */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/schedule"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/appointments"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/prescriptions/new"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <WritePrescription />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>MediConnect © 2026 Doctor Appointment & Consultation Platform</span>
          <span className="text-[11px] text-teal-600 font-medium">
            Computed Timetables • Zero Overlap • Allergy-Checked Prescriptions
          </span>
        </div>
      </footer>

      {/* Toast Notifications Provider */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
          }
        }}
      />
    </div>
  );
}

export default App;


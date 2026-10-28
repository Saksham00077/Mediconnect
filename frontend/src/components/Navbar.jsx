import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  HeartPulse,
  User,
  Calendar,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Stethoscope,
  Activity,
  FileSpreadsheet
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent">
                MediConnect
              </span>
              <span className="hidden sm:inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700 rounded-md">
                Healthcare
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5">
            <Link
              to="/doctors"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/doctors')
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
              }`}
            >
              Find Doctors
            </Link>

            {/* Patient Links */}
            {isAuthenticated && user?.role === 'patient' && (
              <>
                <Link
                  to="/patient/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/patient/dashboard')
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/patient/appointments"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/patient/appointments')
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`}
                >
                  My Appointments
                </Link>
                <Link
                  to="/patient/health-profile"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/patient/health-profile')
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`}
                >
                  Health Profile
                </Link>
              </>
            )}

            {/* Doctor Links */}
            {isAuthenticated && user?.role === 'doctor' && (
              <>
                <Link
                  to="/doctor/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/doctor/dashboard')
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`}
                >
                  Doctor Console
                </Link>
                <Link
                  to="/doctor/appointments"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/doctor/appointments')
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`}
                >
                  Appointments
                </Link>
                <Link
                  to="/doctor/schedule"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/doctor/schedule')
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:text-teal-600 hover:bg-slate-50'
                  }`}
                >
                  Schedule & Leaves
                </Link>
              </>
            )}

            {/* Admin Links */}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  isActive('/admin')
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" /> Admin Panel
              </Link>
            )}
          </div>

          {/* Right Action Items */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                <NotificationBell />

                <div className="h-6 w-px bg-slate-200" />

                <div className="flex items-center gap-2 pl-1">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center border border-teal-200">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-none">
                      {user.name}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-1"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/20 transition-all hover:scale-[1.02]"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center md:hidden gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">
          <Link
            to="/doctors"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Find Doctors
          </Link>

          {isAuthenticated ? (
            <>
              {user.role === 'patient' && (
                <>
                  <Link
                    to="/patient/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/patient/appointments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    My Appointments
                  </Link>
                  <Link
                    to="/patient/health-profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Health Profile
                  </Link>
                </>
              )}

              {user.role === 'doctor' && (
                <>
                  <Link
                    to="/doctor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Doctor Console
                  </Link>
                  <Link
                    to="/doctor/appointments"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Appointments
                  </Link>
                  <Link
                    to="/doctor/schedule"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Schedule & Leaves
                  </Link>
                </>
              )}

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-semibold text-purple-700 hover:bg-purple-50"
                >
                  Admin Panel
                </Link>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2 text-center text-sm font-semibold text-white bg-teal-600 rounded-xl"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;


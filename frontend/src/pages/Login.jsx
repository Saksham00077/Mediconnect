import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Lock, Mail, ArrowRight, Sparkles, UserCheck, Stethoscope, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      if (from) {
        navigate(from, { replace: true });
      } else if (data.user.role === 'doctor') {
        navigate('/doctor/dashboard', { replace: true });
      } else if (data.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/patient/dashboard', { replace: true });
      }
    } catch (err) {
      // Handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = async (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Password@123');
    setLoading(true);
    try {
      const data = await login(demoEmail, 'Password@123');
      if (data.user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/patient/dashboard');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/20 mb-3">
          <HeartPulse className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to MediConnect
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Sign in to manage appointments, consultations, and prescriptions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
          {/* Demo Quick-Fill Bar */}
          <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>One-Click Demo Logins (Password@123)</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoFill('patient1@demo.com', 'patient')}
                className="px-2 py-1.5 text-[11px] font-bold text-teal-800 bg-white hover:bg-teal-600 hover:text-white rounded-lg border border-teal-200 transition-all flex items-center justify-center gap-1"
              >
                <UserCheck className="w-3 h-3" /> Patient
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('doctor1@demo.com', 'doctor')}
                className="px-2 py-1.5 text-[11px] font-bold text-teal-800 bg-white hover:bg-teal-600 hover:text-white rounded-lg border border-teal-200 transition-all flex items-center justify-center gap-1"
              >
                <Stethoscope className="w-3 h-3" /> Doctor
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('admin@demo.com', 'admin')}
                className="px-2 py-1.5 text-[11px] font-bold text-purple-800 bg-white hover:bg-purple-600 hover:text-white rounded-lg border border-purple-200 transition-all flex items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" /> Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-teal-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? 'Signing In...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


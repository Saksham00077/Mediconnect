import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Calendar,
  Clock,
  HeartPulse,
  MessageSquare,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { DateTime } from 'luxon';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';

const PatientDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [aptRes, rxRes, profileRes] = await Promise.all([
          api.get('/appointments'),
          api.get('/prescriptions'),
          api.get('/patient/profile')
        ]);
        setAppointments(aptRes.data.appointments || []);
        setPrescriptions(rxRes.data.prescriptions || []);
        setProfile(profileRes.data || null);
      } catch (err) {
        console.error('Error loading patient dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading your health portal..." size="large" />
      </div>
    );
  }

  // Filter next upcoming booked appointment
  const now = new Date();
  const upcomingApts = appointments
    .filter((a) => a.status === 'booked' && new Date(a.startAt) >= now)
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  const nextAppointment = upcomingApts[0] || null;
  const completedApts = appointments.filter((a) => a.status === 'completed');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-500 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-teal-700/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
              Patient Health Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">Hello, {user.name}!</h1>
            <p className="text-xs sm:text-sm text-teal-100 mt-1">
              Manage your upcoming doctor visits, chat with your specialists, and review medical prescriptions.
            </p>
          </div>

          <Link
            to="/doctors"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-teal-800 hover:bg-teal-50 font-bold text-xs rounded-xl shadow-sm transition-all hover:scale-[1.02] shrink-0"
          >
            <Stethoscope className="w-4 h-4 text-teal-600" /> Book New Appointment
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900">{upcomingApts.length}</span>
            <span className="text-xs text-slate-500 block">Upcoming Consultations</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900">{prescriptions.length}</span>
            <span className="text-xs text-slate-500 block">Active Prescriptions</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900">{completedApts.length}</span>
            <span className="text-xs text-slate-500 block">Past Consultations</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Next Appointment & Quick Health Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Next Appointment Card (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your Next Scheduled Visit</h2>
            <Link
              to="/patient/appointments"
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              All Appointments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {nextAppointment ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-extrabold flex items-center justify-center border border-teal-100">
                    {nextAppointment.doctor?.user?.name
                      ? nextAppointment.doctor.user.name[0].toUpperCase()
                      : 'D'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {nextAppointment.doctor?.user?.name || 'Dr. Specialist'}
                    </h3>
                    <p className="text-xs text-teal-600 font-semibold">
                      {nextAppointment.doctor?.specialisation} • {nextAppointment.doctor?.city}
                    </p>
                  </div>
                </div>
                <StatusBadge status={nextAppointment.status} />
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border border-slate-100">
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="font-semibold">
                    {DateTime.fromISO(nextAppointment.startAt).toFormat('cccc, dd LLL yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    {DateTime.fromISO(nextAppointment.startAt).toFormat('hh:mm a')} -{' '}
                    {DateTime.fromISO(nextAppointment.endAt).toFormat('hh:mm a')}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-700 block mb-0.5">Reason for Visit:</span>
                <p className="italic bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                  "{nextAppointment.reason}"
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Fee: ₹{nextAppointment.fee} (pay at clinic)
                </span>
                <Link
                  to={`/appointments/${nextAppointment._id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> View Chat & Details
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">No upcoming appointments</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Need medical consultation? Browse top verified doctors and book an in-person time slot in seconds.
              </p>
              <Link
                to="/doctors"
                className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl"
              >
                Find Doctors
              </Link>
            </div>
          )}
        </div>

        {/* Health Profile Widget (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Health Profile Summary</h2>
            <Link
              to="/patient/health-profile"
              className="text-xs font-bold text-teal-600 hover:text-teal-700"
            >
              Edit
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {profile?.bloodGroup || 'Unknown'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Age</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {profile?.age ? `${profile.age} yrs` : 'Not specified'}
                </span>
              </div>
            </div>

            {/* Allergies list */}
            <div>
              <span className="text-slate-500 font-bold block mb-1">Recorded Allergies:</span>
              {profile?.allergies && profile.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded-md border border-rose-200 text-[11px]"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">No allergies recorded</p>
              )}
            </div>

            {/* Chronic conditions */}
            <div>
              <span className="text-slate-500 font-bold block mb-1">Chronic Conditions:</span>
              {profile?.chronicConditions && profile.chronicConditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.chronicConditions.map((cond, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-amber-50 text-amber-800 font-semibold rounded-md border border-amber-200 text-[11px]"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">No chronic conditions recorded</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                to="/patient/health-profile"
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-center font-bold text-slate-700 flex items-center justify-center gap-1"
              >
                Update Health Profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;


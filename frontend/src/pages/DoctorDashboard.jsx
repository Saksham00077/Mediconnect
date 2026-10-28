import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Calendar,
  Clock,
  User,
  Star,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { DateTime } from 'luxon';
import Loader from '../components/Loader';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const DoctorDashboard = () => {
  const { user, doctorProfile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = DateTime.now().toISODate();

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [sumRes, schedRes] = await Promise.all([
        api.get('/doctors/me/summary'),
        api.get(`/doctors/me/schedule?date=${todayStr}`)
      ]);
      setSummary(sumRes.data);
      setTodaySchedule(schedRes.data.slots || []);
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleComplete = async (aptId) => {
    try {
      await api.patch(`/appointments/${aptId}/complete`);
      toast.success('Appointment marked as completed');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete appointment');
    }
  };

  const handleNoShow = async (aptId) => {
    try {
      await api.patch(`/appointments/${aptId}/no-show`);
      toast.success('Appointment marked as no-show');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark as no-show');
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading clinician console..." size="large" />
      </div>
    );
  }

  // Filter slots that have booked appointments
  const bookedSlotsToday = todaySchedule.filter((s) => s.appointment);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Approval Status Alert Banner */}
      {doctorProfile && !doctorProfile.isApproved && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <span className="font-bold block text-sm">Account Awaiting Admin Approval</span>
            Your medical profile is currently under review by our administrator. While pending, patients cannot view your slots on the public directory. You can configure your timetable and leaves below.
          </div>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-teal-900/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
              Doctor Management Console
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">Dr. {user.name}</h1>
            <p className="text-xs sm:text-sm text-teal-100 mt-1">
              {doctorProfile?.specialisation} • Reg #{doctorProfile?.regNumber} • {DateTime.now().toFormat('cccc, dd LLL yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/doctor/schedule"
              className="px-4 py-2 bg-white text-teal-800 hover:bg-teal-50 font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Configure Schedule
            </Link>
            <Link
              to="/doctor/appointments"
              className="px-4 py-2 bg-teal-900/60 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition-colors"
            >
              All Appointments
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Today's Visits</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary?.todayCount || 0}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Upcoming Visits</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary?.upcomingCount || 0}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Completed Total</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary?.completedCount || 0}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Unique Patients</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary?.totalUniquePatients || 0}
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Rating</span>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-xl font-black text-slate-900">
                {summary?.rating?.avg > 0 ? summary.rating.avg.toFixed(1) : 'New'}
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            ({summary?.rating?.count || 0} reviews)
          </span>
        </div>
      </div>

      {/* Today's Schedule Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Today's Consultations Timeline</h2>
            <p className="text-xs text-slate-500">
              {DateTime.now().toFormat('cccc, dd LLL yyyy')} • {bookedSlotsToday.length} appointment(s)
            </p>
          </div>

          <Link
            to="/doctor/appointments"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            Full Appointment List <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {bookedSlotsToday.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-2">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">No booked consultations for today</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your timetable has slots available or today is a day off. Check upcoming days or configure your timetable builder.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs divide-y divide-slate-100">
            {bookedSlotsToday.map((slot) => {
              const apt = slot.appointment;
              const startDt = DateTime.fromISO(slot.startAt);
              const endDt = DateTime.fromISO(slot.endAt);

              return (
                <div
                  key={slot.startAt}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="px-3 py-2 bg-teal-50 border border-teal-100 rounded-xl text-center shrink-0">
                      <span className="text-xs font-black text-teal-800 block">
                        {startDt.toFormat('hh:mm a')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {endDt.toFormat('hh:mm a')}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">
                          {apt.patient?.name || 'Patient'}
                        </h4>
                        <StatusBadge status={apt.status} />
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Phone: {apt.patient?.phone || 'N/A'} • Reason: "{apt.reason}"
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      to={`/appointments/${apt.id}`}
                      className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Room
                    </Link>

                    {apt.status === 'booked' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleComplete(apt.id)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNoShow(apt.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
                        >
                          No-Show
                        </button>
                      </>
                    )}

                    {apt.status === 'completed' && (
                      <Link
                        to={`/doctor/prescriptions/new?appointmentId=${apt.id}`}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> Rx
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDashboard;


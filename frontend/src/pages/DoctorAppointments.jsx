import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  Search,
  Filter,
  FileText,
  MessageSquare,
  ShieldAlert,
  X,
  Phone,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { DateTime } from 'luxon';
import api from '../api/axios';
import AppointmentCard from '../components/AppointmentCard';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Cancel action state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Patient health summary panel/modal state
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientHealthData, setPatientHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (dateFilter) {
        const timezone = 'Asia/Kolkata';
        const start = DateTime.fromISO(dateFilter, { zone: timezone }).startOf('day').toJSDate().toISOString();
        const end = DateTime.fromISO(dateFilter, { zone: timezone }).endOf('day').toJSDate().toISOString();
        params.append('from', start);
        params.append('to', end);
      }

      const { data } = await api.get(`/appointments?${params.toString()}`);
      setAppointments(data.appointments || []);
    } catch (err) {
      toast.error('Failed to load doctor appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  const handleComplete = async (apt) => {
    try {
      await api.patch(`/appointments/${apt._id}/complete`);
      toast.success('Consultation marked as completed');
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete appointment');
    }
  };

  const handleNoShow = async (apt) => {
    try {
      await api.patch(`/appointments/${apt._id}/no-show`);
      toast.success('Marked as no-show');
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark no-show');
    }
  };

  const handleOpenCancel = (apt) => {
    setCancelTarget(apt);
    setCancelReason('');
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error('Doctor cancellation requires a valid reason');
      return;
    }

    setCancelLoading(true);
    try {
      await api.patch(`/appointments/${cancelTarget._id}/cancel`, {
        reason: cancelReason.trim()
      });
      toast.success('Appointment cancelled. Patient has been notified.');
      setCancelTarget(null);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleViewPatientProfile = async (patientId) => {
    setSelectedPatientId(patientId);
    setLoadingHealth(true);
    try {
      const { data } = await api.get(`/patient/${patientId}/profile`);
      setPatientHealthData(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load patient health profile');
      setSelectedPatientId(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Consultations Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your patient appointments, view medical profiles, and issue digital prescriptions
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-Show</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none"
          />

          {(statusFilter || dateFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFilter('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="py-24">
          <Loader message="Loading consultation directory..." size="large" />
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No appointments found"
          description="No consultations match the selected status or date filters."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((apt) => (
            <div key={apt._id} className="relative group">
              <AppointmentCard
                appointment={apt}
                role="doctor"
                onComplete={handleComplete}
                onNoShow={handleNoShow}
                onCancel={handleOpenCancel}
              />
              <button
                type="button"
                onClick={() => handleViewPatientProfile(apt.patient?._id || apt.patient)}
                className="mt-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 px-1"
              >
                <Activity className="w-3 h-3" /> View Patient Health Summary
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Patient Health Summary Side Panel / Modal */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" /> Patient Medical Profile
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPatientId(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingHealth ? (
              <div className="py-12">
                <Loader message="Fetching verified patient records..." size="small" />
              </div>
            ) : patientHealthData ? (
              <div className="space-y-4 text-xs">
                {/* Basic Demographics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Age</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {patientHealthData.age ? `${patientHealthData.age} yrs` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Gender</span>
                    <span className="font-bold text-slate-900 text-sm capitalize">
                      {patientHealthData.gender?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Blood Group</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {patientHealthData.bloodGroup || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* CRITICAL: Allergies */}
                <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Recorded Patient Allergies:</span>
                  </div>
                  {patientHealthData.allergies && patientHealthData.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {patientHealthData.allergies.map((allergy, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-white text-rose-700 font-bold rounded-lg border border-rose-300 text-xs shadow-xs"
                        >
                          ⚠️ {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">No known drug or food allergies</p>
                  )}
                </div>

                {/* Chronic Conditions */}
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Chronic Conditions:</span>
                  {patientHealthData.chronicConditions && patientHealthData.chronicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patientHealthData.chronicConditions.map((cond, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-amber-50 text-amber-800 font-semibold rounded-md border border-amber-200"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">None reported</p>
                  )}
                </div>

                {/* Emergency Contact */}
                {patientHealthData.emergencyContact?.name && (
                  <div className="pt-2 border-t border-slate-100 text-slate-600">
                    <span className="font-bold text-slate-700 block mb-0.5">Emergency Contact:</span>
                    <span>
                      {patientHealthData.emergencyContact.name} (
                      {patientHealthData.emergencyContact.relation || 'Contact'}) •{' '}
                      {patientHealthData.emergencyContact.phone}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Doctor Cancel Modal (Reason strictly required) */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Cancel Consultation
              </h3>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Cancel appointment for{' '}
              <span className="font-bold text-slate-900">{cancelTarget.patient?.name}</span>{' '}
              on {DateTime.fromISO(cancelTarget.startAt).toFormat('dd LLL yyyy, hh:mm a')}?
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Cancellation * (Mandatory for doctors)
                </label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Doctor called in for emergency surgical procedure..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;


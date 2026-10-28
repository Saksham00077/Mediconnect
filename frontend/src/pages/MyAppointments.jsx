import React, { useState, useEffect } from 'react';
import { Calendar, Clock, RotateCcw, XCircle, AlertCircle, X } from 'lucide-react';
import api from '../api/axios';
import AppointmentCard from '../components/AppointmentCard';
import SlotPicker from '../components/SlotPicker';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';
import { DateTime } from 'luxon';

const MyAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'cancelled'

  // Modals state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newSelectedSlot, setNewSelectedSlot] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data.appointments || []);
    } catch (err) {
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Filter appointments according to tabs
  const now = new Date();
  const upcomingList = appointments.filter(
    (a) => a.status === 'booked' && new Date(a.startAt) >= now
  );
  const pastList = appointments.filter(
    (a) => a.status === 'completed' || (a.status === 'booked' && new Date(a.startAt) < now)
  );
  const cancelledList = appointments.filter(
    (a) => a.status === 'cancelled' || a.status === 'no_show'
  );

  const currentList =
    activeTab === 'upcoming' ? upcomingList : activeTab === 'past' ? pastList : cancelledList;

  // Handle Cancel Appointment
  const handleOpenCancel = (apt) => {
    setCancelTarget(apt);
    setCancelReason('');
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;

    setCancelLoading(true);
    try {
      await api.patch(`/api/appointments/${cancelTarget._id}/cancel`, {
        reason: cancelReason || 'Personal schedule change'
      });
      toast.success('Appointment cancelled. The slot has been freed.');
      setCancelTarget(null);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel appointment');
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle Reschedule
  const handleOpenReschedule = (apt) => {
    setRescheduleTarget(apt);
    setNewSelectedSlot(null);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !newSelectedSlot) {
      toast.error('Please pick a new time slot');
      return;
    }

    setRescheduleLoading(true);
    try {
      await api.patch(`/api/appointments/${rescheduleTarget._id}/reschedule`, {
        newStartAt: newSelectedSlot.startAt
      });
      toast.success('Appointment rescheduled successfully!');
      setRescheduleTarget(null);
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rescheduling failed');
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Appointments
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review, reschedule, or cancel your consultations with your specialists
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'upcoming'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" /> Upcoming ({upcomingList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'past'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> Past / Completed ({pastList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cancelled')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'cancelled'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <XCircle className="w-4 h-4" /> Cancelled ({cancelledList.length})
        </button>
      </div>

      {/* Appointments Grid / List */}
      {loading ? (
        <div className="py-20">
          <Loader message="Loading appointments..." size="large" />
        </div>
      ) : currentList.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`No ${activeTab} appointments`}
          description={
            activeTab === 'upcoming'
              ? 'You do not have any upcoming doctor visits scheduled.'
              : `You have no ${activeTab} appointments on record.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentList.map((apt) => (
            <AppointmentCard
              key={apt._id}
              appointment={apt}
              role="patient"
              onCancel={handleOpenCancel}
              onReschedule={handleOpenReschedule}
            />
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" /> Cancel Appointment
              </h3>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel your consultation with{' '}
              <span className="font-bold text-slate-900">
                {cancelTarget.doctor?.user?.name || 'the doctor'}
              </span>{' '}
              scheduled for{' '}
              <span className="font-bold text-slate-900">
                {DateTime.fromISO(cancelTarget.startAt).toFormat('dd LLL yyyy, hh:mm a')}
              </span>
              ?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>2-Hour Cancellation Rule:</strong> Patients can cancel up to 2 hours before the start time. Cancelling immediately frees this slot for other patients.
              </span>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Cancellation (optional)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Health improved, unexpected schedule conflict..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal Reusing SlotPicker */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-teal-600" /> Reschedule Appointment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current: {DateTime.fromISO(rescheduleTarget.startAt).toFormat('dd LLL, hh:mm a')} •{' '}
                  {rescheduleTarget.doctor?.user?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                You can reschedule up to 2 times (current reschedules: {rescheduleTarget.rescheduleCount || 0}/2). Must be at least 2 hours before scheduled time.
              </span>
            </div>

            {/* SlotPicker reusable component */}
            <SlotPicker
              doctorId={rescheduleTarget.doctor?._id || rescheduleTarget.doctor}
              onSlotSelect={(slot) => setNewSelectedSlot(slot)}
              selectedSlot={newSelectedSlot}
            />

            {newSelectedSlot && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
                <span>
                  Selected New Slot: {DateTime.fromISO(newSelectedSlot.startAt).toFormat('dd LLL yyyy, hh:mm a')}
                </span>
                <span className="text-[11px] bg-emerald-100 px-2 py-0.5 rounded-md">Available</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newSelectedSlot || rescheduleLoading}
                onClick={handleConfirmReschedule}
                className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {rescheduleLoading ? 'Updating Slot...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;


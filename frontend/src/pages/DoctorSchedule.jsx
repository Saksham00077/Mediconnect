import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Save,
  Grid,
  Sun,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { DateTime } from 'luxon';
import api from '../api/axios';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';

const weekdays = [
  { index: 1, label: 'Monday' },
  { index: 2, label: 'Tuesday' },
  { index: 3, label: 'Wednesday' },
  { index: 4, label: 'Thursday' },
  { index: 5, label: 'Friday' },
  { index: 6, label: 'Saturday' },
  { index: 0, label: 'Sunday' }
];

const DoctorSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Availability state
  const [slotDurationMins, setSlotDurationMins] = useState(30);
  const [availability, setAvailability] = useState([]);
  const [leaves, setLeaves] = useState([]);

  // Leave addition state
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [addingLeave, setAddingLeave] = useState(false);
  const [leaveConflicts, setLeaveConflicts] = useState([]);

  // 7-Day Timetable Grid state
  const [weekSchedule, setWeekSchedule] = useState([]);
  const [weekStart, setWeekStart] = useState(() => DateTime.now().toISODate());
  const [loadingWeek, setLoadingWeek] = useState(false);

  // Fetch current availability and leaves
  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/doctors/me/availability');
      setSlotDurationMins(data.slotDurationMins || 30);
      setAvailability(data.availability || []);
      setLeaves(data.leaves || []);
    } catch (err) {
      toast.error('Failed to load doctor schedule');
    } finally {
      setLoading(false);
    }
  };

  // Fetch 7-day schedule grid
  const fetchWeekSchedule = async (startDate) => {
    setLoadingWeek(true);
    try {
      const { data } = await api.get(`/doctors/me/schedule/week?start=${startDate}`);
      setWeekSchedule(data.days || []);
    } catch (err) {
      console.error('Failed to load week grid:', err);
    } finally {
      setLoadingWeek(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    fetchWeekSchedule(weekStart);
  }, []);

  // Add a new time range to a weekday
  const handleAddRange = (dayIndex) => {
    setAvailability((prev) => [
      ...prev,
      { dayOfWeek: dayIndex, startTime: '09:00', endTime: '13:00' }
    ]);
  };

  // Remove a range by index
  const handleRemoveRange = (rangeIndex) => {
    setAvailability((prev) => prev.filter((_, idx) => idx !== rangeIndex));
  };

  // Update a range's times
  const handleRangeChange = (rangeIndex, field, value) => {
    setAvailability((prev) =>
      prev.map((r, idx) => (idx === rangeIndex ? { ...r, [field]: value } : r))
    );
  };

  // Save Availability
  const handleSaveAvailability = async (e) => {
    e.preventDefault();

    // Frontend validation: check startTime < endTime and no overlap within each day
    const byDay = {};
    for (const r of availability) {
      if (r.startTime >= r.endTime) {
        toast.error(`Invalid range: startTime (${r.startTime}) must be before endTime (${r.endTime})`);
        return;
      }
      if (!byDay[r.dayOfWeek]) byDay[r.dayOfWeek] = [];
      byDay[r.dayOfWeek].push(r);
    }

    for (const day in byDay) {
      const sorted = [...byDay[day]].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].endTime > sorted[i + 1].startTime) {
          toast.error('Overlapping time ranges detected on the same weekday');
          return;
        }
      }
    }

    setSavingAvailability(true);
    try {
      await api.put('/doctors/me/availability', {
        slotDurationMins: Number(slotDurationMins),
        availability
      });
      toast.success('Weekly availability schedule saved successfully!');
      fetchWeekSchedule(weekStart);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save availability');
    } finally {
      setSavingAvailability(false);
    }
  };

  // Add Leave
  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!leaveDate) {
      toast.error('Please select a leave date');
      return;
    }

    setAddingLeave(true);
    setLeaveConflicts([]);
    try {
      const { data } = await api.post('/doctors/me/leaves', {
        date: leaveDate,
        reason: leaveReason || 'On leave'
      });
      setLeaves(data.leaves || []);
      setLeaveDate('');
      setLeaveReason('');

      if (data.conflicts && data.conflicts.length > 0) {
        setLeaveConflicts(data.conflicts);
        toast.error(`Leave saved, but note: ${data.conflicts.length} booked appointment(s) conflict with this date!`);
      } else {
        toast.success(`Leave recorded for ${leaveDate}`);
      }

      fetchWeekSchedule(weekStart);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record leave');
    } finally {
      setAddingLeave(false);
    }
  };

  // Remove Leave
  const handleRemoveLeave = async (dateStr) => {
    try {
      const { data } = await api.delete(`/doctors/me/leaves/${dateStr}`);
      setLeaves(data.leaves || []);
      toast.success(`Leave for ${dateStr} removed`);
      fetchWeekSchedule(weekStart);
    } catch (err) {
      toast.error('Failed to remove leave');
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading timetable builder..." size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Timetable & Leave Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure your weekly working hours and scheduled leaves. Slots are dynamically computed from these settings.
        </p>
      </div>

      {/* SECTION 1: Weekly Availability Builder */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Weekly Working Hours</h2>
            <p className="text-xs text-slate-500">
              Define consultation shifts for each weekday. Multiple non-overlapping shifts (e.g. morning and evening) are supported.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="slot-duration-select" className="text-xs font-bold text-slate-700">
              Slot Duration:
            </label>
            <select
              id="slot-duration-select"
              value={slotDurationMins}
              onChange={(e) => setSlotDurationMins(e.target.value)}
              className="text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="15">15 Minutes</option>
              <option value="20">20 Minutes</option>
              <option value="30">30 Minutes (Recommended)</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes</option>
            </select>
          </div>
        </div>

        {/* Weekday Rows */}
        <div className="space-y-4">
          {weekdays.map((day) => {
            const dayRanges = availability
              .map((r, idx) => ({ ...r, originalIndex: idx }))
              .filter((r) => r.dayOfWeek === day.index);

            return (
              <div
                key={day.index}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="w-32 shrink-0 pt-2">
                  <span className="font-bold text-sm text-slate-800">{day.label}</span>
                  <span className="block text-[10px] text-slate-400">
                    {dayRanges.length === 0 ? 'Off-Duty' : `${dayRanges.length} shift(s)`}
                  </span>
                </div>

                {/* Shifts List for this day */}
                <div className="flex-1 space-y-2">
                  {dayRanges.length === 0 ? (
                    <p className="text-xs text-slate-400 italic pt-2">No active hours scheduled for this day</p>
                  ) : (
                    dayRanges.map((range) => (
                      <div key={range.originalIndex} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-500 font-medium">From:</span>
                        <input
                          type="time"
                          value={range.startTime}
                          onChange={(e) =>
                            handleRangeChange(range.originalIndex, 'startTime', e.target.value)
                          }
                          className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />

                        <span className="text-xs text-slate-500 font-medium">To:</span>
                        <input
                          type="time"
                          value={range.endTime}
                          onChange={(e) =>
                            handleRangeChange(range.originalIndex, 'endTime', e.target.value)
                          }
                          className="px-2.5 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveRange(range.originalIndex)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                          title="Remove shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Range Button */}
                <div className="shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddRange(day.index)}
                    className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Shift
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="button"
            disabled={savingAvailability}
            onClick={handleSaveAvailability}
            className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/30 transition-all hover:scale-[1.02] flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {savingAvailability ? 'Saving...' : 'Save Availability Schedule'}
          </button>
        </div>
      </div>

      {/* SECTION 2: Scheduled Leaves & Conflict Warning */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Leaves & Days Off</h2>
          <p className="text-xs text-slate-500">
            Scheduling a leave marks that entire date as unavailable on patient slot search.
          </p>
        </div>

        {/* Leave Conflict Alert Banner */}
        {leaveConflicts.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Leave Conflict Detected ({leaveConflicts.length} already booked)</span>
            </div>
            <p className="text-xs text-amber-800">
              The following appointments were already booked on this date. As per clinic policy, they are <strong>not automatically cancelled</strong>. Please contact patients or cancel them manually:
            </p>
            <div className="space-y-1.5 pt-1">
              {leaveConflicts.map((c) => (
                <div
                  key={c.appointmentId}
                  className="px-3 py-2 bg-white rounded-xl border border-amber-200 text-xs text-slate-800 flex items-center justify-between"
                >
                  <span className="font-semibold">
                    {c.patientName} ({c.patientPhone || 'No phone'}) • {DateTime.fromISO(c.startAt).toFormat('hh:mm a')}
                  </span>
                  <span className="text-slate-500 italic">"{c.reason}"</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Leave Form */}
        <form onSubmit={handleAddLeave} className="flex flex-col sm:flex-row items-end gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-bold text-slate-700 mb-1">Leave Date *</label>
            <input
              type="date"
              required
              min={DateTime.now().toISODate()}
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Leave</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Attending Annual Medical Conference, Personal vacation..."
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={addingLeave}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shrink-0 transition-all shadow-xs disabled:opacity-50"
          >
            {addingLeave ? 'Scheduling...' : 'Record Leave'}
          </button>
        </form>

        {/* Scheduled Leaves Table */}
        <div>
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
            Currently Scheduled Leaves ({leaves.length})
          </h3>
          {leaves.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No leaves scheduled</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {leaves.map((l) => (
                <div
                  key={l.date}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {DateTime.fromISO(l.date).toFormat('dd LLL yyyy')}
                    </span>
                    <span className="text-[11px] text-slate-500">{l.reason || 'On Leave'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLeave(l.date)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                    title="Remove leave"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Read-Only 7-Day Timetable Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">7-Day Timetable Grid View</h2>
            <p className="text-xs text-slate-500">Live preview of generated slots across next 7 days</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Starting:</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => {
                setWeekStart(e.target.value);
                fetchWeekSchedule(e.target.value);
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {loadingWeek ? (
          <div className="py-12">
            <Loader message="Rendering week timetable..." size="small" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {weekSchedule.map((day) => (
              <div key={day.date} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-center pb-2 border-b border-slate-200/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {day.dayOfWeek}
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    {DateTime.fromISO(day.date).toFormat('dd LLL')}
                  </span>
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {day.slots.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4">Off-Duty</p>
                  ) : (
                    day.slots.map((slot) => {
                      const timeStr = DateTime.fromISO(slot.startAt).toFormat('hh:mm a');
                      return (
                        <div
                          key={slot.startAt}
                          className={`px-1.5 py-1 text-center rounded-lg text-[10px] font-bold ${
                            slot.available
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                              : 'bg-blue-50 text-blue-800 border border-blue-200/60'
                          }`}
                        >
                          {timeStr}
                          <span className="block text-[8px] font-normal uppercase opacity-75">
                            {slot.available ? 'Free' : 'Booked'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorSchedule;


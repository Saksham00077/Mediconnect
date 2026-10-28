import React, { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Calendar, Clock, Sun, Sunset, Moon, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import Loader from './Loader';

const SlotPicker = ({ doctorId, onSlotSelect, selectedSlot = null, reloadTrigger = 0 }) => {
  const [selectedDate, setSelectedDate] = useState(() => DateTime.now().toISODate());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate 14-day strip starting from today
  const daysList = Array.from({ length: 14 }).map((_, i) => {
    const dt = DateTime.now().plus({ days: i });
    return {
      dateStr: dt.toISODate(),
      dayName: dt.toFormat('ccc'),
      dayNum: dt.toFormat('dd'),
      month: dt.toFormat('LLL'),
      isToday: i === 0
    };
  });

  // Fetch slots whenever selectedDate or doctorId changes or when reloadTrigger fires
  useEffect(() => {
    let isMounted = true;

    const fetchSlots = async () => {
      if (!doctorId || !selectedDate) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/doctors/${doctorId}/slots?date=${selectedDate}`);
        if (isMounted) {
          setSlots(data.slots || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load slots for this date');
          setSlots([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSlots();

    return () => {
      isMounted = false;
    };
  }, [doctorId, selectedDate, reloadTrigger]);

  // Group slots into Morning (< 12:00), Afternoon (12:00 - 17:00), Evening (>= 17:00)
  const morningSlots = [];
  const afternoonSlots = [];
  const eveningSlots = [];

  slots.forEach((slot) => {
    const hour = DateTime.fromISO(slot.startAt).hour;
    if (hour < 12) {
      morningSlots.push(slot);
    } else if (hour < 17) {
      afternoonSlots.push(slot);
    } else {
      eveningSlots.push(slot);
    }
  });

  const renderSlotGroup = (title, icon, groupSlots) => {
    if (groupSlots.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          {icon}
          <span>{title}</span>
          <span className="text-slate-400 font-normal">({groupSlots.length})</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {groupSlots.map((slot) => {
            const timeStr = DateTime.fromISO(slot.startAt).toFormat('hh:mm a');
            const isSelected = selectedSlot && selectedSlot.startAt === slot.startAt;

            if (!slot.available) {
              return (
                <div
                  key={slot.startAt}
                  className="px-2.5 py-2 text-center text-xs font-medium rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60 line-through select-none"
                  title="Slot is already booked or unavailable"
                >
                  {timeStr}
                </div>
              );
            }

            return (
              <button
                key={slot.startAt}
                type="button"
                onClick={() => onSlotSelect(slot, selectedDate)}
                className={`px-2.5 py-2 text-center text-xs font-bold rounded-xl transition-all shadow-xs ${
                  isSelected
                    ? 'bg-teal-700 text-white ring-2 ring-teal-600 ring-offset-2'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-600 hover:text-white border border-teal-200/70 hover:scale-[1.03]'
                }`}
              >
                {timeStr}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Calendar className="w-4 h-4 text-teal-600" />
          <span>Select Appointment Date</span>
        </div>
        <span className="text-xs text-slate-500">14-Day Booking Horizon</span>
      </div>

      {/* Date Strip Scrollable */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
        {daysList.map((d) => {
          const isCurrentSelected = selectedDate === d.dateStr;
          return (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => setSelectedDate(d.dateStr)}
              className={`flex flex-col items-center justify-center min-w-[70px] py-2.5 px-2 rounded-2xl border transition-all text-center ${
                isCurrentSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/30 font-bold scale-[1.02]'
                  : 'bg-slate-50 text-slate-700 border-slate-200/70 hover:border-teal-300 hover:bg-teal-50/50'
              }`}
            >
              <span className={`text-[10px] uppercase font-bold ${isCurrentSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                {d.isToday ? 'Today' : d.dayName}
              </span>
              <span className="text-base font-extrabold my-0.5">{d.dayNum}</span>
              <span className={`text-[10px] ${isCurrentSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                {d.month}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slot Grid Container */}
      <div className="pt-2">
        {loading ? (
          <div className="py-12">
            <Loader message="Checking live availability..." size="small" />
          </div>
        ) : error ? (
          <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No time slots available</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              The doctor is either off-duty, on leave, or slots are past for this day. Please pick another date above.
            </p>
          </div>
        ) : (
          <div>
            {renderSlotGroup('Morning', <Sun className="w-3.5 h-3.5 text-amber-500" />, morningSlots)}
            {renderSlotGroup('Afternoon', <Sunset className="w-3.5 h-3.5 text-orange-500" />, afternoonSlots)}
            {renderSlotGroup('Evening', <Moon className="w-3.5 h-3.5 text-indigo-500" />, eveningSlots)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotPicker;


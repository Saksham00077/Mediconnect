import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Globe, Briefcase, Calendar, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';

const DoctorCard = ({ doctor }) => {
  const doctorName = doctor.user?.name || 'Doctor';
  const initials = doctorName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const nextSlot = doctor.nextAvailableSlot;
  let nextSlotDisplay = 'No slots next 14 days';
  if (nextSlot) {
    const slotDt = DateTime.fromISO(nextSlot.startAt);
    const today = DateTime.now();
    if (slotDt.hasSame(today, 'day')) {
      nextSlotDisplay = `Today at ${slotDt.toFormat('hh:mm a')}`;
    } else if (slotDt.hasSame(today.plus({ days: 1 }), 'day')) {
      nextSlotDisplay = `Tomorrow at ${slotDt.toFormat('hh:mm a')}`;
    } else {
      nextSlotDisplay = slotDt.toFormat('ccc, dd LLL, hh:mm a');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-teal-200 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start gap-4">
          {/* Avatar with Initials */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm shadow-teal-500/20">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-base truncate hover:text-teal-700 transition-colors">
                <Link to={`/doctors/${doctor._id}`}>{doctorName}</Link>
              </h3>
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-xs font-bold shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{doctor.rating?.avg > 0 ? doctor.rating.avg.toFixed(1) : 'New'}</span>
                {doctor.rating?.count > 0 && (
                  <span className="text-amber-500 font-normal">({doctor.rating.count})</span>
                )}
              </div>
            </div>

            <p className="text-xs font-semibold text-teal-600 mt-0.5">{doctor.specialisation}</p>
            {doctor.qualifications && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{doctor.qualifications}</p>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{doctor.experienceYears} yrs experience</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{doctor.city}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 truncate text-[11px] text-slate-500">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{(doctor.languages || []).join(', ')}</span>
          </div>
        </div>

        {/* Next Available Slot Badge */}
        <div className="mt-3.5 bg-slate-50 rounded-xl p-2.5 flex items-center gap-2 border border-slate-100">
          <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Next Available Slot
            </span>
            <span className={`font-semibold ${nextSlot ? 'text-teal-900' : 'text-slate-400 italic'}`}>
              {nextSlotDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Fee & Book Action */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-400 block">Consultation Fee</span>
          <span className="text-sm font-extrabold text-slate-900">
            ₹{doctor.fee}
            <span className="text-[10px] font-normal text-slate-500 ml-1">(pay at clinic)</span>
          </span>
        </div>

        <Link
          to={`/doctors/${doctor._id}`}
          className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all hover:scale-[1.02]"
        >
          Book Slot <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default DoctorCard;


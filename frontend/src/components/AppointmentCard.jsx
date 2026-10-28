import React from 'react';
import { Link } from 'react-router-dom';
import { DateTime } from 'luxon';
import { Calendar, Clock, User, MessageSquare, FileText, ArrowRight, XCircle, RotateCcw } from 'lucide-react';
import StatusBadge from './StatusBadge';

const AppointmentCard = ({
  appointment,
  role = 'patient',
  onCancel = null,
  onReschedule = null,
  onComplete = null,
  onNoShow = null
}) => {
  const startDt = DateTime.fromISO(appointment.startAt);
  const endDt = DateTime.fromISO(appointment.endAt);

  const otherPersonName =
    role === 'patient'
      ? appointment.doctor?.user?.name || 'Doctor'
      : appointment.patient?.name || 'Patient';

  const otherPersonSubtitle =
    role === 'patient'
      ? `${appointment.doctor?.specialisation || 'Specialist'} • ${appointment.doctor?.city || ''}`
      : `${appointment.patient?.phone || 'No phone'} • ${appointment.patient?.email || ''}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-teal-200 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0 border border-teal-100">
              {otherPersonName ? otherPersonName[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">{otherPersonName}</h4>
              <p className="text-xs text-slate-500">{otherPersonSubtitle}</p>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Schedule Timing Box */}
        <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs text-slate-700 border border-slate-100 my-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-semibold">{startDt.toFormat('ccc, dd LLL yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {startDt.toFormat('hh:mm a')} - {endDt.toFormat('hh:mm a')}
            </span>
          </div>
        </div>

        {/* Reason for visit */}
        <div className="text-xs text-slate-600 mb-3">
          <span className="font-semibold text-slate-700 block mb-0.5">Reason for Visit:</span>
          <p className="bg-slate-50/60 p-2 rounded-lg italic text-slate-600 border border-slate-100 line-clamp-2">
            "{appointment.reason}"
          </p>
        </div>

        {/* Fee */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Fee: ₹{appointment.fee} (pay at clinic)</span>
          {appointment.rescheduleCount > 0 && (
            <span className="text-[11px] text-amber-600 font-medium">
              Rescheduled {appointment.rescheduleCount}x
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <Link
          to={`/appointments/${appointment._id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Consultation Details & Chat
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Patient Actions on active booked appointment */}
          {role === 'patient' && appointment.status === 'booked' && (
            <>
              {onReschedule && (
                <button
                  type="button"
                  onClick={() => onReschedule(appointment)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reschedule
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(appointment)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </>
          )}

          {/* Doctor Actions */}
          {role === 'doctor' && appointment.status === 'booked' && (
            <>
              {onComplete && (
                <button
                  type="button"
                  onClick={() => onComplete(appointment)}
                  className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Complete
                </button>
              )}
              {onNoShow && (
                <button
                  type="button"
                  onClick={() => onNoShow(appointment)}
                  className="px-2 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                >
                  No-Show
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(appointment)}
                  className="px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </>
          )}

          {appointment.status === 'completed' && (
            <Link
              to={`/appointments/${appointment._id}`}
              className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" /> Prescription
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;


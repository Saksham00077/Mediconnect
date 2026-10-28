import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  Printer,
  Video,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Pill,
  Send,
  MessageSquare
} from 'lucide-react';
import { DateTime } from 'luxon';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ChatBox from '../components/ChatBox';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';

const AppointmentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rating state (for patient on completed appointment)
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const [aptRes, rxRes] = await Promise.all([
        api.get(`/appointments/${id}`),
        api.get(`/prescriptions/appointment/${id}`)
      ]);
      setAppointment(aptRes.data);
      setPrescription(rxRes.data?.prescription || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load appointment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handlePrintPrescription = () => {
    window.print();
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    setRatingLoading(true);
    try {
      await api.post(`/appointments/${id}/rate`, {
        stars: ratingStars,
        comment: ratingComment
      });
      toast.success('Thank you for rating your consultation!');
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading consultation room..." size="large" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-slate-500">
        Appointment not found or you lack permission to view this record.
      </div>
    );
  }

  const isPatient = user.role === 'patient';
  const isDoctor = user.role === 'doctor';
  const doctorName = appointment.doctor?.user?.name || 'Doctor';
  const patientName = appointment.patient?.name || 'Patient';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between no-print">
        <Link
          to={isDoctor ? '/doctor/appointments' : '/patient/appointments'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Appointments
        </Link>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Appointment Information Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs no-print space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 font-extrabold text-xl flex items-center justify-center shrink-0 border border-teal-100">
              {isPatient ? doctorName[0] : patientName[0]}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">
                {isPatient ? 'Consulting Doctor' : 'Patient Record'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {isPatient ? doctorName : patientName}
              </h1>
              <p className="text-xs text-slate-500">
                {isPatient
                  ? `${appointment.doctor?.specialisation} • Fee: ₹${appointment.fee} (pay at clinic)`
                  : `Phone: ${appointment.patient?.phone || 'N/A'} • Email: ${appointment.patient?.email}`}
              </p>
            </div>
          </div>

          {/* Action: Video Placeholder Button */}
          <div className="flex items-center gap-2">
            <button
              disabled
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold flex items-center gap-2 cursor-not-allowed border border-slate-200"
              title="Video consultation feature is coming in a future update"
            >
              <Video className="w-4 h-4" /> Video Consultation – Coming Soon
            </button>

            {isDoctor && (
              <Link
                to={`/doctor/prescriptions/new?appointmentId=${appointment._id}`}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" /> Write / Edit Prescription
              </Link>
            )}
          </div>
        </div>

        {/* Schedule & Reason bar */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-semibold text-slate-800">
              {DateTime.fromISO(appointment.startAt).toFormat('cccc, dd LLL yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {DateTime.fromISO(appointment.startAt).toFormat('hh:mm a')} -{' '}
              {DateTime.fromISO(appointment.endAt).toFormat('hh:mm a')}
            </span>
          </div>
          <div className="sm:col-span-1 truncate">
            <span className="text-slate-400">Reason:</span>{' '}
            <span className="font-medium text-slate-800">"{appointment.reason}"</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Prescription (if any) + Chat Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Chat Conversation Thread */}
        <div className="no-print space-y-3">
          <ChatBox appointmentId={appointment._id} appointmentStatus={appointment.status} />
        </div>

        {/* Right Column: Prescription View & Rating Card */}
        <div className="space-y-6">
          {/* Prescription Card */}
          {prescription ? (
            <div
              id="printable-prescription"
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">
                    Medical Prescription
                  </span>
                  <h3 className="text-lg font-black text-slate-900">Dr. {doctorName}</h3>
                  <p className="text-xs text-slate-500">
                    {appointment.doctor?.specialisation} • Reg #{appointment.doctor?.regNumber || 'Verified'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePrintPrescription}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors no-print"
                >
                  <Printer className="w-4 h-4 text-slate-600" /> Print Prescription
                </button>
              </div>

              {/* Patient Info Header in Rx */}
              <div className="bg-slate-50 rounded-2xl p-3.5 grid grid-cols-2 gap-2 text-xs text-slate-700 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Patient Name</span>
                  <span className="font-bold text-slate-900">{patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Consultation Date</span>
                  <span className="font-medium">
                    {DateTime.fromISO(appointment.startAt).toFormat('dd LLL yyyy')}
                  </span>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Clinical Diagnosis
                </span>
                <p className="text-sm font-semibold text-slate-900 bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                  {prescription.diagnosis}
                </p>
              </div>

              {/* Medicines Table */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Prescribed Medicines
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-left">Medicine</th>
                        <th className="px-2 py-2 text-left">Dosage</th>
                        <th className="px-2 py-2 text-left">Frequency</th>
                        <th className="px-2 py-2 text-left">Duration</th>
                        <th className="px-3 py-2 text-left">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(prescription.medicines || []).map((med, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-bold text-slate-900">{med.name}</td>
                          <td className="px-2 py-2.5 text-slate-700">{med.dosage}</td>
                          <td className="px-2 py-2.5 text-slate-700">{med.frequency}</td>
                          <td className="px-2 py-2.5 text-slate-700">{med.duration}</td>
                          <td className="px-3 py-2.5 text-slate-500 italic">{med.instructions || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Advice & Follow Up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                {prescription.advice && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Doctor Advice</span>
                    <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{prescription.advice}"
                    </p>
                  </div>
                )}
                {prescription.followUpDate && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Follow-Up Date</span>
                    <p className="text-teal-800 font-semibold bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                      {DateTime.fromISO(prescription.followUpDate).toFormat('dd LLL yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-2 no-print">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">No prescription issued yet</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {appointment.status === 'completed'
                  ? 'Consultation is complete. Your doctor has not uploaded a digital prescription.'
                  : 'Prescriptions are issued by the doctor during or after your scheduled consultation.'}
              </p>
            </div>
          )}

          {/* Rating Section (Patient View for Completed Appointment) */}
          {isPatient && appointment.status === 'completed' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 no-print">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-base">Rate Your Consultation</h3>
              </div>

              {appointment.rating && appointment.rating.stars ? (
                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1 text-xs">
                  <span className="text-amber-800 font-bold block">Your Submitted Review</span>
                  <div className="flex items-center gap-1 my-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < appointment.rating.stars
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  {appointment.rating.comment && (
                    <p className="text-slate-700 italic">"{appointment.rating.comment}"</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitRating} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Select Rating:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingStars(star)}
                          className="p-1 focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= ratingStars
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 fill-slate-100'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Share your doctor experience to help other patients..."
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ratingLoading}
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition-all disabled:opacity-50"
                  >
                    {ratingLoading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;


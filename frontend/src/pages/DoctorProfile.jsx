import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  MapPin,
  Globe,
  Briefcase,
  Award,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';
import { DateTime } from 'luxon';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import SlotPicker from '../components/SlotPicker';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    const fetchDoctor = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/doctors/${id}`);
        setDoctor(data);
      } catch (err) {
        toast.error('Could not load doctor details');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  const handleSlotClick = (slot, date) => {
    if (!isAuthenticated) {
      toast.error('Please log in to your patient account to book an appointment');
      navigate('/login', { state: { from: `/doctors/${id}` } });
      return;
    }

    if (user.role !== 'patient') {
      toast.error('Only patient accounts can book appointments. Please log in as a patient.');
      return;
    }

    setSelectedSlot(slot);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please specify the reason for your consultation');
      return;
    }

    setBookingLoading(true);
    try {
      const { data } = await api.post('/appointments', {
        doctorId: id,
        startAt: selectedSlot.startAt,
        reason: reason.trim()
      });

      toast.success('Appointment booked successfully!');
      setIsModalOpen(false);
      setReason('');
      setSelectedSlot(null);
      // Navigate to patient appointment details
      navigate(`/appointments/${data.appointment._id}`);
    } catch (err) {
      const statusCode = err.response?.status;
      const errorMsg =
        err.response?.data?.message || 'Booking failed. Please try choosing another slot.';
      toast.error(errorMsg);

      // Section 7 Requirement: "The frontend refetches slots after a 409 and shows a toast."
      if (statusCode === 409) {
        setReloadTrigger((prev) => prev + 1);
        setIsModalOpen(false);
        setSelectedSlot(null);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading doctor profile and timetable..." size="large" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-slate-500">
        Doctor profile not found.
      </div>
    );
  }

  const doctorName = doctor.user?.name || 'Doctor';
  const initials = doctorName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Header Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
              {initials}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{doctorName}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>

              <p className="text-sm font-semibold text-teal-600 mt-1">{doctor.specialisation}</p>
              {doctor.qualifications && (
                <p className="text-xs text-slate-500 mt-0.5">{doctor.qualifications}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {doctor.experienceYears} Years Exp.
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {doctor.city}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Globe className="w-3.5 h-3.5 text-slate-400" /> {(doctor.languages || []).join(', ')}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Award className="w-3.5 h-3.5" /> Reg #{doctor.regNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Fee & Rating Highlight */}
          <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 gap-2">
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-400 block">Consultation Fee</span>
              <span className="text-2xl font-black text-slate-900">₹{doctor.fee}</span>
              <span className="text-[11px] text-teal-700 font-semibold block">Pay at Clinic</span>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-200/60">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{doctor.rating?.avg > 0 ? doctor.rating.avg.toFixed(1) : 'New'}</span>
              <span className="text-amber-600 font-normal">({doctor.rating?.count || 0} reviews)</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {doctor.bio && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <h4 className="font-bold text-slate-800 mb-1">About Doctor</h4>
            <p>{doctor.bio}</p>
          </div>
        )}
      </div>

      {/* Main Content: Slot Picker & Patient Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 cols): Slot Picker */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Book an In-Person Consultation</h2>
            <span className="text-xs text-slate-500">Pick any available green slot</span>
          </div>

          <SlotPicker
            doctorId={doctor._id}
            onSlotSelect={handleSlotClick}
            selectedSlot={selectedSlot}
            reloadTrigger={reloadTrigger}
          />
        </div>

        {/* Right Column: Patient Reviews */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Verified Patient Reviews</h2>
            <span className="text-xs text-slate-400">{doctor.reviews?.length || 0} total</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 max-h-[500px] overflow-y-auto">
            {!doctor.reviews || doctor.reviews.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No patient reviews yet. Be the first to consult and review Dr. {doctorName}!
              </p>
            ) : (
              doctor.reviews.map((rev) => (
                <div key={rev._id} className="pb-3.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800">{rev.patientName}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3 h-3 ${
                            idx < rev.stars
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-100 text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comment && <p className="text-xs text-slate-600 italic">"{rev.comment}"</p>}
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {DateTime.fromISO(rev.completedAt).toFormat('dd LLL yyyy')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {isModalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">Confirm Appointment</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Booking Info */}
            <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900">{doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Specialisation:</span>
                <span className="font-semibold text-teal-800">{doctor.specialisation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-bold text-slate-900">
                  {DateTime.fromISO(selectedSlot.startAt).toFormat('cccc, dd LLL yyyy')} at{' '}
                  {DateTime.fromISO(selectedSlot.startAt).toFormat('hh:mm a')}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-teal-200/50">
                <span className="text-slate-600 font-semibold">Consultation Fee:</span>
                <span className="font-extrabold text-teal-900 text-sm">
                  ₹{doctor.fee}{' '}
                  <span className="text-[11px] font-normal text-slate-500">(pay at clinic)</span>
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmBooking} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Visit / Symptoms *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe your symptoms or reason for visit (e.g. chronic fever, joint pain)..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Booking is completely free online. You only pay the consultation fee of ₹{doctor.fee} in person at the clinic.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {bookingLoading ? 'Securing Slot...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;


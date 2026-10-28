import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  CalendarCheck,
  ShieldCheck,
  MessageSquare,
  FileCheck,
  ArrowRight,
  HeartPulse,
  Award,
  Clock,
  Sparkles
} from 'lucide-react';

const popularSpecialisations = [
  { name: 'General Physician', desc: 'Fever, infections, lifestyle care', icon: '🩺' },
  { name: 'Cardiologist', desc: 'Heart care, chest pain, hypertension', icon: '❤️' },
  { name: 'Dermatologist', desc: 'Skin, acne, hairfall, allergies', icon: '✨' },
  { name: 'Pediatrician', desc: 'Infant care, vaccination, child wellness', icon: '👶' },
  { name: 'Orthopedic', desc: 'Joint pain, bone fracture, sports injury', icon: '🦴' },
  { name: 'Gynecologist', desc: 'Pregnancy, women wellness, PCOS', icon: '🌸' },
  { name: 'ENT', desc: 'Ear, nose, throat, sinusitis, hearing', icon: '👂' },
  { name: 'Psychiatrist', desc: 'Anxiety, depression, mental wellbeing', icon: '🧠' }
];

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    if (selectedCity) params.append('city', selectedCity);
    navigate(`/doctors?${params.toString()}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/70 via-slate-50 to-white pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/70 text-teal-800 text-xs font-bold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Guaranteed Atomic Slot Booking • No Overlap
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            Book Verified Doctors with{' '}
            <span className="bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
              Real-Time Available Slots
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Browse qualified doctors, view dynamically computed timetable slots, consult asynchronously with chat, and receive verified medical prescriptions.
          </p>

          {/* Unified Search Bar */}
          <div className="mt-8 sm:mt-10 max-w-3xl mx-auto bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/80">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-2.5 flex-1 w-full px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <Search className="w-5 h-5 text-teal-600 shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Doctor name, specialisation, or symptom..."
                  className="w-full bg-transparent text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-48 px-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <MapPin className="w-5 h-5 text-teal-600 shrink-0" />
                <input
                  type="text"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="City (e.g. Mumbai)"
                  className="w-full bg-transparent text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-teal-600/30 transition-all hover:scale-[1.02] shrink-0"
              >
                Search Doctors
              </button>
            </form>
          </div>

          {/* Quick Stats Pill */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" /> Admin-Approved Clinicians
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600" /> Zero Double-Booking Guarantee
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-teal-600" /> Digital Allergy-Checked Rx
            </span>
          </div>
        </div>
      </section>

      {/* Specialisations Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Popular Specialisations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Find the right medical expert for your specific health concern
            </p>
          </div>
          <Link
            to="/doctors"
            className="text-xs sm:text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            All Doctors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {popularSpecialisations.map((spec) => (
            <Link
              key={spec.name}
              to={`/doctors?specialisation=${encodeURIComponent(spec.name)}`}
              className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition-all text-left flex flex-col justify-between"
            >
              <div>
                <span className="text-3xl block mb-3">{spec.icon}</span>
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-600 transition-colors">
                  {spec.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{spec.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
                <span>View Doctors</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Simple 3-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2">How MediConnect Works</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Designed from the ground up for transparency, zero double-booking, and seamless patient-doctor communication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 font-extrabold flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-bold text-lg mb-2">1. Browse & Filter</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Filter approved doctors by specialisation, city, consultation fees, and real-time available time slots over the next 14 days.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 font-extrabold flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-bold text-lg mb-2">2. Guaranteed Booking</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Pick your preferred time slot. MongoDB partial unique indexing guarantees you cannot be double-booked by other patients.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 font-extrabold flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-bold text-lg mb-2">3. Consult & Prescribe</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Chat asynchronously with your doctor before and after the visit. Doctors issue allergy-screened digital prescriptions for easy printing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo helper banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-teal-900 text-sm sm:text-base">Ready for an evaluation demo?</h4>
            <p className="text-xs sm:text-sm text-teal-700 mt-0.5">
              Use demo logins (<code className="bg-white px-1 py-0.5 rounded text-teal-900 font-mono">patient1@demo.com</code>, <code className="bg-white px-1 py-0.5 rounded text-teal-900 font-mono">doctor1@demo.com</code>, <code className="bg-white px-1 py-0.5 rounded text-teal-900 font-mono">admin@demo.com</code> with password <code className="bg-white px-1 py-0.5 rounded text-teal-900 font-mono">Password@123</code>).
            </p>
          </div>
          <Link
            to="/login"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shrink-0 shadow-sm"
          >
            Go to Login
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;


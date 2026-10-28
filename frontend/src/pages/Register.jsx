import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HeartPulse,
  UserCheck,
  Stethoscope,
  Lock,
  Mail,
  User,
  Phone,
  Briefcase,
  MapPin,
  Award,
  Globe,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const commonSpecialisations = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic',
  'Gynecologist',
  'ENT',
  'Psychiatrist',
  'Neurologist',
  'Ophthalmologist'
];

const Register = () => {
  const [role, setRole] = useState('patient'); // 'patient' | 'doctor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Doctor-specific fields
  const [specialisation, setSpecialisation] = useState('General Physician');
  const [qualifications, setQualifications] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [city, setCity] = useState('');
  const [languages, setLanguages] = useState('English, Hindi');
  const [fee, setFee] = useState('500');
  const [regNumber, setRegNumber] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [doctorSuccess, setDoctorSuccess] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        phone,
        role
      };

      if (role === 'doctor') {
        payload.specialisation = specialisation;
        payload.qualifications = qualifications;
        payload.experienceYears = Number(experienceYears) || 0;
        payload.city = city;
        payload.languages = languages.split(',').map((s) => s.trim());
        payload.fee = Number(fee) || 0;
        payload.regNumber = regNumber;
        payload.bio = bio;
      }

      await register(payload);

      if (role === 'doctor') {
        setDoctorSuccess(true);
      } else {
        navigate('/patient/dashboard');
      }
    } catch {
      // Toast shown by context
    } finally {
      setLoading(false);
    }
  };

  if (doctorSuccess) {
    return (
      <div className="min-h-[75vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Doctor Registration Received!</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your medical profile has been submitted and is currently{' '}
            <span className="font-bold text-amber-600">awaiting admin approval</span>. You can access your doctor dashboard to review your timetable, and your profile will become visible to patients once verified by our admin team.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Link
              to="/doctor/dashboard"
              className="py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Go to Doctor Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/20 mb-3">
          <HeartPulse className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create MediConnect Account
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Join as a Patient or Doctor to get started
        </p>

        {/* Role Toggle Tabs */}
        <div className="mt-6 p-1 bg-slate-200/80 rounded-2xl inline-flex max-w-xs w-full shadow-inner">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === 'patient'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-teal-600" /> Patient
          </button>
          <button
            type="button"
            onClick={() => setRole('doctor')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              role === 'doctor'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-teal-600" /> Doctor
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200/80 shadow-xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'doctor' ? 'Dr. Firstname Lastname' : 'Your Full Name'}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password * (min 6 chars)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Doctor-Specific Details */}
            {role === 'doctor' && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>Doctor Professional Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Specialisation *</label>
                    <select
                      value={specialisation}
                      onChange={(e) => setSpecialisation(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      {commonSpecialisations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications *</label>
                    <input
                      type="text"
                      required
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="e.g. MBBS, MD (Internal Medicine)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Medical Reg # *</label>
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="MCI-12345"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Practice City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Fee (₹ INR) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      placeholder="600"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      min={0}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Languages (comma separated)</label>
                    <input
                      type="text"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="English, Hindi, Marathi"
                      className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Professional Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief description of your clinical background and practice philosophy..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-teal-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-1.5 mt-2"
            >
              {loading ? 'Creating Account...' : `Register as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}{' '}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-teal-600 hover:text-teal-700">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;


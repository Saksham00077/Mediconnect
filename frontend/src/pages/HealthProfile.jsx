import React, { useState, useEffect } from 'react';
import { HeartPulse, ShieldAlert, Activity, User, Phone, Save, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';

const HealthProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('prefer_not_to_say');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [conditionsInput, setConditionsInput] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/patient/profile');
        if (data) {
          setAge(data.age || '');
          setGender(data.gender || 'prefer_not_to_say');
          setBloodGroup(data.bloodGroup || 'Unknown');
          setAllergiesInput((data.allergies || []).join(', '));
          setConditionsInput((data.chronicConditions || []).join(', '));
          if (data.emergencyContact) {
            setEmergencyName(data.emergencyContact.name || '');
            setEmergencyPhone(data.emergencyContact.phone || '');
            setEmergencyRelation(data.emergencyContact.relation || '');
          }
        }
      } catch (err) {
        toast.error('Failed to load health profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        age: age ? Number(age) : null,
        gender,
        bloodGroup,
        allergies: allergiesInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        chronicConditions: conditionsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relation: emergencyRelation.trim()
        }
      };

      await api.put('/patient/profile', payload);
      toast.success('Health profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update health profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading your health profile..." size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Patient Health Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Keep your medical records updated so your doctors can cross-check allergies and diagnose safely.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Demographics */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600" /> Basic Demographics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  min="0"
                  max="130"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 29"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Allergies & Conditions */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Allergies & Chronic Conditions
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Drug & Food Allergies (comma separated)
                </label>
                <input
                  type="text"
                  value={allergiesInput}
                  onChange={(e) => setAllergiesInput(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa drugs, Aspirin, Peanuts"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Doctors receive an automatic allergy collision warning if they prescribe medicines matching these keywords.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chronic Medical Conditions (comma separated)
                </label>
                <input
                  type="text"
                  value={conditionsInput}
                  onChange={(e) => setConditionsInput(e.target.value)}
                  placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes, Migraine"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-600" /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Family or Friend Name"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Health Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HealthProfile;


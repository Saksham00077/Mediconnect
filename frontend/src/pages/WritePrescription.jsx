import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  ShieldAlert,
  Save,
  ArrowLeft,
  Pill,
  Calendar,
  User,
  CheckCircle2
} from 'lucide-react';
import { DateTime } from 'luxon';
import api from '../api/axios';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';

const WritePrescription = () => {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '1-0-1 (After food)', duration: '5 days', instructions: '' }
  ]);
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Allergy warning banner state
  const [allergyWarnings, setAllergyWarnings] = useState([]);

  useEffect(() => {
    if (!appointmentId) {
      toast.error('appointmentId query parameter is required');
      navigate('/doctor/appointments');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [aptRes, rxRes] = await Promise.all([
          api.get(`/appointments/${appointmentId}`),
          api.get(`/prescriptions/appointment/${appointmentId}`)
        ]);

        const apt = aptRes.data;
        setAppointment(apt);

        // Fetch patient profile to preview allergies in real-time
        if (apt.patient?._id || apt.patient) {
          try {
            const patientId = apt.patient?._id || apt.patient;
            const pProfileRes = await api.get(`/patient/${patientId}/profile`);
            setPatientProfile(pProfileRes.data);
          } catch {
            // silent
          }
        }

        // If existing prescription exists, populate fields
        if (rxRes.data?.prescription) {
          const rx = rxRes.data.prescription;
          setDiagnosis(rx.diagnosis || '');
          if (rx.medicines && rx.medicines.length > 0) {
            setMedicines(rx.medicines);
          }
          setAdvice(rx.advice || '');
          setFollowUpDate(rx.followUpDate || '');
        }
      } catch (err) {
        toast.error('Failed to load consultation details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [appointmentId]);

  // Dynamic Medicine Row Handlers
  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: '1-0-1 (After food)', duration: '5 days', instructions: '' }
    ]);
  };

  const handleRemoveMedicine = (index) => {
    if (medicines.length <= 1) {
      toast.error('At least one medicine row is required');
      return;
    }
    setMedicines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((med, idx) => (idx === index ? { ...med, [field]: value } : med))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      toast.error('Please enter a clinical diagnosis');
      return;
    }

    // Verify all medicines have a name
    const invalidMed = medicines.find((m) => !m.name.trim() || !m.dosage.trim());
    if (invalidMed) {
      toast.error('Please fill in both name and dosage for all prescribed medicines');
      return;
    }

    setSaving(true);
    setAllergyWarnings([]);
    try {
      const payload = {
        appointmentId,
        diagnosis: diagnosis.trim(),
        medicines,
        advice: advice.trim(),
        followUpDate: followUpDate || null
      };

      const { data } = await api.post('/prescriptions', payload);

      if (data.warnings && data.warnings.length > 0) {
        setAllergyWarnings(data.warnings);
        toast.success('Prescription saved with allergy warnings detected!');
      } else {
        toast.success('Prescription saved successfully!');
        navigate(`/appointments/${appointmentId}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading prescription workspace..." size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={`/appointments/${appointmentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Consultation
        </Link>
        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
          Digital Rx Editor
        </span>
      </div>

      {/* Patient Consultation Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 font-extrabold text-lg flex items-center justify-center border border-teal-100">
            {appointment?.patient?.name ? appointment.patient.name[0] : 'P'}
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              {appointment?.patient?.name || 'Patient Name'}
            </h2>
            <p className="text-xs text-slate-500">
              Consultation: {DateTime.fromISO(appointment?.startAt).toFormat('dd LLL yyyy, hh:mm a')} • "{appointment?.reason}"
            </p>
          </div>
        </div>

        {patientProfile?.allergies && patientProfile.allergies.length > 0 && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            <span className="font-bold flex items-center gap-1 text-[11px] mb-0.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Patient Allergies:
            </span>
            <span className="font-bold">{patientProfile.allergies.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Non-Blocking Allergy Collision Alert Banner */}
      {allergyWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Prescription Saved with Allergy Collisions:</span>
          </div>
          <ul className="list-disc pl-5 text-xs text-amber-800 space-y-1">
            {allergyWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700">
            Review the prescribed medicines above if substitution is recommended for patient safety.
          </p>
        </div>
      )}

      {/* Prescription Form */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Diagnosis */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Clinical Diagnosis *
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Acute Bronchitis with mild wheezing, Hypertension Stage 1..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-semibold text-slate-900"
            />
          </div>

          {/* Dynamic Medicines Rows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-600" /> Prescribed Medications
              </label>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medicine
              </button>
            </div>

            <div className="space-y-3">
              {medicines.map((med, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70 space-y-2.5 relative"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Medicine Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={med.name}
                        onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                        placeholder="e.g. Azithromycin 500mg, Paracetamol"
                        className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Dosage *
                      </label>
                      <input
                        type="text"
                        required
                        value={med.dosage}
                        onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                        placeholder="e.g. 1 Tablet, 5ml"
                        className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                        placeholder="e.g. 5 days, 2 weeks"
                        className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-1/2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Frequency
                      </label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)}
                        placeholder="e.g. 1-0-1 After food, SOS"
                        className="w-full px-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Special Instructions
                      </label>
                      <input
                        type="text"
                        value={med.instructions}
                        onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                        placeholder="e.g. Drink plenty of water, Take with milk"
                        className="w-full px-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>

                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(index)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors self-end mb-0.5"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advice & Follow Up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Advice & Dietary Guidelines
              </label>
              <textarea
                rows={2}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Steam inhalation twice daily, Avoid dairy/cold drinks, Rest adequately..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Follow-Up Date (Optional)
              </label>
              <input
                type="date"
                min={DateTime.now().toISODate()}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              to={`/appointments/${appointmentId}`}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-600/30 transition-all hover:scale-[1.02] flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Issue Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WritePrescription;


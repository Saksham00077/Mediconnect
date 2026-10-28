import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  MapPin,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const [stats, setStats] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, allRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/doctors?approved=false'),
        api.get('/admin/doctors')
      ]);
      setStats(statsRes.data);
      setPendingDoctors(pendingRes.data.doctors || []);
      setAllDoctors(allRes.data.doctors || []);
    } catch (err) {
      toast.error('Failed to load administrator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleApprove = async (docId) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/doctors/${docId}/approve`);
      toast.success('Doctor profile approved! Doctor is now visible for patient booking.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (docId) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/doctors/${docId}/reject`);
      toast.success('Doctor profile rejected and user account deactivated.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24">
        <Loader message="Loading administrator portal..." size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> Platform Administration
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">MediConnect Master Control</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Verify medical credentials, approve practicing clinicians, and monitor platform health metrics.
            </p>
          </div>

          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center shrink-0">
            <span className="text-[10px] text-purple-200 block uppercase font-bold">Pending Approvals</span>
            <span className="text-2xl font-black text-amber-300">{pendingDoctors.length}</span>
          </div>
        </div>
      </div>

      {/* Platform Overview Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Users</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.users?.total || 0}</p>
          <span className="text-[11px] text-slate-500 block mt-1">
            {stats?.users?.patients || 0} Patients • {stats?.users?.doctors || 0} Doctors
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Approved Doctors</span>
          <p className="text-2xl font-black text-teal-700 mt-1">{stats?.doctors?.approved || 0}</p>
          <span className="text-[11px] text-slate-500 block mt-1">
            {stats?.doctors?.pending || 0} Awaiting Verification
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Total Appointments</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.appointments?.total || 0}</p>
          <span className="text-[11px] text-slate-500 block mt-1">
            {stats?.appointments?.booked || 0} Active Booked
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400">Completed Consultations</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {stats?.appointments?.completed || 0}
          </p>
          <span className="text-[11px] text-slate-500 block mt-1">
            {stats?.appointments?.cancelled || 0} Cancelled • {stats?.appointments?.noShow || 0} No-Show
          </span>
        </div>
      </div>

      {/* Pending Doctor Approvals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Doctor Registrations Requiring Verification ({pendingDoctors.length})
            </h2>
            <p className="text-xs text-slate-500">
              Carefully review doctor medical registration numbers and qualifications before approving
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-teal-700 hover:text-teal-800"
          >
            {showAll ? 'View Pending Only' : 'View All Registered Doctors'}
          </button>
        </div>

        {pendingDoctors.length === 0 && !showAll ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">All Doctor Registrations Verified</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no doctor accounts pending approval. You can view all active doctors using the button above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(showAll ? allDoctors : pendingDoctors).map((doc) => (
              <div
                key={doc._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{doc.user?.name}</h3>
                      <p className="text-xs font-semibold text-teal-600">{doc.specialisation}</p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        doc.isApproved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {doc.isApproved ? 'Approved' : 'Pending Verification'}
                    </span>
                  </div>

                  {/* Credentials & Details */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 truncate">
                      <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">Reg: {doc.regNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{doc.experienceYears} yrs exp</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{doc.city}</span>
                    </div>
                    <div className="truncate font-semibold text-slate-800">
                      Fee: ₹{doc.fee}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    <span className="text-slate-400">Qualifications:</span> {doc.qualifications || 'N/A'}
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1">
                    Email: {doc.user?.email} • Phone: {doc.user?.phone || 'N/A'}
                  </div>
                </div>

                {/* Approve / Reject Actions */}
                {!doc.isApproved && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleReject(doc._id)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                    >
                      Reject & Deactivate
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(doc._id)}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Doctor
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;


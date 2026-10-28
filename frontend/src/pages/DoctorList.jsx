import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import DoctorCard from '../components/DoctorCard';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { Filter, SlidersHorizontal, Search, RotateCcw, Stethoscope } from 'lucide-react';

const DoctorList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 9, totalPages: 1 });
  const [meta, setMeta] = useState({ specialisations: [], cities: [], languages: [] });
  const [loading, setLoading] = useState(true);

  // Filters state initialized from URL query params
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [specialisation, setSpecialisation] = useState(searchParams.get('specialisation') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [language, setLanguage] = useState(searchParams.get('language') || '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || '');
  const [maxFee, setMaxFee] = useState(searchParams.get('maxFee') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'rating');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Load filter metadata once
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const { data } = await api.get('/doctors/filters/meta');
        setMeta(data);
      } catch (err) {
        console.error('Error fetching filter metadata:', err);
      }
    };
    fetchMeta();
  }, []);

  // Fetch doctors whenever filters/sort/page change
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (specialisation) params.append('specialisation', specialisation);
        if (city) params.append('city', city);
        if (language) params.append('language', language);
        if (minRating) params.append('minRating', minRating);
        if (maxFee) params.append('maxFee', maxFee);
        if (sort) params.append('sort', sort);
        params.append('page', page);
        params.append('limit', 9);

        setSearchParams(params);

        const { data } = await api.get(`/doctors?${params.toString()}`);
        setDoctors(data.data || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 9, totalPages: 1 });
      } catch (err) {
        console.error('Error fetching doctors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [q, specialisation, city, language, minRating, maxFee, sort, page]);

  const handleResetFilters = () => {
    setQ('');
    setSpecialisation('');
    setCity('');
    setLanguage('');
    setMinRating('');
    setMaxFee('');
    setSort('rating');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find & Book Doctors
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time computed slots • Guaranteed single-booking • No double reservations
          </p>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800"
          >
            <option value="rating">Highest Rating</option>
            <option value="nextAvailable">Earliest Available Slot</option>
            <option value="experience">Most Experienced</option>
            <option value="fee_asc">Consultation Fee (Low to High)</option>
            <option value="fee_desc">Consultation Fee (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, symptom, bio..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800"
            />
          </div>

          {/* Specialisation Select */}
          <div>
            <select
              value={specialisation}
              onChange={(e) => {
                setSpecialisation(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800"
            >
              <option value="">All Specialisations</option>
              {meta.specialisations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* City Select */}
          <div>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800"
            >
              <option value="">All Cities</option>
              {meta.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Language Select */}
          <div>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800"
            >
              <option value="">All Languages</option>
              {meta.languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row Filters: Max Fee & Min Rating */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Max Fee (₹):</span>
              <input
                type="number"
                value={maxFee}
                onChange={(e) => {
                  setMaxFee(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. 1000"
                min="0"
                step="100"
                className="w-24 px-2 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Rating:</span>
              <select
                value={minRating}
                onChange={(e) => {
                  setMinRating(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="4">4.0+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>
          </div>

          {(q || specialisation || city || language || minRating || maxFee) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="text-xs font-semibold text-slate-500">
        Found <span className="text-slate-900 font-bold">{pagination.total}</span> approved medical specialists
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="py-20">
          <Loader message="Loading verified clinicians..." size="large" />
        </div>
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors match your criteria"
          description="Try adjusting your filters, clearing your search keywords, or selecting another city."
          action={
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
            >
              Reset All Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor._id} doctor={doctor} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-medium text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default DoctorList;


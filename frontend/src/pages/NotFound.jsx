import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 font-black text-2xl flex items-center justify-center">
        404
      </div>
      <h1 className="text-2xl font-black text-slate-900">Page Not Found</h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
        The link you followed may be broken or the consultation page may have moved.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02]"
        >
          <Home className="w-4 h-4" /> Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;


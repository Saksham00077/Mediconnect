import React from 'react';

const Loader = ({ message = 'Loading...', size = 'default' }) => {
  const spinnerSize = size === 'small' ? 'w-5 h-5 border-2' : size === 'large' ? 'w-12 h-12 border-4' : 'w-8 h-8 border-3';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div
        className={`${spinnerSize} rounded-full border-teal-200 border-t-teal-600 animate-spin mb-3`}
      />
      {message && <p className="text-sm font-medium text-slate-500">{message}</p>}
    </div>
  );
};

export default Loader;


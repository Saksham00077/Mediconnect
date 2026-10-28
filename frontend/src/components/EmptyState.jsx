import React from 'react';
import { FolderX } from 'lucide-react';

const EmptyState = ({
  icon: Icon = FolderX,
  title = 'No records found',
  description = 'There is currently no data to display.',
  action = null
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-slate-100 text-center shadow-sm">
      <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;


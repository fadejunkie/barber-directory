
import React from 'react';
import type { School } from '../types';

interface SchoolCardProps {
  school: School;
  onSelect: (school: School) => void;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({ school, onSelect }) => {
  const mapsDirHref = (address: string) => 
    "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(address);

  const cleanPhone = (phone: string | null) => phone ? phone.replace(/[^+\d]/g, '') : '';

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Status Styling Logic
  const isFeatured = school.status === 'featured';
  const isVerified = school.status === 'verified';

  let containerClasses = "group cursor-pointer rounded-2xl border bg-white shadow-sm p-5 transition-all flex flex-col h-full ";
  
  if (isFeatured) {
    containerClasses += "border-amber-300 dark:border-amber-600 shadow-md ring-1 ring-amber-100 dark:ring-amber-900 bg-amber-50/30 dark:bg-amber-900/10 ";
  } else if (isVerified) {
    containerClasses += "border-blue-200 dark:border-blue-800 shadow-sm bg-blue-50/20 dark:bg-blue-900/10 ";
  } else {
    containerClasses += "border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-500 ";
  }

  return (
    <article 
      onClick={() => onSelect(school)}
      className={containerClasses}
    >
      <div className="flex-1">
        
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-2">
          {isFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
              </svg>
              Featured
            </span>
          )}
          {isVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.651 3 3 0 00-4.988 0 3 3 0 00-3.75 3.651 3 3 0 000 5.304 3 3 0 003.75 3.651 3 3 0 004.988 0 3 3 0 003.75-3.651zM10 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm.707 5.707a1 1 0 00-1.414-1.414l-1.586 1.586a1 1 0 01-1.414-1.414l1.586-1.586a1 1 0 000-1.414 1 1 0 00-1.414 0l-1.586 1.586a1 1 0 01-1.414-1.414l1.586-1.586a1 1 0 00-1.414-1.414 1 1 0 000 1.414l1.586 1.586a1 1 0 010 1.414L3.293 13.707z" clipRule="evenodd" />
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06l1.89 1.89-1.89 1.89a.75.75 0 101.06 1.06l1.89-1.89 1.89 1.89a.75.75 0 101.06-1.06l-1.89-1.89 1.89-1.89a.75.75 0 00-1.06-1.06l-1.89 1.89-1.89-1.89z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
        </div>

        <h4 className={`text-lg font-semibold transition-colors ${isFeatured ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
          {school.name}
        </h4>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{school.address}</p>
      </div>
      
      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700/50 flex flex-wrap gap-2 items-center">
        {/* Primary Actions - Click propagation stopped so they don't open modal */}
        <a 
          href={mapsDirHref(school.address)} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={handleActionClick}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900 transition-opacity z-10"
        >
          Directions
        </a>
        
        {school.website && (
          <a 
            href={school.website} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={handleActionClick}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors z-10"
          >
            Website
          </a>
        )}
        
        {school.phone && (
          <a 
            href={`tel:${cleanPhone(school.phone)}`}
            onClick={handleActionClick}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors z-10"
          >
            Call
          </a>
        )}
      </div>
      
      {typeof school._distance === 'number' && (
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          {school._distance.toFixed(1)} miles away
        </div>
      )}
    </article>
  );
};

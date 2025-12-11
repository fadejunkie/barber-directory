
import React, { useState } from 'react';
import type { School } from '../types';

interface SchoolCardProps {
  school: School;
  onSelect: (school: School) => void;
  searchQuery?: string;
}

export const SchoolCard: React.FC<SchoolCardProps> = ({ school, onSelect, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-collapse when search query changes
  React.useEffect(() => {
    if (searchQuery) {
      setIsExpanded(false);
    }
  }, [searchQuery]);

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

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="ml-auto p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400 transition-colors"
          aria-label={isExpanded ? "Collapse details" : "Expand details"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Expanded Level-2 Panel */}
      <div
        className={`grid transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
          }`}
      >
        <div className="min-h-0 border-t border-zinc-100 dark:border-zinc-700/50 pt-4">
          <div className="space-y-4">

            {/* Description */}
            {school.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {school.description}
              </p>
            )}

            {/* Programs */}
            {school.programs && school.programs.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Programs</h5>
                <div className="flex flex-wrap gap-2">
                  {school.programs.map((prog, i) => (
                    <span key={i} className="px-2 py-1 rounded-md bg-zinc-100/80 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      {prog}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Details Grid */}
            {(school.hours_required || school.tuition || school.schedule) && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                {school.hours_required && (
                  <div>
                    <span className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Hours</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{school.hours_required} hrs</span>
                  </div>
                )}
                {school.tuition && (
                  <div>
                    <span className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Tuition</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{school.tuition}</span>
                  </div>
                )}
                {school.schedule && (
                  <div className="col-span-2">
                    <span className="block text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Schedule</span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{school.schedule}</span>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder Reviews */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <svg key={n} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <span className="text-xs text-zinc-500">(0 reviews)</span>
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 opacity-50 cursor-not-allowed">
                View Google Reviews
              </span>
            </div>

          </div>
        </div>
      </div>

      {typeof school._distance === 'number' && (
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          {school._distance.toFixed(1)} miles away
        </div>
      )}
    </article>
  );
};

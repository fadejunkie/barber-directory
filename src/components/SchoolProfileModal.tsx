
import React, { useEffect } from 'react';
import type { School } from '../types';

interface SchoolProfileModalProps {
  school: School;
  onClose: () => void;
}

export const SchoolProfileModal: React.FC<SchoolProfileModalProps> = ({ school, onClose }) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const cleanPhone = (phone: string | null) => phone ? phone.replace(/[^+\d]/g, '') : '';
  const mapsDirHref = (address: string) => 
    "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(address);

  // Generate a dynamic "About" blurb based on available data
  const generateAboutBlurb = (s: School) => {
    if (s.description) return s.description;

    const cityState = s.address.split(',').slice(1).join(',').trim() || "the area";
    const programText = s.programs && s.programs.length > 0 
      ? `specializing in ${s.programs.join(', ')}` 
      : "offering comprehensive barbering education";
    const scheduleText = s.schedule ? ` with ${s.schedule.toLowerCase()} schedule options` : "";

    return `${s.name} is a vocational institution located in ${cityState}, ${programText}${scheduleText}. They provide hands-on training for aspiring barbers looking to obtain their state license. Contact the school directly for current tuition rates and enrollment dates.`;
  };

  const isFeatured = school.status === 'featured';
  const isVerified = school.status === 'verified';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isFeatured ? 'ring-2 ring-amber-400 dark:ring-amber-600' : ''}`}>
        
        {/* Header */}
        <div className={`px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start ${isFeatured ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'bg-zinc-50/50 dark:bg-zinc-800/50'}`}>
          <div>
            <div className="flex gap-2 mb-2">
               {isFeatured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                  </svg>
                  Featured School
                </span>
              )}
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">
              {school.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {school.address}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto">
          
          {/* Key Facts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Phone</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{school.phone || "Not available"}</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Programs</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                {school.programs?.join(", ") || "Barbering, Cosmetology Crossover"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Hours Required</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                {school.hours_required ? `${school.hours_required} Hours` : "1,000 Hours (Est.)"}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Schedule</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                {school.schedule || "Full-time & Part-time"}
              </span>
            </div>
          </div>

          {/* About Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">About this School</h3>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {generateAboutBlurb(school)}
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row gap-3">
          <a 
            href={mapsDirHref(school.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex justify-center items-center px-4 py-3 rounded-xl bg-zinc-900 text-white font-medium hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            Get Directions
          </a>
          {school.phone && (
            <a 
              href={`tel:${cleanPhone(school.phone)}`}
              className="flex-1 inline-flex justify-center items-center px-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-medium hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-700 transition-colors"
            >
              Call School
            </a>
          )}
          {school.website && (
            <a 
              href={school.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex justify-center items-center px-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-medium hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-700 transition-colors"
            >
              Visit Website
            </a>
          )}
        </div>

      </div>
    </div>
  );
};

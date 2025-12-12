import { useEffect, useRef } from 'react';
import type { Suggestion } from '../types';

interface AutocompleteProps {
    suggestions: Suggestion[];
    onSelect: (suggestion: Suggestion) => void;
    isLoading?: boolean;
}

export function Autocomplete({ suggestions, onSelect, isLoading }: AutocompleteProps) {
    const listRef = useRef<HTMLUListElement>(null);

    if (suggestions.length === 0 && !isLoading) return null;

    return (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50">
            {isLoading && (
                <div className="p-3 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <div className="animate-spin h-3 w-3 border-2 border-zinc-300 border-t-zinc-600 rounded-full"></div>
                    Loading suggestions...
                </div>
            )}

            {!isLoading && (
                <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
                    {suggestions.map((item, index) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onSelect(item)}
                                className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-3 group"
                            >
                                <div className={`
                  flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
                  ${item.type === 'school'
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}
                `}>
                                    {item.type === 'school' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.62.829.799 1.654 1.38 2.274 1.765.311.192.571.337.757.433.092.047.16.085.203.108.008.004.013.007.018.008.006.003.01.003.01.003h.002zM10 13a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-700 dark:group-hover:text-white">
                                        {item.label}
                                    </p>
                                    {item.subLabel && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                            {item.subLabel}
                                        </p>
                                    )}
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-zinc-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                                    </svg>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

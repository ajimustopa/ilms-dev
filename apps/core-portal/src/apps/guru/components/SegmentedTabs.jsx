import React from 'react';

/**
 * SegmentedTabs Component - Design System Portal Guru
 * Pengalih tab mobile bergaya pill dengan target sentuh 44px, indikator aktif jelas, dan scroll halus.
 */
export const SegmentedTabs = ({
  tabs = [], // [{ id: string, label: string, count?: number | string, icon?: ReactNode }]
  activeTab,
  onChange,
  variant = 'segmented', // 'segmented' | 'underline' | 'pills'
  fullWidth = false,
  className = ''
}) => {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={`flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs font-bold whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B61F4] ${
                fullWidth ? 'flex-1' : ''
              } ${
                isActive
                  ? 'border-[#5B61F4] text-[#5B61F4] dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon && <span className="shrink-0 text-current">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-indigo-100 text-[#5B61F4]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Variant: Segmented (Pill Box)
  return (
    <div
      role="tablist"
      className={`flex items-center p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-full overflow-x-auto no-scrollbar gap-1.5 border border-slate-200/50 dark:border-slate-700/50 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center gap-2 px-4 min-h-[38px] text-xs font-bold rounded-full transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B61F4] select-none ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'bg-[#5B61F4] text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon && <span className="shrink-0 text-current">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedTabs;

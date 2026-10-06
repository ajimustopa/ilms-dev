import React from 'react';

/**
 * SegmentedTabs Component - Design System Portal Guru
 * Pengalih tab mobile dengan target sentuh minimal 44px, indikator aktif jelas, dan dukungan scroll horizontal halus.
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
              className={`flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs font-semibold whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                fullWidth ? 'flex-1' : ''
              } ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon && <span className="shrink-0 text-current">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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

  // Variant: Segmented (Default pill box)
  return (
    <div
      role="tablist"
      className={`flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-x-auto no-scrollbar gap-1 border border-slate-200/60 dark:border-slate-700/60 ${className}`}
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
            className={`flex items-center justify-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold rounded-md transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon && <span className="shrink-0 text-current">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
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

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
        className={`flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar ${className}`}
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
              className={`flex items-center justify-center gap-2 px-4 min-h-[44px] text-xs font-bold whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                fullWidth ? 'flex-1' : ''
              } ${
                isActive
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-400 hover:text-slate-800'
              }`}
            >
              {tab.icon && <span className="shrink-0 text-current">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-700'
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
      className={`flex items-center p-1 bg-slate-100 rounded-lg overflow-x-auto no-scrollbar gap-1 border border-slate-200 ${className}`}
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
            className={`flex items-center justify-center gap-2 px-3.5 min-h-[38px] text-xs font-bold rounded-md transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 select-none ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.icon && <span className="shrink-0 text-current">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600'
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

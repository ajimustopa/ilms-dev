import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';

const VARIANT_CONFIG = {
  success: {
    container: 'border-emerald-200 border-l-emerald-500 bg-emerald-50/60',
    title: 'text-emerald-900',
    description: 'text-emerald-700',
    iconColor: 'text-emerald-600',
    defaultIcon: CheckCircle2
  },
  danger: {
    container: 'border-rose-200 border-l-rose-500 bg-rose-50/60',
    title: 'text-rose-900',
    description: 'text-rose-700',
    iconColor: 'text-rose-600',
    defaultIcon: AlertCircle
  },
  warning: {
    container: 'border-amber-200 border-l-amber-500 bg-amber-50/60',
    title: 'text-amber-950',
    description: 'text-amber-800',
    iconColor: 'text-amber-600',
    defaultIcon: AlertTriangle
  },
  info: {
    container: 'border-indigo-200 border-l-indigo-500 bg-indigo-50/60',
    title: 'text-indigo-950',
    description: 'text-indigo-700',
    iconColor: 'text-indigo-600',
    defaultIcon: Info
  }
};

export default function FlatAlertBanner({
  variant = 'info',
  title,
  description,
  action,
  icon: CustomIcon,
  className = ''
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;
  const IconComponent = CustomIcon || config.defaultIcon;

  return (
    <div
      className={`rounded-lg border border-l-4 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${config.container} ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {IconComponent && (
          <IconComponent className={`w-4 h-4 mt-0.5 shrink-0 ${config.iconColor}`} />
        )}
        <div className="min-w-0">
          <h4 className={`text-xs font-bold leading-snug ${config.title}`}>
            {title}
          </h4>
          {description && (
            <p className={`text-[11px] mt-0.5 leading-relaxed ${config.description}`}>
              {description}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="shrink-0 self-end sm:self-center">
          {action}
        </div>
      )}
    </div>
  );
}

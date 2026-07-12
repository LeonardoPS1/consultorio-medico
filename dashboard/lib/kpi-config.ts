import {
  Calendar,
  Users,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  Activity,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface KpiStyle {
  icon: ComponentType<{ className?: string }>;
  gradient: string;
  bg: string;
}

const kpiConfig: Record<string, KpiStyle> = {
  calendar: {
    icon: Calendar,
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  users: {
    icon: Users,
    gradient: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  messages: {
    icon: MessageSquare,
    gradient: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  alert: {
    icon: AlertTriangle,
    gradient: 'from-red-500 to-red-600',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
  response: {
    icon: TrendingUp,
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  today: {
    icon: Smartphone,
    gradient: 'from-cyan-500 to-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
};

export function getKpiConfig(type: string): KpiStyle {
  return kpiConfig[type] ?? {
    icon: Activity,
    gradient: 'from-gray-500 to-gray-600',
    bg: 'bg-gray-50 dark:bg-gray-950/30',
  };
}

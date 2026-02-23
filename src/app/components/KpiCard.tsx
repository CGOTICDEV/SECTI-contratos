import { LucideIcon } from 'lucide-react';
import { Card } from './ui/card';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant: 'neutral' | 'critical' | 'warning' | 'safe';
  isActive?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  neutral: {
    bg: 'bg-white',
    border: 'border-secti-border',
    text: 'text-secti-primary',
    icon: 'text-secti-muted',
    activeRing: 'ring-secti-accent',
  },
  critical: {
    bg: 'bg-white',
    border: 'border-red-200',
    text: 'text-[#EF4444]',
    icon: 'text-[#EF4444]',
    activeRing: 'ring-[#EF4444]',
  },
  warning: {
    bg: 'bg-white',
    border: 'border-yellow-200',
    text: 'text-[#F59E0B]',
    icon: 'text-[#F59E0B]',
    activeRing: 'ring-[#F59E0B]',
  },
  safe: {
    bg: 'bg-white',
    border: 'border-green-200',
    text: 'text-[#10B981]',
    icon: 'text-[#10B981]',
    activeRing: 'ring-[#10B981]',
  },
};

export function KpiCard({ title, value, icon: Icon, variant, isActive, onClick }: KpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={`
        p-6 cursor-pointer transition-all duration-200 
        bg-secti-surface border rounded-lg shadow-card
        ${styles.border}
        ${isActive ? `ring-2 ${styles.activeRing} border-transparent` : 'hover:border-secti-accent'}
      `}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-secti-muted mb-2 uppercase tracking-tight">
            {title}
          </p>
          <p className={`text-3xl font-bold font-mono tracking-tighter ${styles.text}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-md bg-gray-50 border border-secti-border`}>
          <Icon className={`w-6 h-6 ${styles.icon}`} />
        </div>
      </div>
    </Card>
  );
}
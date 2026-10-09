import { LayoutDashboard, type LucideIcon } from 'lucide-react';
import type { NavIcon as NavIconId } from '@/config/navigation';

const ICONS: Record<NavIconId, LucideIcon> = {
  dashboard: LayoutDashboard,
};

export function NavIcon({ icon, className }: { icon: NavIconId; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden="true" />;
}

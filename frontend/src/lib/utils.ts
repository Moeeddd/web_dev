import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFuel(fuel: number): string {
  if (fuel >= 1000) return `${(fuel / 1000).toFixed(1)}K`;
  return `${Math.round(fuel)}`;
}

export function formatDistance(km: number): string {
  if (km >= 100) return `${Math.round(km)} km`;
  return `${km.toFixed(1)} km`;
}

export function formatETA(eta: string): string {
  const date = new Date(eta);
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return 'Arrived';

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${mins}m`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'normal': return 'text-emerald-400';
    case 'warning': return 'text-amber-400';
    case 'danger': return 'text-red-400';
    case 'stranded': return 'text-red-500';
    case 'rerouting': return 'text-orange-400';
    case 'distress': return 'text-red-600';
    default: return 'text-gray-400';
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'normal': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'danger': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'stranded': return 'bg-red-600/20 text-red-500 border-red-600/30';
    case 'rerouting': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/40';
    case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
    case 'medium': return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    case 'low': return 'text-blue-400 bg-blue-500/20 border-blue-500/40';
    default: return 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  }
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#f59e0b';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
}

export function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

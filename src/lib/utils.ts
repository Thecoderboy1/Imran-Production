import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SYSTEM_LAUNCH_DATE } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isGrandfathered(data: any) {
  if (!data || !data.createdAt) return false;
  // Handle Firestore Timestamp or Date string
  const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
  return createdDate < SYSTEM_LAUNCH_DATE;
}

export function formatCurrency(amount: number) {
  return '₹' + (amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

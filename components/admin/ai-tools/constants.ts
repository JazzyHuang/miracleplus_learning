import type { PricingType } from '@/types/database';

export const pricingOptions: { value: PricingType; label: string }[] = [
  { value: 'free', label: '免费' },
  { value: 'freemium', label: '免费增值' },
  { value: 'paid', label: '付费' },
];

export const pricingColors: Record<string, string> = {
  free: 'bg-success/10 text-success',
  freemium: 'bg-info/10 text-info',
  paid: 'bg-warning/10 text-warning',
};

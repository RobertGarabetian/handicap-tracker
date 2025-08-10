export type Round = {
  date: string;
  course: string;
  rating: number;
  slope: number;
  gross: number;
  differential: number;
  ocrRaw?: string;
  imageUrl?: string;
};

export const differential = (gross: number, rating: number, slope: number) => 
  ((gross - rating) * 113) / slope;

export const handicapIndex = (diffs: number[]) => {
  const last20 = diffs.slice(-20).sort((a, b) => a - b);
  const n = last20.length;
  const take = n >= 20 ? 8 : n >= 8 ? Math.max(3, Math.floor(n / 2)) : Math.min(3, n);
  const avg = last20.slice(0, take).reduce((s, x) => s + x, 0) / Math.max(1, take);
  return Number.isFinite(avg) ? Number(avg.toFixed(1)) : 0;
};

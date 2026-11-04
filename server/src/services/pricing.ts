export type SeatType = 'REGULAR' | 'PREMIUM' | 'RECLINER';

const MULTIPLIER: Record<SeatType, number> = {
  REGULAR: 1,
  PREMIUM: 1.5,
  RECLINER: 2,
};

/** Price of one seat, in rupees. */
export function seatPrice(basePrice: number, type: SeatType): number {
  return Math.round(basePrice * MULTIPLIER[type]);
}

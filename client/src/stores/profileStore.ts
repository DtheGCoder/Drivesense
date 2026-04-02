import { create } from 'zustand';
import { apiGetProfile, apiUpdateProfile, apiDeletePicture, getToken } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CarProfile {
  id: string;
  name: string; // e.g. "VW Golf 7"
  fuelType: 'benzin' | 'diesel' | 'elektro' | 'hybrid';
  consumptionCity: number; // L/100km (or kWh/100km for electric)
  consumptionHighway: number;
  consumptionMixed: number;
  tankSize?: number; // liters (or kWh for EV)
  year?: number;
  horsePower?: number;
  weight?: number; // kg
}

export interface UserSettings {
  notifications: boolean;
  notificationSound: boolean;
  units: 'metric' | 'imperial';
  theme: 'dark' | 'light' | 'system';
  privacy: 'public' | 'friends' | 'private';
}

export interface UserProfile {
  userId: string;
  profilePicture?: string; // base64 data URL
  cars: CarProfile[];
  selectedCarId?: string;
  /** Current fuel price per liter in EUR */
  fuelPriceBenzin: number;
  fuelPriceDiesel: number;
  fuelPriceElektro: number; // EUR/kWh
  settings: UserSettings;
}

interface ProfileState {
  profile: UserProfile | null;
  loadProfile: (userId: string) => void;
  updateProfilePicture: (dataUrl: string) => void;
  removeProfilePicture: () => void;
  addCar: (car: CarProfile) => void;
  updateCar: (carId: string, updates: Partial<CarProfile>) => void;
  removeCar: (carId: string) => void;
  selectCar: (carId: string) => void;
  updateFuelPrices: (prices: Partial<Pick<UserProfile, 'fuelPriceBenzin' | 'fuelPriceDiesel' | 'fuelPriceElektro'>>) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  getSelectedCar: () => CarProfile | undefined;
  /** Calculate fuel cost for a trip in EUR */
  calculateFuelCost: (distanceMeters: number, avgSpeedKmh: number) => { liters: number; cost: number } | null;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

const PROFILE_STORAGE_KEY = 'drivesense_profile';

function loadFromStorage(userId: string): UserProfile {
  const defaults: UserProfile = {
    userId,
    cars: [],
    fuelPriceBenzin: 1.75,
    fuelPriceDiesel: 1.62,
    fuelPriceElektro: 0.35,
    settings: { notifications: true, notificationSound: true, units: 'metric', theme: 'dark', privacy: 'public' },
  };
  try {
    const raw = localStorage.getItem(`${PROFILE_STORAGE_KEY}_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed, settings: { ...defaults.settings, ...parsed.settings } };
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveToStorage(profile: UserProfile) {
  try {
    localStorage.setItem(`${PROFILE_STORAGE_KEY}_${profile.userId}`, JSON.stringify(profile));
  } catch { /* quota */ }
}

// ─── Fuel Calculation ────────────────────────────────────────────────────────

/**
 * Estimate fuel consumption (L/100km) based on instantaneous speed.
 * Uses a realistic model:
 * - Idling (<5 km/h): ~1.5 L/h baseline
 * - City (<50): city consumption + stop-and-go penalty
 * - Mixed (50-100): linear interpolation city→highway
 * - Highway (100-130): highway consumption
 * - High speed (>130): quadratic aerodynamic drag increase
 * - Accounts for vehicle weight via horsePower/weight ratio
 */
function estimateConsumption(car: CarProfile, speedKmh: number): number {
  // Idling
  if (speedKmh < 5) {
    // Idling consumption: ~0.8-1.5 L/h → convert to L/100km equivalent
    // At 0 km/h it's infinite L/100km, so return a fixed idle rate
    return car.consumptionCity * 1.3; // slightly above city
  }

  let base: number;
  if (speedKmh <= 30) {
    // Heavy city: stop-and-go, lots of acceleration
    base = car.consumptionCity * 1.15;
  } else if (speedKmh <= 50) {
    // Normal city
    const t = (speedKmh - 30) / 20;
    base = car.consumptionCity * (1.15 * (1 - t) + 1.0 * t);
  } else if (speedKmh <= 80) {
    // City→mixed transition (sweet spot around 60-80 for most cars)
    const t = (speedKmh - 50) / 30;
    base = car.consumptionCity * (1 - t) + car.consumptionMixed * t;
    // Efficiency bonus in the 60-80 range
    base *= 0.95;
  } else if (speedKmh <= 100) {
    // Mixed→highway
    const t = (speedKmh - 80) / 20;
    base = car.consumptionMixed * (1 - t) + car.consumptionHighway * t;
  } else if (speedKmh <= 130) {
    // Highway
    base = car.consumptionHighway;
    // Mild aerodynamic increase
    const over = speedKmh - 100;
    base *= 1 + (over * over) / 8000;
  } else {
    // High speed — quadratic aerodynamic drag
    base = car.consumptionHighway;
    const over = speedKmh - 100;
    base *= 1 + (over * over) / 4000;
  }

  return base;
}

/**
 * Estimate fuel used for a single segment of driving.
 * @param car - Vehicle profile
 * @param speedKmh - Speed during this segment
 * @param distanceM - Distance of segment in meters
 * @param gForce - Absolute g-force (acceleration intensity increases consumption)
 * @returns Liters consumed for this segment
 */
export function estimateSegmentFuel(car: CarProfile, speedKmh: number, distanceM: number, gForce: number): number {
  const consumptionPer100 = estimateConsumption(car, speedKmh);
  const distanceKm = distanceM / 1000;
  let liters = (consumptionPer100 / 100) * distanceKm;

  // Acceleration penalty: hard acceleration burns more fuel
  // Each 0.1g of acceleration adds ~5% fuel consumption
  if (gForce > 0.05) {
    liters *= 1 + gForce * 0.5;
  }

  return liters;
}

// Sync profile to server (fire-and-forget)
function syncToServer(profile: UserProfile) {
  if (!getToken()) return;
  const { profilePicture: _, ...data } = profile;
  void _;
  apiUpdateProfile(data as unknown as Parameters<typeof apiUpdateProfile>[0]).catch(() => { /* offline */ });
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,

  loadProfile: (userId: string) => {
    // Load from localStorage immediately
    const local = loadFromStorage(userId);
    set({ profile: local });

    // Then try to fetch from server and merge
    if (getToken()) {
      apiGetProfile()
        .then(({ profile: remote }) => {
          if (remote) {
            const merged: UserProfile = {
              ...local,
              ...remote,
              userId,
              cars: (remote.cars as UserProfile['cars']).length > 0 ? remote.cars as UserProfile['cars'] : local.cars,
              settings: { ...local.settings, ...(remote.settings as unknown as UserProfile['settings']) },
              profilePicture: remote.profilePicture ?? local.profilePicture,
            };
            set({ profile: merged });
            saveToStorage(merged);
          } else {
            // No server profile yet — push local data up
            syncToServer(local);
          }
        })
        .catch(() => { /* offline — use local */ });
    }
  },

  updateProfilePicture: (dataUrl: string) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, profilePicture: dataUrl };
    set({ profile: updated });
    saveToStorage(updated);
  },

  removeProfilePicture: () => {
    const profile = get().profile;
    if (!profile) return;
    const { profilePicture: _, ...rest } = profile;
    void _;
    const updated = { ...rest, profilePicture: undefined } as UserProfile;
    set({ profile: updated });
    saveToStorage(updated);
    apiDeletePicture().catch(() => {});
  },

  addCar: (car: CarProfile) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = {
      ...profile,
      cars: [...profile.cars, car],
      selectedCarId: profile.selectedCarId ?? car.id,
    };
    set({ profile: updated });
    saveToStorage(updated);
    syncToServer(updated);
  },

  updateCar: (carId: string, updates: Partial<CarProfile>) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = {
      ...profile,
      cars: profile.cars.map((c) => (c.id === carId ? { ...c, ...updates } : c)),
    };
    set({ profile: updated });
    saveToStorage(updated);
    syncToServer(updated);
  },

  removeCar: (carId: string) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = {
      ...profile,
      cars: profile.cars.filter((c) => c.id !== carId),
      selectedCarId: profile.selectedCarId === carId ? profile.cars.find((c) => c.id !== carId)?.id : profile.selectedCarId,
    };
    set({ profile: updated });
    saveToStorage(updated);
    syncToServer(updated);
  },

  selectCar: (carId: string) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, selectedCarId: carId };
    set({ profile: updated });
    saveToStorage(updated);
    syncToServer(updated);
  },

  updateFuelPrices: (prices) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, ...prices };
    set({ profile: updated });
    saveToStorage(updated);
    syncToServer(updated);
  },

  updateSettings: (partial) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, settings: { ...profile.settings, ...partial } };
    set({ profile: updated });
    saveToStorage(updated);
    syncToServer(updated);
  },

  getSelectedCar: () => {
    const profile = get().profile;
    if (!profile?.selectedCarId) return undefined;
    return profile.cars.find((c) => c.id === profile.selectedCarId);
  },

  calculateFuelCost: (distanceMeters: number, avgSpeedKmh: number) => {
    const profile = get().profile;
    const car = get().getSelectedCar();
    if (!car || !profile) return null;

    const distanceKm = distanceMeters / 1000;
    const consumptionPer100 = estimateConsumption(car, avgSpeedKmh);
    const liters = (consumptionPer100 / 100) * distanceKm;

    let pricePerUnit: number;
    switch (car.fuelType) {
      case 'benzin': pricePerUnit = profile.fuelPriceBenzin; break;
      case 'diesel': pricePerUnit = profile.fuelPriceDiesel; break;
      case 'elektro': pricePerUnit = profile.fuelPriceElektro; break;
      case 'hybrid': pricePerUnit = profile.fuelPriceBenzin; break;
    }

    return {
      liters: Math.round(liters * 100) / 100,
      cost: Math.round(liters * pricePerUnit * 100) / 100,
    };
  },
}));

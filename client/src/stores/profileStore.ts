import { create } from 'zustand';

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
 * Estimate fuel consumption based on speed profile.
 * - City driving (<50 km/h): uses city consumption
 * - Highway (>100 km/h): uses highway consumption
 * - Mixed: linear interpolation
 * - Speed factor: higher speed = exponentially more fuel
 */
function estimateConsumption(car: CarProfile, avgSpeedKmh: number): number {
  // Base consumption interpolation (L/100km)
  let base: number;
  if (avgSpeedKmh <= 50) {
    base = car.consumptionCity;
  } else if (avgSpeedKmh >= 100) {
    base = car.consumptionHighway;
  } else {
    const t = (avgSpeedKmh - 50) / 50;
    base = car.consumptionCity * (1 - t) + car.consumptionMixed * t;
  }

  // Speed correction factor (aerodynamic drag increases quadratically)
  // At 130+ km/h, consumption rises significantly
  if (avgSpeedKmh > 100) {
    const overSpeed = avgSpeedKmh - 100;
    base *= 1 + (overSpeed * overSpeed) / 5000;
  }

  return base;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,

  loadProfile: (userId: string) => {
    set({ profile: loadFromStorage(userId) });
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
  },

  selectCar: (carId: string) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, selectedCarId: carId };
    set({ profile: updated });
    saveToStorage(updated);
  },

  updateFuelPrices: (prices) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, ...prices };
    set({ profile: updated });
    saveToStorage(updated);
  },

  updateSettings: (partial) => {
    const profile = get().profile;
    if (!profile) return;
    const updated = { ...profile, settings: { ...profile.settings, ...partial } };
    set({ profile: updated });
    saveToStorage(updated);
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

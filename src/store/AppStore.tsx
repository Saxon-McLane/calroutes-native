import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Difficulty = "easy" | "moderate" | "hard";

export type SelectedRoute = {
  id: string;
  name: string;
  distanceKm: number;
  durationMin: number;
  difficulty: Difficulty;
  calories?: number;
};

export type Workout = {
  id: string;
  dateISO: string;
  calories: number;
  distanceKm: number;
  durationMin: number;
  difficulty: Difficulty;
  routeName?: string;
};

export type Sex = "male" | "female";
export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export type Units = "imperial" | "metric";

export type Profile = {
  name?: string;
  age?: number;
  sex?: Sex;
  heightIn?: number;
  weightLbs?: number;
  fitnessLevel?: FitnessLevel;
  weeklyCalorieGoal: number;
  units?: Units;
  weightKg?: number;
  heightCm?: number;
};

type StoreState = {
  profile: Profile;
  workouts: Workout[];
  selectedRoute: SelectedRoute | null;
};

type StoreApi = StoreState & {
  setProfile: (patch: Partial<Profile>) => void;
  addWorkout: (w: Workout) => void;
  clearWorkouts: () => void;
  setSelectedRoute: (r: SelectedRoute | null) => void;
};

const STORAGE_KEY = "calroutes_store_v1";

const defaultState: StoreState = {
  profile: {
    name: "",
    age: 30,
    sex: "male",
    heightIn: 69,
    heightCm: 175,
    weightLbs: 170,
    weightKg: 77,
    fitnessLevel: "beginner",
    weeklyCalorieGoal: 2000,
    units: "imperial",
  },
  workouts: [],
  selectedRoute: null,
};

const Ctx = createContext<StoreApi | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(defaultState.profile);
  const [workouts, setWorkouts] = useState<Workout[]>(defaultState.workouts);
  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute | null>(
    defaultState.selectedRoute
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<StoreState>;
        if (parsed.profile) {
          setProfile({ ...defaultState.profile, ...(parsed.profile as Profile) });
        }
        if (parsed.workouts) setWorkouts(parsed.workouts as Workout[]);
        if (parsed.selectedRoute) setSelectedRoute(parsed.selectedRoute as SelectedRoute);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ profile, workouts, selectedRoute })
    ).catch(() => {});
  }, [profile, workouts, selectedRoute]);

  const api = useMemo<StoreApi>(
    () => ({
      profile,
      workouts,
      selectedRoute,
      setProfile: (patch) =>
        setProfile((prev) => ({
          ...prev,
          ...patch,
        })),
      addWorkout: (w) =>
        setWorkouts((prev) => {
          if (prev.some((existing) => existing.id === w.id)) {
            return prev;
          }
          return [w, ...prev];
        }),
      clearWorkouts: () => {
        setWorkouts([]);
      },
      setSelectedRoute,
    }),
    [profile, workouts, selectedRoute]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAppStore() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useAppStore must be used inside AppStoreProvider");
  }
  return v;
}
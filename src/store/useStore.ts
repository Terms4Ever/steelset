import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_EXERCISES, STARTER_ROUTINES } from '@/data/exercises';
import { Exercise, LoggedExercise, Routine, SetEntry, Settings, Unit, Workout } from '@/data/types';
import { isCountable, lastPerformance } from '@/lib/calc';
import { buildPrefilledExercise, prefillSets } from '@/lib/prefill';

let _c = 0;
export const uid = (p = 'id') =>
  `${p}_${Date.now().toString(36)}${(_c++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export interface AppleUser {
  sub: string;
  name?: string;
  email?: string;
}

interface State {
  customExercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  activeWorkoutId: string | null;
  settings: Settings;
  appleUser: AppleUser | null;
  _hydrated: boolean;
}

interface Actions {
  setHydrated: (v: boolean) => void;
  // settings / onboarding
  completeOnboarding: (starterRoutineIds: string[]) => void;
  resetOnboarding: () => void;
  setUnit: (u: Unit) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  setAppleUser: (u: AppleUser | null) => void;
  wipeAll: () => void;
  // exercises
  addExercise: (e: Omit<Exercise, 'id' | 'custom'>) => string;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
  // routines
  addRoutine: (r: Omit<Routine, 'id'>) => string;
  updateRoutine: (id: string, patch: Partial<Routine>) => void;
  deleteRoutine: (id: string) => void;
  // workout lifecycle
  startWorkout: (routineId: string | null, manual?: boolean) => string;
  setWorkoutDate: (ms: number) => void;
  addExerciseToActive: (exerciseId: string) => void;
  addSet: (exIndex: number, type?: SetEntry['type']) => void;
  updateSet: (exIndex: number, setIndex: number, patch: Partial<SetEntry>) => void;
  toggleSetDone: (exIndex: number, setIndex: number) => void;
  removeSet: (exIndex: number, setIndex: number) => void;
  removeActiveExercise: (exIndex: number) => void;
  linkSuperset: (exIndex: number) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
}

const DEFAULT_SETTINGS: Settings = { unit: 'kg', restDefaultSec: 90, increment: 2.5, onboarded: false };

function patchActive(workouts: Workout[], activeId: string | null, fn: (w: Workout) => Workout): Workout[] {
  if (!activeId) return workouts;
  return workouts.map((w) => (w.id === activeId ? fn(w) : w));
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      customExercises: [],
      routines: [],
      workouts: [],
      activeWorkoutId: null,
      settings: DEFAULT_SETTINGS,
      appleUser: null,
      _hydrated: false,

      setHydrated: (v) => set({ _hydrated: v }),

      completeOnboarding: (starterRoutineIds) => {
        const starters = STARTER_ROUTINES.filter((r) => starterRoutineIds.includes(r.id)).map(
          (r) =>
            ({
              ...r,
              id: uid('r'),
              exercises: r.exercises.map((e) => ({ ...e })),
            }) as Routine,
        );
        set((s) => ({
          routines: [...s.routines, ...starters],
          settings: { ...s.settings, onboarded: true },
        }));
      },
      resetOnboarding: () => set((s) => ({ settings: { ...s.settings, onboarded: false } })),
      setUnit: (u) => set((s) => ({ settings: { ...s.settings, unit: u } })),
      setSetting: (k, v) => set((s) => ({ settings: { ...s.settings, [k]: v } })),
      setAppleUser: (u) => set({ appleUser: u }),
      wipeAll: () =>
        set({
          customExercises: [],
          routines: [],
          workouts: [],
          activeWorkoutId: null,
          settings: { ...DEFAULT_SETTINGS },
          appleUser: null,
        }),

      addExercise: (e) => {
        const id = uid('ex');
        set((s) => ({ customExercises: [...s.customExercises, { ...e, id, custom: true }] }));
        return id;
      },
      updateExercise: (id, patch) =>
        set((s) => ({
          customExercises: s.customExercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteExercise: (id) =>
        set((s) => ({ customExercises: s.customExercises.filter((e) => e.id !== id) })),

      addRoutine: (r) => {
        const id = uid('r');
        set((s) => ({ routines: [...s.routines, { ...r, id }] }));
        return id;
      },
      updateRoutine: (id, patch) =>
        set((s) => ({ routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRoutine: (id) => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      startWorkout: (routineId, manual = false) => {
        const st = get();
        const ws = st.workouts;
        let name = manual ? 'Zápis tréninku' : 'Rychlý trénink';
        let exercises: LoggedExercise[] = [];
        if (routineId) {
          const r = st.routines.find((x) => x.id === routineId);
          if (r) {
            name = r.name;
            exercises = r.exercises.map((re) => buildPrefilledExercise(re, ws, !!r.autoProgress, st.settings.increment));
          }
        }
        const w: Workout = {
          id: uid('w'),
          routineId: routineId ?? undefined,
          name,
          startedAt: Date.now(),
          manual: manual || undefined,
          exercises,
        };
        set((s) => ({ workouts: [...s.workouts, w], activeWorkoutId: w.id }));
        return w.id;
      },

      setWorkoutDate: (ms) =>
        set((s) => ({ workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => ({ ...w, startedAt: ms })) })),

      addExerciseToActive: (exerciseId) =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => ({
            ...w,
            exercises: [
              ...w.exercises,
              { exerciseId, sets: prefillSets(lastPerformance(s.workouts, exerciseId), 3) },
            ],
          })),
        })),

      addSet: (exIndex, type = 'R') =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => {
            const exercises = w.exercises.map((le, i) => {
              if (i !== exIndex) return le;
              const prev = le.sets[le.sets.length - 1];
              return {
                ...le,
                sets: [...le.sets, { type, weight: prev?.weight ?? null, reps: prev?.reps ?? null, done: false }],
              };
            });
            return { ...w, exercises };
          }),
        })),

      updateSet: (exIndex, setIndex, patch) =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => ({
            ...w,
            exercises: w.exercises.map((le, i) =>
              i !== exIndex
                ? le
                : { ...le, sets: le.sets.map((st, j) => (j === setIndex ? { ...st, ...patch } : st)) },
            ),
          })),
        })),

      toggleSetDone: (exIndex, setIndex) =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => ({
            ...w,
            exercises: w.exercises.map((le, i) =>
              i !== exIndex
                ? le
                : { ...le, sets: le.sets.map((st, j) => (j === setIndex ? { ...st, done: !st.done } : st)) },
            ),
          })),
        })),

      removeSet: (exIndex, setIndex) =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => ({
            ...w,
            exercises: w.exercises.map((le, i) =>
              i !== exIndex ? le : { ...le, sets: le.sets.filter((_, j) => j !== setIndex) },
            ),
          })),
        })),

      removeActiveExercise: (exIndex) =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => ({
            ...w,
            exercises: w.exercises.filter((_, i) => i !== exIndex),
          })),
        })),

      linkSuperset: (exIndex) =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => {
            const ex = w.exercises;
            if (exIndex < 0 || exIndex >= ex.length - 1) return w;
            const a = ex[exIndex];
            const b = ex[exIndex + 1];
            const same = !!a.supersetGroup && a.supersetGroup === b.supersetGroup;
            const group = a.supersetGroup || b.supersetGroup || uid('ss');
            const exercises = ex.map((le, i) => {
              if (i !== exIndex && i !== exIndex + 1) return le;
              if (same) {
                const { supersetGroup, ...rest } = le;
                return rest;
              }
              return { ...le, supersetGroup: group };
            });
            return { ...w, exercises };
          }),
        })),

      finishWorkout: () =>
        set((s) => {
          const id = s.activeWorkoutId;
          if (!id) return {};
          const workouts = s.workouts
            // drop sets that were never completed, then drop empty exercises
            .map((w) => {
              if (w.id !== id) return w;
              const exercises = w.exercises
                .map((le) => ({ ...le, sets: le.sets.filter((st) => st.done) }))
                .filter((le) => le.sets.length > 0);
              return { ...w, exercises, finishedAt: w.manual ? w.startedAt : Date.now() };
            })
            // if nothing was logged, discard the empty session entirely
            .filter((w) => !(w.id === id && w.exercises.length === 0));
          return { workouts, activeWorkoutId: null };
        }),

      discardWorkout: () =>
        set((s) => ({
          workouts: s.workouts.filter((w) => w.id !== s.activeWorkoutId),
          activeWorkoutId: null,
        })),
    }),
    {
      name: 'setly-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        customExercises: s.customExercises,
        routines: s.routines,
        workouts: s.workouts,
        activeWorkoutId: s.activeWorkoutId,
        settings: s.settings,
        appleUser: s.appleUser,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

// ---- selectors ----
export function allExercises(s: Pick<State, 'customExercises'>): Exercise[] {
  return [...SEED_EXERCISES, ...s.customExercises];
}
export function exercisesById(s: Pick<State, 'customExercises'>): Record<string, Exercise> {
  return Object.fromEntries(allExercises(s).map((e) => [e.id, e]));
}
export function activeWorkout(s: Pick<State, 'workouts' | 'activeWorkoutId'>): Workout | null {
  return s.workouts.find((w) => w.id === s.activeWorkoutId) ?? null;
}
export function history(s: Pick<State, 'workouts'>): Workout[] {
  return s.workouts.filter((w) => w.finishedAt).sort((a, b) => b.finishedAt! - a.finishedAt!);
}
export { isCountable };

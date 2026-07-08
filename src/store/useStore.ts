import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_EXERCISES, STARTER_ROUTINES } from '@/data/exercises';
import { Exercise, HrSample, LoggedExercise, MuscleGroup, Routine, SetEntry, Settings, Unit, Workout } from '@/data/types';
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
  /** Per-exercise overrides (muscles + unilateral flag; works for seed i custom exercises), applied in selectors. */
  exerciseMuscles: Record<string, { primary: MuscleGroup; secondary: MuscleGroup[]; unilateral?: boolean }>;
  favoriteExercises: string[];
  routines: Routine[];
  workouts: Workout[];
  activeWorkoutId: string | null;
  settings: Settings;
  appleUser: AppleUser | null;
  dismissedHealth: string[]; // uuids HKWorkoutů, které uživatel odmítl importovat (aby se nenabízely znovu)
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
  setExerciseMuscles: (id: string, primary: MuscleGroup, secondary: MuscleGroup[], unilateral?: boolean) => void;
  toggleFavorite: (id: string) => void;
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
  deleteWorkout: (id: string) => void;
  editWorkout: (id: string) => void;
  setWorkoutHr: (id: string, avg?: number, max?: number, series?: HrSample[], kcal?: number) => void;
  dismissHealthWorkouts: (uuids: string[]) => void;
  importHealthWorkout: (hw: {
    uuid: string;
    name: string;
    start: number;
    end: number;
    avg?: number;
    max?: number;
    kcal?: number;
    series?: HrSample[];
  }) => string | null;
}

const DEFAULT_SETTINGS: Settings = { unit: 'kg', restDefaultSec: 90, increment: 2.5, incrementLb: 5, healthEnabled: false, bodyweightKg: 80, onboarded: false };

function patchActive(workouts: Workout[], activeId: string | null, fn: (w: Workout) => Workout): Workout[] {
  if (!activeId) return workouts;
  return workouts.map((w) => (w.id === activeId ? fn(w) : w));
}

/** Strip any superset tag that ends up with fewer than 2 members (no orphaned superset-of-one). */
function normalizeSupersets(exercises: LoggedExercise[]): LoggedExercise[] {
  const counts: Record<string, number> = {};
  exercises.forEach((le) => {
    if (le.supersetGroup) counts[le.supersetGroup] = (counts[le.supersetGroup] ?? 0) + 1;
  });
  return exercises.map((le) =>
    le.supersetGroup && (counts[le.supersetGroup] ?? 0) < 2 ? (({ supersetGroup, ...rest }) => rest)(le) : le,
  );
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      customExercises: [],
      exerciseMuscles: {},
      favoriteExercises: [],
      routines: [],
      workouts: [],
      activeWorkoutId: null,
      settings: DEFAULT_SETTINGS,
      appleUser: null,
      dismissedHealth: [],
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
          exerciseMuscles: {},
          favoriteExercises: [],
          routines: [],
          workouts: [],
          activeWorkoutId: null,
          settings: { ...DEFAULT_SETTINGS },
          appleUser: null,
          dismissedHealth: [],
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

      // reassign which muscles an exercise hits + unilateral flag (applies everywhere via selectors, incl. history)
      setExerciseMuscles: (id, primary, secondary, unilateral) =>
        set((s) => ({
          exerciseMuscles: {
            ...s.exerciseMuscles,
            [id]: { primary, secondary: secondary.filter((m) => m !== primary), ...(unilateral != null ? { unilateral } : {}) },
          },
        })),

      toggleFavorite: (id) =>
        set((s) => ({
          favoriteExercises: s.favoriteExercises.includes(id)
            ? s.favoriteExercises.filter((x) => x !== id)
            : [...s.favoriteExercises, id],
        })),

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
          bodyweightKg: st.settings.bodyweightKg, // snapshot: +KG u vlastní váhy se počítá z váhy PŘI tréninku
          exercises,
        };
        set((s) => ({ workouts: [...s.workouts, w], activeWorkoutId: w.id }));
        return w.id;
      },

      setWorkoutDate: (ms) =>
        set((s) => ({
          workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => {
            // shift a stashed edit-end by the same delta so an edited workout keeps its duration (no collapse)
            const delta = ms - w.startedAt;
            return { ...w, startedAt: ms, ...(w.editEndAt != null ? { editEndAt: w.editEndAt + delta } : {}) };
          }),
        })),

      addExerciseToActive: (exerciseId) =>
        set((s) => {
          // weighted-bodyweight exercises (shyby, dipy) pre-fill the weight with the user's bodyweight so
          // they don't retype it. bodyweight_reps (kliky) keep the column HIDDEN → no phantom tonnage.
          const ex = allExercises(s).find((e) => e.id === exerciseId);
          const bw = s.settings.bodyweightKg;
          let sets = prefillSets(lastPerformance(s.workouts, exerciseId), 3);
          if (ex?.tracking === 'weighted_bw' && bw > 0) sets = sets.map((st) => ({ ...st, weight: st.weight ?? bw }));
          // bodyweight_reps has a HIDDEN weight column — force weight null (even if history inherited one)
          else if (ex?.tracking === 'bodyweight_reps') sets = sets.map((st) => ({ ...st, weight: null }));
          return {
            workouts: patchActive(s.workouts, s.activeWorkoutId, (w) => ({
              ...w,
              exercises: [...w.exercises, { exerciseId, sets }],
            })),
          };
        }),

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
            exercises: normalizeSupersets(w.exercises.filter((_, i) => i !== exIndex)),
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
            // unlinking one pair of a 3+ member superset can leave a single-member group → strip it
            return { ...w, exercises: normalizeSupersets(exercises) };
          }),
        })),

      finishWorkout: () =>
        set((s) => {
          const id = s.activeWorkoutId;
          if (!id) return {};
          // keep an empty LIVE session that ran a while (cardio / Apple Watch HR with no logged sets),
          // but still discard accidental quick opens
          const KEEP_EMPTY_MS = 120_000;
          const workouts = s.workouts
            // drop sets that were never completed, then drop empty exercises
            .map((w) => {
              if (w.id !== id) return w;
              const exercises = w.exercises
                .map((le) => ({ ...le, sets: le.sets.filter((st) => st.done) }))
                .filter((le) => le.sets.length > 0);
              // editEndAt restores the original end (imported/HR workouts keep their duration + HR window)
              const rawEnd = w.editEndAt ?? (w.manual ? w.startedAt : Date.now());
              const finishedAt = Math.max(rawEnd, w.startedAt); // never invert if the date was changed mid-edit
              const { editEndAt, ...rest } = w;
              return { ...rest, exercises, finishedAt };
            })
            .filter((w) => {
              if (w.id !== id) return true;
              if (w.exercises.length > 0) return true;
              // keep empty sessions that carry Apple Health data (imported / heart rate), or a real
              // live run (ran ≥2 min); drop accidental quick opens
              const hasHealth =
                w.source === 'health' || !!w.healthUuid || w.avgHr != null || w.maxHr != null || !!w.hrSeries?.length;
              return hasHealth || (!w.manual && Date.now() - w.startedAt >= KEEP_EMPTY_MS);
            });
          return { workouts, activeWorkoutId: null };
        }),

      discardWorkout: () =>
        set((s) => ({
          workouts: s.workouts.filter((w) => w.id !== s.activeWorkoutId),
          activeWorkoutId: null,
        })),

      deleteWorkout: (id) =>
        set((s) => ({
          workouts: s.workouts.filter((w) => w.id !== id),
          activeWorkoutId: s.activeWorkoutId === id ? null : s.activeWorkoutId,
        })),

      // Re-open a finished workout for editing; keeps its original date (manual mode).
      editWorkout: (id) =>
        set((s) => ({
          activeWorkoutId: id,
          workouts: s.workouts.map((w) => {
            if (w.id !== id) return w;
            // any workout carrying heart-rate data keeps its ORIGINAL start+end window (so the HR graph
            // doesn't collapse to a single line when edited); others collapse to a single date as before
            const hasHr = w.source === 'health' || !!w.healthUuid || w.avgHr != null || w.maxHr != null || !!w.hrSeries?.length;
            if (hasHr) {
              return { ...w, manual: true, editEndAt: w.finishedAt ?? w.startedAt, finishedAt: undefined };
            }
            return { ...w, manual: true, startedAt: w.finishedAt ?? w.startedAt, finishedAt: undefined };
          }),
        })),

      setWorkoutHr: (id, avg, max, series, kcal) =>
        set((s) => ({
          workouts: s.workouts.map((w) =>
            w.id === id
              ? { ...w, avgHr: avg, maxHr: max, ...(series ? { hrSeries: series } : {}), ...(kcal ? { kcal } : {}) }
              : w,
          ),
        })),

      dismissHealthWorkouts: (uuids) =>
        set((s) => ({ dismissedHealth: Array.from(new Set([...s.dismissedHealth, ...uuids])) })),

      importHealthWorkout: (hw) => {
        const st = get();
        // dedup: never import the same HealthKit workout twice
        if (st.workouts.some((w) => w.healthUuid === hw.uuid)) return null;
        const w: Workout = {
          id: uid('w'),
          name: hw.name,
          startedAt: hw.start,
          finishedAt: hw.end,
          healthUuid: hw.uuid,
          source: 'health',
          avgHr: hw.avg,
          maxHr: hw.max,
          kcal: hw.kcal,
          hrSeries: hw.series,
          exercises: [],
        };
        set((s) => ({ workouts: [...s.workouts, w] }));
        return w.id;
      },
    }),
    {
      name: 'setly-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        customExercises: s.customExercises,
        exerciseMuscles: s.exerciseMuscles,
        favoriteExercises: s.favoriteExercises,
        routines: s.routines,
        workouts: s.workouts,
        activeWorkoutId: s.activeWorkoutId,
        settings: s.settings,
        appleUser: s.appleUser,
        dismissedHealth: s.dismissedHealth,
      }),
      // deep-merge settings so newly added fields (e.g. incrementLb) keep their defaults for existing users
      merge: (persisted: any, current) => {
        const merged = {
          ...current,
          ...(persisted ?? {}),
          settings: { ...current.settings, ...(persisted?.settings ?? {}) },
        };
        // editEndAt is transient (only the actively-edited workout carries it); drop any stray copy that
        // survived an app kill mid-edit so it never lingers on a finished record.
        if (Array.isArray(merged.workouts)) {
          merged.workouts = merged.workouts.map((w: any) =>
            w && w.editEndAt != null && w.id !== merged.activeWorkoutId
              ? (({ editEndAt, ...rest }) => rest)(w)
              : w,
          );
          // migration: older records have no bodyweight snapshot — stamp the current setting so the
          // +KG display of weighted-bodyweight sets (stored as TOTAL kg) resolves deterministically
          const bw = merged.settings?.bodyweightKg ?? 80;
          merged.workouts = merged.workouts.map((w: any) => (w && w.bodyweightKg == null ? { ...w, bodyweightKg: bw } : w));
        }
        return merged;
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

// ---- selectors ----
export function allExercises(s: Pick<State, 'customExercises'> & Partial<Pick<State, 'exerciseMuscles'>>): Exercise[] {
  const overrides = s.exerciseMuscles ?? {};
  return [...SEED_EXERCISES, ...s.customExercises].map((e) => {
    const o = overrides[e.id];
    return o
      ? {
          ...e,
          primary: o.primary,
          secondary: o.secondary.length ? o.secondary : undefined,
          unilateral: o.unilateral ?? e.unilateral,
        }
      : e;
  });
}
export function exercisesById(s: Pick<State, 'customExercises'> & Partial<Pick<State, 'exerciseMuscles'>>): Record<string, Exercise> {
  return Object.fromEntries(allExercises(s).map((e) => [e.id, e]));
}
export function activeWorkout(s: Pick<State, 'workouts' | 'activeWorkoutId'>): Workout | null {
  return s.workouts.find((w) => w.id === s.activeWorkoutId) ?? null;
}
export function history(s: Pick<State, 'workouts'>): Workout[] {
  return s.workouts.filter((w) => w.finishedAt).sort((a, b) => b.finishedAt! - a.finishedAt!);
}
/** True if a natively-logged Steelset workout overlaps [start, end] — so a Health workout for the
 *  same session isn't offered again as a separate import (avoids duplicate records). */
export function localCoversWindow(workouts: Workout[], start: number, end: number): boolean {
  return workouts.some((w) => w.finishedAt != null && !w.healthUuid && start < w.finishedAt && w.startedAt < end);
}
export { isCountable };

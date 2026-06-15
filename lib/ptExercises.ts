import type { PTExercise } from '../types';

export const PT_EXERCISES: PTExercise[] = [
  {
    id: 'side_lying_abduction',
    name: 'Side-lying Hip Abduction',
    sets: 3,
    reps: 15,
    description:
      'Lie on your side, legs straight. Slowly lift the top leg to about 30–45°, hold 1 second, then lower with control. Do all reps on one side, then switch.',
    tip: 'Keep your hips stacked — do not rotate backward as you lift.',
  },
  {
    id: 'clamshells',
    name: 'Clamshells',
    sets: 3,
    reps: 20,
    description:
      'Lie on your side with hips and knees bent at ~45°. Keep feet together and rotate the top knee open like a clamshell lid. Lower with control.',
    tip: 'Place your hand on your top hip to make sure the pelvis does not roll back. Add a resistance band when this feels easy.',
  },
  {
    id: 'standing_abduction',
    name: 'Standing Hip Abduction',
    sets: 3,
    reps: 15,
    description:
      'Stand near a wall for balance. With a resistance band around your ankles, slowly raise one leg out to the side about 30°. Lower with control.',
    tip: 'Keep your trunk upright — resist the urge to lean away from the working leg.',
  },
  {
    id: 'glute_bridge',
    name: 'Glute Bridge',
    sets: 3,
    reps: 20,
    description:
      'Lie on your back, knees bent, feet flat on the floor. Drive hips toward the ceiling, squeeze glutes at the top, hold 2 seconds, then lower.',
    tip: 'Progress to single-leg glute bridge once the double-leg version is fully pain-free.',
  },
  {
    id: 'monster_walks',
    name: 'Monster Walks (Resistance Band)',
    sets: 3,
    reps: 10,
    description:
      'Place a band around your ankles. Adopt a slight squat position. Step sideways 10 steps in one direction, then 10 back. Keep constant tension on the band.',
    tip: 'Feet should stay hip-width apart — do not let the band pull them together.',
  },
  {
    id: 'fire_hydrants',
    name: 'Fire Hydrants',
    sets: 3,
    reps: 15,
    description:
      'On hands and knees, keeping the knee bent at 90°, lift one knee out to the side (like a dog at a fire hydrant). Lower slowly.',
    tip: 'Keep your hips level — they should not tilt or rotate as you raise your knee.',
  },
  {
    id: 'single_leg_balance',
    name: 'Single-Leg Balance',
    sets: 3,
    duration: '30 sec',
    description:
      'Stand on one foot with a slight bend in the knee. Hold 30 seconds. Progress: close eyes, stand on a folded towel or foam pad.',
    tip: "Focus on keeping your pelvis level — preventing it from dropping is exactly what the gluteus minimus does during running.",
  },
  {
    id: 'hip_flexor_stretch',
    name: 'Hip Flexor Stretch (Low Lunge)',
    sets: 3,
    duration: '30 sec',
    description:
      'Kneel on one knee, step the other foot forward (90/90 lunge). Gently shift your hips forward until you feel a stretch in the front of the back hip.',
    tip: 'Keep your trunk tall and core lightly engaged to avoid excessive lower-back arch.',
  },
];

export function getDailyPTExercises(phase: number): PTExercise[] {
  if (phase <= 2) {
    return PT_EXERCISES;
  }
  // Maintenance phase: just the stability essentials
  return PT_EXERCISES.filter(e =>
    ['clamshells', 'glute_bridge', 'single_leg_balance', 'side_lying_abduction'].includes(e.id)
  );
}

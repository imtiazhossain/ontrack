import {
  MOVEMENT_LABELS,
  movementPatternForExercise,
  type MovementPattern,
} from './exercise-motion';
import type { ExerciseTemplate, MuscleTarget } from './muscle-data';

export interface ExerciseFormStep {
  id: string;
  title: string;
  cue: string;
}

const PATTERN_PHASES: Record<
  MovementPattern,
  Array<{ id: string; title: string; template: string }>
> = {
  'horizontal-push': [
    { id: 'setup', title: 'Set up', template: 'Brace your trunk. Plant your feet. Stack wrists over elbows before you move.' },
    { id: 'load', title: 'Load', template: 'Lower under control so {target} takes the stretch without dumping the shoulders forward.' },
    { id: 'drive', title: 'Drive', template: 'Press through a smooth path. Keep ribs quiet and finish stacked over the mid-line.' },
    { id: 'lock', title: 'Lockout', template: 'Finish tall without shrugging. Feel {target} stay engaged through the last inch.' },
  ],
  'vertical-press': [
    { id: 'setup', title: 'Set up', template: 'Stack ribs over pelvis. Grip securely and keep the neck long.' },
    { id: 'press', title: 'Press', template: 'Drive overhead without flaring the ribs. Lead with elbows, not the traps.' },
    { id: 'peak', title: 'Peak', template: 'Pause briefly at the top with {target} owning the finish.' },
    { id: 'lower', title: 'Lower', template: 'Return under control to the start. Keep shoulders away from the ears.' },
  ],
  'vertical-pull': [
    { id: 'setup', title: 'Set up', template: 'Reach long, depress the shoulder blades, and keep the neck quiet.' },
    { id: 'pull', title: 'Pull', template: 'Drive elbows toward your pockets so {target} initiates the pull.' },
    { id: 'squeeze', title: 'Squeeze', template: 'Pause with the shoulder blades set. Avoid yanking with the arms alone.' },
    { id: 'extend', title: 'Extend', template: 'Return to a full reach without losing trunk tension.' },
  ],
  row: [
    { id: 'setup', title: 'Set up', template: 'Hinge or support the torso. Keep the neck long and the grip secure.' },
    { id: 'row', title: 'Row', template: 'Lead with the elbows. Pull so {target} retracts without shrugging.' },
    { id: 'hold', title: 'Hold', template: 'Pause with the shoulder blades gently together and ribs quiet.' },
    { id: 'return', title: 'Return', template: 'Lengthen the arms under control without rounding the upper back.' },
  ],
  curl: [
    { id: 'setup', title: 'Set up', template: 'Pin the upper arms. Keep wrists neutral and elbows under the load.' },
    { id: 'flex', title: 'Curl', template: 'Flex through a full range so {target} owns the lift.' },
    { id: 'squeeze', title: 'Squeeze', template: 'Pause briefly at peak contraction without swinging the torso.' },
    { id: 'lower', title: 'Lower', template: 'Lower slowly to full extension while keeping the elbows quiet.' },
  ],
  'triceps-extension': [
    { id: 'setup', title: 'Set up', template: 'Stabilize the upper arms. Stack wrists and keep shoulders quiet.' },
    { id: 'bend', title: 'Bend', template: 'Flex only at the elbows so {target} lengthens under control.' },
    { id: 'extend', title: 'Extend', template: 'Straighten fully without flaring the elbows or rolling the shoulders.' },
    { id: 'lock', title: 'Finish', template: 'Squeeze at lockout, then reverse with the same tempo.' },
  ],
  squat: [
    { id: 'setup', title: 'Set up', template: 'Root the feet. Brace 360°. Keep the chest stacked over the mid-foot.' },
    { id: 'descend', title: 'Descend', template: 'Sit the hips down and back. Track knees with toes while {target} loads.' },
    { id: 'depth', title: 'Depth', template: 'Own a depth you control without collapsing the trunk.' },
    { id: 'stand', title: 'Stand', template: 'Drive up evenly through the feet and finish tall without leaning back.' },
  ],
  'knee-extension': [
    { id: 'setup', title: 'Set up', template: 'Sit or stand tall with the knee tracking straight ahead.' },
    { id: 'extend', title: 'Extend', template: 'Straighten the knee so {target} owns the final degrees.' },
    { id: 'pause', title: 'Pause', template: 'Hold briefly without snapping the joint locked.' },
    { id: 'return', title: 'Return', template: 'Lower under control and keep the pelvis quiet.' },
  ],
  hinge: [
    { id: 'setup', title: 'Set up', template: 'Soft knees. Brace. Soften the hips without rounding the low back.' },
    { id: 'hinge', title: 'Hinge', template: 'Push the hips back so {target} lengthens while the spine stays long.' },
    { id: 'stretch', title: 'Stretch', template: 'Stop before the low back rounds. Keep weight mid-foot to heel.' },
    { id: 'drive', title: 'Drive', template: 'Drive the hips forward to stand tall without hyperextending.' },
  ],
  'knee-flexion': [
    { id: 'setup', title: 'Set up', template: 'Stabilize the hips. Keep the knee tracking straight.' },
    { id: 'curl', title: 'Curl', template: 'Flex the knee so {target} shortens without twisting the pelvis.' },
    { id: 'squeeze', title: 'Squeeze', template: 'Pause at peak flexion with even tension through the thigh.' },
    { id: 'lower', title: 'Lower', template: 'Extend slowly and keep the hips square.' },
  ],
  core: [
    { id: 'setup', title: 'Set up', template: 'Stack ribs over pelvis. Soften the knees and lengthen the neck.' },
    { id: 'brace', title: 'Brace', template: 'Exhale gently and brace 360° so {target} stiffens the trunk.' },
    { id: 'hold', title: 'Hold', template: 'Maintain position without dumping into the low back or neck.' },
    { id: 'breathe', title: 'Breathe', template: 'Keep breathing while tension stays even through the torso.' },
  ],
  carry: [
    { id: 'setup', title: 'Set up', template: 'Pick up tall. Pack the shoulders and brace before you walk.' },
    { id: 'walk', title: 'Walk', template: 'Short stable steps. Keep the rib cage quiet over the pelvis.' },
    { id: 'stabilize', title: 'Stabilize', template: 'Resist side bend so {target} and the trunk stay stacked.' },
    { id: 'set', title: 'Set down', template: 'Place the load down with the same posture you walked with.' },
  ],
  'hip-abduction': [
    { id: 'setup', title: 'Set up', template: 'Keep the pelvis level. Soften the standing knee if needed.' },
    { id: 'abduct', title: 'Abduct', template: 'Move the thigh outward so {target} drives the motion.' },
    { id: 'pause', title: 'Pause', template: 'Pause without hiking the hip or rolling the pelvis back.' },
    { id: 'return', title: 'Return', template: 'Return under control and reset level hips.' },
  ],
  calf: [
    { id: 'setup', title: 'Set up', template: 'Root through the mid-foot. Soften the knees unless the drill says otherwise.' },
    { id: 'rise', title: 'Rise', template: 'Rise through the big toe so {target} lifts the heel cleanly.' },
    { id: 'pause', title: 'Pause', template: 'Pause at the top without bouncing.' },
    { id: 'lower', title: 'Lower', template: 'Lower through a full comfortable range under control.' },
  ],
  isolation: [
    { id: 'setup', title: 'Set up', template: 'Stabilize the joints that should stay quiet for this drill.' },
    { id: 'move', title: 'Move', template: 'Move only through the intended range so {target} owns the work.' },
    { id: 'control', title: 'Control', template: 'Use a smooth tempo. Avoid momentum and extra joint motion.' },
    { id: 'reset', title: 'Reset', template: 'Return to the start and reset posture before the next rep.' },
  ],
};

const EXERCISE_OVERRIDES: Partial<Record<string, ExerciseFormStep[]>> = {
  'bench-press': [
    { id: 'setup', title: 'Set up', cue: 'Plant both feet. Pull shoulder blades into the bench. Take a secure grip.' },
    { id: 'unrack', title: 'Unrack', cue: 'Lock the bar out over mid-chest. Wrists stacked over elbows before you start the rep.' },
    { id: 'lower', title: 'Lower', cue: 'Control the descent. Elbows track under the bar as pecs load under stretch.' },
    { id: 'bottom', title: 'Chest touch', cue: 'Touch mid-chest without bouncing. Stay braced through the torso and legs.' },
    { id: 'press', title: 'Press', cue: 'Drive the bar up and slightly back to lockout. Finish with pecs and triceps stacked.' },
  ],
  'front-plank': [
    { id: 'setup', title: 'Set up', cue: 'Forearms planted, elbows under shoulders, legs long and quiet.' },
    { id: 'brace', title: 'Brace', cue: 'Exhale and brace 360°. Glutes lightly on, neck long.' },
    { id: 'hold', title: 'Hold', cue: 'Keep a straight line from head to heels without sagging or piking.' },
    { id: 'breathe', title: 'Breathe', cue: 'Keep breathing while the trunk stays stiff and even.' },
  ],
};

function fillTarget(template: string, targetLabel: string) {
  return template.replaceAll('{target}', targetLabel.toLowerCase());
}

/** Form cues for Anatomy in Motion — exercise overrides when present, else pattern phases. */
export function formStepsForExercise(
  exercise: Pick<ExerciseTemplate, 'id' | 'name'>,
  primaryTarget: Pick<MuscleTarget, 'label' | 'cue'>,
): ExerciseFormStep[] {
  const override = EXERCISE_OVERRIDES[exercise.id];
  if (override) return override;

  const pattern = movementPatternForExercise(exercise);
  const phases = PATTERN_PHASES[pattern];
  const target = primaryTarget.label;
  const steps = phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
    cue: fillTarget(phase.template, target),
  }));

  // Append the muscle-specific feel cue as a final “own it” beat.
  steps.push({
    id: 'feel',
    title: 'Own it',
    cue: primaryTarget.cue || `Keep tension in ${target.toLowerCase()} through every rep of ${exercise.name}.`,
  });

  return steps;
}

export function movementLabelForExercise(exercise: Pick<ExerciseTemplate, 'id'>): string {
  return MOVEMENT_LABELS[movementPatternForExercise(exercise)];
}

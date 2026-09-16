/**
 * EXERCISE CATALOG & DATASET INTEGRATION
 * Movement animations and media referenced from open-source dataset:
 * https://github.com/hasaneyldrm/exercises-dataset
 * Raw media hosted at: https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/
 */

export interface ExerciseGuide {
  id: string;
  name: string;
  normalizedName: string;
  targetMuscle: string;
  secondaryMuscles: string[];
  bodyPart: string;
  equipment: string;
  animationUrl: string;
  thumbnailUrl: string;
  instructions: string[];
  coachingCues: string[];
  formWarnings: string[];
}

const RAW_MEDIA_BASE =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main";

export const EXERCISE_DATABASE: Record<string, ExerciseGuide> = {
  bench_press: {
    id: "0025",
    name: "Barbell Bench Press",
    normalizedName: "bench_press",
    targetMuscle: "Pectorals (Chest)",
    secondaryMuscles: ["Anterior Deltoids", "Triceps Brachii"],
    bodyPart: "chest",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0025-EIeI8Vf.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0025-EIeI8Vf.jpg`,
    instructions: [
      "Lie flat on the bench with eyes positioned directly under the barbell.",
      "Retract and depress your shoulder blades into the bench to establish a solid base.",
      "Grip the bar slightly wider than shoulder-width with wrists straight and stacked above elbows.",
      "Unrack the bar and stabilize it directly over your chest with elbows locked.",
      "Lower the bar under control (2-second eccentric descent) to your mid-sternum.",
      "Drive your feet into the floor, press the bar explosively back to starting position without losing scapular tightness.",
    ],
    coachingCues: [
      "2-second eccentric descent — touch the sternum softly, never bounce.",
      "Tuck elbows at ~45 to 70 degrees; do not flare out to 90 degrees.",
      "Drive heels into the floor throughout the concentric press for leg drive.",
    ],
    formWarnings: [
      "No bouncing the barbell off the ribcage.",
      "Do not lift your glutes or hips off the bench during heavy effort.",
      "Avoid bent or hyper-extended wrists; keep bar resting low in the palm.",
    ],
  },

  squat: {
    id: "0043",
    name: "Barbell Full Squat",
    normalizedName: "squat",
    targetMuscle: "Quadriceps & Glutes",
    secondaryMuscles: ["Hamstrings", "Erector Spinae", "Calves", "Core"],
    bodyPart: "upper legs",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0043-qXTaZnJ.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0043-qXTaZnJ.jpg`,
    instructions: [
      "Step under the barbell, resting it across your upper traps (high bar) or rear delts (low bar).",
      "Unrack with a firm stance, take 2-3 calculated steps backward, feet shoulder-width apart.",
      "Inhale deeply and brace your core 360 degrees using the Valsalva maneuver.",
      "Break at the hips and knees simultaneously, pushing knees outward in the direction of your toes.",
      "Descend smoothly until hip crease breaks parallel with the top of the knee.",
      "Drive forcefully through the midfoot to return to upright lockout, exhaling past sticking point.",
    ],
    coachingCues: [
      "Push knees out in line with your toes throughout both descent and ascent.",
      "Maintain a proud chest and neutral spine; avoid chest collapsing forward.",
      "Break parallel cleanly with full control before reversing direction.",
    ],
    formWarnings: [
      "No knee cave (valgus collapse) during concentric drive.",
      "Do not allow heels to elevate off the floor.",
      "Never round lower back (butt wink) under heavy spinal load.",
    ],
  },

  deadlift: {
    id: "0032",
    name: "Barbell Deadlift",
    normalizedName: "deadlift",
    targetMuscle: "Posterior Chain (Glutes & Hamstrings)",
    secondaryMuscles: ["Erector Spinae", "Trapezius", "Latissimus Dorsi", "Forearms"],
    bodyPart: "back",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0032-ila4NZS.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0032-ila4NZS.jpg`,
    instructions: [
      "Stand with midfoot directly under the barbell, feet hip-width apart.",
      "Hinge at hips to grip the bar just outside your knees with an overhand or mixed grip.",
      "Bring shins forward until they touch the bar, drop hips slightly, and pull slack out of the bar.",
      "Engage lats by 'protecting your armpits' and lock a rigid neutral spine.",
      "Push the floor away with your legs, keeping the bar dragging tightly up your shins and thighs.",
      "Lock out hips by squeezing glutes at the top without hyperextending the lumbar spine.",
    ],
    coachingCues: [
      "Pull the slack out of the barbell until you hear the click before breaking the floor.",
      "Keep bar in continuous contact with your shins and thighs throughout.",
      "Think 'leg press the floor away' rather than yanking with your lower back.",
    ],
    formWarnings: [
      "No rounded lower back (spinal flexion) off the floor.",
      "Do not hyperextend or lean backward at lockout.",
      "Never allow bar to drift away from body center of mass.",
    ],
  },

  overhead_press: {
    id: "0091",
    name: "Barbell Overhead Press",
    normalizedName: "overhead_press",
    targetMuscle: "Anterior & Lateral Deltoids",
    secondaryMuscles: ["Triceps Brachii", "Upper Pectorals", "Trapezius", "Core"],
    bodyPart: "shoulders",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0091-kTbSH9h.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0091-kTbSH9h.jpg`,
    instructions: [
      "Grip the bar just outside shoulders with forearms vertical and elbows slightly forward of the bar.",
      "Rest the bar on your anterior clavicle / front deltoids in the rack position.",
      "Brace core, squeeze glutes, and tilt head back slightly to clear bar path.",
      "Press vertically in a straight line, shifting torso under the bar as it clears forehead.",
      "Lock out overhead with bar centered directly over midfoot, traps shrugged upward.",
      "Lower under control back to clavicle resting position.",
    ],
    coachingCues: [
      "Squeeze glutes and quads maximally to create a rigid kinetic foundation.",
      "Press the bar close to your face; push head forward through the 'window' at lockout.",
      "Maintain stacked vertical forearms under the bar throughout the drive.",
    ],
    formWarnings: [
      "No excessive lumbar extension (leaning back) to turn it into an incline press.",
      "Do not bounce bar off chest or use knee dip momentum (strict press only).",
      "Avoid flared elbows wide of the wrists during press.",
    ],
  },

  barbell_row: {
    id: "0027",
    name: "Barbell Bent Over Row",
    normalizedName: "barbell_row",
    targetMuscle: "Upper Back & Latissimus Dorsi",
    secondaryMuscles: ["Rhomboids", "Rear Deltoids", "Biceps Brachii", "Erectors"],
    bodyPart: "back",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0027-eZyBC3j.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0027-eZyBC3j.jpg`,
    instructions: [
      "Stand with feet shoulder-width, holding barbell with overhand grip slightly wider than knees.",
      "Hinge hips back until torso is angled at approximately 45 degrees relative to floor.",
      "Keep spine neutral and lats pre-engaged.",
      "Pull the bar smoothly into your upper waist/navel, driving elbows backward toward ceiling.",
      "Squeeze shoulder blades together firmly for 1 second at top contraction.",
      "Lower bar slowly under complete muscular tension until arms are extended.",
    ],
    coachingCues: [
      "Pull with your elbows, not your hands; imagine hooking with your fingers.",
      "Keep torso stationary throughout; avoid rocking up and down with momentum.",
      "Hold full peak contraction at the navel for a distinct 1-second pause.",
    ],
    formWarnings: [
      "No vertical body English or swinging torso upward to move the weight.",
      "Never round lumbar spine under bent-over posture.",
      "Do not yank or drop the weight rapidly during eccentric descent.",
    ],
  },

  pull_up: {
    id: "0652",
    name: "Pull-Up",
    normalizedName: "pull_up",
    targetMuscle: "Latissimus Dorsi",
    secondaryMuscles: ["Biceps Brachii", "Posterior Deltoid", "Rhomboids", "Core"],
    bodyPart: "back",
    equipment: "body weight",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0652-lBDjFxJ.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0652-lBDjFxJ.jpg`,
    instructions: [
      "Grasp pull-up bar with overhand grip slightly wider than shoulder-width.",
      "Start in a dead hang with arms fully extended and core braced.",
      "Initiate the pull by depressing shoulder blades downward and pulling chest up.",
      "Drive elbows downward into your back pockets until chin clears the bar comfortably.",
      "Pause briefly at peak contraction without swinging.",
      "Lower under full control back down to dead hang position.",
    ],
    coachingCues: [
      "Lead with your chest toward the bar, not just tucking your chin over.",
      "Depress scapulae first before bending your elbows.",
      "Control descent for full 2-3 seconds to maximize lat eccentric stimulus.",
    ],
    formWarnings: [
      "No kipping, swinging legs, or using momentum.",
      "Avoid cutting range of motion short at the bottom (achieve full dead hang).",
      "Do not round shoulders forward at the top of the pull.",
    ],
  },

  dumbbell_lateral_raise: {
    id: "0334",
    name: "Dumbbell Lateral Raise",
    normalizedName: "dumbbell_lateral_raise",
    targetMuscle: "Lateral Deltoid (Shoulder Width)",
    secondaryMuscles: ["Trapezius", "Anterior Deltoid"],
    bodyPart: "shoulders",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0334-DsgkuIt.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0334-DsgkuIt.jpg`,
    instructions: [
      "Stand tall with dumbbells at sides, slight forward torso tilt, slight bend in elbows.",
      "Initiate movement by raising arms out to the sides in the scapular plane (30° forward).",
      "Lead with the elbows until upper arms are parallel to floor.",
      "Pause for 1 second at shoulder height, pouring out water sensation with pinkies slightly up.",
      "Lower dumbbells under strict 3-second eccentric control.",
    ],
    coachingCues: [
      "Lead with your elbows, not your hands or wrists.",
      "Keep traps relaxed; do not shrug weight upward toward your ears.",
      "Stay in the 10-15 rep sweet spot with controlled pauses at top.",
    ],
    formWarnings: [
      "Zero hip swinging or bouncing knees to heave dumbbells up.",
      "Do not raise above parallel; hyperextension impinges the rotator cuff.",
      "Avoid letting wrists droop below elbow level.",
    ],
  },

  cable_pushdown: {
    id: "0201",
    name: "Cable Triceps Pushdown",
    normalizedName: "cable_pushdown",
    targetMuscle: "Triceps Brachii (Lateral & Medial Heads)",
    secondaryMuscles: ["Forearms", "Anterior Deltoids (stabilizer)"],
    bodyPart: "upper arms",
    equipment: "cable",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0201-3ZflifB.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0201-3ZflifB.jpg`,
    instructions: [
      "Attach straight or V-bar to high cable pulley, grip with palms facing down.",
      "Pin elbows against ribcage with slight torso hinge forward.",
      "Push attachment downward toward thighs until elbows reach full lockout.",
      "Contract triceps forcefully at the bottom for 1 second.",
      "Allow forearms to rise slowly to upper chest level while keeping elbows pinned.",
    ],
    coachingCues: [
      "Glue elbows to your sides; only the forearms should move.",
      "Squeeze triceps hard at full extension without unlocking shoulders.",
      "Control the eccentric return until forearms are just past 90 degrees.",
    ],
    formWarnings: [
      "Do not flare elbows outward or allow them to drift forward and back.",
      "No hunching over the bar or using bodyweight to push down.",
      "Avoid rapid bouncing at the bottom lockout.",
    ],
  },

  romanian_deadlift: {
    id: "0032",
    name: "Romanian Deadlift (RDL)",
    normalizedName: "romanian_deadlift",
    targetMuscle: "Hamstrings & Gluteus Maximus",
    secondaryMuscles: ["Erector Spinae", "Trapezius", "Forearms"],
    bodyPart: "upper legs",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0032-ila4NZS.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0032-ila4NZS.jpg`,
    instructions: [
      "Unrack barbell at hip height with overhand grip and soft bend in knees.",
      "Brace core and hinge at hips, pushing your butt backward toward the rear wall.",
      "Lower bar close to shins until you feel an intense stretch in the hamstrings.",
      "Maintain flat back and neutral neck throughout the entire descent.",
      "Drive hips forward forcefully to return to standing position, squeezing glutes at top.",
    ],
    coachingCues: [
      "Think of pushing your hips back to touch a wall behind you, not bending forward.",
      "Keep bar sliding against your thighs and shins at all times.",
      "Stop descent once hips stop moving backward (usually just below knees).",
    ],
    formWarnings: [
      "Do not round upper or lower back.",
      "Avoid turning the lift into a conventional squat by bending knees excessively.",
      "Do not drop neck or look up toward ceiling; keep chin tucked.",
    ],
  },

  dumbbell_bench_press: {
    id: "0025",
    name: "Dumbbell Flat Bench Press",
    normalizedName: "dumbbell_bench_press",
    targetMuscle: "Pectorals (Chest)",
    secondaryMuscles: ["Anterior Deltoids", "Triceps Brachii"],
    bodyPart: "chest",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0025-EIeI8Vf.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0025-EIeI8Vf.jpg`,
    instructions: [
      "Sit on flat bench with dumbbells resting on knees, then kick back onto bench.",
      "Set feet firmly on floor, retract scapulae, hold dumbbells at outer chest level.",
      "Press dumbbells upward along a converging arc until arms are extended above chest.",
      "Lower slowly under full control for 2 seconds to get a deep pectoral stretch.",
      "Reverse smoothly without clashing dumbbells together at top.",
    ],
    coachingCues: [
      "Keep elbows tucked at roughly 60 degrees from torso.",
      "Achieve deep comfortable chest stretch at the bottom of each rep.",
      "Keep wrists rigid and stacked directly over elbows.",
    ],
    formWarnings: [
      "Do not bang dumbbells together at the top of the rep.",
      "Avoid lifting feet off floor or squirming on the bench.",
      "Never drop dumbbells carelessly to floor; use knees to spot down.",
    ],
  },

  box_squat: {
    id: "0043",
    name: "Barbell Box Squat",
    normalizedName: "box_squat",
    targetMuscle: "Glutes & Hamstrings",
    secondaryMuscles: ["Quadriceps", "Erector Spinae", "Adductors"],
    bodyPart: "upper legs",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0043-qXTaZnJ.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0043-qXTaZnJ.jpg`,
    instructions: [
      "Position a stable box or bench at parallel height behind squat rack.",
      "Unrack barbell across upper back and establish a slightly wider squat stance.",
      "Hinge hips back and push knees outward, descending with control onto the box.",
      "Sit onto the box with a brief pause without relaxing core or lumbar spine.",
      "Drive heels into floor and explode upward to full standing lockout.",
    ],
    coachingCues: [
      "Sit back onto the box; do not bounce off it.",
      "Keep torso braced and rigid during the momentary box pause.",
      "Push the floor away violently with heels on the concentric rise.",
    ],
    formWarnings: [
      "Never crash down onto the box or rock torso backward to gain momentum.",
      "Keep core pressurized during the pause on the box.",
    ],
  },

  neutral_grip_dumbbell_press: {
    id: "0091",
    name: "Neutral Grip Dumbbell Overhead Press",
    normalizedName: "neutral_grip_dumbbell_press",
    targetMuscle: "Anterior Deltoids",
    secondaryMuscles: ["Triceps Brachii", "Upper Chest", "Rotator Cuff"],
    bodyPart: "shoulders",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0091-kTbSH9h.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0091-kTbSH9h.jpg`,
    instructions: [
      "Hold dumbbells at shoulder height with palms facing each other (neutral grip).",
      "Brace core tightly and press dumbbells vertically overhead.",
      "Reach full elbow extension at the top with dumbbells aligned over ears.",
      "Lower under control back to shoulders with elbows tracking naturally forward.",
    ],
    coachingCues: [
      "Palms stay facing each other throughout to spare the shoulder joint.",
      "Press straight up; do not allow arms to flare wide.",
      "Keep ribs down and core engaged to prevent arching the back.",
    ],
    formWarnings: [
      "No arching lower back or pushing belly forward.",
      "Do not drop dumbbells abruptly at the bottom.",
    ],
  },
};

/**
 * Normalizes an arbitrary exercise name string (e.g., "Barbell Bench Press", "bench_press", "Squat 1RM")
 */
export function normalizeExerciseName(rawName: string): string {
  const clean = rawName
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

  if (clean.includes("bench")) {
    if (clean.includes("dumbbell")) return "dumbbell_bench_press";
    return "bench_press";
  }
  if (clean.includes("squat")) {
    if (clean.includes("box")) return "box_squat";
    return "squat";
  }
  if (clean.includes("deadlift")) {
    if (clean.includes("romanian") || clean.includes("rdl"))
      return "romanian_deadlift";
    return "deadlift";
  }
  if (clean.includes("overhead") || clean.includes("military") || clean.includes("shoulder press")) {
    if (clean.includes("dumbbell") || clean.includes("neutral"))
      return "neutral_grip_dumbbell_press";
    return "overhead_press";
  }
  if (clean.includes("row")) {
    return "barbell_row";
  }
  if (clean.includes("pull up") || clean.includes("chin up") || clean.includes("pullup")) {
    return "pull_up";
  }
  if (clean.includes("lateral") || clean.includes("delt raise")) {
    return "dumbbell_lateral_raise";
  }
  if (clean.includes("pushdown") || clean.includes("tricep")) {
    return "cable_pushdown";
  }

  return clean.replace(/\s+/g, "_");
}

/**
 * Looks up full exercise guide with fallback heuristics
 */
export function getExerciseGuide(rawName: string): ExerciseGuide {
  const normKey = normalizeExerciseName(rawName);

  if (EXERCISE_DATABASE[normKey]) {
    return EXERCISE_DATABASE[normKey];
  }

  // Fallback generic guide for uncataloged exercises
  const displayName = rawName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id: `custom_${normKey}`,
    name: displayName,
    normalizedName: normKey,
    targetMuscle: "Primary Target Muscle",
    secondaryMuscles: ["Core", "Stabilizers"],
    bodyPart: "general",
    equipment: "barbell / dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0025-EIeI8Vf.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0025-EIeI8Vf.jpg`,
    instructions: [
      `Set up in a solid athletic position for ${displayName}.`,
      "Engage your core, maintain a neutral spine, and stabilize joints.",
      "Control the eccentric descent for 2 full seconds.",
      "Execute the concentric drive forcefully with zero momentum.",
      "Pause for peak contraction before repeating.",
    ],
    coachingCues: [
      "2-second eccentric descent — never drop the weight.",
      "Stop sets at technical failure; preserve form under load.",
      "Keep joint alignment stacked (wrists over elbows, knees tracking toes).",
    ],
    formWarnings: [
      "No swinging, body English, or relying on bounce/momentum.",
      "Cease immediately if any joint or tendon pain emerges.",
    ],
  };
}

/**
 * Returns all catalog exercises as an array
 */
export function getAllExerciseGuides(): ExerciseGuide[] {
  return Object.values(EXERCISE_DATABASE);
}

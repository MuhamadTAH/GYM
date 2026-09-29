/**
 * EXERCISE CATALOG & DATASET INTEGRATION
 * Movement animations and media referenced from open-source dataset:
 * https://github.com/hasaneyldrm/exercises-dataset
 * Raw media hosted at: https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/
 */

import exerciseCatalogRaw from "@/data/exercise-catalog.json";

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

export const RAW_MEDIA_BASE =
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
    id: "0085",
    name: "Barbell Romanian Deadlift (RDL)",
    normalizedName: "romanian_deadlift",
    targetMuscle: "Hamstrings & Gluteus Maximus",
    secondaryMuscles: ["Erector Spinae", "Trapezius", "Forearms"],
    bodyPart: "upper legs",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0085-wQ2c4XD.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0085-wQ2c4XD.jpg`,
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
    id: "0289",
    name: "Dumbbell Flat Bench Press",
    normalizedName: "dumbbell_bench_press",
    targetMuscle: "Pectorals (Chest)",
    secondaryMuscles: ["Anterior Deltoids", "Triceps Brachii"],
    bodyPart: "chest",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0289-SpYC0Kp.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0289-SpYC0Kp.jpg`,
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
    id: "0426",
    name: "Neutral Grip Dumbbell Overhead Press",
    normalizedName: "neutral_grip_dumbbell_press",
    targetMuscle: "Anterior Deltoids",
    secondaryMuscles: ["Triceps Brachii", "Upper Chest", "Rotator Cuff"],
    bodyPart: "shoulders",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0426-A6wtbuL.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0426-A6wtbuL.jpg`,
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

  leg_press: {
    id: "1463",
    name: "Sled 45° Leg Press",
    normalizedName: "leg_press",
    targetMuscle: "Quadriceps & Glutes",
    secondaryMuscles: ["Hamstrings", "Calves"],
    bodyPart: "upper legs",
    equipment: "sled machine",
    animationUrl: `${RAW_MEDIA_BASE}/videos/1463-2Qh2J1e.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/1463-2Qh2J1e.jpg`,
    instructions: [
      "Sit on 45-degree leg press machine with lower back and hips firmly against the seat pad.",
      "Place feet shoulder-width apart in the center of the sled platform.",
      "Disengage safety levers and slowly lower the sled until knees reach 90 degrees.",
      "Drive through midfoot and heels to press sled upward, stopping just short of knee lockout.",
      "Control the eccentric descent for 2 full seconds on every repetition.",
    ],
    coachingCues: [
      "Keep pelvis and lower back glued into the pad; never allow hips to lift or round.",
      "Stop just shy of full knee lockout at the top to preserve joint integrity.",
      "Lower under control to 90 degrees knee bend.",
    ],
    formWarnings: [
      "Never snap or lock knees out forcefully under heavy loads.",
      "Do not allow lower back or tailbone to round off the backrest.",
      "Avoid knees caving inward during the upward press.",
    ],
  },

  lat_pulldown: {
    id: "0150",
    name: "Cable Lat Pulldown",
    normalizedName: "lat_pulldown",
    targetMuscle: "Latissimus Dorsi",
    secondaryMuscles: ["Biceps Brachii", "Rhomboids", "Middle & Lower Trapezius"],
    bodyPart: "back",
    equipment: "cable",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0150-eYnzaCm.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0150-eYnzaCm.jpg`,
    instructions: [
      "Sit facing cable pulldown station with thighs secured under support pads.",
      "Grasp wide bar with overhand grip slightly outside shoulder-width.",
      "Lean torso back approximately 10-15 degrees with a proud chest.",
      "Depress shoulder blades first, then pull the bar down smoothly to upper clavicle.",
      "Squeeze lats intensely at the bottom, then return under controlled 2-second eccentric.",
    ],
    coachingCues: [
      "Drive elbows down and back toward your back pockets.",
      "Depress scapulae before initiating elbow bend.",
      "Hold full peak contraction at collarbone level for 1 second.",
    ],
    formWarnings: [
      "No swinging torso back and forth to heave the bar down.",
      "Never pull behind the neck.",
      "Do not let the weight stack crash up at the top.",
    ],
  },

  seated_cable_row: {
    id: "0861",
    name: "Seated Cable Row",
    normalizedName: "seated_cable_row",
    targetMuscle: "Middle Back & Rhomboids",
    secondaryMuscles: ["Latissimus Dorsi", "Rear Deltoids", "Biceps Brachii"],
    bodyPart: "back",
    equipment: "cable",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0861-fUBheHs.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0861-fUBheHs.jpg`,
    instructions: [
      "Sit at cable row station with feet braced on footrests and knees soft.",
      "Grip V-bar handle with neutral grip and sit tall with neutral spine.",
      "Pull handle into lower abdomen while retracting shoulder blades.",
      "Squeeze upper and mid-back firmly for 1 second at peak contraction.",
      "Return slowly under full control until arms are extended and lats stretch.",
    ],
    coachingCues: [
      "Pull with your elbows, driving them past your ribcage.",
      "Keep torso tall and quiet; avoid excessive backward rocking.",
      "Maintain proud chest throughout the pull.",
    ],
    formWarnings: [
      "Never round lumbar spine while leaning forward.",
      "Do not use backward momentum to sling the weight.",
    ],
  },

  bicep_curl: {
    id: "0285",
    name: "Dumbbell Alternate Biceps Curl",
    normalizedName: "bicep_curl",
    targetMuscle: "Biceps Brachii",
    secondaryMuscles: ["Brachialis", "Brachioradialis", "Forearms"],
    bodyPart: "upper arms",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0285-BU15nH4.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0285-BU15nH4.jpg`,
    instructions: [
      "Stand tall holding dumbbells at sides with neutral grip (palms facing inward).",
      "Pin elbows against ribcage and curl one dumbbell upward.",
      "Supinate wrist as the dumbbell rises so palm faces shoulder at peak contraction.",
      "Squeeze bicep hard at the top for 1 full second.",
      "Lower under 2-3 second eccentric control, then repeat with opposite arm.",
    ],
    coachingCues: [
      "Keep elbows pinned to your sides; do not let elbows drift forward.",
      "Supinate wrist fully as dumbbell passes hip level.",
      "Lower under control without swinging hips or shoulders.",
    ],
    formWarnings: [
      "Zero hip swinging or lower back leaning to heave dumbbells.",
      "Avoid cutting eccentric descent short at the bottom.",
    ],
  },

  hammer_curl: {
    id: "0313",
    name: "Dumbbell Hammer Curl",
    normalizedName: "hammer_curl",
    targetMuscle: "Brachialis & Brachioradialis",
    secondaryMuscles: ["Biceps Brachii", "Forearms"],
    bodyPart: "upper arms",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0313-slDvUAU.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0313-slDvUAU.jpg`,
    instructions: [
      "Stand tall holding dumbbells with neutral palms-in grip (thumbs pointing up).",
      "Keep upper arms pinned against torso and chest upright.",
      "Curl dumbbells upward toward shoulders while maintaining neutral grip.",
      "Squeeze brachialis and forearms forcefully at the top for 1 second.",
      "Lower slowly under full muscular tension back to full extension.",
    ],
    coachingCues: [
      "Thumbs stay pointed upward throughout entire movement range.",
      "Lock elbows in place; only forearms move.",
    ],
    formWarnings: [
      "No body English or bouncing knees to swing the weight.",
    ],
  },

  incline_dumbbell_press: {
    id: "0314",
    name: "Dumbbell Incline Bench Press",
    normalizedName: "incline_dumbbell_press",
    targetMuscle: "Clavicular Pectorals (Upper Chest)",
    secondaryMuscles: ["Anterior Deltoids", "Triceps Brachii"],
    bodyPart: "chest",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0314-ns0SIbU.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0314-ns0SIbU.jpg`,
    instructions: [
      "Set incline bench to 30-45 degrees, lie back with dumbbells at outer chest level.",
      "Retract scapulae into bench pad and plant feet firmly on the floor.",
      "Press dumbbells upward along a converging arc until arms are extended.",
      "Lower slowly over 2 seconds until dumbbells are level with upper chest.",
      "Pause briefly in the stretched position, then press explosively back to top.",
    ],
    coachingCues: [
      "Keep elbows tucked at ~45-60 degrees from ribcage.",
      "Control the stretch at the bottom — feel the upper pectoral fibers.",
    ],
    formWarnings: [
      "Do not set bench steeper than 45 degrees to avoid shifting stress to anterior deltoids.",
      "Avoid flaring elbows wide out to 90 degrees.",
    ],
  },

  dips: {
    id: "0251",
    name: "Chest Dips",
    normalizedName: "dips",
    targetMuscle: "Pectorals & Triceps",
    secondaryMuscles: ["Anterior Deltoids", "Core"],
    bodyPart: "chest",
    equipment: "body weight",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0251-9WTm7dq.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0251-9WTm7dq.jpg`,
    instructions: [
      "Grasp parallel dip bars and suspend body with arms fully locked.",
      "Lean torso forward 15-25 degrees to prioritize chest engagement.",
      "Lower body under control until elbows reach approximately 90 degrees flexion.",
      "Press forcefully through palms to return to full lockout at the top.",
    ],
    coachingCues: [
      "Torso lean forward biases chest; upright posture biases triceps.",
      "Descend smoothly to 90 degrees; avoid crashing into extreme joint depth.",
    ],
    formWarnings: [
      "Never bounce out of the bottom position.",
      "Do not let shoulders roll forward or shrug toward ears.",
    ],
  },

  skull_crusher: {
    id: "0060",
    name: "Barbell Lying Triceps Extension (Skull Crusher)",
    normalizedName: "skull_crusher",
    targetMuscle: "Triceps Brachii (Long Head)",
    secondaryMuscles: ["Forearms"],
    bodyPart: "upper arms",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0060-h8LFzo9.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0060-h8LFzo9.jpg`,
    instructions: [
      "Lie flat on bench holding barbell directly above upper chest with arms extended.",
      "Angle upper arms back roughly 10 degrees toward head to keep tension continuous.",
      "Bend elbows to lower bar smoothly toward hairline or top of forehead.",
      "Extend elbows forcefully back to starting position without letting elbows flare out.",
    ],
    coachingCues: [
      "Keep elbows tucked in line with shoulders; do not let elbows flare wide.",
      "Maintain a 2-second controlled descent on every rep.",
    ],
    formWarnings: [
      "Never drop or bounce the bar near your forehead or skull.",
      "Do not swing shoulders to assist the movement.",
    ],
  },

  leg_extension: {
    id: "0585",
    name: "Lever Leg Extension",
    normalizedName: "leg_extension",
    targetMuscle: "Quadriceps",
    secondaryMuscles: ["Patellar Tendon"],
    bodyPart: "upper legs",
    equipment: "leverage machine",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0585-my33uHU.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0585-my33uHU.jpg`,
    instructions: [
      "Align knee joint with machine pivot axis and set shin pad just above ankles.",
      "Grip side handles firmly to anchor pelvis into the seat pad.",
      "Extend knees smoothly to raise the pad until legs are fully extended.",
      "Squeeze quadriceps intensely for 1 second at full extension.",
      "Lower pad under a strict 2-second eccentric count back to starting angle.",
    ],
    coachingCues: [
      "Hold full quad contraction at the top for 1 full second.",
      "Pull up on side handles to keep hips pressed firmly into seat.",
    ],
    formWarnings: [
      "No kicking or violently slinging the weight stack.",
      "Avoid letting weights slam down between reps.",
    ],
  },

  leg_curl: {
    id: "0586",
    name: "Lever Lying Leg Curl",
    normalizedName: "leg_curl",
    targetMuscle: "Hamstrings",
    secondaryMuscles: ["Calves", "Glutes"],
    bodyPart: "upper legs",
    equipment: "leverage machine",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0586-17lJ1kr.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0586-17lJ1kr.jpg`,
    instructions: [
      "Lie face down on leg curl bench with roller pad positioned just below calf muscles.",
      "Grip handles and press hips down firmly into the pad.",
      "Curl legs upward toward glutes in a smooth, continuous contraction.",
      "Hold peak hamstring contraction for 1 second at top.",
      "Lower legs slowly over 2-3 seconds back to starting position.",
    ],
    coachingCues: [
      "Keep hips glued to the bench; never allow hips to lift during contraction.",
      "Dorsiflex ankles (toes pointed up) to enhance hamstring recruitment.",
    ],
    formWarnings: [
      "No arching lower back to yank the pad up.",
      "Do not drop weight rapidly during eccentric descent.",
    ],
  },

  calf_raise: {
    id: "1372",
    name: "Barbell Standing Calf Raise",
    normalizedName: "calf_raise",
    targetMuscle: "Gastrocnemius & Soleus (Calves)",
    secondaryMuscles: ["Ankle Stabilizers"],
    bodyPart: "lower legs",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/1372-8ozhUIZ.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/1372-8ozhUIZ.jpg`,
    instructions: [
      "Position balls of feet on elevated calf block with heels hanging off the edge.",
      "Rest barbell across upper traps and keep knees straight but unlocked.",
      "Lower heels smoothly into a deep calf stretch below block level, pausing 1 second.",
      "Drive upward onto balls of feet, contracting calves into peak extension.",
      "Hold peak contraction for 1 full second before lowering slowly.",
    ],
    coachingCues: [
      "Pause for 1 second at the deep bottom stretch to eliminate elastic rebound.",
      "Drive through the big toe ball of the foot.",
    ],
    formWarnings: [
      "No rapid bouncing or rebounding off the Achilles tendon.",
      "Avoid bending knees to turn it into a squatting motion.",
    ],
  },

  bulgarian_split_squat: {
    id: "0410",
    name: "Dumbbell Single Leg Split Squat",
    normalizedName: "bulgarian_split_squat",
    targetMuscle: "Quadriceps & Gluteus Maximus",
    secondaryMuscles: ["Hamstrings", "Adductors", "Core"],
    bodyPart: "upper legs",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0410-qx4fgX7.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0410-qx4fgX7.jpg`,
    instructions: [
      "Stand 2 feet ahead of a bench holding dumbbells at sides.",
      "Place top of rear foot laces onto the bench behind you.",
      "Lower torso smoothly until front thigh is parallel to the ground.",
      "Drive through front heel and midfoot to return to top standing position.",
    ],
    coachingCues: [
      "90% of your weight stays planted through the front working leg.",
      "Keep front knee tracking directly over toes.",
    ],
    formWarnings: [
      "Do not let front knee collapse inward.",
      "Avoid excessive forward torso collapse.",
    ],
  },

  lunge: {
    id: "0336",
    name: "Dumbbell Lunge",
    normalizedName: "lunge",
    targetMuscle: "Quadriceps & Glutes",
    secondaryMuscles: ["Hamstrings", "Calves", "Core"],
    bodyPart: "upper legs",
    equipment: "dumbbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0336-RRWFUcw.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0336-RRWFUcw.jpg`,
    instructions: [
      "Stand tall holding dumbbells at sides.",
      "Take a deliberate step forward and lower hips until back knee hovers just above ground.",
      "Push off front foot to step through or return to starting position.",
    ],
    coachingCues: [
      "Maintain upright torso; keep chest proud.",
      "Step with deliberate control; both knees reach ~90 degrees.",
    ],
    formWarnings: [
      "Do not smash back knee into the floor.",
      "Avoid lateral knee wobbling.",
    ],
  },

  hip_thrust: {
    id: "1409",
    name: "Barbell Glute Bridge / Hip Thrust",
    normalizedName: "hip_thrust",
    targetMuscle: "Gluteus Maximus",
    secondaryMuscles: ["Hamstrings", "Adductors", "Erector Spinae"],
    bodyPart: "upper legs",
    equipment: "barbell",
    animationUrl: `${RAW_MEDIA_BASE}/videos/1409-qKBpF7I.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/1409-qKBpF7I.jpg`,
    instructions: [
      "Sit on floor with upper back against bench and padded barbell placed across hips.",
      "Plant feet flat on floor with shins vertical at top of hip extension.",
      "Drive heels into floor and bridge hips up until thighs and torso align.",
      "Squeeze glutes hard at peak contraction for 1 second.",
      "Lower hips under control without hyperextending lumbar spine.",
    ],
    coachingCues: [
      "Keep chin tucked; eyes looking forward throughout the lift.",
      "Lock out by posterior pelvic tilt (squeezing glutes), not arching lower back.",
    ],
    formWarnings: [
      "No hyper-extending the lower back at top lockout.",
      "Do not let knees collapse inward.",
    ],
  },

  face_pull: {
    id: "0233",
    name: "Cable Face Pull",
    normalizedName: "face_pull",
    targetMuscle: "Posterior Deltoids & Rotator Cuff",
    secondaryMuscles: ["Rhomboids", "Middle Traps", "Infraspinatus"],
    bodyPart: "shoulders",
    equipment: "cable",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0233-ZfyAGhK.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0233-ZfyAGhK.jpg`,
    instructions: [
      "Attach rope to high pulley, hold ends with thumbs pointing back.",
      "Step back into athletic split stance.",
      "Pull rope directly toward eye bridge while pulling hands apart and externally rotating thumbs back.",
      "Hold peak contraction for 1 second, feeling rear shoulders and upper back.",
      "Return smoothly under tension back to full arm extension.",
    ],
    coachingCues: [
      "Finish in a 'double bicep' posture with elbows high and hands spread wide.",
      "Squeeze rear delts; avoid shrugging traps toward ears.",
    ],
    formWarnings: [
      "Do not lean back or heave torso to pull the weight.",
      "Avoid letting elbows drop below wrists.",
    ],
  },

  hanging_leg_raise: {
    id: "0472",
    name: "Hanging Leg Raise",
    normalizedName: "hanging_leg_raise",
    targetMuscle: "Abdominals & Hip Flexors",
    secondaryMuscles: ["Obliques", "Grip"],
    bodyPart: "waist",
    equipment: "body weight",
    animationUrl: `${RAW_MEDIA_BASE}/videos/0472-I3tsCnC.gif`,
    thumbnailUrl: `${RAW_MEDIA_BASE}/images/0472-I3tsCnC.jpg`,
    instructions: [
      "Hang from pull-up bar with overhand grip and legs straight.",
      "Brace core and tilt pelvis upward to initiate leg raise.",
      "Raise legs smoothly to at least hip level without swinging.",
      "Pause for 1 second at peak contraction.",
      "Lower under strict control back to dead hang.",
    ],
    coachingCues: [
      "Curl pelvis toward chest rather than just swinging legs.",
      "Control the descent completely to eliminate pendulum momentum.",
    ],
    formWarnings: [
      "Zero swinging or kipping with hips.",
    ],
  },
};

// Aliases mapping common gym terms to best-matching catalog items or keys
const CANONICAL_ALIASES: Record<string, string> = {
  rdl: "romanian_deadlift",
  romanian_deadlift: "romanian_deadlift",
  ohp: "overhead_press",
  military_press: "overhead_press",
  shoulder_press: "overhead_press",
  leg_press: "leg_press",
  lat_pulldown: "lat_pulldown",
  pulldown: "lat_pulldown",
  seated_cable_row: "seated_cable_row",
  seated_row: "seated_cable_row",
  cable_row: "seated_cable_row",
  bicep_curl: "bicep_curl",
  biceps_curl: "bicep_curl",
  dumbbell_curl: "bicep_curl",
  dumbbell_bicep_curl: "bicep_curl",
  barbell_curl: "bicep_curl",
  hammer_curl: "hammer_curl",
  incline_dumbbell_press: "incline_dumbbell_press",
  incline_db_press: "incline_dumbbell_press",
  incline_bench_press: "incline_bench_press",
  incline_press: "incline_dumbbell_press",
  dips: "dips",
  chest_dips: "dips",
  tricep_dips: "dips",
  skull_crusher: "skull_crusher",
  skullcrusher: "skull_crusher",
  triceps_extension: "skull_crusher",
  leg_extension: "leg_extension",
  leg_curl: "leg_curl",
  hamstring_curl: "leg_curl",
  lying_leg_curl: "leg_curl",
  calf_raise: "calf_raise",
  standing_calf_raise: "calf_raise",
  seated_calf_raise: "calf_raise",
  bulgarian_split_squat: "bulgarian_split_squat",
  split_squat: "bulgarian_split_squat",
  lunge: "lunge",
  lunges: "lunge",
  walking_lunge: "lunge",
  walking_lunges: "lunge",
  hip_thrust: "hip_thrust",
  glute_bridge: "hip_thrust",
  face_pull: "face_pull",
  face_pulls: "face_pull",
  lateral_raise: "dumbbell_lateral_raise",
  side_lateral_raise: "dumbbell_lateral_raise",
  side_raise: "dumbbell_lateral_raise",
  tricep_pushdown: "cable_pushdown",
  rope_pushdown: "cable_pushdown",
  pushdown: "cable_pushdown",
  hanging_leg_raise: "hanging_leg_raise",
  leg_raise: "hanging_leg_raise",
  plank: "plank",
};

interface RawCatalogItem {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
  gif: string;
  image: string;
  instructions: string[];
}

const exerciseCatalog = exerciseCatalogRaw as RawCatalogItem[];

// Fast lookup maps
const catalogByName = new Map<string, RawCatalogItem>();
for (const item of exerciseCatalog) {
  catalogByName.set(item.name.toLowerCase().trim(), item);
}

function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
    if (clean.includes("incline")) return "incline_bench_press";
    return "bench_press";
  }
  if (clean.includes("squat")) {
    if (clean.includes("box")) return "box_squat";
    if (clean.includes("bulgarian") || clean.includes("split"))
      return "bulgarian_split_squat";
    return "squat";
  }
  if (clean.includes("deadlift")) {
    if (clean.includes("romanian") || clean.includes("rdl"))
      return "romanian_deadlift";
    return "deadlift";
  }
  if (
    clean.includes("overhead") ||
    clean.includes("military") ||
    clean.includes("shoulder press")
  ) {
    if (clean.includes("dumbbell") || clean.includes("neutral"))
      return "neutral_grip_dumbbell_press";
    return "overhead_press";
  }
  if (clean.includes("row")) {
    if (clean.includes("cable") || clean.includes("seated"))
      return "seated_cable_row";
    return "barbell_row";
  }
  if (
    clean.includes("pull up") ||
    clean.includes("chin up") ||
    clean.includes("pullup")
  ) {
    return "pull_up";
  }
  if (clean.includes("pulldown") || clean.includes("pull down")) {
    return "lat_pulldown";
  }
  if (clean.includes("leg press")) {
    return "leg_press";
  }
  if (clean.includes("leg extension")) {
    return "leg_extension";
  }
  if (clean.includes("leg curl") || clean.includes("hamstring")) {
    return "leg_curl";
  }
  if (clean.includes("calf")) {
    return "calf_raise";
  }
  if (clean.includes("lunge")) {
    return "lunge";
  }
  if (clean.includes("hip thrust") || clean.includes("glute bridge")) {
    return "hip_thrust";
  }
  if (clean.includes("face pull")) {
    return "face_pull";
  }
  if (clean.includes("hammer curl")) {
    return "hammer_curl";
  }
  if (clean.includes("curl")) {
    return "bicep_curl";
  }
  if (clean.includes("lateral") || clean.includes("delt raise")) {
    return "dumbbell_lateral_raise";
  }
  if (clean.includes("pushdown") || clean.includes("tricep")) {
    return "cable_pushdown";
  }

  return clean.replace(/\s+/g, "_");
}

function searchCatalog(cleanName: string): RawCatalogItem | null {
  // 1. Direct name lookup
  if (catalogByName.has(cleanName)) {
    return catalogByName.get(cleanName)!;
  }

  // 2. Tokenized match
  const qWords = cleanName
    .split(" ")
    .filter(
      (w) =>
        ![
          "and",
          "the",
          "for",
          "with",
          "on",
          "of",
          "1rm",
          "close",
          "grip",
          "attachment",
          "machine",
          "heavy",
        ].includes(w)
    );

  if (qWords.length === 0) return null;

  let best: RawCatalogItem | null = null;
  let highestScore = 0;

  for (const item of exerciseCatalog) {
    const itemClean = cleanString(item.name);
    let score = 0;

    if (itemClean === cleanName) return item;
    if (itemClean.includes(cleanName)) score += 40;
    if (cleanName.includes(itemClean)) score += 30;

    const itemWords = itemClean.split(" ");
    let wordMatches = 0;
    for (const w of qWords) {
      if (itemWords.includes(w)) wordMatches++;
    }

    if (wordMatches > 0 && wordMatches === qWords.length) score += 35;
    score += wordMatches * 15;
    score -= Math.abs(itemWords.length - qWords.length) * 2;

    if (score > highestScore) {
      highestScore = score;
      best = item;
    }
  }

  return highestScore >= 25 ? best : null;
}

function formatTitleCase(str: string): string {
  return str
    .replace(/[_-]+/g, " ")
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

/**
 * Looks up full exercise guide with fallback heuristics
 */
export function getExerciseGuide(rawName: string): ExerciseGuide {
  const normKey = normalizeExerciseName(rawName);

  // 1. Exact match in EXERCISE_DATABASE
  if (EXERCISE_DATABASE[normKey]) {
    return EXERCISE_DATABASE[normKey];
  }

  // 2. Canonical alias match in EXERCISE_DATABASE
  if (CANONICAL_ALIASES[normKey] && EXERCISE_DATABASE[CANONICAL_ALIASES[normKey]]) {
    return EXERCISE_DATABASE[CANONICAL_ALIASES[normKey]];
  }

  const clean = cleanString(rawName);
  for (const [alias, targetKey] of Object.entries(CANONICAL_ALIASES)) {
    if (clean === alias || clean.includes(alias.replace(/_/g, " "))) {
      if (EXERCISE_DATABASE[targetKey]) {
        return EXERCISE_DATABASE[targetKey];
      }
    }
  }

  // 3. Search in 1,324-exercise dataset
  const catalogMatch = searchCatalog(clean);
  if (catalogMatch) {
    const displayName = formatTitleCase(rawName);
    const targetFormatted = formatTitleCase(catalogMatch.target);
    const bodyPartFormatted = formatTitleCase(catalogMatch.bodyPart);

    return {
      id: catalogMatch.id,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: targetFormatted,
      secondaryMuscles: catalogMatch.secondaryMuscles.map(formatTitleCase),
      bodyPart: catalogMatch.bodyPart,
      equipment: catalogMatch.equipment,
      animationUrl: `${RAW_MEDIA_BASE}/${catalogMatch.gif}`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/${catalogMatch.image}`,
      instructions:
        catalogMatch.instructions && catalogMatch.instructions.length > 0
          ? catalogMatch.instructions
          : [
              `Set up in a solid, athletic position for ${displayName}.`,
              `Engage ${targetFormatted} muscles and brace core with a neutral spine.`,
              "Control the eccentric descent smoothly for 2 full seconds.",
              "Drive through the concentric phase forcefully without using momentum.",
              "Pause at peak contraction for 1 second before lowering.",
            ],
      coachingCues: [
        `Focus continuous mind-muscle connection directly on ${targetFormatted}.`,
        "Maintain 2-second eccentric tempo on every repetition.",
        "Stop set at technical form breakdown to preserve joint health.",
      ],
      formWarnings: [
        "Never use body swing, momentum, or bouncing to move the resistance.",
        "Cease immediately if sharp joint or tendon discomfort arises.",
      ],
    };
  }

  // 4. Intelligent Category & Movement Pattern Fallback (NEVER default blindly to flat bench press!)
  const displayName = formatTitleCase(rawName);

  // Legs / Squat / Quad pattern
  if (
    clean.includes("squat") ||
    clean.includes("leg") ||
    clean.includes("quad") ||
    clean.includes("thigh")
  ) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Quadriceps & Glutes",
      secondaryMuscles: ["Hamstrings", "Calves", "Core"],
      bodyPart: "upper legs",
      equipment: "barbell / machine",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0043-qXTaZnJ.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0043-qXTaZnJ.jpg`,
      instructions: [
        `Position yourself securely for ${displayName}.`,
        "Brace core 360 degrees and maintain a neutral lumbar spine.",
        "Descend under control, pushing knees out in line with your toes.",
        "Drive through your midfoot to return to top standing position.",
      ],
      coachingCues: [
        "Keep knees tracking over toes throughout the entire range of motion.",
        "Preserve chest angle and avoid excessive forward collapse.",
        "Drive heels into the floor throughout concentric rise.",
      ],
      formWarnings: [
        "No knee cave (valgus collapse) during concentric drive.",
        "Do not allow heels to peel up off the floor.",
      ],
    };
  }

  // Posterior Chain / Hamstrings / Deadlift pattern
  if (
    clean.includes("deadlift") ||
    clean.includes("rdl") ||
    clean.includes("hamstring") ||
    clean.includes("glute") ||
    clean.includes("posterior")
  ) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Posterior Chain (Glutes & Hamstrings)",
      secondaryMuscles: ["Erector Spinae", "Trapezius", "Forearms"],
      bodyPart: "upper legs",
      equipment: "barbell / dumbbell",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0032-ila4NZS.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0032-ila4NZS.jpg`,
      instructions: [
        `Hinge at your hips to set up for ${displayName}.`,
        "Keep spine locked in neutral and pull slack out before lifting.",
        "Drive hips through by contracting glutes and hamstrings.",
        "Lower under controlled hip hinge along your thighs and shins.",
      ],
      coachingCues: [
        "Think of driving hips back toward the wall behind you.",
        "Keep weight path dragging tightly against body center of mass.",
        "Lock out hips by squeezing glutes; never arch lower back.",
      ],
      formWarnings: [
        "No rounded lower back (spinal flexion) under load.",
        "Avoid hyperextending backwards at the top of the repetition.",
      ],
    };
  }

  // Back / Lat / Pull / Row pattern
  if (
    clean.includes("back") ||
    clean.includes("lat") ||
    clean.includes("pull") ||
    clean.includes("row") ||
    clean.includes("chin")
  ) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Latissimus Dorsi & Upper Back",
      secondaryMuscles: ["Rhomboids", "Rear Delts", "Biceps"],
      bodyPart: "back",
      equipment: "cable / barbell / body weight",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0652-lBDjFxJ.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0652-lBDjFxJ.jpg`,
      instructions: [
        `Initiate movement for ${displayName} with scapulae depressed.`,
        "Lead with elbows pulling backward into your torso.",
        "Hold full peak contraction in lats and upper back for 1 second.",
        "Extend arms smoothly under a 2-second eccentric stretch.",
      ],
      coachingCues: [
        "Pull with your elbows, not your hands or wrists.",
        "Keep torso stable; eliminate momentum and swinging.",
        "Hold peak contraction for a clean 1-second pause.",
      ],
      formWarnings: [
        "No yanking or using body English to swing the weight.",
        "Avoid shrugging shoulders up toward ears.",
      ],
    };
  }

  // Biceps / Curl pattern
  if (clean.includes("curl") || clean.includes("bicep")) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Biceps Brachii",
      secondaryMuscles: ["Brachialis", "Forearms"],
      bodyPart: "upper arms",
      equipment: "dumbbell / cable",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0285-BU15nH4.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0285-BU15nH4.jpg`,
      instructions: [
        `Pin your elbows against your ribcage for ${displayName}.`,
        "Curl weight upward toward shoulders with zero shoulder sway.",
        "Squeeze biceps hard for 1 full second at peak contraction.",
        "Lower under controlled 2-3 second eccentric tempo.",
      ],
      coachingCues: [
        "Elbows stay pinned in place; only forearms move.",
        "Supinate fully at top for maximal bicep peak contraction.",
      ],
      formWarnings: [
        "No swinging hips or leaning back to heave the weight.",
      ],
    };
  }

  // Triceps / Pushdown / Extension pattern
  if (
    clean.includes("tricep") ||
    clean.includes("pushdown") ||
    clean.includes("extension")
  ) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Triceps Brachii",
      secondaryMuscles: ["Forearms"],
      bodyPart: "upper arms",
      equipment: "cable / dumbbell",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0201-3ZflifB.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0201-3ZflifB.jpg`,
      instructions: [
        `Lock elbows at sides for ${displayName}.`,
        "Extend elbows until triceps reach complete lockout.",
        "Hold contraction for 1 second, then control eccentric return.",
      ],
      coachingCues: [
        "Keep elbows pinned; only forearms move through the arc.",
        "Squeeze triceps hard at full extension without unlocking shoulders.",
      ],
      formWarnings: [
        "Avoid flaring elbows wide or bouncing at lockout.",
      ],
    };
  }

  // Shoulder / Delt / Overhead / Raise pattern
  if (
    clean.includes("shoulder") ||
    clean.includes("delt") ||
    clean.includes("overhead") ||
    clean.includes("lateral") ||
    clean.includes("raise")
  ) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Deltoids (Shoulders)",
      secondaryMuscles: ["Trapezius", "Triceps Brachii"],
      bodyPart: "shoulders",
      equipment: "dumbbell / cable",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0334-DsgkuIt.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0334-DsgkuIt.jpg`,
      instructions: [
        `Establish a strong athletic base for ${displayName}.`,
        "Raise weight leading with elbows in scapular plane.",
        "Pause for 1 second at shoulder height before lowering under control.",
      ],
      coachingCues: [
        "Lead with elbows, keeping traps relaxed and down.",
        "Control descent smoothly for 2-3 full seconds.",
      ],
      formWarnings: [
        "No swinging hips or bouncing knees to heave weight up.",
      ],
    };
  }

  // Calves pattern
  if (clean.includes("calf") || clean.includes("calves")) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Gastrocnemius & Soleus (Calves)",
      secondaryMuscles: ["Ankle Stabilizers"],
      bodyPart: "lower legs",
      equipment: "machine / barbell",
      animationUrl: `${RAW_MEDIA_BASE}/videos/1372-8ozhUIZ.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/1372-8ozhUIZ.jpg`,
      instructions: [
        `Stand on balls of feet for ${displayName}.`,
        "Lower heels into a deep bottom calf stretch and pause 1 second.",
        "Explode up onto balls of feet, squeezing calves for 1 full second.",
      ],
      coachingCues: [
        "Pause at both deep bottom stretch and top contraction to kill elasticity.",
      ],
      formWarnings: [
        "Avoid rapid bouncing off Achilles tendon.",
      ],
    };
  }

  // Core / Abs pattern
  if (
    clean.includes("ab") ||
    clean.includes("core") ||
    clean.includes("crunch") ||
    clean.includes("plank")
  ) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Abdominals & Core",
      secondaryMuscles: ["Obliques", "Hip Flexors"],
      bodyPart: "waist",
      equipment: "body weight",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0472-I3tsCnC.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0472-I3tsCnC.jpg`,
      instructions: [
        `Brace core 360 degrees for ${displayName}.`,
        "Contract abdominals forcefully to move through the active range.",
        "Pause for 1 second at peak contraction, exhaling completely.",
      ],
      coachingCues: [
        "Focus on flexing the spine and rolling pelvis, not yanking with neck or hips.",
      ],
      formWarnings: [
        "Do not pull on the neck or swing momentum.",
      ],
    };
  }

  // Chest / Fly pattern
  if (clean.includes("fly") || clean.includes("flye")) {
    return {
      id: `custom_${normKey}`,
      name: displayName,
      normalizedName: normKey,
      targetMuscle: "Pectorals (Chest Fly)",
      secondaryMuscles: ["Anterior Deltoids"],
      bodyPart: "chest",
      equipment: "cable / dumbbell",
      animationUrl: `${RAW_MEDIA_BASE}/videos/0158-7saC5zz.gif`,
      thumbnailUrl: `${RAW_MEDIA_BASE}/images/0158-7saC5zz.jpg`,
      instructions: [
        `Set up with slight bend in elbows for ${displayName}.`,
        "Open arms out to sides in a wide arc until feeling a deep pectoral stretch.",
        "Bring arms back together along the arc, hugging a giant barrel.",
        "Squeeze chest muscles hard at peak contraction for 1 second.",
      ],
      coachingCues: [
        "Maintain fixed soft elbow bend throughout; do not turn it into a press.",
        "Focus on bringing inner biceps toward each other at contraction.",
      ],
      formWarnings: [
        "Do not over-stretch shoulders excessively at the back.",
      ],
    };
  }

  // Fallback generic chest / push movement
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

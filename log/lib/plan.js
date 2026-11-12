// The training plan and the exercise instructions. Data only.
/* Each day is ordered into weight "stations": exercises in a station use the same
   dumbbell setup, so you only reload between stations. kg = default per-dumbbell
   weight until you've logged the station's first exercise; each is a weight the
   plates can make with 1.6 kg handles (see plates.js). cap = the most an exercise
   should ever be loaded to (small stabiliser muscles: control matters, not weight). */
export const PLAN = {
  push:{name:"Push + arms",sub:"Tuesday",dow:2,mins:45,
   stations:{
    A:{kit:"one",kg:1.6,label:"One light dumbbell",note:"Warm-up for the shoulder."},
    B:{kit:"pair",kg:11.6,label:"Both dumbbells heavy",note:"Floor press, then use one of them for the triceps extension."},
    C:{kit:"pair",kg:6.6,label:"Both dumbbells medium",note:"Press and curls share this weight."},
    D:{kit:"pair",kg:4.1,label:"Both dumbbells light"}},
   ex:[
    {id:"ext-rot",st:"A",n:"Side-lying external rotation",sets:2,lo:15,hi:15,start:"Bare handle",unit:"per arm",rest:45,load:"kg",cap:3.6},
    {id:"floor-press",st:"B",n:"Dumbbell floor press",sets:4,lo:6,hi:8,start:"10–14 kg",unit:"per hand",rest:150,load:"kg"},
    {id:"oh-tri",st:"B",n:"Overhead tricep extension",sets:3,lo:8,hi:12,start:"One floor-press dumbbell",unit:"held in both hands",rest:75,load:"kg"},
    {id:"ohp",st:"C",pair:"zottman",n:"Standing overhead press",sets:3,lo:8,hi:12,start:"6–10 kg",unit:"per hand",rest:90,load:"kg"},
    {id:"zottman",st:"C",n:"Zottman curls",sets:3,lo:8,hi:12,start:"Same as the press",unit:"per hand",rest:75,load:"kg"},
    {id:"lateral",st:"D",n:"Lateral raises",sets:3,lo:12,hi:15,start:"3–5 kg",unit:"per hand",rest:60,load:"kg"}
  ]},
  pull:{name:"Pull + arms",sub:"Thursday",dow:4,mins:50,
   stations:{
    A:{kit:"pair",kg:4.1,label:"Both dumbbells light",note:"Warm-up for the upper back."},
    B:{kit:"pair",kg:11.6,label:"Both dumbbells heavy",note:"Rows, close-grip press and pullovers all use this weight."},
    C:{kit:"pair",kg:6.6,label:"Both dumbbells medium"},
    D:{kit:"one",kg:4.1,label:"Take one dumbbell down to light",note:"Keep the other at curl weight for palm-up wrist curls."}},
   ex:[
    {id:"rear-fly",st:"A",n:"Rear-delt flyes",sets:3,lo:12,hi:15,start:"3–5 kg",unit:"per hand",rest:60,load:"kg"},
    {id:"bo-row",st:"B",pair:"cg-press",n:"Bent-over row",sets:4,lo:6,hi:10,start:"10–14 kg",unit:"per hand",rest:120,load:"kg"},
    {id:"cg-press",st:"B",n:"Close-grip floor press",sets:3,lo:8,hi:12,start:"Same as the row",unit:"per hand",rest:90,load:"kg"},
    {id:"pullup",st:"B",n:"Pull-ups or pullovers",sets:3,lo:null,hi:null,start:"Bodyweight / one row dumbbell",unit:"as many as possible",rest:120,load:"bw"},
    {id:"curl",st:"C",n:"Bicep curls",sets:3,lo:8,hi:12,start:"7–10 kg",unit:"per hand",rest:75,load:"kg"},
    {id:"wrist",st:"D",n:"Wrist curls + reverse",sets:2,lo:15,hi:15,start:"Curl dumbbell / light dumbbell",unit:"palm up / palm down",rest:45,load:"kg"}
  ]},
  upper:{name:"Arms + legs",sub:"Saturday",dow:6,mins:55,
   stations:{
    A:{kit:"none",label:"No weights",note:"Load the dumbbells for hammer curls while you rest."},
    B:{kit:"pair",kg:6.6,label:"Both dumbbells medium",note:"Hammer curls, then one of them for concentration curls."},
    C:{kit:"pair",kg:4.1,label:"Both dumbbells light",note:"Skull crushers, then one of them for woodchops."},
    D:{kit:"pair",kg:14.1,label:"Both dumbbells heavy",note:"Deadlifts, split squats and calf raises."}},
   ex:[
    {id:"diamond",st:"A",n:"Close-grip push-ups",sets:3,lo:null,hi:null,start:"Bodyweight",unit:"as many as possible",rest:90,load:"bw"},
    {id:"hammer",st:"B",n:"Hammer curls",sets:3,lo:8,hi:12,start:"8–10 kg",unit:"per hand",rest:60,load:"kg"},
    {id:"conc-curl",st:"B",n:"Concentration curls",sets:2,lo:8,hi:12,start:"One hammer-curl dumbbell",unit:"per arm",rest:45,load:"kg"},
    {id:"skull",st:"C",pair:"woodchop",n:"Floor skull crushers",sets:3,lo:10,hi:15,start:"5–8 kg",unit:"per hand",rest:60,load:"kg"},
    {id:"woodchop",st:"C",n:"Dumbbell woodchop",sets:2,lo:10,hi:12,start:"One skull-crusher dumbbell",unit:"per side",rest:45,load:"kg"},
    {id:"rdl",st:"D",n:"Romanian deadlift",sets:3,lo:8,hi:10,start:"12–15 kg",unit:"per hand",rest:120,load:"kg"},
    {id:"split",st:"D",n:"Rear-foot-elevated split squat",sets:2,lo:10,hi:10,start:"Bodyweight, then the deadlift dumbbells",unit:"per leg",rest:75,load:"kg"},
    {id:"calf",st:"D",n:"Single-leg calf raises",sets:2,lo:15,hi:15,start:"Bodyweight, then one deadlift dumbbell",unit:"per leg",rest:45,load:"kg"}
  ]}
};
/* ---------- exercise instructions (shown under "How to do it") ----------
   steps: in order; an item {h:"…"} starts a new group (e.g. an alternative version)
   feel: where you should feel it working; avoid: the common form mistakes */
export const HOW={
  "floor-press":{steps:[
    "Sit on the floor with a dumbbell standing on each thigh. Lie back with knees bent and feet flat, bringing the dumbbells to your chest as you go.",
    "Press both dumbbells straight up over your chest, palms facing your feet. This is the start position.",
    "Lower slowly (about 2 seconds) with your elbows at roughly 45° from your body: an arrow shape, not a T.",
    "Let the backs of your upper arms rest on the floor for one second. Keep your shoulder blades squeezed together.",
    "Press back up until your arms are straight, finishing with the dumbbells over your chest, not your face.",
    "To finish, lower the dumbbells to your chest and roll them onto your thighs as you sit up."],
    feel:"Chest, front of the shoulders and triceps.",
    avoid:["Elbows flared straight out to the sides, which strains the shoulders.","Bouncing your elbows off the floor.","Lifting your hips or arching your lower back off the floor."]},
  "ohp":{steps:[
    "Stand with feet hip-width apart, dumbbells at shoulder height, palms facing forward, elbows slightly in front of your body.",
    "Squeeze your glutes and brace your abs as if someone's about to poke your stomach. Keep your ribs pulled down.",
    "Press straight up until your arms are straight and your biceps are beside your ears.",
    "Lower slowly (2 seconds) back to shoulder height."],
    feel:"Shoulders and triceps.",
    avoid:["Leaning back or arching your lower back to get the weight up. Go lighter if you need to.","Using your legs to bounce the weight up.","Stopping halfway: go all the way up and all the way down."]},
  "lateral":{steps:[
    "Stand tall with soft knees, dumbbells by your sides, palms facing in. Lean forward very slightly.",
    "Bend your elbows a little and keep them fixed at that angle for the whole set.",
    "Raise your arms out to the sides until your hands reach shoulder height and no higher. Think of pushing your hands out to the walls, not up to the ceiling.",
    "Pause for a moment, then lower over 2–3 seconds."],
    feel:"The sides of your shoulders.",
    avoid:["Swinging your body to get the weights up. If you need to swing, they're too heavy.","Shrugging your shoulders up towards your ears.","Lifting above shoulder height."]},
  "oh-tri":{steps:[
    "Stand or sit tall. Hold one dumbbell vertically with both hands, palms cupping the underside of the top plate.",
    "Press it straight overhead with your upper arms close to your ears.",
    "Keep your upper arms still and elbows pointing forward. Bend only at the elbows to lower the dumbbell behind your head until you feel a deep stretch in the backs of your arms.",
    "Straighten your arms to lift it back up. Only your forearms move."],
    feel:"The backs of your upper arms (triceps), with a strong stretch at the bottom.",
    avoid:["Elbows flaring out wide.","Arching your lower back. Brace your abs, or sit on a chair with a back.","Dropping the weight quickly behind your head."]},
  "zottman":{steps:[
    "Stand tall, dumbbells by your sides, palms facing forward. Pin your elbows to your sides.",
    "Curl both dumbbells up to shoulder height, moving only at the elbows.",
    "At the top, turn your wrists so your palms face down.",
    "Lower slowly over 3 seconds with palms down. At the bottom, turn your palms forward again for the next rep."],
    feel:"Biceps on the way up, the top of your forearms on the way down.",
    avoid:["Elbows drifting forward as you curl.","Swinging your body.","Going too heavy. The palms-down lowering is the hard part, so pick a weight you can lower slowly."]},
  "ext-rot":{steps:[
    "Lie on your side with knees bent, head resting on your lower arm or a pillow.",
    "Hold a light dumbbell in your top hand. Bend that elbow to 90° and pin it to your side. A rolled-up towel between your elbow and ribs helps.",
    "Start with the forearm resting across your stomach. Rotate it up towards the ceiling as far as is comfortable, keeping the elbow glued to your side.",
    "Pause, then lower over 3 seconds. Do all reps, then roll over and do the other arm."],
    feel:"The back of your shoulder. It's a small muscle, so a mild burn is normal.",
    avoid:["Your elbow lifting off your ribs.","Rolling your body backwards to help.","Going heavy: 1–3 kg is plenty. This is about control."]},
  "bo-row":{steps:[
    "Stand with feet hip-width apart, a dumbbell in each hand, knees slightly bent.",
    "Push your hips back until your torso is at about 45°. Keep your back flat and look at the floor about a metre ahead. Let the dumbbells hang below your shoulders, palms facing each other.",
    "Brace your abs, then pull the dumbbells towards your lower ribs with your elbows going back at about 45° from your body. Squeeze your shoulder blades together at the top.",
    "Lower until your arms are straight. Keep your torso at the same angle the whole time."],
    feel:"Upper and middle back, the backs of your shoulders and your lats.",
    avoid:["Rounding your lower back. This is the big one: go lighter if it rounds.","Standing up more as you pull.","Jerking the weight or shrugging."]},
  "pullup":{steps:[
    {h:"With a bar: pull-ups"},
    "Grip the bar slightly wider than your shoulders, palms facing away (or towards you for chin-ups, which are a little easier).",
    "Hang with straight arms. Before bending your arms, pull your shoulders down away from your ears.",
    "Pull until your chin is over the bar, driving your elbows down towards your hips.",
    "Lower all the way to straight arms over 2–3 seconds.",
    {h:"No bar: floor pullovers"},
    "Lie on the floor with knees bent. Hold one dumbbell with both hands cupping the top plate, arms straight up above your chest.",
    "With a slight bend in your elbows, lower the dumbbell in an arc behind your head until you feel a stretch along your sides.",
    "Pull it back over your chest along the same arc. Keep your lower back on the floor."],
    feel:"Lats (the wide muscles down your sides and back) and biceps.",
    avoid:["Swinging or kicking to get up.","Half reps: straight arms at the bottom every time.","On pullovers, arching your lower back off the floor."]},
  "curl":{steps:[
    "Stand tall, dumbbells by your sides, palms facing forward, shoulders back. Pin your elbows to your sides.",
    "Curl the dumbbells up, bending only at the elbows, until your forearms are vertical.",
    "Squeeze your biceps hard for one second at the top.",
    "Lower over 3 seconds all the way to straight arms. The slow lowering does as much as the lift."],
    feel:"Biceps.",
    avoid:["Leaning back or swinging your hips.","Elbows drifting forward at the top, which shifts the work to your shoulders.","Stopping short of straight arms at the bottom."]},
  "cg-press":{steps:[
    "Lie on the floor with knees bent. Press both dumbbells up above your chest and touch them together, palms facing each other.",
    "Keep the dumbbells squeezed together for the whole set.",
    "Lower slowly with your elbows tucked tight to your sides until your upper arms touch the floor. The dumbbells end up above your lower chest.",
    "Press straight back up, concentrating on straightening your elbows."],
    feel:"Triceps first, then the inner chest.",
    avoid:["Elbows flaring out to the sides.","The dumbbells drifting towards your face.","Bouncing your elbows off the floor."]},
  "rear-fly":{steps:[
    "Stand with feet hip-width apart and soft knees. Hinge forward at the hips until your chest is nearly parallel to the floor, back flat. (Or sit on the edge of a chair and lean your chest towards your thighs.)",
    "Let the dumbbells hang under your chest, palms facing each other, elbows slightly bent.",
    "Raise your arms out to the sides in a wide arc until they're level with your body, like a T.",
    "Pause, then lower over 2–3 seconds."],
    feel:"The backs of your shoulders and between your shoulder blades.",
    avoid:["Too much weight, which turns it into a row (elbows bending more and more).","Swinging your torso up and down.","Shrugging your shoulders."]},
  "wrist":{steps:[
    "Sit on a chair and rest your forearm along your thigh, wrist just past your knee, holding a dumbbell palm up.",
    "Let the dumbbell roll down towards your fingertips, then curl it back into your palm and lift your wrist as high as it goes. Your forearm stays on your thigh.",
    "Lower slowly. Do 15 reps, then switch arms.",
    "Reverse curls: same position, palm facing down, lighter dumbbell. Lift the back of your hand towards the ceiling, then lower slowly."],
    feel:"Forearms, the front on palm-up and the top on palm-down.",
    avoid:["Lifting your forearm off your thigh.","Bouncing the weight.","Going heavy on the palm-down version, which can strain the wrist."]},
  "diamond":{steps:[
    "Place your hands on the floor under your chest, a little narrower than shoulder-width.",
    "Get into a straight line from head to heels: squeeze your glutes and brace your abs.",
    "Lower your chest towards your hands, with your elbows brushing your ribs and pointing back towards your feet, until your chest is a fist's height from the floor.",
    "Push back up to straight arms. When you can't do full reps, drop to your knees and keep going."],
    feel:"Triceps and chest.",
    avoid:["Hips sagging or sticking up.","Elbows flaring out to the sides.","Letting your head drop towards the floor."]},
  "hammer":{steps:[
    "Stand tall, dumbbells by your sides, palms facing your thighs (thumbs pointing forward). Pin your elbows.",
    "Curl the dumbbells up with palms still facing each other, like holding two hammers, until your forearms are vertical.",
    "Squeeze for a moment at the top.",
    "Lower over 3 seconds to straight arms."],
    feel:"The outer part of your upper arm and your forearm.",
    avoid:["Swinging your body.","Elbows drifting forward.","Twisting your wrists: palms stay facing in throughout."]},
  "skull":{steps:[
    "Lie on the floor with knees bent, dumbbells pressed up above your chest, palms facing each other.",
    "Tilt your arms back slightly so the dumbbells are above your forehead. This keeps the tension on your triceps.",
    "Keep your upper arms still and bend only at the elbows to lower the dumbbells slowly beside your head, until they nearly touch the floor.",
    "Straighten your elbows to return to the slightly tilted start position."],
    feel:"The backs of your upper arms (triceps).",
    avoid:["Elbows flaring out.","Moving your upper arms, which turns it into a press.","Lowering quickly near your face."]},
  "conc-curl":{steps:[
    "Sit on a chair with your feet wide. Hold a dumbbell and lean forward, bracing the back of your upper arm against the inside of the same-side thigh. Let the arm hang straight down.",
    "Curl the dumbbell up towards your shoulder, keeping your upper arm pressed against your thigh.",
    "Squeeze hard for one second at the top.",
    "Lower slowly to a fully straight arm. Do all reps on one arm, then switch."],
    feel:"Biceps, with a strong squeeze at the top.",
    avoid:["Lifting your elbow off your thigh.","Using your body or leg to help.","Stopping short of a straight arm."]},
  "woodchop":{steps:[
    "Stand with feet wider than your shoulders, holding one dumbbell by its ends with both hands.",
    "Start with the dumbbell up beside your right shoulder, torso turned slightly to the right.",
    "Rotate your torso and pivot your back foot to bring the dumbbell diagonally down across your body to the outside of your left knee, bending your knees as you go. Arms stay fairly straight: the power comes from your hips and torso.",
    "Return under control to the start. Do all reps on one side, then switch."],
    feel:"The sides of your waist (obliques) and your core. This is the rotation behind your groundstrokes.",
    avoid:["Rounding your lower back at the bottom.","Doing it with your arms only.","Going faster than you can control."]},
  "rdl":{steps:[
    "Stand with feet hip-width apart, dumbbells in front of your thighs, palms facing you. Unlock your knees slightly and keep that small bend fixed.",
    "Push your hips straight back, sliding the dumbbells down the front of your legs and keeping them close.",
    "Keep your back flat and chest up. Stop when you feel a strong stretch in your hamstrings, usually just below the knees to mid-shin. Don't chase the floor.",
    "Drive your hips forward to stand tall, squeezing your glutes at the top. Don't lean back."],
    feel:"Hamstrings (backs of the thighs) and glutes. Not your lower back.",
    avoid:["Rounding your back. Stop higher if it starts to round.","Bending your knees into a squat.","The dumbbells drifting away from your legs."]},
  "split":{steps:[
    "Stand a long stride in front of a low step, chair or couch, facing away from it. Rest the top of your back foot on it, laces down.",
    "Hold a wall or doorframe for balance until you're confident.",
    "Keeping your torso upright (a slight forward lean is fine), lower straight down by bending your front knee until your front thigh is about level with the floor and your back knee is close to it.",
    "Push through your whole front foot, especially the heel, to stand back up. Do all reps on one leg, then switch. If your front heel lifts, move your front foot further forward."],
    feel:"Front of the front thigh and the front-leg glute.",
    avoid:["Your front knee caving inwards.","Pushing off with the back foot.","Bouncing at the bottom."]},
  "calf":{steps:[
    "Stand on one foot on the edge of a step, ball of the foot on the step and heel hanging off. Hold a rail or wall lightly for balance, with a dumbbell in the same-side hand once bodyweight gets easy.",
    "Lower your heel slowly (2 seconds) as far as is comfortable, to stretch the calf.",
    "Rise as high as you can onto the ball of your foot and hold the top for one second.",
    "Keep the knee straight but not locked."],
    feel:"Calf and Achilles, which protects them for tennis.",
    avoid:["Bouncing at the bottom.","Rushing the reps.","Pulling yourself up with the rail."]}
};

export const ORDER = ["push","pull","upper"]; // also the rotation order
export const EX = {}; ORDER.forEach(d=>PLAN[d].ex.forEach(e=>EX[e.id]={...e,day:d}));
export const allExercises=()=>ORDER.flatMap(d=>PLAN[d].ex);

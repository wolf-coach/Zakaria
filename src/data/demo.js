export const demoCustomer = {
  id: "demo-customer",
  name: "Alex Morgan",
  email: "alex@example.com",
  age: 29,
  gender: "Male",
  height: 178,
  weight: 78,
  goal: "Build lean muscle",
  allergies: "Peanuts",
  health: "No known conditions",
  phone: "+212 600 000 000",
  package: "Elite Coaching",
  startDate: "2026-09-01",
  endDate: "2026-10-01"
};

export const demoProgram = {
  Monday: {
    workout: "Upper Body Strength",
    exercises: ["Bench press — 4 × 8", "Pull-ups — 4 × 6", "Shoulder press — 3 × 10"],
    meals: ["Oats + berries + yogurt", "Chicken rice bowl", "Salmon + vegetables"]
  },
  Tuesday: {
    workout: "Lower Body Strength",
    exercises: ["Squat — 4 × 8", "Romanian deadlift — 3 × 10", "Walking lunges — 3 × 12"],
    meals: ["Eggs + wholegrain toast", "Greek yogurt + fruit", "Lean beef + potatoes"]
  },
  Wednesday: {
    workout: "Active Recovery",
    exercises: ["30 min walk", "10 min mobility", "Stretching — 15 min"],
    meals: ["Omelette + avocado", "Tuna wrap", "Chicken + quinoa"]
  },
  Thursday: {
    workout: "Push",
    exercises: ["Incline press — 4 × 8", "Lateral raises — 3 × 15", "Triceps extensions — 3 × 12"],
    meals: ["Protein oats", "Turkey sandwich", "White fish + rice"]
  },
  Friday: {
    workout: "Pull",
    exercises: ["Lat pulldown — 4 × 10", "Cable row — 3 × 10", "Biceps curl — 3 × 12"],
    meals: ["Eggs + fruit", "Chicken salad", "Beef + vegetables"]
  },
  Saturday: {
    workout: "Full Body",
    exercises: ["Goblet squat — 3 × 12", "Push-ups — 3 × 12", "Kettlebell swing — 3 × 15"],
    meals: ["Greek yogurt bowl", "Chicken wrap", "Salmon + sweet potato"]
  },
  Sunday: {
    workout: "Rest & Recovery",
    exercises: ["Light walk", "Mobility — 15 min"],
    meals: ["Balanced breakfast", "Protein-rich lunch", "Light dinner"]
  }
};

export const demoCustomers = [
  demoCustomer,
  {
    ...demoCustomer,
    id: "customer-2",
    name: "Sara Benali",
    email: "sara@example.com",
    age: 34,
    gender: "Female",
    height: 165,
    weight: 68,
    goal: "Fat loss",
    allergies: "None",
    package: "Transformation",
    startDate: "2026-09-05",
    endDate: "2026-12-05"
  }
];
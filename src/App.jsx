import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence,
  animate,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
  useInView } from "framer-motion";
import { wrap } from "@motionone/utils";
import {
  ArrowRight, ArrowLeft, Bell, Check, ChevronDown, ChevronRight, Dumbbell, Flame, HeartPulse, Instagram, Package as PackageIcon, Trash2,
  LayoutDashboard, LogIn, LogOut, Menu, Play, Plus, ShieldCheck, Star, Search,
  Target, User, Users, Utensils, X, CalendarDays, Clock3, Save, CheckCircle2, AlertTriangle, Send, Phone
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react"; 
import "swiper/css";
import Img1 from "./data/img1.jpeg";
import Img2 from "./data/img2.jpeg";
import Img3 from "./data/img3.jpeg";
import Img4 from "./data/img4.jpeg";

import { Autoplay, Navigation } from "swiper/modules";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, firebaseConfigured, loginEmail, registerEmail, loginGoogle, logoutFirebase, resetPassword } from "./lib/firebase";
import { ref, get, set, update, remove, onValue } from "firebase/database";

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "omar@gmail.com").trim().toLowerCase();
const demoCustomer = {
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
const demoProgram = {
  Monday: { workout: "Upper Body Strength", exercises: ["Bench press — 4 × 8", "Pull-ups — 4 × 6", "Shoulder press — 3 × 10"], meals: ["Oats + berries + yogurt", "Chicken rice bowl", "Salmon + vegetables"] },
  Tuesday: { workout: "Lower Body Strength", exercises: ["Squat — 4 × 8", "Romanian deadlift — 3 × 10", "Walking lunges — 3 × 12"], meals: ["Eggs + wholegrain toast", "Greek yogurt + fruit", "Lean beef + potatoes"] },
  Wednesday: { workout: "Active Recovery", exercises: ["30 min walk", "10 min mobility", "Stretching — 15 min"], meals: ["Omelette + avocado", "Tuna wrap", "Chicken + quinoa"] },
  Thursday: { workout: "Push", exercises: ["Incline press — 4 × 8", "Lateral raises — 3 × 15", "Triceps extensions — 3 × 12"], meals: ["Protein oats", "Turkey sandwich", "White fish + rice"] },
  Friday: { workout: "Pull", exercises: ["Lat pulldown — 4 × 10", "Cable row — 3 × 10", "Biceps curl — 3 × 12"], meals: ["Eggs + fruit", "Chicken salad", "Beef + vegetables"] },
  Saturday: { workout: "Full Body", exercises: ["Goblet squat — 3 × 12", "Push-ups — 3 × 12", "Kettlebell swing — 3 × 15"], meals: ["Greek yogurt bowl", "Chicken wrap", "Salmon + sweet potato"] },
  Sunday: { workout: "Rest & Recovery", exercises: ["Light walk", "Mobility — 15 min"], meals: ["Balanced breakfast", "Protein-rich lunch", "Light dinner"] }
};
const demoCustomers = [
  demoCustomer,
  { ...demoCustomer, id: "customer-2", name: "Sara Benali", email: "sara@example.com", age: 34, gender: "Female", height: 165, weight: 68, goal: "Fat loss", allergies: "None", package: "Transformation", startDate: "2026-09-05", endDate: "2026-12-05" }
];
const days = Object.keys(demoProgram);
const emptyProgram = Object.fromEntries(days.map(day => [day, { workout: "", exercises: [], meals: [] }]));


function ParallaxText({ children, baseVelocity = 100 }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false
  });
 
  /**
   * This is a magic wrapping for the length of the text - you
   * have to replace for wrapping that works for you or dynamically
   * calculate
   */
  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);
 
  const directionFactor = useRef(1);
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1600);
 
    /**
     * This is what changes the direction of the scroll once we
     * switch scrolling directions.
     */
    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }
 
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
 
    baseX.set(baseX.get() + moveBy);
  });
 
  /**
   * The number of times to repeat the child text should be dynamically calculated
   * based on the size of the text and viewport. Likewise, the x motion value is
   * currently wrapped between -20 and -45% - this 25% is derived from the fact
   * we have four children (100% / 4). This would also want deriving from the
   * dynamically generated number of children.
   */
  return (
    <div className="parallax">
      <motion.div className="scroller" style={{ x }}>
        <span>{children} </span>
        <span>{children} </span>
        <span>{children} </span>
        <span>{children} </span>
      </motion.div>
    </div>
  );
}
 

 

// Firebase Realtime Database can return arrays as arrays or, depending on how
// the data was edited, as objects. Normalize every day before rendering so a
// single malformed/missing day (including Sunday) can never crash the dashboard.
function normalizeList(value) {
  const items = Array.isArray(value) ? value : (value && typeof value === "object" ? Object.values(value) : (typeof value === "string" ? [value] : []));
  return items.filter(Boolean).map(item => {
    if (typeof item === "object") return String(item.description ?? item.name ?? item.text ?? "").trim();
    return String(item).trim();
  }).filter(Boolean);
}
function normalizeDay(value) {
  const v = value && typeof value === "object" ? value : {};
  return {
    workout: typeof v.workout === "string" ? v.workout : String(v.workout || ""),
    exercises: normalizeList(v.exercises),
    meals: normalizeList(v.meals)
  };
}
function normalizeProgram(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(days.map(day => [day, normalizeDay(source[day])]));
}

const emptyCustomer = {
  id: "", name: "", email: "", age: "", gender: "", height: "", weight: "",
  goal: "", allergies: "", health: "", phone: "", package: "", startDate: "", endDate: ""
};

const CUSTOMER_PACKAGES = [
  { value: "Basic", price: "1000 MAD", months: 1, description: "1 to 1 at Gym Metroflex." },
  { value: "Transformation", price: "1200 MAD", months: 1, description: "1 to 1 at your home or your gym." },
  { value: "Special Promo", price: "2000 MAD", months: 3, description: "Maximum accountability for 3 months." }
];

function getPackageMonths(packageName) {
  return packageName === "Special Promo" ? 3 : 1;
}

function getPackageDurationLabel(packageName) {
  const months = getPackageMonths(packageName);
  return `${months} month${months === 1 ? "" : "s"}`;
}

function addPackageMonths(dateString, months = 1) {
  if (!dateString) return "";
  const d = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + Number(months || 1));
  // If the target month has fewer days, use its last valid day.
  if (d.getDate() !== originalDay) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function getPackageEndDate(packageName, startDate) {
  return addPackageMonths(startDate, getPackageMonths(packageName));
}

function packageProgress(startDate, endDate) {
  if (!startDate || !endDate) return { remaining: null, percent: 0, active: false, awaiting: true };
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const now = new Date();
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.min(total, Math.max(0, now.getTime() - start.getTime()));
  const percent = Math.round(Math.max(0, Math.min(100, 100 - (elapsed / total) * 100)));
  const remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  return { remaining, percent, active: now <= end, awaiting: false };
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function App() {
  const [page, setPage] = useState("home");
  const [dashboardSection, setDashboardSection] = useState("home");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [customer, setCustomer] = useState(() => firebaseConfigured ? emptyCustomer : demoCustomer);
  const [customers, setCustomers] = useLocalState("coachflow_customers", firebaseConfigured ? [] : demoCustomers);
  const [program, setProgram] = useState(demoProgram);
  const [authMode, setAuthMode] = useState(null);
  const [toast, setToast] = useState("");
  const [welcomePopup, setWelcomePopup] = useState(false);
  const authFlowRef = useRef(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const go = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDashboardSection = (section) => {
    setDashboardSection(section);
    go("dashboard");
  };

  // Firebase is the source of truth for the currently signed-in customer.
  // Live listeners keep the dashboard synchronized with the coach's edits.
  useEffect(() => {
    if (!firebaseConfigured || !db || !user || user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;

    const profileRef = ref(db, `users/${user.uid}`);
    const programRef = ref(db, `programs/${user.uid}`);

    const unsubscribeProfile = onValue(profileRef, (snap) => {
      const data = snap.val();
      if (data) {
        setCustomer({
          ...emptyCustomer,
          ...data,
          id: user.uid,
          email: user.email || data.email || ""
        });
      }
    }, (e) => {
      console.error("Could not listen to customer profile", e);
      notify(e?.code === "PERMISSION_DENIED"
        ? "denied your profile.."
        : "Could not load your customer profile.");
    });

    const unsubscribeProgram = onValue(programRef, (snap) => {
      const data = snap.val();
      setProgram(normalizeProgram(data));
    }, (e) => {
      console.error("Could not listen to customer program", e);
      setProgram(emptyProgram);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeProgram();
    };
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!firebaseConfigured || !auth) return;
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!active) return;
      setUser(u);
      setAuthReady(true);

      // Login/signup handlers perform the profile write/load themselves.
      // Skipping here prevents the auth listener from racing them and replacing
      // the freshly entered customer information with an empty profile.
      if (u && authFlowRef.current === u.uid) return;

      if (!u) {
        setCustomer(emptyCustomer);
        setProgram(emptyProgram);
        if (["dashboard", "profile", "admin"].includes(page)) setPage("home");
        return;
      }

      try {
        if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setCustomer({ ...emptyCustomer, id: u.uid, email: u.email || "", name: u.displayName || "Coach" });
          setPage((current) => ["login", "home"].includes(current) ? "admin" : current);
        } else {
          setCustomer(prev => ({ ...emptyCustomer, ...prev, id: u.uid, email: u.email || "" }));
          setProgram(emptyProgram);
          setPage((current) => ["login", "home"].includes(current) ? "dashboard" : current);
        }
      } catch (e) {
        console.error("Could not load user data", e);
        notify("Signed in, but your profile could not be loaded. Check it.");
      }
    });

    return () => { active = false; unsubscribe(); };
  }, []);

  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isCustomer = !!user && !isAdmin;

  async function handleLogout() {
    await logoutFirebase();
    setUser(null);
    setCustomer(emptyCustomer);
    setProgram(emptyProgram);
    setAuthMode(null);
    go("home");
    notify("You have been logged out.");
  }

  async function handleAuth(mode, form) {
    try {
      const email = form.email.trim().toLowerCase();
      if (!email) throw new Error("Please enter your email.");
      if (form.password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (mode === "signup" && !String(form.package || "").trim()) throw new Error("Please choose a coaching package.");
      if (mode === "signup" && !String(form.phone || "").trim()) throw new Error("Please enter your phone number.");

      if (firebaseConfigured) {
        const result = mode === "signup"
          ? await registerEmail(email, form.password)
          : await loginEmail(email, form.password);
        const u = result?.user;
        if (!u) throw new Error("Authentication did not return a user.");

        authFlowRef.current = u.uid;
        setUser(u);
        setAuthReady(true);

        // Route immediately after Firebase authentication succeeds.
        // Realtime Database loading happens after the screen is already shown.
        if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setAuthMode(null);
          go("admin");
          notify("Welcome, Coach.");
          authFlowRef.current = null;
          return;
        }

        const profileRef = ref(db, `users/${u.uid}`);

        // Route immediately after Authentication succeeds. The dashboard is
        // rendered with THIS Firebase UID, never with the demo Alex profile.
        setCustomer({ ...emptyCustomer, id: u.uid, email: u.email || email });
        setProgram(emptyProgram);
        setAuthMode(null);
        go("dashboard");

        if (mode === "signup") {
          // Save the complete signup form in one Realtime Database write. The auth-state
          // listener intentionally does not create missing profiles, preventing
          // a race that previously saved only the email.
          const profile = {
            ...emptyCustomer,
            id: u.uid,
            name: String(form.name || "").trim(),
            email: u.email || email,
            age: form.age === "" ? "" : Number(form.age),
            height: form.height === "" ? "" : Number(form.height),
            weight: form.weight === "" ? "" : Number(form.weight),
            goal: String(form.goal || "").trim(),
            gender: String(form.gender || "").trim(),
            phone: String(form.phone || "").trim(),
            package: String(form.package || "").trim()
          };
          await set(profileRef, profile);
          setCustomer(profile);
          setWelcomePopup(true);
        } else {
          // Existing customer: load their own UID document. If it does not
          // exist, create a minimal profile without demo data.
          const existing = await get(profileRef);
          if (existing.exists()) {
            setCustomer({ ...emptyCustomer, ...existing.val(), id: u.uid, email: u.email || existing.val().email || email });
          } else {
            const profile = { ...emptyCustomer, id: u.uid, email: u.email || email, name: u.displayName || "" };
            await set(profileRef, profile);
            setCustomer(profile);
          }
        }

        const programSnap = await get(ref(db, `programs/${u.uid}`));
        setProgram(normalizeProgram(programSnap.exists() ? programSnap.val() : emptyProgram));

        notify(mode === "signup" ? "Account created successfully." : "Welcome back.");
        authFlowRef.current = null;
        return;
      }

      // Demo mode only when Firebase is not configured.
      if (mode === "login" && email === ADMIN_EMAIL.toLowerCase() && form.password === "admin123") {
        setAuthMode(null);
        go("admin");
        notify("Welcome, Coach Ziko.");
        return;
      }

      const existing = customers.find(c => c.email?.toLowerCase() === email);
      const profile = mode === "login"
        ? (existing || { ...emptyCustomer, id: crypto.randomUUID(), email })
        : { ...emptyCustomer, id: crypto.randomUUID(), email, name: form.name || "", age: Number(form.age || 0), height: Number(form.height || 0), weight: Number(form.weight || 0), goal: form.goal || "", phone: form.phone || "", package: form.package || "" };
      setCustomer(profile);
      setCustomers(prev => prev.some(x => x.email?.toLowerCase() === email) ? prev : [...prev, profile]);
      setAuthMode(null);
      go("dashboard");
      if (mode === "signup") setWelcomePopup(true);
      notify(mode === "signup" ? "Account created successfully." : "Welcome back.");
    } catch (e) {
      authFlowRef.current = null;
      console.error(e);
      const msg = e?.code === "auth/invalid-credential" ? "Incorrect email or password."
        : e?.code === "auth/email-already-in-use" ? "This email is already registered. Try signing in."
          : e?.code === "auth/weak-password" ? "Password must be at least 6 characters."
            : e?.code === "auth/invalid-email" ? "Please enter a valid email address."
              : e?.code === "PERMISSION_DENIED" || e?.code === "permission-denied" ? "Blocked this request. Check It."
                : e?.message || "Authentication failed.";
      notify(msg);
    }
  }

  async function handleGoogle() {
    try {
      if (!firebaseConfigured) throw new Error("Google sign-in requires Firebase.");
      const result = await loginGoogle();
      const u = result?.user;
      if (!u) return;
      authFlowRef.current = u.uid;
      setUser(u);
      setAuthReady(true);

      if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAuthMode(null);
        go("admin");
        notify("Welcome, Coach Ziko.");
        authFlowRef.current = null;
        return;
      }

      const profileRef = ref(db, `users/${u.uid}`);
      const existing = await get(profileRef);
      if (!existing.exists()) {
        await set(profileRef, { ...emptyCustomer, id: u.uid, email: u.email || "", name: u.displayName || "" });
      }
      setAuthMode(null);
      go("dashboard");
      notify("Signed in with Google.");
      authFlowRef.current = null;
    } catch (e) {
      authFlowRef.current = null;
      notify(e?.code === "auth/popup-closed-by-user" ? "Google sign-in was cancelled." : e?.message || "Google sign-in failed.");
    }
  }

  async function handleReset(email) {
    try {
      if (!firebaseConfigured) throw new Error("Password reset requires Firebase.");
      if (!email?.trim()) throw new Error("Enter your email first.");
      await resetPassword(email.trim().toLowerCase());
      notify("Password reset email sent.");
    } catch (e) {
      notify(e?.code === "auth/user-not-found" ? "No account found for this email." : e?.message || "Could not send reset email.");
    }
  }

  if (!authReady) {
    return <div className="app auth-loading">
              <div className="loading-card">
                <div className="brand static">
                  <span className="brand-mark">C</span>
                  <span>COACH<span className="accent">RAFALIA</span></span>
                </div>
                <div className="spinner" />
                 <p>Checking your account…</p>
                 </div>
              </div>;
  }

  return (
    <div className="app">
      <Nav page={page} go={go} isCustomer={isCustomer} isAdmin={isAdmin} logout={handleLogout} />
      <AnimatePresence mode="wait">
        {page === "home" && <Home key="home" go={go} />}
        {page === "dashboard" && isCustomer && <Dashboard key="dashboard" customer={customer} program={program} go={go} initialSection={dashboardSection} />}
        {page === "profile" && isCustomer && <Profile key="profile" customer={customer} setCustomer={setCustomer} notify={notify} go={go} openDashboardSection={openDashboardSection} />}
        {page === "admin" && isAdmin && <Admin key="admin" customers={customers} setCustomers={setCustomers} program={program} setProgram={setProgram} notify={notify} />}
        {page === "login" && <Auth key="login" mode="login" onSubmit={(f) => handleAuth("login", f)} onGoogle={handleGoogle} onReset={handleReset} switchMode={() => setAuthMode("signup")} />}
      </AnimatePresence>
      <AnimatePresence>
        {authMode && <AuthOverlay mode={authMode} close={() => setAuthMode(null)} onSubmit={(f) => handleAuth(authMode, f)} onGoogle={handleGoogle} onReset={handleReset} switchMode={() => setAuthMode(authMode === "login" ? "signup" : "login")} />}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
      <AnimatePresence>
        {welcomePopup && (
          <motion.div className="welcome-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="welcome-popup"
              initial={{ opacity: 0, y: 28, scale: .96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: .97 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <button className="welcome-close" aria-label="Close welcome message" onClick={() => setWelcomePopup(false)}><X size={19} /></button>
              <div className="welcome-icon"><Dumbbell size={26} /></div>
              <div className="section-label">WELCOME TO COACHRAFALIA</div>
              <h2>Welcome to your <span>new fitness journey.</span></h2>
              <p>Your account is ready. Your dashboard is where you'll find your workouts, meals, progress and coaching updates.</p>
              <div className="welcome-points">
                <div><Check size={17} /><span>Personalized weekly program</span></div>
                <div><Check size={17} /><span>Progress tracking in one place</span></div>
                <div><Check size={17} /><span>Updates from your coach</span></div>
              </div>
              <button className="primary-btn full" onClick={() => setWelcomePopup(false)}>Let's get started <ArrowRight size={17} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}

function Nav({ page, go, isCustomer, isAdmin, logout }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const close = () => setOpen(false);

  // Close the mobile navigation when the user clicks/taps anywhere outside it.
  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  const section = (id) => { close(); if (page !== "home") { go("home"); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100); } else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  return <header className="nav" ref={navRef}><div className="nav-inner">
    <button className="brand" onClick={() => { close(); go("home") }}>
      <span>COACH<span className="accent">RAFALIA</span></span>
    </button>
    <button className="mobile-menu" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav className={open ? "nav-links open" : "nav-links"}>
      <button onClick={() => { close(); go("home") }}>Home</button>
      <button onClick={() => section("about")}>About</button>
      <button onClick={() => section("packs")}>Packs</button>
      <button onClick={() => section("reviews")}>Reviews</button>
      {isCustomer && <button onClick={() => { close(); go("dashboard") }}>Dashboard</button>}
      {isAdmin && <button onClick={() => { close(); go("admin") }}>Admin</button>}
      {isCustomer || isAdmin ? <button className="outline-btn" onClick={() => { close(); logout() }}><LogOut size={15} /> Logout</button> : <button className="primary-btn small" onClick={() => { close(); go("login") }}><LogIn size={15} /> Login</button>}
    </nav>
  </div></header>;
}
function Home({ go }) {
  const [certificateImage, setCertificateImage] = useState("");
  const packs = [
    { name: "Basic", price: "1000MAD", desc: "1 To 1 At Gym Metroflex.", items: ["Fully Personalized Workout Session", "One-on-one coaching during the entire workout","Training tips to improve future workouts","Motivation and accountability to push your limits","Nutrition basics","An account with your own dashboard for your daily meals.","Everything in Starter", "Personal meal plan", "Weekly check-in", "Progress tracking","Everything in Transformation", "Direct coach support", "Program adjustments", "Priority check-ins"] },
    { name: "Transformation", price: "1200MAD", desc: "1 To 1 In Your Home Or Your Gym", popular: true, items: ["Fully Personalized Workout Session", "One-on-one coaching during the entire workout","Training tips to improve future workouts","Motivation and accountability to push your limits","Nutrition basics","An account with your own dashboard for your daily meals.","Everything in Starter", "Personal meal plan", "Weekly check-in", "Progress tracking","Everything in Transformation", "Direct coach support", "Program adjustments", "Priority check-ins"] },
    { name: "Special Promo", price: "2000MAD",month: "3" ,desc: "Maximum accountability.", items: ["Fully Personalized Workout Session", "One-on-one coaching during the entire workout","Training tips to improve future workouts","Motivation and accountability to push your limits","Nutrition basics","An account with your own dashboard for your daily meals.","Everything in Starter", "Personal meal plan", "Weekly check-in", "Progress tracking","Everything in Transformation", "Direct coach support", "Program adjustments", "Priority check-ins"] }
  ];
  const reviews = [
    ["Omar R.", "Lost 9 kg in 12 weeks. The plan was simple, clear and actually sustainable.", "5.0"],
    ["Sara B.", "I finally understand how to train and eat for my goal. Amazing coaching.", "5.0"],
    ["Walid R.", "The weekly dashboard keeps me accountable every single day.", "5.0"]
  ];

  const handleCertificateUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCertificateImage(String(reader.result));
    reader.readAsDataURL(file);
  };



  



  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <section className="hero">
      <div className="hero-glow one" /><div className="hero-glow two" />
      <div className="container hero-grid">
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: .7 }}>
          <div className="eyebrow"><span className="pulse" /> PERSONAL COACHING • BUILT FOR RESULTS</div>
          <h1>Build the body.<br /><span>Build the life.</span></h1>
          <p className="hero-copy">Personalized training, nutrition and accountability — designed around your life, your body and your goals.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => go("login")}>
              Start your journey <ArrowRight size={18} />
            </button>
            <a className="video-link" href="#about">
              <span className="play">
                <Play size={14} fill="currentColor" />
              </span> Discover coaching
            </a>
          </div>
            <div className="trust">
                <div className="avatars">
                  <span>A</span>
                  <span>S</span>
                  <span>Y</span>
                  <span>+</span>
                </div>
                <div>
                    <strong>50+ clients</strong>
                    <small>already transforming</small>
                </div>
            </div>
        </motion.div>
        <motion.div className="hero-card-wrap" initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .8, delay: .15 }}>
          <div className="hero-card">
            <div className="hero-card-top"><span>YOUR NEXT LEVEL</span><span className="live-dot">● LIVE</span></div>
            <div className="hero-photo">
              <div className="photo-overlay">
                 <Swiper className="mySwiper"
                    spaceBetween={30}
                    centeredSlides={true}
                    autoplay={{
                      delay: 2000,
                      disableOnInteraction: false,
                    }}
                    pagination={{
                      clickable: true,
                    }}
                   
                    modules={[Autoplay, Navigation]}
                   
                 >
                  <SwiperSlide><img src={Img1} className="imgs-swiper" alt="image"/></SwiperSlide>
                  <SwiperSlide><img src={Img2} className="imgs-swiper" alt="image"/></SwiperSlide>
                  <SwiperSlide><img src={Img3} className="imgs-swiper" alt="image"/></SwiperSlide>
                  <SwiperSlide><img src={Img4} className="imgs-swiper" alt="image"/></SwiperSlide>
                  
                </Swiper>
              </div>
            </div>
            <div className="mini-stats">
              <div>
                <AnimatedNumber value={12} />
                <span>Weeks</span>
              </div>
              <div><AnimatedNumber value={4.8} decimals={1} />
              <span>Rating</span>
              </div>
              <div>
                <b>24/7</b>
                <span>Support</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    <section id="how-it-works" className="section how-it-works">
      <div className="container">
        <Reveal>
          <div className="section-label">02 — HOW THE APP WORKS</div>
          <div className="how-heading">
            <div>
              <h2>Your coaching journey, <span>all in one place.</span></h2>
              <p>Everything you need to train, track your progress and stay connected with your coach — designed for your phone.</p>
            </div>
            <div className="how-badge"><Dumbbell size={18} /> Mobile-first coaching</div>
          </div>
        </Reveal>

        <motion.div
          className="how-slider-shell"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .15 }}
          transition={{ duration: .55 }}
        >
          <Swiper
            className="how-swiper"
            spaceBetween={16}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2 },
              980: { slidesPerView: 3 }
            }}
          >
            {[
              { icon: <User size={22} />, number: "01", title: "Create your account", text: "Choose your coaching package and tell us about your goals. Your personal dashboard is created automatically." },
              { icon: <CalendarDays size={22} />, number: "02", title: "Follow your plan", text: "Open your dashboard to see workouts, meals and your weekly program from your coach." },
              { icon: <Target size={22} />, number: "03", title: "Track your progress", text: "Keep your weight, measurements, photos and weekly progress organized in one place." },
              { icon: <Bell size={22} />, number: "04", title: "Stay updated", text: "Receive important updates from your coach and keep up with your training schedule." }
            ].map((step) => (
              <SwiperSlide key={step.number}>
                <motion.article
                  className="how-card"
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: .98 }}
                  transition={{ type: "spring", stiffness: 3209, damping: 22 }}
                >
                  <div className="how-card-top">
                    <span className="how-icon">{step.icon}</span>
                    <span className="how-number">{step.number}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <div className="how-line"><span /></div>
                </motion.article>
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="how-swipe-hint">
            <ArrowLeft size={15} /> Swipe to explore <ArrowRight size={15} /></div>
        </motion.div>
      </div>
    </section>

    <section id="about" className="section about"><div className="container two-col">
      <Reveal><div className="section-label">01 — ABOUT THE COACH</div><h2>Coaching that fits <span>your life.</span></h2><p>I believe fitness should make your life better — not take it over. My coaching combines smart training, practical nutrition and real accountability to create results you can keep.</p><p>Every client gets a plan built around their current level, schedule, preferences and goal.</p>
      <a className="text-btn" target="_blank" href='https://wa.me/212681197174?text=Hello%20Coach%20ZAKARIA%20Im%20interested'>Meet your coach <ArrowRight size={17} /></a></Reveal>
      <Reveal delay={.15}><div className="about-card"><div className="about-icon"><Target /></div><h3>Personal. Measurable. Sustainable.</h3><div className="about-list"><span><Check />Individual training</span><span><Check />Personal nutrition</span><span><Check />Weekly accountability</span><span><Check />Progress adjustments</span></div></div></Reveal>
    </div>
    
        <section className="parallax-section">
          <ParallaxText baseVelocity={-5}>ZAKARIA RAFALIA <i class="fa-solid fa-dumbbell"></i> COACH PERSONEL <i class="fa-solid fa-medal"></i></ParallaxText>
        </section>
    </section>
    









    <section className="section certificate-section">
      <div className="container certificate-grid">
        <Reveal>
          <div className="section-label">COACH CERTIFICATE</div>
          <h2>Proof behind <span>the coaching.</span></h2>
          <p className="certificate-copy">Show clients the qualification and experience behind every personalized training plan.</p>
          <label className="certificate-upload">
            <span>{certificateImage ? "Replace certificate image" : "Add certificate image"}</span>
            <input type="file" accept="image/*" onChange={handleCertificateUpload} />
          </label>
        </Reveal>
        <Reveal delay={.15}>
          <div className="certificate-frame">
            {certificateImage ? <img className="certificate-image" src={certificateImage} alt="Coach certificate" /> : <div className="certificate-placeholder"><div className="certificate-placeholder-mark"><Check size={28} /></div><b>Your certificate</b><span>Upload an image to display it here</span></div>}
          </div>
        </Reveal>
      </div>
    </section>

    <section className="section dark-section"><div className="container"><Reveal><div className="section-label">02 — WHAT I DO</div><h2>Everything you need to <span>move forward.</span></h2></Reveal><div className="service-grid">
      {[["01", "TRAINING", "Structured workouts built for your goal, experience and available equipment.", Dumbbell], ["02", "NUTRITION", "Simple meal guidance and personalized plans you can actually follow.", Utensils], ["03", "ACCOUNTABILITY", "Regular check-ins, adjustments and direct support when you need it.", HeartPulse]].map(([n, t, d, I], i) => <Reveal delay={i * .1} key={n}><div className="service-card"><span>{n}</span><I /><h3>{t}</h3><p>{d}</p></div></Reveal>)}
    </div></div></section>

    <section id="packs" className="section"><div className="container"><Reveal><div className="section-label">03 — COACHING PACKS</div><h2>Choose your <span>commitment.</span></h2></Reveal><div className="pack-grid">{packs.map((p, i) => <Reveal delay={i * .1} key={p.name}><div className={"pack " + (p.popular ? "featured" : "")}>{p.popular && <div className="popular">MOST POPULAR</div>}<h3>{p.name}</h3><p>{p.desc}</p><div className="price">{p.price}<small>/{p.month} month</small></div><div className="pack-items">{p.items.map(x => <span key={x}><Check size={16} />{x}</span>)}</div><button className={p.popular ? "primary-btn" : "outline-dark"} onClick={() => go("login")}>Get started <ArrowRight size={16} /></button></div></Reveal>)}</div></div></section>

    <section id="reviews" className="section reviews"><div className="container"><Reveal><div className="section-label">04 — CLIENT RESULTS</div><h2>Real people. <span>Real change.</span></h2></Reveal><div className="review-grid">{reviews.map(([name, text, score], i) => <Reveal delay={i * .1} key={name}><div className="review"><div className="stars">{[1, 2, 3, 4, 5].map(x => <Star key={x} size={16} fill="currentColor" />)}</div><p>“{text}”</p><div className="reviewer"><div>{name[0]}</div><span><b>{name}</b><small>Verified client</small></span></div></div></Reveal>)}</div></div></section>
    <section className="cta"><div className="container cta-inner"><Reveal><div><div className="section-label">READY?</div><h2>Your next chapter starts <span>today.</span></h2></div><button className="primary-btn" onClick={() => go("login")}>Join the coaching <ArrowRight /></button></Reveal></div></section>
  </motion.main>
}

function Dashboard({ customer, program, go, initialSection = "home" }) {
  const [selected, setSelected] = useState("Monday");
  const [activeSection, setActiveSection] = useState(initialSection);
  const [notifications, setNotifications] = useState([]);
  const d = normalizeDay(program?.[selected]);
  const progress = packageProgress(customer.startDate, customer.endDate);
  const firstName = customer.name?.trim()?.split(" ")[0] || "there";

  useEffect(() => {
    if (!firebaseConfigured || !db || !auth?.currentUser?.uid) return;
    const notificationsRef = ref(db, `notifications/${auth.currentUser.uid}`);
    return onValue(notificationsRef, (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, value]) => ({ id, ...(value || {}) }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setNotifications(list);
    }, (e) => console.error("Could not load notifications", e));
  }, [customer.id]);

  const packageNotification = progress.awaiting
    ? { id: "package-pending", title: "Package awaiting confirmation", message: "Your coach will confirm your package start date and end date.", createdAt: Date.now(), system: true }
    : progress.remaining > 0 && progress.remaining <= 7
      ? { id: `package-expiry-${customer.endDate}`, title: `Your package expires in ${progress.remaining} day${progress.remaining === 1 ? "" : "s"}.`, message: `Your ${customer.package || "coaching"} package ends on ${formatDate(customer.endDate)}.`, createdAt: Date.now(), system: true }
      : progress.remaining === 0
        ? { id: `package-expired-${customer.endDate}`, title: "Your package has expired.", message: `Your package ended on ${formatDate(customer.endDate)}. Contact your coach for the next step.`, createdAt: Date.now(), system: true }
        : null;
  const visibleNotifications = packageNotification ? [packageNotification, ...notifications] : notifications;
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  const markRead = async (id) => {
    if (!firebaseConfigured || !db || id.startsWith("package-")) return;
    try { await update(ref(db, `notifications/${auth.currentUser.uid}/${id}`), { read: true }); } catch (e) { console.error(e); }
  };
  const deleteNotification = async (id) => {
    if (id.startsWith("package-")) return;
    if (!firebaseConfigured || !db || !auth?.currentUser?.uid) {
      setNotifications(current => current.filter(notification => notification.id !== id));
      return;
    }
    try { await remove(ref(db, `notifications/${auth.currentUser.uid}/${id}`)); }
    catch (e) { console.error("Could not delete notification", e); }
  };

  const openSection = (section) => {
    if (section === "profile") {
      go("profile");
      return;
    }
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderNotifications = (compact = false) => (
    <div className={compact ? "notification-list" : "customer-notification-page-list"}>
      {visibleNotifications.length === 0 ? (
        <div className="notification-empty"><Bell size={22} /><p>No new notifications.</p></div>
      ) : visibleNotifications.slice(0, compact ? 8 : 30).map(n => (
        <motion.div key={n.id} className={`notification-item ${n.read ? "read" : ""}`} onClick={() => markRead(n.id)} whileHover={{ x: 3 }} role="button" tabIndex={0} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") markRead(n.id); }}>
          <span className="notification-icon"><Bell size={15} /></span>
          <span className="notification-copy"><b>{n.title}</b><small>{n.message}</small><em>{n.createdAt && !n.system ? new Date(Number(n.createdAt)).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "Now"}</em></span>
          {!n.system && <button type="button" className="notification-delete" onClick={event => { event.stopPropagation(); deleteNotification(n.id); }} aria-label={`Delete notification: ${n.title}`} title="Delete notification"><Trash2 size={15} /></button>}
        </motion.div>
      ))}
    </div>
  );

  return <motion.main className="page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
    <div className="container">
      <div className="dash-head">
        <div><div className="section-label">CLIENT DASHBOARD</div><h1>Good morning, <span>{firstName}.</span></h1><p>Stay consistent. Small actions, big results.</p></div>
      </div>

      <nav className="customer-page-browser" aria-label="Customer dashboard sections">
        {[{ id: "home", label: "Home", icon: LayoutDashboard }, { id: "workout", label: "Workout", icon: Dumbbell }, { id: "notifications", label: "Notifications", icon: Bell }, { id: "profile", label: "My profile", icon: User }].map(item => {
          const Icon = item.icon;
          return <motion.button key={item.id} className={activeSection === item.id ? "active" : ""} onClick={() => openSection(item.id)} whileTap={{ scale: .96 }}>
            <Icon size={17} /> <span>{item.label}</span>{item.id === "notifications" && unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
          </motion.button>;
        })}
      </nav>

      <AnimatePresence mode="wait">
        {activeSection === "home" && <motion.section key="customer-home" className="customer-browser-view" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: .2 }}>
          <div className="dash-stats">
            <Stat icon={Target} label="Goal" value={customer.goal || "Not set"} />
            <Stat icon={Flame} label="Current weight" value={customer.weight ? `${customer.weight} kg` : "Not set"} />
            <Stat icon={Clock3} label="Plan remaining" value={progress.remaining === null ? "Awaiting admin" : `${progress.remaining} days`} />
            <Stat icon={ShieldCheck} label="Package" value={customer.package || "Not assigned"} />
          </div>
          <section className="package-progress-card panel">
            <div className="package-progress-top"><div><span className="section-label">YOUR PACKAGE</span><h2>{customer.package || "Package not assigned"}</h2></div><span className={`package-status ${progress.awaiting ? "pending" : progress.active ? "active" : "expired"}`}>{progress.awaiting ? "AWAITING ADMIN" : progress.active ? "ACTIVE" : "EXPIRED"}</span></div>
            {progress.awaiting ? <div className="package-awaiting"><AlertTriangle size={19} /><div><b>Dates are waiting for admin confirmation.</b><p>Your coach needs to confirm your package start date. Your package end date will then be calculated automatically.</p></div></div> : <>
              <div className="package-dates"><span><small>START DATE</small><b>{formatDate(customer.startDate)}</b></span><span><small>END DATE</small><b>{formatDate(customer.endDate)}</b></span><span><small>TIME</small><b>{getPackageDurationLabel(customer.package)}</b></span><span><small>REMAINING</small><b>{progress.remaining} day{progress.remaining === 1 ? "" : "s"}</b></span></div>
              <div className="progress-track"><motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progress.percent}%` }} transition={{ duration: 1.1, type: "spring", stiffness: 70, damping: 18 }} /></div>
              <div className="progress-meta"><span>{progress.percent}% remaining</span><span>{progress.remaining === 0 ? "Package ended" : `${progress.remaining} days left`}</span></div>
            </>}
          </section>
          <aside className="panel coach-note"><div className="coach-avatar">C</div><div className="section-label">COACH NOTE</div><h3>Consistency beats perfection.</h3><p>Focus on completing today's plan. If something doesn't feel right, message your coach and we'll adjust it.</p><div className="note-line"><Check /> Personalized for you</div><div className="note-line"><Check /> Weekly adjustments</div></aside>
        </motion.section>}

        {activeSection === "workout" && <motion.section key="customer-workout" className="customer-browser-view" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .2 }}>
          <section className="panel week-panel"><div className="panel-title"><div><span className="section-label">THIS WEEK</span><h2>Your program</h2></div><CalendarDays /></div><div className="day-tabs">{days.map(day => <button className={selected === day ? "active" : ""} onClick={() => setSelected(day)} key={day}>{day.slice(0, 3)}<small>{day}</small></button>)}</div><AnimatePresence mode="wait"><motion.div key={selected} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="program-content"><div className="program-heading"><div className="day-icon"><Dumbbell /></div><div><small>{selected}</small><h3>{d.workout || "Your workout will appear here."}</h3></div></div><h4>Workout</h4>{d.exercises.map((x, i) => <div className="exercise" key={`${x}-${i}`}><span>{String(i + 1).padStart(2, "0")}</span><b>{x}</b><Check size={16} /></div>)}<h4>Meals</h4><div className="meal-list">{d.meals.map((x, i) => <div key={`${x}-${i}`}><Utensils size={16} /><span>{x}</span></div>)}</div></motion.div></AnimatePresence></section>
        </motion.section>}

        {activeSection === "notifications" && <motion.section key="customer-notifications" className="customer-browser-view" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .2 }}>
          <section className="panel customer-notifications-page"><div className="panel-title"><div><span className="section-label">INBOX</span><h2>Your notifications</h2></div><span className="notification-count-pill">{visibleNotifications.length}</span></div>{renderNotifications(false)}</section>
        </motion.section>}
      </AnimatePresence>
    </div>
  </motion.main>
}

function Stat({ icon: Icon, label, value }) { return <div className="stat-card"><div className="stat-icon"><Icon size={18} /></div><small>{label}</small><b>{value}</b></div> }

function Profile({ customer, setCustomer, notify, go, openDashboardSection }) {
  const [form, setForm] = useState(customer);
  const save = async () => {
    try {
      const uid = auth?.currentUser?.uid;
      const normalized = { ...form, id: uid || form.id, email: auth?.currentUser?.email || form.email || "" };
      if (firebaseConfigured && uid && db) await set(ref(db, `users/${uid}`), normalized);
      setCustomer(normalized);
      notify("Profile updated and saved.");
    } catch (e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this save. Check Firestore Rules." : "Could not save profile.");
    }
  };
  const fields = [["name", "Full name"], ["email", "Email"], ["age", "Age"], ["gender", "Gender"], ["height", "Height (cm)"], ["weight", "Weight (kg)"], ["goal", "Main goal"], ["phone", "Phone"], ["allergies", "Allergies"], ["health", "Health / medical notes"]];
  return <motion.main className="page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
    <div className="container narrow">
      <nav className="customer-page-browser" aria-label="Customer sections">
        <motion.button onClick={() => openDashboardSection("home")} whileTap={{ scale: .96 }}><LayoutDashboard size={17} /><span>Home</span></motion.button>
        <motion.button onClick={() => openDashboardSection("workout")} whileTap={{ scale: .96 }}><Dumbbell size={17} /><span>Workout</span></motion.button>
        <motion.button onClick={() => openDashboardSection("notifications")} whileTap={{ scale: .96 }}><Bell size={17} /><span>Notifications</span></motion.button>
        <motion.button className="active" aria-current="page" whileTap={{ scale: .96 }}><User size={17} /><span>My profile</span></motion.button>
      </nav>
      <div className="page-heading">
        <div className="section-label">
        MY PROFILE
        </div>
        <h1>Your personal <span>information.</span>
        </h1>
        <p>Keep your information accurate so your coach can personalize your plan.</p>
        </div>
        <div className="profile-card">{fields.map(([key, label]) => <label key={key}>{label}<input value={form[key] ?? ""} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<button className="primary-btn" onClick={save}><Save size={17} /> Save changes</button></div></div></motion.main>
}

function Admin({ customers, setCustomers, program, setProgram, notify }) {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("customers");
  const [adminLoading, setAdminLoading] = useState(firebaseConfigured);
  const [programLoading, setProgramLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [programSaving, setProgramSaving] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSending, setNotificationSending] = useState(false);
  const programBeforeEditRef = useRef(emptyProgram);
  const [search, setSearch] = useState("");
  const [startDateDraft, setStartDateDraft] = useState("");
  // Mobile-app style navigation: which pane shows on a phone-width screen,
  // which sub-tab of a customer's profile is open, and which day of the
  // weekly program/meal builder is currently focused.
  const [mobileView, setMobileView] = useState("list");
  const [detailTab, setDetailTab] = useState("info");
  const [activeDay, setActiveDay] = useState(days[0]);
  const currentDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

  useEffect(() => {
    if (!firebaseConfigured || !db || !auth?.currentUser) {
      setAdminLoading(false);
      if (!selected && customers[0]) setSelected(customers[0].id);
      return;
    }
    setAdminLoading(true);
    const unsubscribe = onValue(ref(db, "users"), (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw).map(([id, data]) => ({ ...emptyCustomer, ...(data || {}), id }))
        .filter(c => c.email?.toLowerCase() !== ADMIN_EMAIL)
        .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));
      setCustomers(list);
      setSelected(current => current && list.some(c => c.id === current) ? current : (list[0]?.id || null));
      setAdminLoading(false);
    }, (e) => {
      console.error("Could not load customers", e);
      setCustomers([]); setSelected(null); setAdminLoading(false);
      notify(e?.code === "PERMISSION_DENIED" || e?.code === "permission-denied" ? `Admin access denied for ${ADMIN_EMAIL}. Check your Realtime Database Rules.` : "Could not load customers from Firebase. Check the Realtime Database URL.");
    });
    return () => unsubscribe();
  }, []);

  const selectedCustomer = customers.find(x => x.id === selected) || null;

  useEffect(() => {
    setStartDateDraft(selectedCustomer?.startDate || "");
  }, [selectedCustomer?.id, selectedCustomer?.startDate]);

  useEffect(() => {
    if (!firebaseConfigured || !db || !selectedCustomer?.id) {
      setProgram(firebaseConfigured ? emptyProgram : demoProgram);
      return;
    }
    setProgramLoading(true);
    const unsubscribe = onValue(ref(db, `programs/${selectedCustomer.id}`), (snap) => {
      const normalized = normalizeProgram(snap.val());
      setProgram(normalized);
      programBeforeEditRef.current = normalized;
      setProgramLoading(false);
    }, (e) => {
      console.error("Could not load customer program", e);
      setProgram(emptyProgram); setProgramLoading(false);
      notify(e?.code === "permission-denied" ? "Firebase denied program access. Publish the Realtime Database Rules." : "Could not load this customer's program.");
    });
    return () => unsubscribe();
  }, [selectedCustomer?.id]);

  const filteredCustomers = customers.filter(c => {
    const q = search.trim().toLowerCase();
    return !q || [c.name, c.email, c.goal, c.package].some(v => String(v || "").toLowerCase().includes(q));
  });
  const activeCount = customers.filter(c => { const p = packageProgress(c.startDate, c.endDate); return !p.awaiting && p.active; }).length;
  const pendingCount = customers.filter(c => !c.startDate || !c.endDate).length;
  const expiringCount = customers.filter(c => { const p = packageProgress(c.startDate, c.endDate); return !p.awaiting && p.remaining > 0 && p.remaining <= 7; }).length;

  const update = (key, val) => setCustomers(prev => prev.map(c => c.id === selected ? { ...c, [key]: val } : c));
  const openCustomer = (id) => { setSelected(id); setDetailTab("info"); setMobileView("detail"); };
  const backToCustomerList = () => setMobileView("list");
  const browseCustomer = (direction) => {
    if (!selectedCustomer) return;
    const index = filteredCustomers.findIndex(c => c.id === selectedCustomer.id);
    const nextIndex = index + direction;
    if (nextIndex >= 0 && nextIndex < filteredCustomers.length) {
      setSelected(filteredCustomers[nextIndex].id);
      setDetailTab("info");
    }
  };

  const confirmPackageDates = async () => {
    if (!selectedCustomer) return notify("Select a customer first.");
    if (!startDateDraft) return notify("Choose a package start date first.");
    const months = getPackageMonths(selectedCustomer.package);
    const duration = getPackageDurationLabel(selectedCustomer.package);
    const endDate = getPackageEndDate(selectedCustomer.package, startDateDraft);
    const updatedCustomer = { ...selectedCustomer, startDate: startDateDraft, endDate, packageDuration: duration, packageMonths: months, packageConfirmed: true, packageConfirmedAt: Date.now() };
    setSaving(true);
    try {
      if (firebaseConfigured && db) {
        await set(ref(db, `users/${selectedCustomer.id}`), updatedCustomer);
        await set(ref(db, `notifications/${selectedCustomer.id}/package-confirmed-${startDateDraft}`), {
          title: "Your package dates have been confirmed.",
          message: `${updatedCustomer.package || "Your package"} starts ${formatDate(startDateDraft)} and ends ${formatDate(endDate)}. Duration: ${duration}.`,
          createdAt: Date.now(), read: false, type: "package"
        });
      } else {
        setCustomers(prev => prev.map(c => c.id === selected ? updatedCustomer : c));
      }
      notify(`Package confirmed: ${formatDate(startDateDraft)} → ${formatDate(endDate)}.`);
    } catch (e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this confirmation. Publish the Realtime Database Rules." : "Could not confirm package dates.");
    } finally { setSaving(false); }
  };

  const saveCustomer = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      if (firebaseConfigured && db) await set(ref(db, `users/${selectedCustomer.id}`), selectedCustomer);
      else setCustomers(prev => prev.map(c => c.id === selected ? selectedCustomer : c));
      notify("Customer information saved to Firebase.");
    } catch (e) {
      console.error(e); notify(e?.code === "permission-denied" ? "Firebase blocked this save. Check Realtime Database Rules." : "Could not save customer.");
    } finally { setSaving(false); }
  };

  const updateProgram = (day, key, val) => setProgram(prev => ({ ...prev, [day]: { ...(prev[day] || {}), [key]: val } }));
  const saveProgram = async () => {
    if (!selectedCustomer?.id) return notify("Select a customer first.");
    setProgramSaving(true);
    try {
      // Compare against the immutable snapshot captured when this customer's
      // program was loaded. This makes meal-change detection reliable even
      // when Firebase sends the current program back through onValue.
      const before = normalizeProgram(programBeforeEditRef.current || emptyProgram);
      const after = normalizeProgram(program);
      const mealChanged = days.some(day =>
        JSON.stringify(before[day]?.meals || []) !== JSON.stringify(after[day]?.meals || [])
      );
      const now = Date.now();

      if (firebaseConfigured && db) {
        await set(ref(db, `programs/${selectedCustomer.id}`), after);

        const notification = mealChanged
          ? {
              title: "Your meal plan has been updated.",
              message: "Your coach updated your meals in your weekly nutrition plan.",
              type: "meal"
            }
          : {
              title: "Your program has been updated.",
              message: "Your coach added or changed your weekly training and program.",
              type: "program"
            };

        try {
          await set(ref(db, `notifications/${selectedCustomer.id}/program-${now}`), {
            ...notification,
            createdAt: now,
            read: false
          });
        } catch (notificationError) {
          console.error("Could not send program notification", notificationError);
          setProgram(after);
          programBeforeEditRef.current = after;
          notify(mealChanged
            ? "Meal plan updated, but the customer notification could not be sent. Publish the latest Realtime Database Rules."
            : "Program updated, but the customer notification could not be sent. Publish the latest Realtime Database Rules.");
          return;
        }
      }

      setProgram(after);
      programBeforeEditRef.current = after;
      notify(mealChanged
        ? `Meal plan updated and notification sent to ${selectedCustomer.name || selectedCustomer.email}.`
        : `Program saved for ${selectedCustomer.name || selectedCustomer.email}.`);
    } catch (e) {
      console.error("Could not save program or send notification", e);
      notify(e?.code === "permission-denied"
        ? "Firebase blocked saving the program. Publish the latest Realtime Database Rules."
        : "Could not save the program. Check Firebase permissions.");
    } finally {
      setProgramSaving(false);
    }
  };

  const sendCustomerNotification = async () => {
    if (!selectedCustomer?.id) return notify("Select a customer first.");
    const title = notificationTitle.trim();
    const message = notificationMessage.trim();
    if (!title || !message) return notify("Enter both a notification title and message.");
    setNotificationSending(true);
    try {
      const now = Date.now();
      const payload = { title, message, createdAt: now, read: false, type: "admin" };
      if (firebaseConfigured && db) {
        await set(ref(db, `notifications/${selectedCustomer.id}/admin-${now}`), payload);
      } else {
        notify("Demo mode: notification prepared for this customer.");
      }
      setNotificationTitle("");
      setNotificationMessage("");
      notify(`Notification sent to ${selectedCustomer.name || selectedCustomer.email}.`);
    } catch (e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this notification. Publish the Realtime Database Rules." : "Could not send the notification.");
    } finally { setNotificationSending(false); }
  };

  const activeDayData = program[activeDay] || { workout: "", exercises: [], meals: [] };
  const activeDayExercises = activeDayData.exercises || [];
  const activeDayMeals = activeDayData.meals || [];
  const setActiveDayList = (key, index, value) => { const list = [...(program[activeDay]?.[key] || [])]; list[index] = value; updateProgram(activeDay, key, list); };
  const addActiveDayItem = key => updateProgram(activeDay, key, [...(program[activeDay]?.[key] || []), ""]);
  const removeActiveDayItem = (key, index) => updateProgram(activeDay, key, (program[activeDay]?.[key] || []).filter((_, i) => i !== index));
  const selectedStatus = selectedCustomer ? packageProgress(selectedCustomer.startDate, selectedCustomer.endDate) : null;

  return <motion.main className="page admin-app" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div className="container">
    <div className="admin-head"><div><div className="section-label">COACH CONTROL CENTER</div><h1>Admin <span>dashboard.</span></h1><p>Manage customer packages, dates, notifications and weekly programs from one place.</p></div><div className="admin-identity"><CheckCircle2 size={16} /> Signed in as <b>{auth?.currentUser?.email || ADMIN_EMAIL}</b></div></div>
    <div className="admin-summary"><div className="admin-summary-card"><Users size={18} /><span>Total customers</span><b>{customers.length}</b></div><div className="admin-summary-card"><CheckCircle2 size={18} /><span>Active packages</span><b>{activeCount}</b></div><div className="admin-summary-card"><Clock3 size={18} /><span>Awaiting dates</span><b>{pendingCount}</b></div><div className="admin-summary-card"><Bell size={18} /><span>Expires ≤ 7 days</span><b>{expiringCount}</b></div></div>
    <div className="admin-tabs"><button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}><Users size={16} /> Customers <span className="tab-count">{customers.length}</span></button><button className={tab === "program" ? "active" : ""} onClick={() => setTab("program")}><Utensils size={16} /> Meals & program</button></div>

    {adminLoading ? <div className="panel loading-panel"><div className="spinner" /><h3>Loading customers…</h3><p>Getting all customer profiles from Firebase.</p></div> : tab === "customers" ? <div className={`admin-app-grid mobile-showing-${mobileView}`}>
      <div className="customer-pane">
        <div className="customer-list-top"><Search size={15} /><input className="customer-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" /><span>{filteredCustomers.length}</span></div>
        <div className="customer-list">
          {filteredCustomers.length === 0 ? <div className="empty-state">No customer accounts found.<br />Ask the customer to Sign Up first.</div> : filteredCustomers.map(c => {
            const p = packageProgress(c.startDate, c.endDate);
            const statusClass = p.awaiting ? "pending" : !p.active ? "expired" : p.remaining <= 7 ? "expiring" : "active";
            const statusLabel = p.awaiting ? "Awaiting dates" : !p.active ? "Expired" : p.remaining <= 7 ? `${p.remaining}d left` : "Active";
            return <motion.button whileTap={{ scale: .98 }} className={selected === c.id ? "selected" : ""} key={c.id} onClick={() => openCustomer(c.id)}>
              <span className="customer-avatar">{(c.name || c.email || "C")[0].toUpperCase()}</span>
              <span className="customer-card-body">
                <b>{c.name || "Unnamed customer"}</b>
                <small>{c.email}</small>
                <span className="customer-card-meta"><em className={`status-chip ${statusClass}`}>{statusLabel}</em><em className="package-chip">{c.package || "No package"}</em></span>
                {!p.awaiting && <span className="mini-progress"><span style={{ width: `${p.percent}%` }} /></span>}
              </span>
              <ChevronRight size={17} className="chevron" />
            </motion.button>;
          })}
        </div>
      </div>

      <div className="customer-detail-pane">
        {!selectedCustomer ? <div className="empty-state detail-empty"><Users size={26} /><p>Select a customer to view their profile, package and notifications.</p></div> : <motion.div className="admin-editor panel" key={selectedCustomer.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .18 }}>
          <div className="customer-browser-bar">
            <button type="button" className="back-btn" onClick={backToCustomerList} aria-label="Back to customers"><ArrowLeft size={18} /></button>
            <div className="browser-crumb"><Users size={14} /><span>Customers</span><ChevronRight size={13} /><b>{selectedCustomer.name || "Customer"}</b></div>
            <div className="browser-actions">
              <button type="button" onClick={() => browseCustomer(-1)} disabled={filteredCustomers.findIndex(c => c.id === selectedCustomer.id) <= 0} aria-label="Previous customer"><ArrowLeft size={15} /></button>
              <button type="button" onClick={() => browseCustomer(1)} disabled={filteredCustomers.findIndex(c => c.id === selectedCustomer.id) === filteredCustomers.length - 1} aria-label="Next customer"><ArrowRight size={15} /></button>
            </div>
          </div>
          <div className="editor-title">
            <span className="customer-avatar big">{(selectedCustomer.name || selectedCustomer.email || "C")[0].toUpperCase()}</span>
            <div className="editor-title-text"><div className="section-label">CLIENT</div><h2>{selectedCustomer.name || "Customer"}</h2><small>{selectedCustomer.email}</small></div>
            <span className={`status ${selectedStatus.awaiting ? "pending-status" : selectedStatus.active ? "" : "expired-status"}`}>{selectedStatus.awaiting ? "AWAITING DATES" : selectedStatus.active ? "ACTIVE" : "EXPIRED"}</span>
          </div>

          <div className="detail-subtabs">
            <button type="button" className={detailTab === "info" ? "active" : ""} onClick={() => setDetailTab("info")}><User size={14} /> Info</button>
            <button type="button" className={detailTab === "package" ? "active" : ""} onClick={() => setDetailTab("package")}><PackageIcon size={14} /> Package</button>
            <button type="button" className={detailTab === "notify" ? "active" : ""} onClick={() => setDetailTab("notify")}><Bell size={14} /> Notify</button>
          </div>

          <AnimatePresence mode="wait">
            {detailTab === "info" && <motion.div key="info" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .16 }}>
              <div className="editor-grid">{[["name", "Name"], ["email", "Email"], ["age", "Age"], ["gender", "Gender"], ["height", "Height"], ["weight", "Weight"], ["goal", "Goal"], ["phone", "Phone"], ["allergies", "Allergies"], ["health", "Health notes"]].map(([key, label]) => <label key={key}>{label}<input value={selectedCustomer[key] ?? ""} onChange={e => update(key, e.target.value)} /></label>)}</div>
              <button className="outline-dark" onClick={saveCustomer} disabled={saving}><Save size={17} /> {saving ? "Saving…" : "Save customer information"}</button>
            </motion.div>}

            {detailTab === "package" && <motion.div key="package" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .16 }}>
              <label className="package-select-label">Package<input value={selectedCustomer.package ?? ""} onChange={e => update("package", e.target.value)} placeholder="e.g. Transformation" /></label>
              <div className="package-confirm-box"><div><span className="section-label">PACKAGE ACTIVATION</span><h3>{selectedCustomer.package || "No package selected"} · {getPackageDurationLabel(selectedCustomer.package)}</h3><p>Choose the start date. The end date is calculated automatically from the selected package and sent to the customer dashboard.</p></div><div className="package-confirm-fields"><label>Start date<input type="date" value={startDateDraft} onChange={e => setStartDateDraft(e.target.value)} /></label><label>Calculated end date<input type="date" value={getPackageEndDate(selectedCustomer.package, startDateDraft)} readOnly /></label></div><div className="confirm-result"><span>Start: <b>{formatDate(startDateDraft || selectedCustomer.startDate)}</b></span><ArrowRight size={15} /><span>End: <b>{formatDate(getPackageEndDate(selectedCustomer.package, startDateDraft || selectedCustomer.startDate) || selectedCustomer.endDate)}</b></span><span className="duration-pill">{getPackageDurationLabel(selectedCustomer.package).toUpperCase()}</span></div><button className="primary-btn" onClick={confirmPackageDates} disabled={saving || !selectedCustomer.package}><CheckCircle2 size={17} /> {saving ? "Confirming…" : "Confirm start & end dates"}</button></div>
              <button className="outline-dark" onClick={saveCustomer} disabled={saving}><Save size={17} /> {saving ? "Saving…" : "Save customer information"}</button>
            </motion.div>}

            {detailTab === "notify" && <motion.div key="notify" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .16 }}>
              <div className="customer-notification-box no-border">
                <div><span className="section-label">DIRECT NOTIFICATION</span><h3>Send to this customer</h3><p>Only <b>{selectedCustomer.name || selectedCustomer.email}</b> will receive this notification.</p></div>
                <label>Notification title<input value={notificationTitle} onChange={e => setNotificationTitle(e.target.value)} placeholder="e.g. Your next check-in is ready" /></label>
                <label>Message<textarea value={notificationMessage} onChange={e => setNotificationMessage(e.target.value)} placeholder="Write a message for this customer…" rows={3} /></label>
                <motion.button className="primary-btn" onClick={sendCustomerNotification} disabled={notificationSending} whileTap={{ scale: .98 }}><Send size={17} /> {notificationSending ? "Sending…" : "Send notification"}</motion.button>
              </div>
            </motion.div>}
          </AnimatePresence>
        </motion.div>}
      </div>
    </div> : <div className="panel program-admin">
      <div className="section-label">PROGRAM BUILDER</div><h2>Meals & workouts</h2>{selectedCustomer ? <p className="program-client">Drafting for <b>{selectedCustomer.name || selectedCustomer.email}</b></p> : <p className="program-client">Select a customer from the Customers tab first.</p>}

      <div className="day-tabs admin-day-tabs">{days.map(day => { const isToday = day === currentDay; return <button type="button" className={activeDay === day ? "active" : ""} onClick={() => setActiveDay(day)} key={day}>{day.slice(0, 3)}<small>{day}</small>{isToday && <i className="day-dot" />}</button>; })}</div>

      {programLoading ? <div className="loading-panel compact"><div className="spinner" /><h3>Loading this customer's program…</h3></div> : <AnimatePresence mode="wait">
        <motion.div className="day-editor mobile-day-editor" key={activeDay} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .18 }}>
          <div className="day-title"><b>{activeDay}</b><span>{activeDayData.workout || "Rest / no workout"}</span></div>
          <label>Workout title<input value={activeDayData.workout || ""} onChange={e => updateProgram(activeDay, "workout", e.target.value)} placeholder="e.g. Upper body strength" /></label>
          <div className="program-field-group exercise-group">
            <div className="field-group-head"><span><Dumbbell size={14} /> Exercise</span>
            <button type="button" className="mini-add" onClick={() => addActiveDayItem("exercises")}><i class="fa-solid fa-plus"></i> Add exercise</button>
            </div>{activeDayExercises.length === 0 && <div className="field-empty">No exercises added yet.</div>}{activeDayExercises.map((x, i) => <div className="repeat-row" key={`ex-${i}`}><input value={x} onChange={e => setActiveDayList("exercises", i, e.target.value)} placeholder={`Exercise ${i + 1} — description, sets, reps, rest, notes…`} /><button type="button" className="remove-item" onClick={() => removeActiveDayItem("exercises", i)} aria-label="Remove exercise"><i class="fa-solid fa-trash-can"></i></button></div>)}</div>
          <div className="program-field-group meals-group">
            <div className="field-group-head"><span><Utensils size={14} /> Meals</span><button type="button" className="mini-add" onClick={() => addActiveDayItem("meals")}><i class="fa-solid fa-plus"></i> Add meal</button></div>{activeDayMeals.length === 0 && <div className="field-empty">No meals drafted yet for {activeDay}.</div>}{activeDayMeals.map((x, i) => <div className="repeat-row meal-row" key={`meal-${i}`}><input value={x} onChange={e => setActiveDayList("meals", i, e.target.value)} placeholder={`Meal ${i + 1} — e.g. Breakfast: eggs, oats, fruit`} /><button type="button" className="remove-item" onClick={() => removeActiveDayItem("meals", i)} aria-label="Remove meal"><i class="fa-solid fa-trash-can"></i></button></div>)}</div>
        </motion.div>
      </AnimatePresence>}

      <div className="program-save-bar"><button className="primary-btn" onClick={saveProgram} disabled={programSaving || programLoading || !selectedCustomer}><Save size={17} /> {programSaving ? "Saving…" : "Save program for this customer"}</button></div>
    </div>}

    <div className="admin-bottom-nav">
      <button type="button" className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}><Users size={18} /><span>Customers</span></button>
      <button type="button" className={tab === "program" ? "active" : ""} onClick={() => setTab("program")}><Utensils size={18} /><span>Meals</span></button>
    </div>
  </div></motion.main>
}
function Auth({ mode, onSubmit, onGoogle, onReset, switchMode }) {
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "", age: "", gender: "", height: "", weight: "", goal: "", package: "" });
  const [show, setShow] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const packageRef = useRef(null);
  const genderRef = useRef(null);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const selectedPackage = CUSTOMER_PACKAGES.find(item => item.value === form.package);
  const selectedGender = form.gender;

  // Both custom popups close naturally when clicking/tapping outside their field.
  useEffect(() => {
    if (!packageOpen && !genderOpen) return;
    const handleOutside = (event) => {
      if (packageOpen && packageRef.current && !packageRef.current.contains(event.target)) setPackageOpen(false);
      if (genderOpen && genderRef.current && !genderRef.current.contains(event.target)) setGenderOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [packageOpen, genderOpen]);

  return <motion.main className="auth-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="auth-box">
    <div className="brand static">
      <span>COACH<span className="accent">WOLF</span></span>
    </div>
    <div className="section-label">{mode === "login" ? "WELCOME BACK" : "START YOUR JOURNEY"}</div>
    <h1>{mode === "login" ? "Sign in to your" : "Create your"} <span>account.</span></h1>
    <p>{mode === "login" ? "Access your personalized coaching dashboard." : "Tell us a little about yourself to get started."}</p>
    {mode === "signup" && <>
      <label>Full name<input autoComplete="name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" /></label>
      <label>Phone number<input type="tel" inputMode="tel" autoComplete="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="+212" /></label>
      <div className="form-row"><label>Age<input inputMode="numeric" value={form.age} onChange={e => set("age", e.target.value)} placeholder="20" /></label>
      <label>Height<input inputMode="numeric" value={form.height} onChange={e => set("height", e.target.value)} placeholder="170cm" /></label>
      <label>Weight<input inputMode="decimal" value={form.weight} onChange={e => set("weight", e.target.value)} placeholder="70Kg" /></label>
      </div>
      <label className="gender-field-label">Gender
        <div className="gender-select" ref={genderRef}>
          <button type="button" className={selectedGender ? "gender-trigger selected" : "gender-trigger"} onClick={() => { setGenderOpen(prev => !prev); setPackageOpen(false); }} aria-haspopup="listbox" aria-expanded={genderOpen}>
            <span className="gender-trigger-main"><User size={17} />{selectedGender || "Select your gender"}</span>
            <span className="gender-trigger-side"><ChevronDown size={17} className={genderOpen ? "rotated" : ""} /></span>
          </button>
          <AnimatePresence>
            {genderOpen && <motion.div className="gender-options" role="listbox" initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .98 }} transition={{ duration: .18, ease: "easeOut" }}>
              {[{ value: "Male" }, { value: "Female" }, { value: "Other" }].map(item => <motion.button type="button" role="option" aria-selected={form.gender === item.value} className={form.gender === item.value ? "gender-option active" : "gender-option"} key={item.value} onClick={() => { set("gender", item.value); setGenderOpen(false); }} whileHover={{ x: 3 }} whileTap={{ scale: .98 }}>
                <span className="gender-option-icon"><User size={16} /></span><span className="gender-option-copy"><b>{item.value}</b></span>{form.gender === item.value && <Check size={17} />}
              </motion.button>)}
            </motion.div>}
          </AnimatePresence>
        </div>
      </label>
      <label>Main goal<input value={form.goal} onChange={e => set("goal", e.target.value)} placeholder="e.g. Fat loss" /></label>
      <label className="package-field-label">Coaching package
        <div className="package-select" ref={packageRef}>
          <button type="button" className={selectedPackage ? "package-trigger selected" : "package-trigger"} onClick={() => { setPackageOpen(prev => !prev); setGenderOpen(false); }} aria-haspopup="listbox" aria-expanded={packageOpen}>
            <span className="package-trigger-main"><PackageIcon size={17} />{selectedPackage ? selectedPackage.value : "Choose your package"}</span>
            <span className="package-trigger-side">{selectedPackage ? `${selectedPackage.price} · ${selectedPackage.months} month${selectedPackage.months === 1 ? "" : "s"}` : ""}<ChevronDown size={17} className={packageOpen ? "rotated" : ""} /></span>
          </button>
          <AnimatePresence>
            {packageOpen && <motion.div className="package-options" role="listbox" initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .98 }} transition={{ duration: .18, ease: "easeOut" }}>
              {CUSTOMER_PACKAGES.map(item => <motion.button type="button" role="option" aria-selected={form.package === item.value} className={form.package === item.value ? "package-option active" : "package-option"} key={item.value} onClick={() => { set("package", item.value); setPackageOpen(false); }} whileHover={{ x: 3 }} whileTap={{ scale: .98 }}>
                <span className="package-option-icon"><PackageIcon size={16} /></span><span className="package-option-copy"><b>{item.value}</b><small>{item.description} · {item.months} month{item.months === 1 ? "" : "s"}</small></span><strong>{item.price}</strong>{form.package === item.value && <Check size={17} />}
              </motion.button>)}
            </motion.div>}
          </AnimatePresence>
        </div>
      </label>
    </>}
    <label>Email<input type="email" autoComplete="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" /></label>
    <label>Password<div className="password-wrap"><input type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Password" /><button type="button" onClick={() => setShow(!show)}>{show ? <i class="fa-solid fa-eye-slash"></i> : <i class="fa-solid fa-eye"></i>}</button></div></label>
    <button className="primary-btn full" onClick={() => onSubmit(form)}>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17} /></button>
    {mode === "login" && <><button className="forgot-btn" onClick={() => onReset(form.email)}>Forgot password?</button></>}
    <p className="switch">{mode === "login" ? "Don't have an account?" : "Already have an account?"} <button onClick={switchMode}>{mode === "login" ? "Sign up" : "Sign in"}</button></p>
  </div></motion.main>;
}
function AuthOverlay({ mode, close, onSubmit, onGoogle, onReset, switchMode }) { return <div className="overlay"><button className="overlay-close" onClick={close}><X /></button><Auth mode={mode} onSubmit={onSubmit} onGoogle={onGoogle} onReset={onReset} switchMode={switchMode} /></div>; }
function AnimatedNumber({ value, decimals = 0, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: .6 });
  const count = useMotionValue(0);
  const displayed = useTransform(count, current => `${current.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (!inView) return undefined;
    const controls = animate(count, value, { duration: 1.2, ease: "easeOut" });
    return () => controls.stop();
  }, [count, inView, value]);

  return <motion.b ref={ref}>{displayed}</motion.b>;
}
function Reveal({ children, delay = 0 }) { return <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .6, delay }}>{children}</motion.div> }
function Toast({ message }) { return <motion.div className="toast" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}><Check size={17} />{message}</motion.div> }
function Footer() { return <footer>
  <div className="container footer-inner">
    <div className="brand">
      <span>COACH<span className="accent">RAFALIA</span>
      </span>
    </div>
      <div className="link-social">
        <span>
          © 2026 COACHRFALIA. Personal coaching platform.
        </span>
        <div className="icon-social">
          <a target="_blank" href='https://www.instagram.com/the_wolf_zakaria?stkn=MThnMnU1a2xnb2lmcg=='>
          <span className="social"><i class="fa-brands fa-instagram"></i></span>
          </a>
          <a target="_blank" href='https://wa.me/212681197174?text=Hello%20Coach%20Im%20interested'>
          <span className="social"><i class="fa-brands fa-whatsapp"></i></span>
          </a>
          <a target="_blank" href='https://maps.app.goo.gl/ckytLd6RMss1KSoJA'>
          <span className="social"><i class="fa-regular fa-compass"></i></span>
          </a>
        </div>
      </div>
  </div></footer> }

export default App;

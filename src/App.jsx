import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame } from "framer-motion";
import { wrap } from "@motionone/utils";
import {
  ArrowRight, ArrowLeft, ArrowLeftRight, Bell, BellRing, Check, ChevronDown, ChevronRight, Copy, Dumbbell, Eye, Flame, HeartPulse, Home as HomeIcon, Instagram, Package as PackageIcon, Pencil, Trash2,
  LayoutDashboard, LogIn, LogOut, Menu, Play, Plus, ShieldCheck, Star, Search,
  Target, User, Users, Utensils, X, CalendarDays, Clock3, Save, CheckCircle2, AlertTriangle, Send, Phone
} from "lucide-react";
import NumberFlow from "@number-flow/react";
import { Swiper, SwiperSlide } from "swiper/react"; 
import "swiper/css";
import BeforeImage from "./data/before.png";
import AfterImage from "./data/after.png";
import CoachAvatar from "./data/img1.jpeg";

import { onAuthStateChanged } from "firebase/auth";
import { auth, db, firebaseConfigured, loginEmail, registerEmail, loginGoogle, logoutFirebase, resetPassword, verifyResetPasswordCode, confirmResetPassword } from "./lib/firebase";
import { ref, get, set, update, remove, onValue } from "firebase/database";
import { notifySignup } from "./lib/telegram";

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

function getWeekKey(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const resetParams = new URLSearchParams(window.location.search);
  const resetCode = resetParams.get("oobCode");
  const resetMode = resetParams.get("mode");
  const [page, setPage] = useState(() => (resetCode || resetMode === "resetPassword") ? "reset-password" : "home");
  const [dashboardSection, setDashboardSection] = useState("home");
  const [adminTab, setAdminTab] = useState("customers");
  const [customerUnreadCount, setCustomerUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [clientProfileLoading, setClientProfileLoading] = useState(false);
  const [clientProgramLoading, setClientProgramLoading] = useState(false);
  const [clientSkeletonDelayDone, setClientSkeletonDelayDone] = useState(false);
  const [customer, setCustomer] = useState(() => firebaseConfigured ? emptyCustomer : demoCustomer);
  const [customers, setCustomers] = useLocalState("coachflow_customers", firebaseConfigured ? [] : demoCustomers);
  const [program, setProgram] = useState(demoProgram);
  const [authMode, setAuthMode] = useState(null);
  const [authPageMode, setAuthPageMode] = useState("login");
  const [toast, setToast] = useState(null);
  const [forgotEmail, setForgotEmail] = useState("");
  const [welcomePopup, setWelcomePopup] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const authFlowRef = useRef(null);
  const authLoadingStartedAtRef = useRef(Date.now());

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const go = (p) => {
    if (p === "login") setAuthPageMode("login");
    if (p === "signup") {
      setAuthPageMode("signup");
      setPage("login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDashboardSection = (section) => {
    if (section === "profile") {
      go("profile");
      return;
    }
    setDashboardSection(section);
    go("dashboard");
  };

  // Firebase is the source of truth for the currently signed-in customer.
  // Live listeners keep the dashboard synchronized with the coach's edits.
  useEffect(() => {
    if (!firebaseConfigured || !db || !user || user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setClientProfileLoading(false);
      setClientProgramLoading(false);
      return;
    }

    setClientProfileLoading(true);
    setClientProgramLoading(true);

    const profileRef = ref(db, `users/${user.uid}`);
    const programRef = ref(db, `programs/${user.uid}`);

    const unsubscribeProfile = onValue(profileRef, (snap) => {
      const data = snap.val();
      setClientProfileLoading(false);
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
      setClientProfileLoading(false);
      notify(e?.code === "PERMISSION_DENIED"
        ? "denied your profile.."
        : "Could not load your customer profile.");
    });

    const unsubscribeProgram = onValue(programRef, (snap) => {
      const data = snap.val();
      setProgram(normalizeProgram(data));
      setClientProgramLoading(false);
    }, (e) => {
      console.error("Could not listen to customer program", e);
      setProgram(emptyProgram);
      setClientProgramLoading(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeProgram();
    };
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!firebaseConfigured || !auth) return;
    let active = true;
    let authReadyTimeout;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!active) return;
      setUser(u);
      window.clearTimeout(authReadyTimeout);
      const remainingLoadingTime = Math.max(0, 2000 - (Date.now() - authLoadingStartedAtRef.current));
      authReadyTimeout = window.setTimeout(() => {
        if (active) setAuthReady(true);
      }, remainingLoadingTime);

      // Login/signup handlers perform the profile write/load themselves.
      // Skipping here prevents the auth listener from racing them and replacing
      // the freshly entered customer information with an empty profile.
      if (u && authFlowRef.current === u.uid) return;

      if (!u) {
        setClientProfileLoading(false);
        setClientProgramLoading(false);
        setCustomer(emptyCustomer);
        setProgram(emptyProgram);
        if (["dashboard", "profile", "admin"].includes(page)) setPage("home");
        return;
      }

      try {
        if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setClientProfileLoading(false);
          setClientProgramLoading(false);
          setCustomer({ ...emptyCustomer, id: u.uid, email: u.email || "", name: u.displayName || "Coach" });
          setPage((current) => ["login", "home"].includes(current) ? "admin" : current);
        } else {
          setClientProfileLoading(true);
          setClientProgramLoading(true);
          setCustomer(prev => ({ ...emptyCustomer, ...prev, id: u.uid, email: u.email || "" }));
          setProgram(emptyProgram);
          setPage((current) => ["login", "home"].includes(current) ? "dashboard" : current);
        }
      } catch (e) {
        console.error("Could not load user data", e);
        setClientProfileLoading(false);
        setClientProgramLoading(false);
        notify("Signed in, but your profile could not be loaded. Check it.");
      }
    });

    return () => {
      active = false;
      window.clearTimeout(authReadyTimeout);
      unsubscribe();
    };
  }, []);

  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const isCustomer = !!user && !isAdmin;

  useEffect(() => {
    if (!authReady || !isCustomer) {
      setClientSkeletonDelayDone(false);
      return;
    }
    setClientSkeletonDelayDone(false);
    const timeoutId = window.setTimeout(() => setClientSkeletonDelayDone(true), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [authReady, isCustomer, user?.uid]);

  async function confirmLogout() {
    setLogoutPending(true);
    try {
      await logoutFirebase();
      setUser(null);
      setCustomer(emptyCustomer);
      setProgram(emptyProgram);
      setAuthMode(null);
      setLogoutConfirmOpen(false);
      go("home");
      notify("You have been logged out.");
    } catch (e) {
      console.error("Could not log out", e);
      notify(e?.message || "Could not log out. Please try again.");
    } finally {
      setLogoutPending(false);
    }
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
          setClientProfileLoading(false);
          setClientProgramLoading(false);
          setAuthMode(null);
          go("admin");
          notify("Welcome, Coach.");
          authFlowRef.current = null;
          return;
        }

        setClientProfileLoading(true);
        setClientProgramLoading(true);

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
          void notifySignup(profile);
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
        setClientProfileLoading(false);
        setClientProgramLoading(false);

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
      if (mode === "signup") {
        void notifySignup(profile);
        setWelcomePopup(true);
      }
      notify(mode === "signup" ? "Account created successfully." : "Welcome back.");
    } catch (e) {
      authFlowRef.current = null;
      setClientProfileLoading(false);
      setClientProgramLoading(false);
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

  function goForgotPassword(email) {
    setForgotEmail(email || "");
    go("forgot-password");
  }

  async function handleReset(email) {
    try {
      if (!firebaseConfigured) throw new Error("Password reset requires Firebase.");
      if (!email?.trim()) throw new Error("Enter your email first.");
      await resetPassword(email.trim().toLowerCase());
      notify("Reset code sent to your email.");
      go("reset-password");
    } catch (e) {
      const msg = e?.code === "auth/user-not-found" ? "No account found for this email."
        : e?.code === "auth/invalid-email" || e?.code === "auth/missing-email" ? "Please enter a valid email address."
          : e?.code === "auth/operation-not-allowed" ? "Email/password sign-in is disabled in Firebase Authentication."
            : e?.code === "auth/too-many-requests" ? "Too many reset requests. Try again later."
              : e?.code === "auth/network-request-failed" ? "Network error. Check your internet connection."
                : e?.message || "Could not send reset email.";
      console.error("Password reset failed", e);
      notify(msg);
    }
  }

  if (!authReady) {
    return <motion.div className="app auth-loading" aria-label="Loading Coach Rafalia coaching app" aria-busy="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <CoachLoadingIndicator title="Your coaching plan is loading" detail="Getting your training plan ready." />
    </motion.div>;
  }

  return (
    <div className="app">
      {!(isCustomer && ["dashboard", "profile"].includes(page)) && !(isAdmin && page === "admin") && <Nav page={page} go={go} isCustomer={isCustomer} isAdmin={isAdmin} requestLogout={() => setLogoutConfirmOpen(true)} adminTab={adminTab} setAdminTab={setAdminTab} />}
      {isCustomer && ["dashboard", "profile"].includes(page) && <CustomerBar activeSection={page === "profile" ? "profile" : dashboardSection} openSection={openDashboardSection} requestLogout={() => setLogoutConfirmOpen(true)} />}
      <AnimatePresence mode="wait">
        {page === "home" && <Home key="home" go={go} />}
        {page === "dashboard" && isCustomer && <Dashboard key="dashboard" customer={customer} program={program} loading={clientProfileLoading || clientProgramLoading || !clientSkeletonDelayDone} go={go} notify={notify} initialSection={dashboardSection} openDashboardSection={openDashboardSection} setUnreadCount={setCustomerUnreadCount} />}
        {page === "profile" && isCustomer && <Profile key="profile" customer={customer} setCustomer={setCustomer} notify={notify} go={go} openDashboardSection={openDashboardSection} unreadCount={customerUnreadCount} />}
        {page === "admin" && isAdmin && <Admin key="admin" customers={customers} setCustomers={setCustomers} program={program} setProgram={setProgram} notify={notify} tab={adminTab} setTab={setAdminTab} requestLogout={() => setLogoutConfirmOpen(true)} />}
        {page === "login" && <Auth key={authPageMode} mode={authPageMode} onSubmit={(f) => handleAuth(authPageMode, f)} onGoogle={handleGoogle} onReset={goForgotPassword} switchMode={() => setAuthPageMode(authPageMode === "login" ? "signup" : "login")} />}
        {page === "forgot-password" && <ForgotPasswordPage key="forgot-password" initialEmail={forgotEmail} onReset={handleReset} notify={notify} go={go} />}
        {page === "reset-password" && <ResetPasswordPage key="reset-password" code={resetCode} notify={notify} go={go} />}
      </AnimatePresence>
      {!isCustomer && !isAdmin && ["home", "login"].includes(page) && <MobileBrowseNav page={page} go={go} isCustomer={isCustomer} isAdmin={isAdmin} />}
      <AnimatePresence>
        {authMode && <AuthOverlay mode={authMode} close={() => setAuthMode(null)} onSubmit={(f) => handleAuth(authMode, f)} onGoogle={handleGoogle} onReset={(email) => { setAuthMode(null); goForgotPassword(email); }} switchMode={() => setAuthMode(authMode === "login" ? "signup" : "login")} />}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>
      <AnimatePresence>
        {logoutConfirmOpen && <LogoutConfirmDialog onCancel={() => setLogoutConfirmOpen(false)} onConfirm={confirmLogout} pending={logoutPending} />}
      </AnimatePresence>
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
              <h2 className="welcom-title">Welcome to your <span>new fitness journey.</span></h2>
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

function Nav({ page, go, isCustomer, isAdmin, requestLogout, adminTab, setAdminTab }) {
  const [activeSection, setActiveSection] = useState("top");
  const navRef = useRef(null);

  useEffect(() => {
    if (page !== "home") {
      setActiveSection("top");
      return;
    }

    const sections = ["top", "how-it-works", "about", "packs", "reviews"]
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.25, 0.5] });
    sections.forEach(section => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [page]);

  const section = (id) => {
    setActiveSection(id);
    if (page !== "home") {
      go("home");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };
  const navClass = `nav${page === "home" && !isCustomer && !isAdmin ? " nav-home" : ""}${page === "login" ? " nav-login" : ""}${isCustomer || isAdmin ? " nav-workspace" : ""}`;
  return <header className={navClass} ref={navRef}><div className="nav-inner">
    <button className="brand brand-coach hero-brand" onClick={() => go("home")}>
      <span className="brand-badge hero-brand-mark"><Dumbbell size={17} /></span>
      <span className="brand-copy hero-brand-copy">
        <small>Coach</small>
        <strong>Zakaria</strong>
      </span>
    </button>
  </div></header>;
}

function MobileBrowseNav({ page, go, isCustomer, isAdmin }) {
  const [activeSection, setActiveSection] = useState(page === "home" ? "top" : "profile");
  const browseTabs = [
    { id: "top", label: "Home", icon: HomeIcon },
    { id: "how-it-works", label: "Journey", icon: CalendarDays },
    { id: "packs", label: "Packs", icon: PackageIcon },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "profile", label: "Profile", icon: User }
  ];

  useEffect(() => {
    if (page !== "home") {
      setActiveSection("profile");
      return;
    }

    const sections = ["top", "how-it-works", "packs", "reviews"]
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.1, 0.25, 0.5] });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [page]);

  const navigate = (id) => {
    setActiveSection(id);
    if (id === "profile") {
      if (isCustomer) go("profile");
      else if (isAdmin) go("admin");
      else if (page !== "login") go("login");
      return;
    }

    if (page !== "home") {
      go("home");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return <nav className="mobile-browse-nav" aria-label="Browse page">
    {browseTabs.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        className={activeSection === id ? "active" : ""}
        aria-current={activeSection === id ? "location" : undefined}
        onClick={() => navigate(id)}
      >
        <Icon size={19} strokeWidth={activeSection === id ? 2.5 : 2} />
        <span>{label}</span>
      </button>
    ))}
  </nav>;
}

function CustomerBar({ activeSection, openSection, requestLogout }) {
  const items = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "workout", label: "Program", icon: Dumbbell },
    { id: "profile", label: "Profile", icon: User },
    { id: "logout", label: "Logout", icon: LogOut }
  ];

  return <nav className="customer-page-browser" aria-label="Customer sections">
    {items.map(item => {
      const Icon = item.icon;
      return <motion.button key={item.id} className={`${activeSection === item.id ? "active" : ""}${item.id === "logout" ? " nav-logout" : ""}`} aria-current={activeSection === item.id ? "page" : undefined} onClick={() => item.id === "logout" ? requestLogout() : openSection(item.id)} whileTap={{ scale: .96 }}>
        <Icon size={17} /> <span>{item.label}</span>{item.id === "notifications" && unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
      </motion.button>;
    })}
  </nav>;
}

function WorkspaceGreeting({ name, photoUrl, unreadCount, onNotifications, coach = false }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "U";
  const avatarSrc = photoUrl || (coach ? CoachAvatar : "");
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [avatarSrc]);

  return <div className="workspace-greeting-bar">
    <div className="workspace-greeting">
      {avatarSrc && !imageFailed ? <img className="workspace-avatar" src={avatarSrc} alt="" onError={() => setImageFailed(true)} /> : <span className="workspace-avatar workspace-avatar-fallback" aria-hidden="true">{initials}</span>}
      <h1>Hi, {name}</h1>
    </div>
    {!coach && <button type="button" className="workspace-notifications" onClick={onNotifications} aria-label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
      <BellRing size={21} />
      {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
    </button>}
  </div>;
}

function BeforeAfterSlider({ position, setPosition }) {
  const dragging = useRef(false);
  const comparisonLabel = position <= 50 ? "After" : "Before";
  const updatePosition = (clientX, element) => {
    const bounds = element.getBoundingClientRect();
    setPosition(Math.round(Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100))));
  };

  return <div
    className="before-after-slider"
    onPointerDown={event => {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updatePosition(event.clientX, event.currentTarget);
    }}
    onPointerMove={event => {
      if (dragging.current) updatePosition(event.clientX, event.currentTarget);
    }}
    onPointerUp={() => { dragging.current = false; }}
    onPointerCancel={() => { dragging.current = false; }}
  >
    <img className="comparison-image" src={AfterImage} alt="After fitness transformation" />
    <div className="comparison-before" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
      <img className="comparison-image" src={BeforeImage} alt="Before fitness transformation" />
    </div>
    <div className="comparison-divider" style={{ left: `${position}%` }} aria-hidden="true">
      <span><ArrowLeftRight size={17} /></span>
    </div>
    <div className="comparison-label" style={{ left: `${Math.min(92, Math.max(8, position))}%` }} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={comparisonLabel}
          initial={{ opacity: 0, y: 6, scale: .92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: .92 }}
          transition={{ duration: .2 }}
        >
          {comparisonLabel}
        </motion.span>
      </AnimatePresence>
    </div>
    <input
      className="comparison-range"
      type="range"
      min="0"
      max="100"
      value={position}
      onChange={event => setPosition(Number(event.target.value))}
      aria-label="Compare before and after photos"
      aria-valuetext={`${position}% before image visible, ${comparisonLabel} comparison`}
    />
  </div>;
}

function Home({ go }) {
  const [comparisonPosition, setComparisonPosition] = useState(20);
  const beforeShare = comparisonPosition / 100;
  const afterShare = 1 - beforeShare;
  const weight = Math.round(100 * beforeShare + 80 * afterShare);
  const planWeeks = Math.round(100 * beforeShare + 12 * afterShare);
  const supportHours = Math.round(24 * afterShare);
  const supportDays = Math.round(7 * afterShare);
  const satisfiedClients = Math.round(50 * afterShare);
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

  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <section id="top" className="hero">
      <div className="hero-glow one" /><div className="hero-glow two" />
      <div className="container hero-grid">
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: .7 }}>
          <div className="eyebrow"><span className="pulse" /> PERSONAL COACHING • BUILT FOR RESULTS</div>
          <h1>Build the body.<br /><span>Build the life.</span></h1>
          <p className="hero-copy">Personalized training, nutrition and accountability — designed around your life, your body and your goals.</p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => go("signup")}>
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
            <div className="hero-card-top"><span>BEFORE &amp; AFTER</span><span className="live-dot">DRAG TO COMPARE</span></div>
            <div className="hero-photo">
              <BeforeAfterSlider position={comparisonPosition} setPosition={setComparisonPosition} />
            </div>
            <div className="mini-stats">
              {[
                { label: "Body weight", value: weight, suffix: " kg", detail: "weight", icon: Target },
                { label: "Plan length", value: planWeeks, suffix: "", detail: "weeks", icon: CalendarDays },
                { label: "Coach support", value: supportHours, suffix: "", detail: "support", icon: HeartPulse },
                { label: "Satisfied clients", value: satisfiedClients, suffix: satisfiedClients > 0 ? "+" : "", detail: "clients", icon: Users }
              ].map(({ label, value, suffix = "", detail, icon: Icon }, index) => (
                <motion.div
                  className="hero-stat"
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: .5 }}
                  transition={{ duration: .45, delay: index * .1 }}
                >
                  <span className="hero-stat-icon"><Icon size={15} /></span>
                  <small>{label}</small>
                  <strong>
                    {label === "Satisfied clients"
                      ? <NumberFlow value={value} suffix={suffix} transformTiming={{ duration: 300, easing: "ease-out" }} />
                      : <NumberFlow value={value} suffix={suffix} transformTiming={{ duration: 300, easing: "ease-out" }} />}
                    {label === "Coach support" && <>/<NumberFlow value={supportDays} transformTiming={{ duration: 300, easing: "ease-out" }} /></>}
                  </strong>
                  <span className="hero-stat-detail">{detail}</span>
                </motion.div>
              ))}
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
        </Reveal>
        <Reveal delay={.15}>
          <div className="certificate-frame">
            <img className="certificate-image" src={`${import.meta.env.BASE_URL}certificate.jpg`} alt="Coach certificate" />
          </div>
        </Reveal>
      </div>
    </section>

    <section className="section dark-section"><div className="container"><Reveal><div className="section-label">02 — WHAT I DO</div><h2>Everything you need to <span>move forward.</span></h2></Reveal><div className="service-grid">
      {[["01", "TRAINING", "Structured workouts built for your goal, experience and available equipment.", Dumbbell], ["02", "NUTRITION", "Simple meal guidance and personalized plans you can actually follow.", Utensils], ["03", "ACCOUNTABILITY", "Regular check-ins, adjustments and direct support when you need it.", HeartPulse]].map(([n, t, d, I], i) => <Reveal delay={i * .1} key={n}><div className="service-card"><span>{n}</span><I /><h3>{t}</h3><p>{d}</p></div></Reveal>)}
    </div></div></section>

    <section id="packs" className="section"><div className="container"><Reveal><div className="section-label">03 — COACHING PACKS</div><h2>Choose your <span>commitment.</span></h2></Reveal><div className="pack-grid">{packs.map((p, i) => <Reveal delay={i * .1} key={p.name}><div className={"pack " + (p.popular ? "featured" : "")}>{p.popular && <div className="popular">MOST POPULAR</div>}<h3>{p.name}</h3><p>{p.desc}</p><div className="price">{p.price}<small>/{p.month} month</small></div><div className="pack-items">{p.items.map(x => <span key={x}><Check size={16} />{x}</span>)}</div><button className={p.popular ? "primary-btn" : "outline-dark"} onClick={() => go("signup")}>Get started <ArrowRight size={16} /></button></div></Reveal>)}</div></div></section>

    <section id="reviews" className="section reviews"><div className="container"><Reveal><div className="section-label">04 — CLIENT RESULTS</div><h2>Real people. <span>Real change.</span></h2></Reveal><div className="review-grid">{reviews.map(([name, text, score], i) => <Reveal delay={i * .1} key={name}><div className="review"><div className="stars">{[1, 2, 3, 4, 5].map(x => <Star key={x} size={16} fill="currentColor" />)}</div><p>“{text}”</p><div className="reviewer"><div>{name[0]}</div><span><b>{name}</b><small>Verified client</small></span></div></div></Reveal>)}</div></div>    </section>

    <section className="cta"><div className="container cta-inner"><Reveal><div><div className="section-label">READY?</div><h2>Your next chapter starts <span>today.</span></h2></div><button className="primary-btn" onClick={() => go("signup")}>Join the coaching <ArrowRight /></button></Reveal></div></section>
  </motion.main>;
}

function CoachLoadingIndicator({ title, detail }) {
  return <motion.div
    className="account-loading-layout"
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: .45, ease: "easeOut" }}
  >
    <div className="account-loading-brand"><span className="brand-mark"><Dumbbell size={17} /></span><span>COACH <span className="accent">ZAKARIA</span></span></div>
    <motion.section className="account-loading-coach" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .08, duration: .5 }}>
      <motion.img src={CoachAvatar} alt="Coach Zakaria Rafalia" initial={{ scale: .92 }} animate={{ scale: 1 }} transition={{ delay: .15, duration: .55, ease: "easeOut" }} />
      <span className="account-loading-eyebrow">YOUR COACH</span>
      <h2>Zakaria Rafalia</h2>
      <p>Personal training and nutrition coaching.</p>
    </motion.section>
    <motion.section className="account-loading-main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .4 }}>
      <motion.div className="account-loading-ring" animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}>
        <ShieldCheck size={23} />
      </motion.div>
      <div className="account-loading-copy">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .35 }}>{title}</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .22, duration: .35 }}>{detail}</motion.p>
      </div>
      <div className="account-loading-track"><motion.span initial={{ scaleX: .12 }} animate={{ scaleX: [.12, .78, .35, .9, .12] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} /></div>
    </motion.section>
  </motion.div>;
}

function CustomerDashboardSkeleton() {
  const loadingGroup = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: .12, delayChildren: .05 } } };
  const loadingItem = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: .38, ease: "easeOut" } } };

  return <motion.main className="page customer-page-with-bar client-dashboard-skeleton" aria-label="Loading client dashboard" aria-busy="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="container" variants={loadingGroup} initial="hidden" animate="show">
      <motion.div className="skeleton-greeting" variants={loadingItem}><span className="skeleton-shape skeleton-avatar" /><span className="skeleton-greeting-copy"><i className="skeleton-shape" /><i className="skeleton-shape" /></span><span className="skeleton-shape skeleton-icon" /></motion.div>
      <motion.section className="skeleton-overview" variants={loadingItem}>
        <span className="skeleton-shape skeleton-eyebrow" />
        <div className="skeleton-stat-grid">{days.slice(0, 4).map(day => <div className="skeleton-stat" key={day}><i className="skeleton-shape" /><i className="skeleton-shape" /><i className="skeleton-shape" /></div>)}</div>
      </motion.section>
      <motion.section className="package-progress-card panel skeleton-package" variants={loadingItem}>
        <div className="skeleton-package-heading"><span className="skeleton-shape" /><span className="skeleton-shape" /></div>
        <div className="skeleton-package-details">{days.slice(0, 4).map(day => <i className="skeleton-shape" key={day} />)}</div>
        <i className="skeleton-shape skeleton-progress-line" />
      </motion.section>
      <motion.section className="panel week-panel skeleton-workout" variants={loadingItem}>
        <div className="skeleton-workout-heading"><span className="skeleton-shape" /><span className="skeleton-shape" /></div>
        <div className="skeleton-day-tabs">{days.map(day => <i className="skeleton-shape" key={day} />)}</div>
        <div className="skeleton-workout-body"><i className="skeleton-shape" /><i className="skeleton-shape" /><i className="skeleton-shape" /><i className="skeleton-shape" /></div>
      </motion.section>
    </motion.div>
  </motion.main>;
}

function Dashboard({ customer, program, loading, go, notify, initialSection = "home", openDashboardSection, setUnreadCount }) {
  const [selected, setSelected] = useState("Monday");
  const activeSection = initialSection;
  const [notifications, setNotifications] = useState([]);
  const [completionWeek, setCompletionWeek] = useState(() => getWeekKey());
  const [completedDays, setCompletedDays] = useState({});
  const [completionSaving, setCompletionSaving] = useState(false);
  const notifyRef = useRef(notify);
  const d = normalizeDay(program?.[selected]);
  const today = new Date();
  const currentDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(today);
  const currentWeekdayOffset = (today.getDay() + 6) % 7;
  const progress = packageProgress(customer.startDate, customer.endDate);
  const fullName = customer.name?.trim() || customer.email || "there";
  const weightValue = Number(customer.weight);
  const hasWeight = customer.weight !== "" && customer.weight != null && Number.isFinite(weightValue);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

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

  useEffect(() => {
    const refreshWeek = () => setCompletionWeek(getWeekKey());
    const intervalId = window.setInterval(refreshWeek, 60_000);
    window.addEventListener("focus", refreshWeek);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWeek);
    };
  }, []);

  useEffect(() => {
    const uid = auth?.currentUser?.uid;
    if (!firebaseConfigured || !db || !uid) {
      setCompletedDays({});
      return;
    }
    return onValue(ref(db, `programCompletions/${uid}`), snapshot => {
      const value = snapshot.val() || {};
      setCompletedDays(value && typeof value === "object" ? value : {});
    }, error => {
      console.error("Could not load weekly completion status", error);
      if (error?.code !== "PERMISSION_DENIED" && error?.code !== "permission-denied") {
        notifyRef.current("Could not load weekly completion status.");
      }
    });
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

  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [setUnreadCount, unreadCount]);

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

  const toggleDayComplete = async () => {
    const uid = auth?.currentUser?.uid;
    if (completionSaving) return;
    setCompletionSaving(true);
    try {
      if (firebaseConfigured && db && uid) {
        const completionRef = ref(db, `programCompletions/${uid}/${selected}`);
        if (completedDays[selected] === completionWeek) await remove(completionRef);
        else await set(completionRef, completionWeek);
      } else {
        setCompletedDays(current => {
          const next = { ...current };
          if (next[selected] === completionWeek) delete next[selected];
          else next[selected] = completionWeek;
          return next;
        });
      }
    } catch (error) {
      console.error("Could not update day completion status", error);
      const denied = error?.code === "PERMISSION_DENIED" || error?.code === "permission-denied";
      notify(denied
        ? "Couldn't save this day. Firebase denied the write; ask your coach to publish the latest Realtime Database Rules."
        : "Couldn't save this day. Check your connection and try again.", "error");
    } finally {
      setCompletionSaving(false);
    }
  };

  const openSection = (section) => {
    if (section === "profile") {
      go("profile");
      return;
    }
    openDashboardSection(section);
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

  if (loading) return <CustomerDashboardSkeleton />;

  return <motion.main className="page customer-page-with-bar" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
    <div className="container">
      <WorkspaceGreeting name={fullName} photoUrl={auth?.currentUser?.photoURL} unreadCount={unreadCount} onNotifications={() => openDashboardSection("notifications")} />

      <AnimatePresence mode="wait">
        {activeSection === "home" && <motion.section key="customer-home" className="customer-browser-view" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }} transition={{ duration: .2 }}>
          <motion.section className="client-profile-card" aria-label="Your client and package details" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="client-profile-top">
              <div className="client-profile-identity">
                <span className="client-profile-avatar">{(customer.name?.trim() || customer.email || "C").slice(0, 1).toUpperCase()}</span>
                <div><h2>{customer.name?.trim() || "Your profile"}</h2><p>{customer.email || "Email not set"}</p></div>
              </div>
              <div className="client-profile-package">
                <small>YOUR PACKAGE</small>
                <b>{customer.package || "Package not assigned"}</b>
                <span className={`package-status ${progress.awaiting ? "pending" : progress.active ? "active" : "expired"}`}>{progress.awaiting ? "AWAITING ADMIN" : progress.active ? "ACTIVE" : "EXPIRED"}</span>
              </div>
            </div>
            <div className="client-profile-facts">
              <div><small>Goal</small><b>{customer.goal || "Not set"}</b></div>
              <div><small>Age</small><b>{customer.age !== "" && customer.age != null ? `${customer.age} years` : "Not set"}</b></div>
              <div><small>Height</small><b>{customer.height !== "" && customer.height != null ? `${customer.height} cm` : "Not set"}</b></div>
              <div><small>Current weight</small><b>{hasWeight ? `${weightValue} kg` : "Not set"}</b></div>
            </div>
          </motion.section>
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
          <section className="panel week-panel"><div className="panel-title"><div><span className="section-label">THIS WEEK</span><h2>Your program</h2></div><CalendarDays /></div><div className="day-tabs customer-day-tabs" aria-label="Choose a day for your weekly program">{days.map((day, index) => {
            const isToday = day === currentDay;
            const isDone = completedDays[day] === completionWeek;
            const calendarDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index - currentWeekdayOffset);
            const dayNumber = new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(calendarDate);
            return <button type="button" className={`${selected === day ? "active" : ""}${isToday ? " today" : ""}`} onClick={() => setSelected(day)} aria-label={`${day}, ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(calendarDate)}${isToday ? ", today" : ""}${isDone ? ", completed" : ""}`} aria-pressed={selected === day} key={day}>
              <span className="day-tab-name">{day.slice(0, 3)}</span>
              <span className="day-tab-number">{dayNumber}</span>
              {isToday && <span className="day-tab-today">Today</span>}
              {isDone && <span className="day-tab-complete" aria-hidden="true"><Check size={12} /></span>}
            </button>;
          })}</div><AnimatePresence mode="wait"><motion.div key={selected} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="program-content"><div className="program-heading"><div className="day-icon"><Dumbbell /></div><div><small>{selected}</small><h3>{d.workout || "Your workout will appear here."}</h3></div></div><button type="button" className={`completion-action${completedDays[selected] === completionWeek ? " completed" : ""}`} onClick={toggleDayComplete} disabled={completionSaving}><CheckCircle2 size={17} />{completionSaving ? "Saving…" : completedDays[selected] === completionWeek ? "Day completed · Undo" : "Mark day as done"}</button><h4>Workout</h4>{d.exercises.map((x, i) => <div className="exercise" key={`${x}-${i}`}><span>{String(i + 1).padStart(2, "0")}</span><b>{x}</b><Check size={16} /></div>)}<h4>Meals</h4><div className="meal-list">{d.meals.map((x, i) => <div key={`${x}-${i}`}><Utensils size={16} /><span>{x}</span></div>)}</div></motion.div></AnimatePresence></section>
        </motion.section>}

        {activeSection === "notifications" && <motion.section key="customer-notifications" className="customer-browser-view" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .2 }}>
          <section className="panel customer-notifications-page"><div className="panel-title"><div><span className="section-label">INBOX</span><h2>Your notifications</h2></div><span className="notification-count-pill">{visibleNotifications.length}</span></div>{renderNotifications(false)}</section>
        </motion.section>}
      </AnimatePresence>
    </div>
  </motion.main>
}

function Profile({ customer, setCustomer, notify, go, openDashboardSection, unreadCount = 0 }) {
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
  const fullName = customer.name?.trim() || customer.email || "there";
  return <motion.main className="page customer-page-with-bar" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
    <div className="container narrow">
      <WorkspaceGreeting name={fullName} photoUrl={auth?.currentUser?.photoURL} unreadCount={unreadCount} onNotifications={() => openDashboardSection("notifications")} />
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

function Admin({ customers, setCustomers, program, setProgram, notify, tab, setTab, requestLogout }) {
  const [selected, setSelected] = useState(null);
  const [adminLoading, setAdminLoading] = useState(firebaseConfigured);
  const [programLoading, setProgramLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [programSaving, setProgramSaving] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSending, setNotificationSending] = useState(false);
  const [search, setSearch] = useState("");
  const [startDateDraft, setStartDateDraft] = useState("");
  // Mobile-app style navigation: which pane shows on a phone-width screen,
  // which sub-tab of a customer's profile is open, and which day of the
  // weekly program/meal builder is currently focused.
  const [mobileView, setMobileView] = useState("list");
  const [detailTab, setDetailTab] = useState("info");
  const [completionStatus, setCompletionStatus] = useState({});
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionLoadError, setCompletionLoadError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [activeDay, setActiveDay] = useState(days[0]);
  const [copyPickerOpen, setCopyPickerOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [planTemplates, setPlanTemplates] = useLocalState("coachflow_plan_templates", []);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientPickerSearch, setClientPickerSearch] = useState("");
  const clientPickerRef = useRef(null);
  const currentDay = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const today = new Date();
  const currentWeekdayOffset = (today.getDay() + 6) % 7;

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
    if (!firebaseConfigured || !db || !auth?.currentUser) return;
    const unsubscribe = onValue(ref(db, "planTemplates"), snapshot => {
      const raw = snapshot.val();
      if (!snapshot.exists() && Array.isArray(planTemplates) && planTemplates.length) {
        const legacyTemplates = Object.fromEntries(planTemplates.filter(item => item?.id).map(item => [item.id, item]));
        set(ref(db, "planTemplates"), legacyTemplates).catch(error => console.error("Could not migrate saved plan templates", error));
        return;
      }
      const templates = raw && typeof raw === "object" ? Object.values(raw).filter(item => item?.id && item?.name && item?.data) : [];
      setPlanTemplates(templates);
    }, error => {
      console.error("Could not load saved plan templates", error);
      notify(error?.code === "PERMISSION_DENIED" || error?.code === "permission-denied"
        ? "Firebase denied access to plan templates. Publish the latest Realtime Database Rules."
        : "Could not load saved plan templates.");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !db || !selectedCustomer?.id) {
      setCompletionStatus({});
      setCompletionLoading(false);
      setCompletionLoadError(false);
      return;
    }
    setCompletionStatus({});
    setCompletionLoading(true);
    setCompletionLoadError(false);
    const unsubscribe = onValue(ref(db, `programCompletions/${selectedCustomer.id}`), snapshot => {
      const value = snapshot.val();
      setCompletionStatus(value && typeof value === "object" ? value : {});
      setCompletionLoading(false);
    }, error => {
      console.error("Could not load customer completion status", error);
      setCompletionStatus({});
      setCompletionLoadError(true);
      setCompletionLoading(false);
    });
    return () => unsubscribe();
  }, [selectedCustomer?.id]);

  useEffect(() => {
    if (!clientPickerOpen) return;
    const handleOutside = event => {
      if (clientPickerRef.current && !clientPickerRef.current.contains(event.target)) setClientPickerOpen(false);
    };
    const handleEscape = event => {
      if (event.key === "Escape") setClientPickerOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [clientPickerOpen]);

  useEffect(() => {
    if (!copyPickerOpen) return;
    const handleEscape = event => {
      if (event.key === "Escape") setCopyPickerOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [copyPickerOpen]);

  useEffect(() => {
    if (!templatePickerOpen) return;
    const handleEscape = event => {
      if (event.key === "Escape") setTemplatePickerOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [templatePickerOpen]);

  useEffect(() => {
    setStartDateDraft(selectedCustomer?.startDate || "");
  }, [selectedCustomer?.id, selectedCustomer?.startDate]);

  useEffect(() => {
    if (!firebaseConfigured || !db || !selectedCustomer?.id) {
      setProgram(firebaseConfigured ? emptyProgram : demoProgram);
      setProgramLoading(false);
      return;
    }
    setProgramLoading(true);
    const unsubscribe = onValue(ref(db, `programs/${selectedCustomer.id}`), (snap) => {
      const normalized = normalizeProgram(snap.val());
      setProgram(normalized);
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
  const deleteCustomer = async () => {
    if (!deleteTarget || deletePending) return;
    const target = deleteTarget;
    setDeletePending(true);
    try {
      if (firebaseConfigured && db) {
        await update(ref(db), {
          [`users/${target.id}`]: null,
          [`programs/${target.id}`]: null,
          [`notifications/${target.id}`]: null,
          [`programCompletions/${target.id}`]: null
        });
      }
      setCustomers(current => current.filter(customer => customer.id !== target.id));
      if (selected === target.id) {
        setSelected(null);
        setMobileView("list");
      }
      setDeleteTarget(null);
      notify(`${target.name || target.email || "Client"} and their linked data were deleted.`);
    } catch (error) {
      console.error("Could not delete client and linked data", error);
      notify(error?.code === "permission-denied"
        ? "Firebase blocked deleting this client. Check the Realtime Database Rules."
        : "Could not delete this client and linked data.");
    } finally {
      setDeletePending(false);
    }
  };
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
  const copyActiveDayTo = targetDay => {
    if (!targetDay || targetDay === activeDay) return;
    setProgram(prev => {
      const source = normalizeDay(prev[activeDay]);
      return {
        ...prev,
        [targetDay]: {
          ...normalizeDay(prev[targetDay]),
          meals: [...source.meals],
          workout: source.workout,
          exercises: [...source.exercises]
        }
      };
    });
    notify(`Meals and program copied from ${activeDay} to ${targetDay}.`);
    setCopyPickerOpen(false);
  };
  const saveDayTemplate = async () => {
    const name = templateName.trim();
    if (!name) return notify("Enter a name for this template.");
    const dayData = normalizeDay(program[activeDay]);
    const template = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      category: "plan",
      data: {
        meals: [...dayData.meals],
        workout: dayData.workout,
        exercises: [...dayData.exercises]
      }
    };
    setTemplateSaving(true);
    try {
      if (firebaseConfigured && db) await set(ref(db, `planTemplates/${template.id}`), template);
      setPlanTemplates(current => [...(Array.isArray(current) ? current.filter(item => item.id !== template.id) : []), template]);
      setSelectedTemplateId(template.id);
      setTemplateName("");
      notify("Plan template saved.");
    } catch (error) {
      console.error("Could not save plan template", error);
      notify(error?.code === "PERMISSION_DENIED" || error?.code === "permission-denied"
        ? "Firebase denied saving templates. Publish the latest Realtime Database Rules."
        : "Could not save this plan template.");
    } finally {
      setTemplateSaving(false);
    }
  };
  const applyDayTemplate = () => {
    const template = (Array.isArray(planTemplates) ? planTemplates : []).find(item => item.id === selectedTemplateId);
    if (!template) return notify("Choose a matching template first.");
    setProgram(prev => ({
      ...prev,
      [activeDay]: {
        ...normalizeDay(prev[activeDay]),
        ...template.data,
        ...(template.data.exercises ? { exercises: [...template.data.exercises] } : {}),
        ...(template.data.meals ? { meals: [...template.data.meals] } : {})
      }
    }));
    notify(`Plan template applied to ${activeDay}.`);
  };
  const saveProgram = async () => {
    if (!selectedCustomer?.id) return notify("Select a customer first.");
    setProgramSaving(true);
    try {
      const after = normalizeProgram(program);
      const now = Date.now();

      if (firebaseConfigured && db) {
        await set(ref(db, `programs/${selectedCustomer.id}`), after);

        try {
          await set(ref(db, `notifications/${selectedCustomer.id}/program-${now}`), {
            title: "Your plan has been updated.",
            message: "Your coach updated your weekly meals and training program.",
            createdAt: now,
            read: false,
            type: "program"
          });
        } catch (notificationError) {
          console.error("Could not send program notification", notificationError);
          setProgram(after);
          notify("Plan updated, but the customer notification could not be sent. Publish the latest Realtime Database Rules.");
          return;
        }
      }

      setProgram(after);
      notify(`Meals and program published to ${selectedCustomer.name || selectedCustomer.email}.`);
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
  const matchingTemplates = Array.isArray(planTemplates) ? planTemplates.filter(item => item && ["plan", "meals", "program"].includes(item.category)) : [];
  const selectedTemplate = matchingTemplates.find(item => item.id === selectedTemplateId) || null;
  const matchingClients = customers.filter(client => [client.name, client.email].some(value => String(value || "").toLowerCase().includes(clientPickerSearch.trim().toLowerCase())));
  const setActiveDayList = (key, index, value) => { const list = [...(program[activeDay]?.[key] || [])]; list[index] = value; updateProgram(activeDay, key, list); };
  const addActiveDayItem = key => updateProgram(activeDay, key, [...(program[activeDay]?.[key] || []), ""]);
  const removeActiveDayItem = (key, index) => updateProgram(activeDay, key, (program[activeDay]?.[key] || []).filter((_, i) => i !== index));
  const selectedStatus = selectedCustomer ? packageProgress(selectedCustomer.startDate, selectedCustomer.endDate) : null;
  const coachName = `Coach ${(auth?.currentUser?.displayName || auth?.currentUser?.email?.split("@")[0] || ADMIN_EMAIL.split("@")[0]).replace(/^coach\s+/i, "").trim().toUpperCase()}`;

  return <motion.main className="page admin-app" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div className="container">
    <WorkspaceGreeting name={coachName} photoUrl={auth?.currentUser?.photoURL} coach />
    <div className="admin-summary"><div className="admin-summary-card"><Users size={18} /><span>Total customers</span><b>{customers.length}</b></div><div className="admin-summary-card"><CheckCircle2 size={18} /><span>Active packages</span><b>{activeCount}</b></div><div className="admin-summary-card"><Clock3 size={18} /><span>Awaiting dates</span><b>{pendingCount}</b></div><div className="admin-summary-card"><Bell size={18} /><span>Expires ≤ 7 days</span><b>{expiringCount}</b></div></div>
    <div className="admin-tabs" role="navigation" aria-label="Coach workspace">
      <button type="button" aria-current={tab === "customers" ? "page" : undefined} className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}><Users size={16} /> Customers <span className="tab-count">{customers.length}</span></button>
      <button type="button" aria-current={tab !== "customers" ? "page" : undefined} className={tab !== "customers" ? "active" : ""} onClick={() => setTab("plan")}><Dumbbell size={16} /> Meals &amp; program</button>
    </div>

    {adminLoading ? <div className="panel loading-panel"><div className="spinner" /><h3>Loading customers…</h3><p>Getting all customer profiles from Firebase.</p></div> : tab === "customers" ? <div className={`admin-app-grid mobile-showing-${mobileView}`}>
      <div className="customer-pane">
        <div className="customer-list-top"><Search size={15} /><input className="customer-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" /><span>{filteredCustomers.length}</span></div>
        <div className="customer-list">
          {filteredCustomers.length === 0 ? <div className="empty-state">No customer accounts found.<br />Ask the customer to Sign Up first.</div> : filteredCustomers.map(c => {
            const p = packageProgress(c.startDate, c.endDate);
            const statusClass = p.awaiting ? "pending" : !p.active ? "expired" : p.remaining <= 7 ? "expiring" : "active";
            const statusLabel = p.awaiting ? "Awaiting dates" : !p.active ? "Expired" : p.remaining <= 7 ? `${p.remaining}d left` : "Active";
            return <motion.div className="customer-list-item" key={c.id} layout>
              <motion.button type="button" whileTap={{ scale: .98 }} className={`customer-list-select${selected === c.id ? " selected" : ""}`} onClick={() => openCustomer(c.id)}>
                <span className="customer-avatar">{(c.name || c.email || "C")[0].toUpperCase()}</span>
                <span className="customer-card-body">
                  <b>{c.name || "Unnamed customer"}</b>
                  <small>{c.email}</small>
                  <span className="customer-card-meta"><em className={`status-chip ${statusClass}`}>{statusLabel}</em><em className="package-chip">{c.package || "No package"}</em></span>
                  {!p.awaiting && <span className="mini-progress"><span style={{ width: `${p.percent}%` }} /></span>}
                </span>
                <ChevronRight size={17} className="chevron" />
              </motion.button>
              <button type="button" className="customer-delete-button" onClick={() => setDeleteTarget(c)} aria-label={`Delete ${c.name || c.email}`} title="Delete client">
                <Trash2 size={16} />
              </button>
            </motion.div>;
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
            <button type="button" className={detailTab === "progress" ? "active" : ""} onClick={() => setDetailTab("progress")}><CalendarDays size={14} /> Progress</button>
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

            {detailTab === "progress" && <motion.div className="admin-completion-progress" key="progress" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: .16 }}>
              <div className="admin-completion-heading"><div><span className="section-label">THIS WEEK</span><h3>Workout completion</h3></div><b>{days.filter(day => completionStatus[day] === getWeekKey(today)).length}<small> / 7 days</small></b></div>
              {completionLoading ? <div className="admin-completion-message">Loading this week's progress…</div>
                : completionLoadError ? <div className="admin-completion-message error">Completion status is unavailable for this client.</div>
                  : <div className="admin-completion-days">{days.map(day => {
                    const isDone = completionStatus[day] === getWeekKey(today);
                    return <div className={`admin-completion-day${isDone ? " done" : ""}`} key={day}>
                      <span className="admin-completion-mark">{isDone ? <Check size={15} /> : <span />}</span>
                      <b>{day}</b>
                      <small>{isDone ? "Done" : "Not done"}</small>
                    </div>;
                  })}</div>}
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
      <div className="section-label">WEEKLY PLAN BUILDER</div>
      <h2>Meals &amp; program</h2>
      <div className="plan-client-select" ref={clientPickerRef}>
        <button
          type="button"
          className={`plan-client-trigger${clientPickerOpen ? " open" : ""}${selectedCustomer ? " selected" : ""}`}
          onClick={() => { setClientPickerOpen(open => !open); setClientPickerSearch(""); }}
          aria-haspopup="dialog"
          aria-expanded={clientPickerOpen}
        >
          <span className="plan-client-avatar">{selectedCustomer ? (selectedCustomer.name || selectedCustomer.email || "C")[0].toUpperCase() : <Users size={17} />}</span>
          <span className="plan-client-trigger-copy">
            <small>{selectedCustomer ? "PLAN FOR" : "CLIENT"}</small>
            <b>{selectedCustomer?.name || "Choose a client"}</b>
            {selectedCustomer?.email && <small>{selectedCustomer.email}</small>}
          </span>
          <span className="plan-client-change">{selectedCustomer ? "Change client" : "Select client"} <ChevronDown size={16} className={clientPickerOpen ? "rotated" : ""} /></span>
        </button>
        <AnimatePresence>
          {clientPickerOpen && <motion.div
            className="plan-client-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .18 }}
            onClick={() => setClientPickerOpen(false)}
          >
            <motion.div
              className="plan-client-options"
              role="dialog"
              aria-modal="true"
              aria-label="Choose a client"
              initial={{ opacity: 0, y: 14, scale: .97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: .98 }}
              transition={{ duration: .2, ease: "easeOut" }}
              onClick={event => event.stopPropagation()}
            >
              <div className="plan-client-popup-heading"><div><span className="section-label">MEALS &amp; PROGRAM</span><h3>Choose a client</h3><p>Select who this weekly plan is for.</p></div><button type="button" className="plan-client-popup-close" onClick={() => setClientPickerOpen(false)} aria-label="Close client picker">×</button></div>
              <div className="plan-client-search"><Search size={16} /><input type="search" value={clientPickerSearch} onChange={event => setClientPickerSearch(event.target.value)} placeholder="Search clients…" aria-label="Search clients" /></div>
              <div className="plan-client-option-list" role="listbox" aria-label="Clients">
                {matchingClients.length === 0 ? <p className="plan-client-empty">No clients match that search.</p> : matchingClients.map(client => (
                  <motion.button
                    type="button"
                    role="option"
                    aria-selected={selectedCustomer?.id === client.id}
                    className={`plan-client-option${selectedCustomer?.id === client.id ? " active" : ""}`}
                    key={client.id}
                    onClick={() => {
                      setSelected(client.id);
                      setActiveDay(days[0]);
                      setCopyPickerOpen(false);
                      setPreviewMode(false);
                      setClientPickerOpen(false);
                      setClientPickerSearch("");
                    }}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: .99 }}
                  >
                    <span className="plan-client-avatar">{(client.name || client.email || "C")[0].toUpperCase()}</span>
                    <span className="plan-client-trigger-copy"><b>{client.name || "Unnamed client"}</b><small>{client.email || "No email address"}</small></span>
                    {selectedCustomer?.id === client.id && <Check size={17} />}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>}
        </AnimatePresence>
      </div>

      <div className="plan-tools">
        <div className="plan-template-tools">
          <div className="plan-template-select-row">
            <button type="button" className="plan-template-trigger" onClick={() => setTemplatePickerOpen(true)} disabled={!selectedCustomer} aria-haspopup="dialog" aria-expanded={templatePickerOpen}>
              <span><small>SAVED PLAN TEMPLATES</small><b>{selectedTemplate?.name || "Choose a template"}</b></span><ChevronDown size={16} />
            </button>
            <button type="button" className="outline-dark plan-tool-button" onClick={applyDayTemplate} disabled={!selectedTemplate || !selectedCustomer}><Copy size={15} /> Apply</button>
          </div>
          <div className="plan-tool-row">
            <input value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="Name this plan template" aria-label="Template name" />
            <button type="button" className="outline-dark plan-tool-button" onClick={saveDayTemplate} disabled={!selectedCustomer || templateSaving}><Save size={15} /> {templateSaving ? "Saving…" : "Save template"}</button>
          </div>
        </div>
        <AnimatePresence>
          {templatePickerOpen && <motion.div className="plan-copy-popup-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTemplatePickerOpen(false)}>
            <motion.div className="plan-copy-popup plan-template-popup" role="dialog" aria-modal="true" aria-labelledby="plan-template-popup-title" initial={{ opacity: 0, y: 16, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 9, scale: .98 }} transition={{ duration: .22, ease: "easeOut" }} onClick={event => event.stopPropagation()}>
              <div className="plan-copy-popup-heading">
                <div><span className="section-label">SAVED PLANS</span><h3 id="plan-template-popup-title">Choose a template</h3><p>Select a saved workout and meal plan to apply to {activeDay}.</p></div>
                <button type="button" className="plan-copy-popup-close" onClick={() => setTemplatePickerOpen(false)} aria-label="Close template picker">×</button>
              </div>
              <div className="plan-template-options" role="listbox" aria-label="Saved plan templates">
                {matchingTemplates.length === 0 ? <p className="plan-template-empty">No saved templates yet. Save this day to create your first template.</p> : matchingTemplates.map(template => (
                  <motion.button type="button" role="option" aria-selected={selectedTemplateId === template.id} className={`plan-template-option${selectedTemplateId === template.id ? " active" : ""}`} key={template.id} onClick={() => { setSelectedTemplateId(template.id); setTemplatePickerOpen(false); }} whileHover={{ x: 3 }} whileTap={{ scale: .99 }}>
                    <span className="plan-template-option-icon"><Dumbbell size={16} /></span>
                    <span className="plan-template-option-copy"><b>{template.name}</b><small>{template.data?.workout || `${template.data?.exercises?.length || 0} exercises · ${template.data?.meals?.length || 0} meals`}</small></span>
                    {selectedTemplateId === template.id && <Check size={17} />}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>}
        </AnimatePresence>
      </div>

      <div className="day-tabs admin-day-tabs" aria-label="Choose a day for the weekly plan">{days.map((day, index) => {
        const isToday = day === currentDay;
        const calendarDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index - currentWeekdayOffset);
        const dayNumber = new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(calendarDate);
        return <button type="button" className={`${activeDay === day ? "active" : ""}${isToday ? " today" : ""}`} onClick={() => setActiveDay(day)} aria-label={`${day}, ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(calendarDate)}${isToday ? ", today" : ""}`} aria-pressed={activeDay === day} key={day}>
          <span className="day-tab-name">{day.slice(0, 3)}</span>
          <span className="day-tab-number">{dayNumber}</span>
          {isToday && <span className="day-tab-today">Today</span>}
        </button>;
      })}</div>

      <div className="plan-preview-toggle">
        <span>{previewMode ? "Client preview" : "Editing draft"}</span>
        <button type="button" className="outline-dark plan-tool-button" onClick={() => setPreviewMode(value => !value)} disabled={!selectedCustomer}>
          {previewMode ? <><Pencil size={15} /> Back to editing</> : <><Eye size={15} /> Preview as client</>}
        </button>
      </div>

      {programLoading ? <div className="loading-panel compact"><div className="spinner" /><h3>Loading this customer's program…</h3></div> : previewMode ? <motion.section className="client-plan-preview" key={`preview-${tab}-${activeDay}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="client-plan-preview-heading"><span className="section-label">{selectedCustomer?.name || "CLIENT"} · {activeDay.toUpperCase()}</span><h3>{activeDayData.workout || "Your workout"}</h3></div>
        <h4>Workout</h4>
        {activeDayExercises.length ? <ol>{activeDayExercises.map((exercise, index) => <li key={`${exercise}-${index}`}>{exercise}</li>)}</ol> : <p>No exercises added for this day yet.</p>}
        <h4>Meals</h4>
        {activeDayMeals.length ? <ul>{activeDayMeals.map((meal, index) => <li key={`${meal}-${index}`}><Utensils size={16} />{meal}</li>)}</ul> : <p>No meals added for this day yet.</p>}
      </motion.section> : <AnimatePresence mode="wait">
        <motion.div className="day-editor mobile-day-editor" key={activeDay} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .18 }}>
          <div className="day-title"><b>{activeDay}</b><span>{activeDayData.workout || "Rest / no workout"} · {activeDayMeals.length} meal{activeDayMeals.length === 1 ? "" : "s"}</span></div>
          <label>Workout title<input value={activeDayData.workout || ""} onChange={e => updateProgram(activeDay, "workout", e.target.value)} placeholder="e.g. Upper body strength" /></label>
          <div className="program-field-group exercise-group">
            <div className="field-group-head"><span><Dumbbell size={14} /> Exercise</span>
            <button type="button" className="mini-add" onClick={() => addActiveDayItem("exercises")}><i class="fa-solid fa-plus"></i> Add exercise</button>
            </div>{activeDayExercises.length === 0 && <div className="field-empty">No exercises added yet.</div>}{activeDayExercises.map((x, i) => <div className="repeat-row" key={`ex-${i}`}><input value={x} onChange={e => setActiveDayList("exercises", i, e.target.value)} placeholder={`Exercise ${i + 1} — description, sets, reps, rest, notes…`} /><button type="button" className="remove-item" onClick={() => removeActiveDayItem("exercises", i)} aria-label="Remove exercise"><i class="fa-solid fa-trash-can"></i></button></div>)}</div>
          <div className="program-field-group meals-group">
            <div className="field-group-head"><span><Utensils size={14} /> Meals</span><button type="button" className="mini-add" onClick={() => addActiveDayItem("meals")}><i class="fa-solid fa-plus"></i> Add meal</button></div>{activeDayMeals.length === 0 && <div className="field-empty">No meals drafted yet for {activeDay}.</div>}{activeDayMeals.map((x, i) => <div className="repeat-row meal-row" key={`meal-${i}`}><input value={x} onChange={e => setActiveDayList("meals", i, e.target.value)} placeholder={`Meal ${i + 1} — e.g. Breakfast: eggs, oats, fruit`} /><button type="button" className="remove-item" onClick={() => removeActiveDayItem("meals", i)} aria-label="Remove meal"><i class="fa-solid fa-trash-can"></i></button></div>)}</div>
        </motion.div>
      </AnimatePresence>}

      <div className="program-save-bar">
        <div className="plan-copy-action">
          <button type="button" className="outline-dark plan-copy-toggle" onClick={() => setCopyPickerOpen(true)} disabled={!selectedCustomer || programLoading} aria-haspopup="dialog">
            <Copy size={16} /> Copy plan to day
          </button>
          <AnimatePresence>
            {copyPickerOpen && <motion.div
              className="plan-copy-popup-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: .18 }}
              onClick={() => setCopyPickerOpen(false)}
            >
              <motion.div
                className="plan-copy-popup"
                role="dialog"
                aria-modal="true"
                aria-labelledby="plan-copy-popup-title"
                initial={{ opacity: 0, y: 16, scale: .96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 9, scale: .98 }}
                transition={{ duration: .22, ease: "easeOut" }}
                onClick={event => event.stopPropagation()}
              >
                <div className="plan-copy-popup-heading">
                  <div><span className="section-label">COPY FULL PLAN</span><h3 id="plan-copy-popup-title">Choose a day</h3><p>Copy {activeDay}'s meals and program to another day.</p></div>
                  <button type="button" className="plan-copy-popup-close" onClick={() => setCopyPickerOpen(false)} aria-label="Close day picker">×</button>
                </div>
                <div className="plan-copy-day-cards">
                  {days.filter(day => day !== activeDay).map((day, index) => <motion.button
                    type="button"
                    className="plan-copy-day-card"
                    key={day}
                    onClick={() => copyActiveDayTo(day)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .16, delay: index * .025 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: .98 }}
                  >
                    <Copy size={15} /><b>{day}</b><small>Copy from {activeDay}</small>
                  </motion.button>)}
                </div>
              </motion.div>
            </motion.div>}
          </AnimatePresence>
        </div>
        <button className="primary-btn" onClick={saveProgram} disabled={programSaving || programLoading || !selectedCustomer}><Send size={17} /> {programSaving ? "Publishing…" : "Publish full plan to client"}</button>
      </div>
    </div>}

    <div className="admin-bottom-nav">
      <button type="button" className={tab === "customers" ? "active" : ""} aria-current={tab === "customers" ? "page" : undefined} onClick={() => setTab("customers")}><Users size={18} /><span>Customers</span></button>
      <button type="button" className={tab !== "customers" ? "active" : ""} aria-current={tab !== "customers" ? "page" : undefined} onClick={() => setTab("plan")}><Dumbbell size={18} /><span>Meals &amp; program</span></button>
      <button type="button" className="nav-logout" onClick={requestLogout}><LogOut size={18} /><span>Logout</span></button>
    </div>
    <AnimatePresence>
      {deleteTarget && <SwipeDeleteDialog
        target={deleteTarget}
        pending={deletePending}
        onCancel={() => { if (!deletePending) setDeleteTarget(null); }}
        onConfirm={deleteCustomer}
      />}
    </AnimatePresence>
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
// Accepts either a raw oobCode or a full reset link pasted from the email,
// and pulls the oobCode out of it either way.
function extractOobCode(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    const fromUrl = url.searchParams.get("oobCode");
    if (fromUrl) return fromUrl;
  } catch {
    // Not a full URL — fall through and treat it as a raw code.
  }
  return trimmed;
}

function ForgotPasswordPage({ initialEmail, onReset, notify, go }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!email.trim()) return notify("Enter your email address.");
    setSending(true);
    try {
      await onReset(email);
    } finally {
      setSending(false);
    }
  };

  return <motion.main className="auth-page reset-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <motion.div
      className="reset-shell"
      initial={{ opacity: 0, y: 24, scale: .98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: .45, ease: "easeOut" }}
    >
      <div className="reset-glow reset-glow-one" />
      <div className="reset-glow reset-glow-two" />

      <div className="reset-card">
        <form className="reset-form" onSubmit={submit}>
          <div className="section-label">ACCOUNT SECURITY</div>
          <h1>Forgot your <span>password?</span></h1>
          <p className="reset-intro">Enter the email on your account and we'll send you a reset code.</p>

          <label>Email
            <div className="reset-input-wrap">
              <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoFocus />
            </div>
          </label>

          <button className="primary-btn full reset-submit" type="submit" disabled={sending}>{sending ? "Sending…" : "Send reset code"} <ArrowRight size={17} /></button>
          <button className="forgot-btn reset-secondary" type="button" onClick={() => go("login")}>Return to sign in</button>
        </form>
      </div>
    </motion.div>
  </motion.main>;
}
function ResetPasswordPage({ code, notify, go }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [loading, setLoading] = useState(!!code);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resolvedCode, setResolvedCode] = useState(code || "");
  const [manualInput, setManualInput] = useState("");
  const [checkingManual, setCheckingManual] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkCode() {
      if (!resolvedCode) {
        if (active) setLoading(false);
        return;
      }
      try {
        const email = await verifyResetPasswordCode(resolvedCode);
        if (active) {
          setAccountEmail(email || "");
          setInvalid(false);
          setLoading(false);
        }
      } catch {
        if (active) {
          setInvalid(true);
          setLoading(false);
        }
      }
    }
    checkCode();
    return () => { active = false; };
  }, [resolvedCode]);

  const submitManualCode = async (event) => {
    event.preventDefault();
    const extracted = extractOobCode(manualInput);
    if (!extracted) return notify("Paste the reset code or the link from your email.");
    setCheckingManual(true);
    setLoading(true);
    setInvalid(false);
    setResolvedCode(extracted);
    setCheckingManual(false);
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Too short", "Good", "Strong"][strength];
  const strengthClass = ["", "weak", "medium", "strong"][strength];

  const submit = async (event) => {
    event.preventDefault();
    if (!resolvedCode) return notify("This password reset link is missing or invalid.");
    if (password.length < 6) return notify("Password must be at least 6 characters.");
    if (password !== confirmPassword) return notify("Passwords do not match.");
    setSaving(true);
    try {
      await confirmResetPassword(resolvedCode, password);
      setSuccess(true);
      notify("Password updated successfully.");
    } catch (error) {
      const message = error?.code === "auth/expired-action-code"
        ? "This reset link has expired. Request a new one."
        : error?.code === "auth/weak-password"
          ? "Please choose a stronger password."
          : "This reset link is invalid or already used.";
      notify(message);
      if (error?.code === "auth/expired-action-code" || error?.code === "auth/invalid-action-code") setInvalid(true);
    } finally {
      setSaving(false);
    }
  };

  return <motion.main className="auth-page reset-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <motion.div
      className="reset-shell"
      initial={{ opacity: 0, y: 24, scale: .98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: .45, ease: "easeOut" }}
    >
      <div className="reset-glow reset-glow-one" />
      <div className="reset-glow reset-glow-two" />

      <div className="reset-card">
        {!resolvedCode && !loading ? <form className="reset-form" onSubmit={submitManualCode}>
          <div className="section-label">ACCOUNT SECURITY</div>
          <h1>Enter your reset <span>code.</span></h1>
          <p className="reset-intro">Open the password reset email we sent you and paste the code, or the whole link, below.</p>

          <label>Reset code or link
            <div className="reset-input-wrap">
              <input type="text" autoComplete="off" value={manualInput} onChange={event => setManualInput(event.target.value)} placeholder="Paste code or link from your email" autoFocus />
            </div>
          </label>

          <button className="primary-btn full reset-submit" type="submit" disabled={checkingManual}>{checkingManual ? "Checking…" : "Continue"} <ArrowRight size={17} /></button>
          <button className="forgot-btn reset-secondary" type="button" onClick={() => go("login")}>Return to sign in</button>
        </form> : loading ? <div className="reset-state">
          <motion.div className="reset-loader" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
          <h1>Checking your link<span>.</span></h1>
          <p>We are securely validating your password reset request.</p>
        </div> : invalid ? <div className="reset-state">
          <div className="reset-state-icon error"><X size={28} /></div>
          <div className="section-label">RESET LINK</div>
          <h1>This link is no longer <span>valid.</span></h1>
          <p>The password reset link may have expired, already been used, or be incomplete.</p>
          <button className="primary-btn full" onClick={() => go("login")}>Back to sign in <ArrowRight size={17} /></button>
          <button className="forgot-btn reset-secondary" onClick={() => go("forgot-password")}>Request a new reset email</button>
        </div> : success ? <motion.div className="reset-state" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div className="reset-state-icon success" initial={{ scale: .7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}><CheckCircle2 size={30} /></motion.div>
          <div className="section-label">ALL SET</div>
          <h1>Your password is <span>updated.</span></h1>
          <p>Your CoachWolf account is secure again. You can now sign in with your new password.</p>
          <button className="primary-btn full" onClick={() => go("login")}>Continue to sign in <ArrowRight size={17} /></button>
        </motion.div> : <form className="reset-form" onSubmit={submit}>
          <div className="section-label">ACCOUNT SECURITY</div>
          <h1>Set a new <span>password.</span></h1>
          <p className="reset-intro">Create a new password for your coaching account.</p>

          {accountEmail && <div className="reset-account">
            <span className="reset-account-dot" />
            <div><small>Resetting password for</small><strong>{accountEmail}</strong></div>
          </div>}

          <label>New password
            <div className="reset-input-wrap">
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" autoFocus />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}>{showPassword ? "Hide" : "Show"}</button>
            </div>
          </label>

          <div className="password-strength">
            <div className="strength-bars"><i className={strength >= 1 ? strengthClass : ""} /><i className={strength >= 2 ? strengthClass : ""} /><i className={strength >= 3 ? strengthClass : ""} /></div>
            <span>{strengthLabel}</span>
          </div>

          <label>Confirm password
            <div className="reset-input-wrap">
              <input type={showConfirm ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat your new password" />
              <button type="button" aria-label={showConfirm ? "Hide password" : "Show password"} onClick={() => setShowConfirm(value => !value)}>{showConfirm ? "Hide" : "Show"}</button>
            </div>
          </label>

          <div className="reset-rules"><Check size={14} /> Minimum 6 characters <span /> <ShieldCheck size={14} /> Secure reset</div>
          <button className="primary-btn full reset-submit" type="submit" disabled={saving}>{saving ? "Updating…" : "Update password"} <ArrowRight size={17} /></button>
          <button className="forgot-btn reset-secondary" type="button" onClick={() => go("login")}>Return to sign in</button>
        </form>}
      </div>
    </motion.div>
  </motion.main>;
}
function Reveal({ children, delay = 0 }) { return <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .6, delay }}>{children}</motion.div> }

function LogoutConfirmDialog({ onCancel, onConfirm, pending }) {
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, pending]);

  return <motion.div
    className="logout-confirm-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onMouseDown={event => {
      if (event.target === event.currentTarget && !pending) onCancel();
    }}
  >
    <motion.section
      className="logout-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
      aria-describedby="logout-confirm-description"
      initial={{ opacity: 0, y: 22, scale: .94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 14, scale: .96 }}
      transition={{ type: "spring", stiffness: 340, damping: 27 }}
    >
      <div className="logout-confirm-icon"><LogOut size={23} /></div>
      <h2 id="logout-confirm-title">Log out?</h2>
      <p id="logout-confirm-description">You’ll be signed out of your coaching account. Sign in again to view your plan and progress.</p>
      <div className="logout-confirm-actions">
        <motion.button type="button" className="logout-cancel-btn" onClick={onCancel} disabled={pending} whileTap={{ scale: .97 }}>Stay signed in</motion.button>
        <motion.button type="button" className="logout-confirm-btn" onClick={onConfirm} disabled={pending} whileTap={{ scale: .97 }} whileHover={{ y: -1 }}>
          {pending ? <><span className="logout-spinner" /> Logging out…</> : <><LogOut size={16} /> Log out</>}
        </motion.button>
      </div>
    </motion.section>
  </motion.div>;
}

function SwipeDeleteDialog({ target, pending, onCancel, onConfirm }) {
  const swipeTrackRef = useRef(null);
  const swipeToConfirm = (_, info) => {
    const availableDistance = Math.max(0, (swipeTrackRef.current?.clientWidth || 0) - 58);
    if (availableDistance > 0 && info.offset.x >= availableDistance * .78) onConfirm();
  };
  const handleKeyDown = event => {
    if ((event.key === "Enter" || event.key === " ") && !pending) {
      event.preventDefault();
      onConfirm();
    }
    if (event.key === "Escape" && !pending) onCancel();
  };

  return <motion.div
    className="delete-confirm-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onMouseDown={event => {
      if (event.target === event.currentTarget && !pending) onCancel();
    }}
  >
    <motion.section
      className="delete-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      aria-describedby="delete-confirm-description"
      initial={{ opacity: 0, y: 22, scale: .94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 14, scale: .96 }}
      transition={{ type: "spring", stiffness: 340, damping: 27 }}
    >
      <div className="delete-confirm-icon"><Trash2 size={22} /></div>
      <h2 id="delete-confirm-title">Delete client?</h2>
      <p id="delete-confirm-description">This permanently removes <b>{target.name || target.email || "this client"}</b>, their weekly program, notifications, and completion data. Their Firebase sign-in account is not deleted.</p>
      <div className="delete-swipe-track" ref={swipeTrackRef} aria-label="Swipe right to confirm deletion">
        <span>Swipe to delete</span>
        <motion.button
          type="button"
          className="delete-swipe-handle"
          drag={pending ? false : "x"}
          dragConstraints={swipeTrackRef}
          dragElastic={0}
          dragMomentum={false}
          dragSnapToOrigin
          onDragEnd={swipeToConfirm}
          onKeyDown={handleKeyDown}
          disabled={pending}
          aria-label="Swipe right to permanently delete this client"
        >
          {pending ? <span className="logout-spinner" /> : <ArrowRight size={19} />}
        </motion.button>
      </div>
      <button type="button" className="delete-cancel-btn" onClick={onCancel} disabled={pending}>Cancel</button>
    </motion.section>
  </motion.div>;
}

function Toast({ message, type = "success" }) { const Icon = type === "error" ? AlertTriangle : Check; return <motion.div className={`toast${type === "error" ? " toast-error" : ""}`} role={type === "error" ? "alert" : "status"} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}><Icon size={17} />{message}</motion.div> }
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

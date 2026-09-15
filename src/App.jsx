import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, ChevronDown, Dumbbell, Flame, HeartPulse, Instagram,
  LayoutDashboard, LogIn, LogOut, Menu, Play, Plus, ShieldCheck, Star,
  Target, User, Users, Utensils, X, CalendarDays, Clock3, Save
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, firebaseConfigured, loginEmail, registerEmail, loginGoogle, logoutFirebase, resetPassword } from "./lib/firebase";
import { ref, get, set, update, onValue } from "firebase/database";
import { demoCustomer, demoCustomers, demoProgram } from "./data/demo";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@coachflow.demo";
const days = Object.keys(demoProgram);
const emptyProgram = Object.fromEntries(days.map(day => [day, { workout: "", exercises: [], meals: [] }]));

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

function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [customer, setCustomer] = useState(() => firebaseConfigured ? emptyCustomer : demoCustomer);
  const [customers, setCustomers] = useLocalState("coachflow_customers", firebaseConfigured ? [] : demoCustomers);
  const [program, setProgram] = useState(demoProgram);
  const [authMode, setAuthMode] = useState(null);
  const [toast, setToast] = useState("");
  const authFlowRef = useRef(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const go = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            gender: String(form.gender || "").trim()
          };
          await set(profileRef, profile);
          setCustomer(profile);
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
        : { ...emptyCustomer, id: crypto.randomUUID(), email, name: form.name || "", age: Number(form.age || 0), height: Number(form.height || 0), weight: Number(form.weight || 0), goal: form.goal || "" };
      setCustomer(profile);
      setCustomers(prev => prev.some(x => x.email?.toLowerCase() === email) ? prev : [...prev, profile]);
      setAuthMode(null);
      go("dashboard");
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
        {page === "dashboard" && isCustomer && <Dashboard key="dashboard" customer={customer} program={program} go={go} />}
        {page === "profile" && isCustomer && <Profile key="profile" customer={customer} setCustomer={setCustomer} notify={notify} />}
        {page === "admin" && isAdmin && <Admin key="admin" customers={customers} setCustomers={setCustomers} program={program} setProgram={setProgram} notify={notify} />}
        {page === "login" && <Auth key="login" mode="login" onSubmit={(f) => handleAuth("login", f)} onGoogle={handleGoogle} onReset={handleReset} switchMode={() => setAuthMode("signup")} />}
      </AnimatePresence>
      <AnimatePresence>
        {authMode && <AuthOverlay mode={authMode} close={() => setAuthMode(null)} onSubmit={(f) => handleAuth(authMode, f)} onGoogle={handleGoogle} onReset={handleReset} switchMode={() => setAuthMode(authMode === "login" ? "signup" : "login")} />}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast} />}</AnimatePresence>
      <Footer />
    </div>
  );
}

function Nav({ page, go, isCustomer, isAdmin, logout }) {
  const [open, setOpen] = useState(false); const close = () => setOpen(false);
  const section = (id) => { close(); if (page !== "home") { go("home"); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 100); } else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };
  return <header className="nav"><div className="nav-inner">
    <button className="brand" onClick={() => { close(); go("home") }}>
      <span>COACH<span className="accent">RAFALIA</span>
      </span>
    </button>
    <button className="mobile-menu" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav className={open ? "nav-links open" : "nav-links"}>
      <button onClick={() => { close(); go("home") }}>Home</button>
      <button onClick={() => section("about")}>About</button>
      <button onClick={() => section("packs")}>Packs</button>
      <button onClick={() => section("reviews")}>Reviews</button>
      {isCustomer && <button onClick={() => { close(); go("dashboard") }}>Dashboard</button>}{isAdmin && <button onClick={() => { close(); go("admin") }}>Admin</button>}
      {isCustomer || isAdmin ? <button className="outline-btn" onClick={() => { close(); logout() }}><LogOut size={15} /> Logout</button> : <button className="primary-btn small" onClick={() => { close(); go("login") }}><LogIn size={15} /> Login</button>}
    </nav>
  </div></header>;
}
function Home({ go }) {
  const packs = [
    { name: "Basic", price: "1000MAD", desc: "1 To 1 At Gym Metroflex.", items: ["Fully Personalized Workout Session", "One-on-one coaching during the entire workout","Training tips to improve future workouts","Motivation and accountability to push your limits","Nutrition basics","An account with your own dashboard for your daily meals.","Everything in Starter", "Personal meal plan", "Weekly check-in", "Progress tracking","Everything in Transformation", "Direct coach support", "Program adjustments", "Priority check-ins"] },
    { name: "Transformation", price: "999MAD", desc: "1 To 1 In Your Home Or My Gym", popular: true, items: ["Everything in Starter", "Personal meal plan", "Weekly check-in", "Progress tracking"] },
    { name: "Elite", price: "1159MAD", desc: "Maximum accountability.", items: ["Everything in Transformation", "Direct coach support", "Program adjustments", "Priority check-ins"] }
  ];
  const reviews = [
    ["Omar R.", "Lost 9 kg in 12 weeks. The plan was simple, clear and actually sustainable.", "5.0"],
    ["Sara B.", "I finally understand how to train and eat for my goal. Amazing coaching.", "5.0"],
    ["Walid R.", "The weekly dashboard keeps me accountable every single day.", "5.0"]
  ];
  return <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <section className="hero">
      <div className="hero-glow one" /><div className="hero-glow two" />
      <div className="container hero-grid">
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: .7 }}>
          <div className="eyebrow"><span className="pulse" /> PERSONAL COACHING • BUILT FOR RESULTS</div>
          <h1>Build the body.<br /><span>Build the life.</span></h1>
          <p className="hero-copy">Personalized training, nutrition and accountability — designed around your life, your body and your goals.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={() => go("login")}>Start your journey <ArrowRight size={18} /></button><a className="video-link" href="#about"><span className="play"><Play size={14} fill="currentColor" /></span> Discover coaching</a></div>
          <div className="trust"><div className="avatars"><span>A</span><span>S</span><span>Y</span><span>+</span></div><div><strong>50+ clients</strong><small>already transforming</small></div></div>
        </motion.div>
        <motion.div className="hero-card-wrap" initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .8, delay: .15 }}>
          <div className="hero-card">
            <div className="hero-card-top"><span>YOUR NEXT LEVEL</span><span className="live-dot">● LIVE</span></div>
            <div className="hero-photo"><div className="photo-overlay"><div className="metric"></div></div></div>
            <div className="mini-stats"><div><b>12</b><span>Weeks</span></div><div><b>4.8</b><span>Rating</span></div><div><b>24/7</b><span>Support</span></div></div>
          </div>
        </motion.div>
      </div>
    </section>

    <section id="about" className="section about"><div className="container two-col">
      <Reveal><div className="section-label">01 — ABOUT THE COACH</div><h2>Coaching that fits <span>your life.</span></h2><p>I believe fitness should make your life better — not take it over. My coaching combines smart training, practical nutrition and real accountability to create results you can keep.</p><p>Every client gets a plan built around their current level, schedule, preferences and goal.</p><button className="text-btn">Meet your coach <ArrowRight size={17} /></button></Reveal>
      <Reveal delay={.15}><div className="about-card"><div className="about-icon"><Target /></div><h3>Personal. Measurable. Sustainable.</h3><div className="about-list"><span><Check />Individual training</span><span><Check />Personal nutrition</span><span><Check />Weekly accountability</span><span><Check />Progress adjustments</span></div></div></Reveal>
    </div></section>

    <section className="section dark-section"><div className="container"><Reveal><div className="section-label">02 — WHAT I DO</div><h2>Everything you need to <span>move forward.</span></h2></Reveal><div className="service-grid">
      {[["01", "TRAINING", "Structured workouts built for your goal, experience and available equipment.", Dumbbell], ["02", "NUTRITION", "Simple meal guidance and personalized plans you can actually follow.", Utensils], ["03", "ACCOUNTABILITY", "Regular check-ins, adjustments and direct support when you need it.", HeartPulse]].map(([n, t, d, I], i) => <Reveal delay={i * .1} key={n}><div className="service-card"><span>{n}</span><I /><h3>{t}</h3><p>{d}</p></div></Reveal>)}
    </div></div></section>

    <section id="packs" className="section"><div className="container"><Reveal><div className="section-label">03 — COACHING PACKS</div><h2>Choose your <span>commitment.</span></h2></Reveal><div className="pack-grid">{packs.map((p, i) => <Reveal delay={i * .1} key={p.name}><div className={"pack " + (p.popular ? "featured" : "")}>{p.popular && <div className="popular">MOST POPULAR</div>}<h3>{p.name}</h3><p>{p.desc}</p><div className="price">{p.price}<small>/ month</small></div><div className="pack-items">{p.items.map(x => <span key={x}><Check size={16} />{x}</span>)}</div><button className={p.popular ? "primary-btn" : "outline-dark"} onClick={() => go("login")}>Get started <ArrowRight size={16} /></button></div></Reveal>)}</div></div></section>

    <section id="reviews" className="section reviews"><div className="container"><Reveal><div className="section-label">04 — CLIENT RESULTS</div><h2>Real people. <span>Real change.</span></h2></Reveal><div className="review-grid">{reviews.map(([name, text, score], i) => <Reveal delay={i * .1} key={name}><div className="review"><div className="stars">{[1, 2, 3, 4, 5].map(x => <Star key={x} size={16} fill="currentColor" />)}</div><p>“{text}”</p><div className="reviewer"><div>{name[0]}</div><span><b>{name}</b><small>Verified client</small></span></div></div></Reveal>)}</div></div></section>
    <section className="cta"><div className="container cta-inner"><Reveal><div><div className="section-label">READY?</div><h2>Your next chapter starts <span>today.</span></h2></div><button className="primary-btn" onClick={() => go("login")}>Join the coaching <ArrowRight /></button></Reveal></div></section>
  </motion.main>
}

function Dashboard({ customer, program, go }) {
  const [selected, setSelected] = useState("Monday");
  const d = normalizeDay(program?.[selected]);
  const remaining = customer.endDate ? Math.max(0, Math.ceil((new Date(customer.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;
  const firstName = customer.name?.trim()?.split(" ")[0] || "there";
  return <motion.main className="page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
    <div className="container">
      <div className="dash-head"><div><div className="section-label">CLIENT DASHBOARD</div><h1>Good morning, <span>{firstName}.</span></h1><p>Stay consistent. Small actions, big results.</p></div><button className="outline-dark" onClick={() => go("profile")}><User size={17} /> My profile</button></div>
      <div className="dash-stats"><Stat icon={Target} label="Goal" value={customer.goal || "Not set"} /><Stat icon={Flame} label="Current weight" value={customer.weight ? `${customer.weight} kg` : "Not set"} /><Stat icon={Clock3} label="Plan remaining" value={remaining === null ? "—" : `${remaining} days`} /><Stat icon={ShieldCheck} label="Package" value={customer.package || "Not assigned"} /></div>
      <div className="dashboard-grid">
        <section className="panel week-panel"><div className="panel-title"><div><span className="section-label">THIS WEEK</span><h2>Your program</h2></div><CalendarDays /></div><div className="day-tabs">{days.map(day => <button className={selected === day ? "active" : ""} onClick={() => setSelected(day)} key={day}>{day.slice(0, 3)}<small>{day}</small></button>)}</div><AnimatePresence mode="wait"><motion.div key={selected} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="program-content"><div className="program-heading"><div className="day-icon"><Dumbbell /></div><div><small>{selected}</small><h3>{d.workout}</h3></div></div><h4>Workout</h4>{d.exercises.map((x, i) => <div className="exercise" key={x}><span>{String(i + 1).padStart(2, "0")}</span><b>{x}</b><Check size={16} /></div>)}<h4>Meals</h4><div className="meal-list">{d.meals.map(x => <div key={x}><Utensils size={16} /><span>{x}</span></div>)}</div></motion.div></AnimatePresence></section>
        <aside className="panel coach-note"><div className="coach-avatar">C</div><div className="section-label">COACH NOTE</div><h3>Consistency beats perfection.</h3><p>Focus on completing today's plan. If something doesn't feel right, message your coach and we'll adjust it.</p><div className="note-line"><Check /> Personalized for you</div><div className="note-line"><Check /> Weekly adjustments</div></aside>
      </div>
    </div>
  </motion.main>
}

function Stat({ icon: Icon, label, value }) { return <div className="stat-card"><div className="stat-icon"><Icon size={18} /></div><small>{label}</small><b>{value}</b></div> }

function Profile({ customer, setCustomer, notify }) {
  const [form, setForm] = useState(customer);
  const save = async () => {
    try {
      const uid = auth?.currentUser?.uid;
      const normalized = { ...form, id: uid || form.id, email: auth?.currentUser?.email || form.email || "" };
      if (firebaseConfigured && uid && db) await set(ref(db, `users/${uid}`), normalized);
      setCustomer(normalized);
      notify("Profile updated and saved to Firebase.");
    } catch (e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this save. Check Firestore Rules." : "Could not save profile.");
    }
  };
  const fields = [["name", "Full name"], ["email", "Email"], ["age", "Age"], ["gender", "Gender"], ["height", "Height (cm)"], ["weight", "Weight (kg)"], ["goal", "Main goal"], ["phone", "Phone"], ["allergies", "Allergies"], ["health", "Health / medical notes"]];
  return <motion.main className="page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}><div className="container narrow"><div className="page-heading"><div className="section-label">MY PROFILE</div><h1>Your personal <span>information.</span></h1><p>Keep your information accurate so your coach can personalize your plan.</p></div><div className="profile-card">{fields.map(([key, label]) => <label key={key}>{label}<input value={form[key] ?? ""} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<button className="primary-btn" onClick={save}><Save size={17} /> Save changes</button></div></div></motion.main>
}

function Admin({ customers, setCustomers, program, setProgram, notify }) {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("customers");
  const [adminLoading, setAdminLoading] = useState(firebaseConfigured);
  const [programLoading, setProgramLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [programSaving, setProgramSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Firebase is the source of truth for the coach dashboard. We listen to the
  // users collection so new customer profiles appear automatically.
  useEffect(() => {
    if (!firebaseConfigured || !db || !auth?.currentUser) {
      setAdminLoading(false);
      if (!selected && customers[0]) setSelected(customers[0].id);
      return;
    }

    setAdminLoading(true);
    const usersRef = ref(db, "users");
    const unsubscribe = onValue(usersRef, (snap) => {
      const raw = snap.val() || {};
      const list = Object.entries(raw)
        .map(([id, data]) => ({ ...emptyCustomer, ...(data || {}), id }))
        .filter(c => c.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase())
        .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));

      setCustomers(list);
      setSelected(current => {
        if (current && list.some(c => c.id === current)) return current;
        return list[0]?.id || null;
      });
      setAdminLoading(false);
    }, (e) => {
      console.error("Could not load customers", e);
      setCustomers([]);
      setSelected(null);
      setAdminLoading(false);
      notify(e?.code === "PERMISSION_DENIED"
        ? "Admin access denied: publish the corrected Realtime Database Rules and use the exact admin email."
        : "Could not load customers from Firebase. Check the Realtime Database URL.");
    });

    return () => unsubscribe();
  }, []);

  const selectedCustomer = customers.find(x => x.id === selected) || null;

  // Every time the coach chooses a customer, load THAT customer's program.
  useEffect(() => {
    if (!firebaseConfigured || !db || !selectedCustomer?.id) {
      setProgram(firebaseConfigured ? emptyProgram : demoProgram);
      return;
    }

    setProgramLoading(true);
    const unsubscribe = onValue(ref(db, `programs/${selectedCustomer.id}`), (snap) => {
      const data = snap.val();
      setProgram(normalizeProgram(data));
      setProgramLoading(false);
    }, (e) => {
      console.error("Could not load customer program", e);
      setProgram(emptyProgram);
      setProgramLoading(false);
      notify(e?.code === "permission-denied"
        ? "Firebase denied program access. Publish the Realtime Database Rules."
        : "Could not load this customer's program.");
    });
    return () => unsubscribe();
  }, [selectedCustomer?.id]);

  const filteredCustomers = customers.filter(c => {
    const q = search.trim().toLowerCase();
    return !q || [c.name, c.email, c.goal, c.package].some(v => String(v || "").toLowerCase().includes(q));
  });

  const update = (key, val) => setCustomers(prev => prev.map(c => c.id === selected ? { ...c, [key]: val } : c));

  const saveCustomer = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      if (firebaseConfigured && db) {
        await set(ref(db, `users/${selectedCustomer.id}`), selectedCustomer);
      } else {
        setCustomers(prev => prev.map(c => c.id === selected ? selectedCustomer : c));
      }
      notify("Customer information saved to Firebase.");
    } catch (e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this save. Check Firestore Rules." : "Could not save customer.");
    } finally { setSaving(false); }
  };

  const add = () => {
    notify("Have the customer create their account with Sign Up first. They will then appear here automatically.");
    setTab("customers");
  };

  const updateProgram = (day, key, val) => {
    setProgram(prev => ({ ...prev, [day]: { ...(prev[day] || {}), [key]: val } }));
  };

  const saveProgram = async () => {
    if (!selectedCustomer?.id) {
      notify("Select a customer first.");
      return;
    }
    setProgramSaving(true);
    try {
      if (firebaseConfigured && db) {
        await set(ref(db, `programs/${selectedCustomer.id}`), program);
      }
      notify(`Program saved for ${selectedCustomer.name || selectedCustomer.email}.`);
    } catch (e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this save. Check Firestore Rules." : "Could not save the program to Firebase.");
    } finally { setProgramSaving(false); }
  };

  return <motion.main className="page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><div className="container">
    <div className="admin-head"><div><div className="section-label">COACH CONTROL CENTER</div><h1>Admin <span>dashboard.</span></h1><p>Every customer is loaded from Firebase. Select one client and manage only their personal program.</p></div><button className="primary-btn" onClick={add}><Plus size={17} /> Add customer</button></div>
    <div className="admin-tabs"><button className={tab === "customers" ? "active" : ""} onClick={() => setTab("customers")}><Users /> Customers <span className="tab-count">{customers.length}</span></button><button className={tab === "program" ? "active" : ""} onClick={() => setTab("program")}><Dumbbell /> Weekly program</button></div>
    {adminLoading ? <div className="panel loading-panel"><div className="spinner" /><h3>Loading customers…</h3><p>Getting all customer profiles from Firebase.</p></div> : tab === "customers" ? <div className="admin-grid">
      <div className="customer-list">
        <div className="customer-list-top"><input className="customer-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" /><span>{filteredCustomers.length}</span></div>
        {filteredCustomers.length === 0 ? <div className="empty-state">No customer accounts found.<br />Ask the customer to Sign Up first.</div> : filteredCustomers.map(c => <button className={selected === c.id ? "selected" : ""} key={c.id} onClick={() => setSelected(c.id)}><span className="customer-avatar">{(c.name || c.email || "C")[0]}</span><span><b>{c.name || "Unnamed customer"}</b><small>{c.email}</small></span><ChevronDown size={15} /></button>)}
      </div>
      {selectedCustomer && <div className="admin-editor panel"><div className="editor-title"><div><div className="section-label">CLIENT</div><h2>{selectedCustomer.name || "Customer"}</h2><small>{selectedCustomer.email}</small></div><span className="status">{selectedCustomer.endDate && new Date(selectedCustomer.endDate) < new Date() ? "EXPIRED" : "ACTIVE"}</span></div><div className="editor-grid">{[["name", "Name"], ["email", "Email"], ["age", "Age"], ["gender", "Gender"], ["height", "Height"], ["weight", "Weight"], ["goal", "Goal"], ["phone", "Phone"], ["allergies", "Allergies"], ["health", "Health notes"], ["package", "Package"], ["startDate", "Start date"], ["endDate", "Validity end date"]].map(([key, label]) => <label key={key}>{label}<input value={selectedCustomer[key] ?? ""} onChange={e => update(key, e.target.value)} /></label>)}</div><button className="primary-btn" onClick={saveCustomer} disabled={saving}><Save size={17} /> {saving ? "Saving…" : "Save customer"}</button></div>}
    </div> :
      <div className="panel program-admin">
        <div className="section-label">PROGRAM BUILDER</div><h2>Monday → Sunday</h2>{selectedCustomer ? <p className="program-client">Program for <b>{selectedCustomer.name || selectedCustomer.email}</b></p> : <p className="program-client">Select a customer from the Customers tab first.</p>}
        {programLoading ? <div className="loading-panel compact"><div className="spinner" /><h3>Loading this customer's program…</h3></div> : <div className="admin-day-list">{days.map(day => {
          const dayData = program[day] || { workout: "", exercises: [], meals: [] };
          const exercises = dayData.exercises || [];
          const meals = dayData.meals || [];
          const setListItem = (key, index, value) => {
            const list = [...(program[day]?.[key] || [])];
            list[index] = value;
            updateProgram(day, key, list);
          };
          const addListItem = (key) => updateProgram(day, key, [...(program[day]?.[key] || []), ""]);
          const removeListItem = (key, index) => updateProgram(day, key, (program[day]?.[key] || []).filter((_, i) => i !== index));
          return <div className="day-editor" key={day}>
            <div className="day-title"><b>{day}</b><span>{dayData.workout || "Rest / no workout"}</span></div>
            <label>Workout title<input value={dayData.workout || ""} onChange={e => updateProgram(day, "workout", e.target.value)} placeholder="e.g. Upper body strength" /></label>
            <div className="program-field-group"><div className="field-group-head"><span>Exercise descriptions</span><button type="button" className="mini-add" onClick={() => addListItem("exercises")}><i class="fa-regular fa-square-plus"></i> Add exercise</button></div>
              {exercises.length === 0 && <div className="field-empty">No exercises added yet.</div>}
              {exercises.map((x, i) => <div className="repeat-row" key={`ex-${i}`}><input value={x} onChange={e => setListItem("exercises", i, e.target.value)} placeholder={`Exercise ${i + 1} — description, sets, reps, rest, notes…`} rows="2" /><button type="button" className="remove-item" onClick={() => removeListItem("exercises", i)} aria-label="Remove exercise"><i class="fa-solid fa-trash-can"></i></button></div>)}
            </div>
            <div className="program-field-group"><div className="field-group-head"><span>Meals</span><button type="button" className="mini-add" onClick={() => addListItem("meals")}><i class="fa-regular fa-square-plus"></i> Add meal</button></div>
              {meals.length === 0 && <div className="field-empty">No meals added yet.</div>}
              {meals.map((x, i) => <div className="repeat-row" key={`meal-${i}`}><input value={x} onChange={e => setListItem("meals", i, e.target.value)} placeholder={`Meal ${i + 1} — e.g. Breakfast: eggs, oats, fruit`} /><button type="button" className="remove-item" onClick={() => removeListItem("meals", i)} aria-label="Remove meal"><i class="fa-solid fa-trash-can"></i></button></div>)}
            </div>
          </div>;
        })}</div>}
        <button className="primary-btn" onClick={saveProgram} disabled={programSaving || programLoading || !selectedCustomer}><Save size={17} /> {programSaving ? "Saving…" : "Save program for this customer"}</button>
      </div>}
  </div></motion.main>
}

function Auth({ mode, onSubmit, onGoogle, onReset, switchMode }) {
  const [form, setForm] = useState({ email: "", password: "", name: "", age: "", gender: "", height: "", weight: "", goal: "" }); const [show, setShow] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });
  return <motion.main className="auth-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="auth-box">
    <div className="brand static"><span>COACH<span className="accent">WOLF</span></span></div>
    <div className="section-label">{mode === "login" ? "WELCOME BACK" : "START YOUR JOURNEY"}</div><h1>{mode === "login" ? "Sign in to your" : "Create your"} <span>account.</span></h1>
    <p>{mode === "login" ? "Access your personalized coaching dashboard." : "Tell us a little about yourself to get started."}</p>
    {mode === "signup" && <><label>Full name<input autoComplete="name" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" /></label>
      <div className="form-row"><label>Age<input inputMode="numeric" value={form.age} onChange={e => set("age", e.target.value)} /></label><label>Height<input inputMode="numeric" value={form.height} onChange={e => set("height", e.target.value)} /></label><label>Weight<input inputMode="decimal" value={form.weight} onChange={e => set("weight", e.target.value)} /></label></div>
      <label>Gender<select value={form.gender} onChange={e => set("gender", e.target.value)}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></label>
      <label>Main goal<input value={form.goal} onChange={e => set("goal", e.target.value)} placeholder="e.g. Fat loss" /></label></>}
    <label>Email<input type="email" autoComplete="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" /></label>
    <label>Password<div className="password-wrap"><input type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={e => set("password", e.target.value)} placeholder="At least 6 characters" /><button type="button" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div></label>
    <button className="primary-btn full" onClick={() => onSubmit(form)}>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17} /></button>
    {mode === "login" && <><button className="forgot-btn" onClick={() => onReset(form.email)}>Forgot password?</button></>}
    <p className="switch">{mode === "login" ? "Don't have an account?" : "Already have an account?"} <button onClick={switchMode}>{mode === "login" ? "Sign up" : "Sign in"}</button></p>

  </div></motion.main>;
}
function AuthOverlay({ mode, close, onSubmit, onGoogle, onReset, switchMode }) { return <div className="overlay"><button className="overlay-close" onClick={close}><X /></button><Auth mode={mode} onSubmit={onSubmit} onGoogle={onGoogle} onReset={onReset} switchMode={switchMode} /></div>; }
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
        </div>
      </div>
  </div></footer> }

export default App;

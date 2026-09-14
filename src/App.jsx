import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, ChevronDown, Dumbbell, Flame, HeartPulse, Instagram,
  LayoutDashboard, LogIn, LogOut, Menu, Play, Plus, ShieldCheck, Star,
  Target, User, Users, Utensils, X, CalendarDays, Clock3, Save
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, firebaseConfigured, loginEmail, registerEmail, loginGoogle, logoutFirebase, resetPassword } from "./lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot } from "firebase/firestore";
import { demoCustomer, demoCustomers, demoProgram } from "./data/demo";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@coachflow.demo";
const days = Object.keys(demoProgram);
const emptyProgram = Object.fromEntries(days.map(day => [day, { workout: "", exercises: [], meals: [] }]));

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
  const [customers, setCustomers] = useLocalState("coachflow_customers", demoCustomers);
  const [program, setProgram] = useState(demoProgram);
  const [authMode, setAuthMode] = useState(null);
  const [toast, setToast] = useState("");

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const go = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadFirebaseUser = async (u) => {
    if (!u || !db) return;
    const profileRef = doc(db, "users", u.uid);
    const programRef = doc(db, "programs", u.uid);
    const [profileSnap, programSnap] = await Promise.all([
      getDoc(profileRef),
      getDoc(programRef)
    ]);

    let profile;
    if (profileSnap.exists()) {
      profile = { ...emptyCustomer, ...profileSnap.data(), id: u.uid, email: u.email || profileSnap.data().email || "" };
    } else {
      profile = { ...emptyCustomer, id: u.uid, email: u.email || "" };
      await setDoc(profileRef, profile, { merge: true });
    }

    setCustomer(profile);
    setProgram(programSnap.exists() ? { ...emptyProgram, ...programSnap.data() } : emptyProgram);
  };

  useEffect(() => {
    if (!firebaseConfigured || !auth) return;
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!active) return;
      setUser(u);
      setAuthReady(true);

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
          await loadFirebaseUser(u);
          setPage((current) => ["login", "home"].includes(current) ? "dashboard" : current);
        }
      } catch (e) {
        console.error("Could not load Firebase user data", e);
        notify("Signed in, but your profile could not be loaded. Check Firestore rules.");
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

        setUser(u);
        setAuthReady(true);

        // Route immediately after Firebase authentication succeeds.
        // Firestore loading happens after the screen is already shown.
        if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setAuthMode(null);
          go("admin");
          notify("Welcome, Coach.");
          return;
        }

        const profileRef = doc(db, "users", u.uid);
        const programRef = doc(db, "programs", u.uid);

        // Show the correct user's dashboard immediately instead of waiting
        // for Firestore. This prevents a successful login from appearing stuck.
        setCustomer(prev => ({ ...emptyCustomer, ...prev, id: u.uid, email: u.email || email }));
        setAuthMode(null);
        go("dashboard");

        const existing = await getDoc(profileRef);

        if (mode === "signup" || !existing.exists()) {
          const profile = {
            ...emptyCustomer,
            id: u.uid,
            name: form.name || "",
            email: u.email || email,
            age: Number(form.age || 0),
            height: Number(form.height || 0),
            weight: Number(form.weight || 0),
            goal: form.goal || ""
          };
          await setDoc(profileRef, profile, { merge: true });
          setCustomer(profile);
        } else {
          setCustomer({ ...emptyCustomer, ...existing.data(), id: u.uid, email: u.email || existing.data().email || email });
        }

        const programSnap = await getDoc(programRef);
        setProgram(programSnap.exists() ? { ...emptyProgram, ...programSnap.data() } : emptyProgram);

        notify(mode === "signup" ? "Account created successfully." : "Welcome back.");
        return;
      }

      // Demo mode only when Firebase is not configured.
      if (mode === "login" && email === ADMIN_EMAIL.toLowerCase() && form.password === "admin123") {
        setAuthMode(null);
        go("admin");
        notify("Welcome, Coach.");
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
      console.error(e);
      const msg = e?.code === "auth/invalid-credential" ? "Incorrect email or password."
        : e?.code === "auth/email-already-in-use" ? "This email is already registered. Try signing in."
        : e?.code === "auth/weak-password" ? "Password must be at least 6 characters."
        : e?.code === "auth/invalid-email" ? "Please enter a valid email address."
        : e?.code === "permission-denied" ? "Firebase blocked this request. Check Firestore Rules."
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
      setUser(u);
      setAuthReady(true);

      if (u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAuthMode(null);
        go("admin");
        notify("Welcome, Coach.");
        return;
      }

      await loadFirebaseUser(u);
      setAuthMode(null);
      go("dashboard");
      notify("Signed in with Google.");
    } catch (e) {
      notify(e?.code === "auth/popup-closed-by-user" ? "Google sign-in was cancelled." : e?.message || "Google sign-in failed.");
    }
  }

  async function handleReset(email) {
    try {
      if (!firebaseConfigured) throw new Error("Password reset requires Firebase.");
      if (!email?.trim()) throw new Error("Enter your email first.");
      await resetPassword(email.trim().toLowerCase());
      notify("Password reset email sent.");
    } catch(e) {
      notify(e?.code === "auth/user-not-found" ? "No account found for this email." : e?.message || "Could not send reset email.");
    }
  }

  if (!authReady) {
    return <div className="app auth-loading"><div className="loading-card"><div className="brand static"><span className="brand-mark">C</span><span>COACH<span className="accent">FLOW</span></span></div><div className="spinner"/><p>Checking your account…</p></div></div>;
  }

  return (
    <div className="app">
      <Nav page={page} go={go} isCustomer={isCustomer} isAdmin={isAdmin} logout={handleLogout} />
      <AnimatePresence mode="wait">
        {page === "home" && <Home key="home" go={go} />}
        {page === "dashboard" && isCustomer && <Dashboard key="dashboard" customer={customer} program={program} go={go} />}
        {page === "profile" && isCustomer && <Profile key="profile" customer={customer} setCustomer={setCustomer} notify={notify} />}
        {page === "admin" && isAdmin && <Admin key="admin" customers={customers} setCustomers={setCustomers} program={program} setProgram={setProgram} notify={notify} />}
        {page === "login" && <Auth key="login" mode="login" onSubmit={(f)=>handleAuth("login", f)} onGoogle={handleGoogle} onReset={handleReset} switchMode={()=>setAuthMode("signup")} />}
      </AnimatePresence>
      <AnimatePresence>
        {authMode && <AuthOverlay mode={authMode} close={()=>setAuthMode(null)} onSubmit={(f)=>handleAuth(authMode, f)} onGoogle={handleGoogle} onReset={handleReset} switchMode={()=>setAuthMode(authMode==="login"?"signup":"login")} />}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast}/>}</AnimatePresence>
      <Footer />
    </div>
  );
}

function Nav({page,go,isCustomer,isAdmin,logout}) {
  const [open,setOpen]=useState(false); const close=()=>setOpen(false);
  const section=(id)=>{close(); if(page!=="home"){go("home");setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"}),100);}else document.getElementById(id)?.scrollIntoView({behavior:"smooth"});};
  return <header className="nav"><div className="nav-inner">
    <button className="brand" onClick={()=>{close();go("home")}}><span className="brand-mark">C</span><span>COACH<span className="accent">FLOW</span></span></button>
    <button className="mobile-menu" aria-label="Toggle menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
    <nav className={open?"nav-links open":"nav-links"}>
      <button onClick={()=>{close();go("home")}}>Home</button><button onClick={()=>section("about")}>About</button><button onClick={()=>section("packs")}>Packs</button><button onClick={()=>section("reviews")}>Reviews</button>
      {isCustomer&&<button onClick={()=>{close();go("dashboard")}}>Dashboard</button>}{isAdmin&&<button onClick={()=>{close();go("admin")}}>Admin</button>}
      {isCustomer||isAdmin?<button className="outline-btn" onClick={()=>{close();logout()}}><LogOut size={15}/> Logout</button>:<button className="primary-btn small" onClick={()=>{close();go("login")}}><LogIn size={15}/> Login</button>}
    </nav>
  </div></header>;
}
function Home({go}) {
  const packs = [
    {name:"Starter", price:"€49", desc:"Build the foundation.", items:["Personal assessment","Weekly training plan","Nutrition basics"]},
    {name:"Transformation", price:"€99", desc:"Your complete transformation.", popular:true, items:["Everything in Starter","Personal meal plan","Weekly check-in","Progress tracking"]},
    {name:"Elite", price:"€159", desc:"Maximum accountability.", items:["Everything in Transformation","Direct coach support","Program adjustments","Priority check-ins"]}
  ];
  const reviews = [
    ["Amine R.","Lost 9 kg in 12 weeks. The plan was simple, clear and actually sustainable.","5.0"],
    ["Sara B.","I finally understand how to train and eat for my goal. Amazing coaching.","5.0"],
    ["Youssef K.","The weekly dashboard keeps me accountable every single day.","5.0"]
  ];
  return <motion.main initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
    <section className="hero">
      <div className="hero-glow one"/><div className="hero-glow two"/>
      <div className="container hero-grid">
        <motion.div initial={{x:-40,opacity:0}} animate={{x:0,opacity:1}} transition={{duration:.7}}>
          <div className="eyebrow"><span className="pulse"/> PERSONAL COACHING • BUILT FOR RESULTS</div>
          <h1>Build the body.<br/><span>Build the life.</span></h1>
          <p className="hero-copy">Personalized training, nutrition and accountability — designed around your life, your body and your goals.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={()=>go("login")}>Start your journey <ArrowRight size={18}/></button><a className="video-link" href="#about"><span className="play"><Play size={14} fill="currentColor"/></span> Discover coaching</a></div>
          <div className="trust"><div className="avatars"><span>A</span><span>S</span><span>Y</span><span>+</span></div><div><strong>500+ clients</strong><small>already transforming</small></div></div>
        </motion.div>
        <motion.div className="hero-card-wrap" initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:.8,delay:.15}}>
          <div className="hero-card">
            <div className="hero-card-top"><span>YOUR NEXT LEVEL</span><span className="live-dot">● LIVE</span></div>
            <div className="hero-photo"><div className="photo-overlay"><div className="metric"><span>Progress</span><b>+84%</b></div><div className="progress"><i style={{width:"84%"}}/></div></div></div>
            <div className="mini-stats"><div><b>12</b><span>Weeks</span></div><div><b>4.8</b><span>Rating</span></div><div><b>24/7</b><span>Support</span></div></div>
          </div>
        </motion.div>
      </div>
    </section>

    <section id="about" className="section about"><div className="container two-col">
      <Reveal><div className="section-label">01 — ABOUT THE COACH</div><h2>Coaching that fits <span>your life.</span></h2><p>I believe fitness should make your life better — not take it over. My coaching combines smart training, practical nutrition and real accountability to create results you can keep.</p><p>Every client gets a plan built around their current level, schedule, preferences and goal.</p><button className="text-btn">Meet your coach <ArrowRight size={17}/></button></Reveal>
      <Reveal delay={.15}><div className="about-card"><div className="about-icon"><Target/></div><h3>Personal. Measurable. Sustainable.</h3><div className="about-list"><span><Check/>Individual training</span><span><Check/>Personal nutrition</span><span><Check/>Weekly accountability</span><span><Check/>Progress adjustments</span></div></div></Reveal>
    </div></section>

    <section className="section dark-section"><div className="container"><Reveal><div className="section-label">02 — WHAT I DO</div><h2>Everything you need to <span>move forward.</span></h2></Reveal><div className="service-grid">
      {[["01","TRAINING","Structured workouts built for your goal, experience and available equipment.",Dumbbell],["02","NUTRITION","Simple meal guidance and personalized plans you can actually follow.",Utensils],["03","ACCOUNTABILITY","Regular check-ins, adjustments and direct support when you need it.",HeartPulse]].map(([n,t,d,I],i)=><Reveal delay={i*.1} key={n}><div className="service-card"><span>{n}</span><I/><h3>{t}</h3><p>{d}</p></div></Reveal>)}
    </div></div></section>

    <section id="packs" className="section"><div className="container"><Reveal><div className="section-label">03 — COACHING PACKS</div><h2>Choose your <span>commitment.</span></h2></Reveal><div className="pack-grid">{packs.map((p,i)=><Reveal delay={i*.1} key={p.name}><div className={"pack "+(p.popular?"featured":"")}>{p.popular&&<div className="popular">MOST POPULAR</div>}<h3>{p.name}</h3><p>{p.desc}</p><div className="price">{p.price}<small>/ month</small></div><div className="pack-items">{p.items.map(x=><span key={x}><Check size={16}/>{x}</span>)}</div><button className={p.popular?"primary-btn":"outline-dark"} onClick={()=>go("login")}>Get started <ArrowRight size={16}/></button></div></Reveal>)}</div></div></section>

    <section id="reviews" className="section reviews"><div className="container"><Reveal><div className="section-label">04 — CLIENT RESULTS</div><h2>Real people. <span>Real change.</span></h2></Reveal><div className="review-grid">{reviews.map(([name,text,score],i)=><Reveal delay={i*.1} key={name}><div className="review"><div className="stars">{[1,2,3,4,5].map(x=><Star key={x} size={16} fill="currentColor"/>)}</div><p>“{text}”</p><div className="reviewer"><div>{name[0]}</div><span><b>{name}</b><small>Verified client</small></span></div></div></Reveal>)}</div></div></section>
    <section className="cta"><div className="container cta-inner"><Reveal><div><div className="section-label">READY?</div><h2>Your next chapter starts <span>today.</span></h2></div><button className="primary-btn" onClick={()=>go("login")}>Join the coaching <ArrowRight/></button></Reveal></div></section>
  </motion.main>
}

function Dashboard({customer, program, go}) {
  const [selected, setSelected] = useState("Monday");
  const d = program?.[selected] || demoProgram[selected];
  const remaining = customer.endDate ? Math.max(0, Math.ceil((new Date(customer.endDate)-new Date())/(1000*60*60*24))) : null;
  const firstName = customer.name?.trim()?.split(" ")[0] || "there";
  return <motion.main className="page" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
    <div className="container">
      <div className="dash-head"><div><div className="section-label">CLIENT DASHBOARD</div><h1>Good morning, <span>{firstName}.</span></h1><p>Stay consistent. Small actions, big results.</p></div><button className="outline-dark" onClick={()=>go("profile")}><User size={17}/> My profile</button></div>
      <div className="dash-stats"><Stat icon={Target} label="Goal" value={customer.goal || "Not set"}/><Stat icon={Flame} label="Current weight" value={customer.weight ? `${customer.weight} kg` : "Not set"}/><Stat icon={Clock3} label="Plan remaining" value={remaining === null ? "—" : `${remaining} days`}/><Stat icon={ShieldCheck} label="Package" value={customer.package || "Not assigned"}/></div>
      <div className="dashboard-grid">
        <section className="panel week-panel"><div className="panel-title"><div><span className="section-label">THIS WEEK</span><h2>Your program</h2></div><CalendarDays/></div><div className="day-tabs">{days.map(day=><button className={selected===day?"active":""} onClick={()=>setSelected(day)} key={day}>{day.slice(0,3)}<small>{day}</small></button>)}</div><AnimatePresence mode="wait"><motion.div key={selected} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} className="program-content"><div className="program-heading"><div className="day-icon"><Dumbbell/></div><div><small>{selected}</small><h3>{d.workout}</h3></div></div><h4>Workout</h4>{d.exercises.map((x,i)=><div className="exercise" key={x}><span>{String(i+1).padStart(2,"0")}</span><b>{x}</b><Check size={16}/></div>)}<h4>Meals</h4><div className="meal-list">{d.meals.map(x=><div key={x}><Utensils size={16}/><span>{x}</span></div>)}</div></motion.div></AnimatePresence></section>
        <aside className="panel coach-note"><div className="coach-avatar">C</div><div className="section-label">COACH NOTE</div><h3>Consistency beats perfection.</h3><p>Focus on completing today's plan. If something doesn't feel right, message your coach and we'll adjust it.</p><div className="note-line"><Check/> Personalized for you</div><div className="note-line"><Check/> Weekly adjustments</div></aside>
      </div>
    </div>
  </motion.main>
}

function Stat({icon:Icon,label,value}) { return <div className="stat-card"><div className="stat-icon"><Icon size={18}/></div><small>{label}</small><b>{value}</b></div> }

function Profile({customer,setCustomer,notify}) {
  const [form,setForm]=useState(customer);
  const save=async()=>{setCustomer(form); if(firebaseConfigured && auth?.currentUser && db) await setDoc(doc(db,"users",auth.currentUser.uid),form,{merge:true}); notify("Profile updated.");};
  const fields=[["name","Full name"],["email","Email"],["age","Age"],["gender","Gender"],["height","Height (cm)"],["weight","Weight (kg)"],["goal","Main goal"],["phone","Phone"],["allergies","Allergies"],["health","Health / medical notes"]];
  return <motion.main className="page" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}><div className="container narrow"><div className="page-heading"><div className="section-label">MY PROFILE</div><h1>Your personal <span>information.</span></h1><p>Keep your information accurate so your coach can personalize your plan.</p></div><div className="profile-card">{fields.map(([key,label])=><label key={key}>{label}<input value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}<button className="primary-btn" onClick={save}><Save size={17}/> Save changes</button></div></div></motion.main>
}

function Admin({customers,setCustomers,program,setProgram,notify}) {
  const [selected,setSelected]=useState(null);
  const [tab,setTab]=useState("customers");
  const [adminLoading,setAdminLoading]=useState(firebaseConfigured);
  const [programLoading,setProgramLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [programSaving,setProgramSaving]=useState(false);
  const [search,setSearch]=useState("");

  // Firebase is the source of truth for the coach dashboard. We listen to the
  // users collection so new customer profiles appear automatically.
  useEffect(() => {
    if (!firebaseConfigured || !db || !auth?.currentUser) {
      setAdminLoading(false);
      if (!selected && customers[0]) setSelected(customers[0].id);
      return;
    }

    setAdminLoading(true);
    const unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs
        .map(d => ({ ...emptyCustomer, ...d.data(), id: d.id }))
        .filter(c => c.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase())
        .sort((a,b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));

      setCustomers(list);
      setSelected(current => {
        if (current && list.some(c => c.id === current)) return current;
        return list[0]?.id || null;
      });
      setAdminLoading(false);
    }, (e) => {
      console.error("Could not load customers", e);
      setAdminLoading(false);
      notify(e?.code === "permission-denied"
        ? "Firebase denied customer access. Publish the Admin Firestore rules."
        : "Could not load customers from Firebase.");
    });

    return () => unsubscribe();
  }, []);

  const selectedCustomer=customers.find(x=>x.id===selected)||null;

  // Every time the coach chooses a customer, load THAT customer's program.
  useEffect(() => {
    if (!firebaseConfigured || !db || !selectedCustomer?.id) {
      setProgram(firebaseConfigured ? emptyProgram : demoProgram);
      return;
    }

    setProgramLoading(true);
    const unsubscribe=onSnapshot(doc(db,"programs",selectedCustomer.id), (snap) => {
      setProgram(snap.exists() ? { ...emptyProgram, ...snap.data() } : emptyProgram);
      setProgramLoading(false);
    }, (e) => {
      console.error("Could not load customer program", e);
      setProgram(emptyProgram);
      setProgramLoading(false);
      notify(e?.code === "permission-denied"
        ? "Firebase denied program access. Publish the Admin Firestore rules."
        : "Could not load this customer's program.");
    });
    return () => unsubscribe();
  }, [selectedCustomer?.id]);

  const filteredCustomers=customers.filter(c => {
    const q=search.trim().toLowerCase();
    return !q || [c.name,c.email,c.goal,c.package].some(v => String(v||"").toLowerCase().includes(q));
  });

  const update=(key,val)=>setCustomers(prev=>prev.map(c=>c.id===selected?{...c,[key]:val}:c));

  const saveCustomer=async()=>{
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      if (firebaseConfigured && db) {
        await setDoc(doc(db,"users",selectedCustomer.id), selectedCustomer, { merge:true });
      } else {
        setCustomers(prev=>prev.map(c=>c.id===selected?selectedCustomer:c));
      }
      notify("Customer information saved to Firebase.");
    } catch(e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this save. Check Firestore Rules." : "Could not save customer.");
    } finally { setSaving(false); }
  };

  const add=()=>{
    notify("Have the customer create their account with Sign Up first. They will then appear here automatically.");
    setTab("customers");
  };

  const updateProgram=(day,key,val)=>{
    setProgram(prev=>({ ...prev, [day]:{ ...(prev[day]||{}), [key]:val } }));
  };

  const saveProgram=async()=>{
    if (!selectedCustomer?.id) {
      notify("Select a customer first.");
      return;
    }
    setProgramSaving(true);
    try {
      if (firebaseConfigured && db) {
        await setDoc(doc(db,"programs",selectedCustomer.id), program, { merge:false });
      }
      notify(`Program saved for ${selectedCustomer.name || selectedCustomer.email}.`);
    } catch(e) {
      console.error(e);
      notify(e?.code === "permission-denied" ? "Firebase blocked this save. Check Firestore Rules." : "Could not save the program to Firebase.");
    } finally { setProgramSaving(false); }
  };

  return <motion.main className="page" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0}}><div className="container">
    <div className="admin-head"><div><div className="section-label">COACH CONTROL CENTER</div><h1>Admin <span>dashboard.</span></h1><p>Every customer is loaded from Firebase. Select one client and manage only their personal program.</p></div><button className="primary-btn" onClick={add}><Plus size={17}/> Add customer</button></div>
    <div className="admin-tabs"><button className={tab==="customers"?"active":""} onClick={()=>setTab("customers")}><Users/> Customers <span className="tab-count">{customers.length}</span></button><button className={tab==="program"?"active":""} onClick={()=>setTab("program")}><Dumbbell/> Weekly program</button></div>
    {adminLoading ? <div className="panel loading-panel"><div className="spinner"/><h3>Loading customers…</h3><p>Getting all customer profiles from Firebase.</p></div> : tab==="customers" ? <div className="admin-grid">
      <div className="customer-list">
        <div className="customer-list-top"><input className="customer-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customers…"/><span>{filteredCustomers.length}</span></div>
        {filteredCustomers.length===0?<div className="empty-state">No customer accounts found.<br/>Ask the customer to Sign Up first.</div>:filteredCustomers.map(c=><button className={selected===c.id?"selected":""} key={c.id} onClick={()=>setSelected(c.id)}><span className="customer-avatar">{(c.name||c.email||"C")[0]}</span><span><b>{c.name||"Unnamed customer"}</b><small>{c.email}</small></span><ChevronDown size={15}/></button>)}
      </div>
      {selectedCustomer&&<div className="admin-editor panel"><div className="editor-title"><div><div className="section-label">CLIENT</div><h2>{selectedCustomer.name||"Customer"}</h2><small>{selectedCustomer.email}</small></div><span className="status">{selectedCustomer.endDate && new Date(selectedCustomer.endDate)<new Date()?"EXPIRED":"ACTIVE"}</span></div><div className="editor-grid">{[["name","Name"],["email","Email"],["age","Age"],["gender","Gender"],["height","Height"],["weight","Weight"],["goal","Goal"],["phone","Phone"],["allergies","Allergies"],["health","Health notes"],["package","Package"],["startDate","Start date"],["endDate","Validity end date"]].map(([key,label])=><label key={key}>{label}<input value={selectedCustomer[key]??""} onChange={e=>update(key,e.target.value)}/></label>)}</div><button className="primary-btn" onClick={saveCustomer} disabled={saving}><Save size={17}/> {saving?"Saving…":"Save customer"}</button></div>}
    </div> :
    <div className="panel program-admin">
      <div className="section-label">PROGRAM BUILDER</div><h2>Monday → Sunday</h2>{selectedCustomer?<p className="program-client">Editing program for <b>{selectedCustomer.name||selectedCustomer.email}</b> · Firebase ID <code>{selectedCustomer.id}</code></p>:<p className="program-client">Select a customer from the Customers tab first.</p>}
      {programLoading ? <div className="loading-panel compact"><div className="spinner"/><h3>Loading this customer's program…</h3></div> : <div className="admin-day-list">{days.map(day=><div className="day-editor" key={day}><div className="day-title"><b>{day}</b><span>{program[day]?.workout || "Rest / no workout"}</span></div><label>Workout title<input value={program[day]?.workout||""} onChange={e=>updateProgram(day,"workout",e.target.value)}/></label><label>Exercises<input value={(program[day]?.exercises||[]).join(" | ")} onChange={e=>updateProgram(day,"exercises",e.target.value.split("|").map(x=>x.trim()).filter(Boolean))}/></label><label>Meals<input value={(program[day]?.meals||[]).join(" | ")} onChange={e=>updateProgram(day,"meals",e.target.value.split("|").map(x=>x.trim()).filter(Boolean))}/></label></div>)}</div>}
      <button className="primary-btn" onClick={saveProgram} disabled={programSaving || programLoading || !selectedCustomer}><Save size={17}/> {programSaving?"Saving…":"Save program for this customer"}</button>
    </div>}
  </div></motion.main>
}

function Auth({mode,onSubmit,onGoogle,onReset,switchMode}) {
 const [form,setForm]=useState({email:"",password:"",name:"",age:"",height:"",weight:"",goal:""}); const [show,setShow]=useState(false);
 const set=(k,v)=>setForm({...form,[k]:v});
 return <motion.main className="auth-page" initial={{opacity:0}} animate={{opacity:1}}><div className="auth-box">
  <div className="brand static"><span className="brand-mark">C</span><span>COACH<span className="accent">FLOW</span></span></div>
  <div className="section-label">{mode==="login"?"WELCOME BACK":"START YOUR JOURNEY"}</div><h1>{mode==="login"?"Sign in to your":"Create your"} <span>account.</span></h1>
  <p>{mode==="login"?"Access your personalized coaching dashboard.":"Tell us a little about yourself to get started."}</p>
  {mode==="signup"&&<><label>Full name<input autoComplete="name" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Your name"/></label>
  <div className="form-row"><label>Age<input inputMode="numeric" value={form.age} onChange={e=>set("age",e.target.value)}/></label><label>Height<input inputMode="numeric" value={form.height} onChange={e=>set("height",e.target.value)}/></label><label>Weight<input inputMode="decimal" value={form.weight} onChange={e=>set("weight",e.target.value)}/></label></div>
  <label>Main goal<input value={form.goal} onChange={e=>set("goal",e.target.value)} placeholder="e.g. Fat loss"/></label></>}
  <label>Email<input type="email" autoComplete="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="you@example.com"/></label>
  <label>Password<div className="password-wrap"><input type={show?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="At least 6 characters"/><button type="button" onClick={()=>setShow(!show)}>{show?"Hide":"Show"}</button></div></label>
  <button className="primary-btn full" onClick={()=>onSubmit(form)}>{mode==="login"?"Sign in":"Create account"} <ArrowRight size={17}/></button>
  {mode==="login"&&<><button className="google-btn" onClick={onGoogle}>G <span>Continue with Google</span></button><button className="forgot-btn" onClick={()=>onReset(form.email)}>Forgot password?</button></>}
  <p className="switch">{mode==="login"?"Don't have an account?":"Already have an account?"} <button onClick={switchMode}>{mode==="login"?"Sign up":"Sign in"}</button></p>
  <small className="demo-hint">{firebaseConfigured?<>Coach admin email: <b>{ADMIN_EMAIL}</b></>:<>Demo admin: admin@coachflow.demo / admin123</>}</small>
 </div></motion.main>;
}
function AuthOverlay({mode,close,onSubmit,onGoogle,onReset,switchMode}) { return <div className="overlay"><button className="overlay-close" onClick={close}><X/></button><Auth mode={mode} onSubmit={onSubmit} onGoogle={onGoogle} onReset={onReset} switchMode={switchMode}/></div>; }
function Reveal({children,delay=0}) { return <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.15}} transition={{duration:.6,delay}}>{children}</motion.div> }
function Toast({message}) { return <motion.div className="toast" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}><Check size={17}/>{message}</motion.div> }
function Footer(){return <footer><div className="container footer-inner"><div className="brand"><span className="brand-mark">C</span><span>COACH<span className="accent">FLOW</span></span></div><span>© 2026 CoachFlow. Personal coaching platform.</span><span className="social"><Instagram size={17}/></span></div></footer>}

export default App;
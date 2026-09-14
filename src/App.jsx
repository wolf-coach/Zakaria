import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Check, ChevronDown, Dumbbell, Flame, HeartPulse, Instagram,
  LayoutDashboard, LogIn, LogOut, Menu, Play, Plus, ShieldCheck, Star,
  Target, User, Users, Utensils, X, CalendarDays, Clock3, Save
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, firebaseConfigured, loginEmail, registerEmail, loginGoogle, logoutFirebase } from "./lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { demoCustomer, demoCustomers, demoProgram } from "./data/demo";

const ADMIN_EMAIL = "admin@coachflow.demo";
const days = Object.keys(demoProgram);

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
  const [customer, setCustomer] = useLocalState("coachflow_customer", demoCustomer);
  const [customers, setCustomers] = useLocalState("coachflow_customers", demoCustomers);
  const [program, setProgram] = useLocalState("coachflow_program", demoProgram);
  const [authMode, setAuthMode] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && db) {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setCustomer({ ...demoCustomer, ...snap.data(), id: u.uid });
      }
    });
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL || localStorage.getItem("coachflow_role") === "admin";
  const isCustomer = user || localStorage.getItem("coachflow_role") === "customer";

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const go = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function handleLogout() {
    await logoutFirebase();
    localStorage.removeItem("coachflow_role");
    setUser(null);
    go("home");
    notify("You have been logged out.");
  }

  async function handleAuth(mode, form) {
    try {
      if (firebaseConfigured) {
        const result = mode === "signup"
          ? await registerEmail(form.email, form.password)
          : await loginEmail(form.email, form.password);
        if (result?.user && db) {
          const profile = {
            ...demoCustomer, id: result.user.uid, name: form.name || demoCustomer.name,
            email: form.email, age: Number(form.age || 0), height: Number(form.height || 0),
            weight: Number(form.weight || 0), goal: form.goal || "General fitness"
          };
          await setDoc(doc(db, "users", result.user.uid), profile, { merge: true });
          setCustomer(profile);
        }
      } else {
        if (mode === "login" && form.email === ADMIN_EMAIL && form.password === "admin123") {
          localStorage.setItem("coachflow_role", "admin");
          go("admin");
          notify("Welcome, Coach.");
          setAuthMode(null);
          return;
        }
        localStorage.setItem("coachflow_role", "customer");
        const profile = {
          ...demoCustomer, email: form.email,
          name: form.name || demoCustomer.name,
          age: Number(form.age || demoCustomer.age),
          height: Number(form.height || demoCustomer.height),
          weight: Number(form.weight || demoCustomer.weight),
          goal: form.goal || demoCustomer.goal
        };
        setCustomer(profile);
        setCustomers(prev => {
          const exists = prev.some(x => x.email === profile.email);
          return exists ? prev : [...prev, { ...profile, id: crypto.randomUUID() }];
        });
      }
      setAuthMode(null);
      go("dashboard");
      notify(mode === "signup" ? "Account created." : "Welcome back.");
    } catch (e) {
      notify(e.message || "Authentication failed.");
    }
  }

  return (
    <div className="app">
      <Nav page={page} go={go} isCustomer={isCustomer} isAdmin={isAdmin} logout={handleLogout} />
      <AnimatePresence mode="wait">
        {page === "home" && <Home key="home" go={go} />}
        {page === "dashboard" && isCustomer && <Dashboard key="dashboard" customer={customer} program={program} go={go} />}
        {page === "profile" && isCustomer && <Profile key="profile" customer={customer} setCustomer={setCustomer} notify={notify} />}
        {page === "admin" && isAdmin && <Admin key="admin" customers={customers} setCustomers={setCustomers} program={program} setProgram={setProgram} notify={notify} />}
        {page === "login" && <Auth key="login" mode="login" onSubmit={(f)=>handleAuth("login", f)} switchMode={()=>setAuthMode("signup")} />}
      </AnimatePresence>
      {!isCustomer && page !== "login" && null}
      <AnimatePresence>
        {authMode && <AuthOverlay mode={authMode} close={()=>setAuthMode(null)} onSubmit={(f)=>handleAuth(authMode, f)} />}
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast message={toast}/>}</AnimatePresence>
      <Footer />
    </div>
  );
}

function Nav({page, go, isCustomer, isAdmin, logout}) {
  const [open, setOpen] = useState(false);
  return <header className="nav">
    <div className="nav-inner">
      <button className="brand" onClick={()=>go("home")}><span className="brand-mark">C</span><span>COACH<span className="accent">FLOW</span></span></button>
      <button className="mobile-menu" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
      <nav className={open?"nav-links open":"nav-links"}>
        <button onClick={()=>{go("home");setOpen(false)}}>Home</button>
        <a href="#about" onClick={()=>setOpen(false)}>About</a>
        <a href="#packs" onClick={()=>setOpen(false)}>Packs</a>
        <a href="#reviews" onClick={()=>setOpen(false)}>Reviews</a>
        {isCustomer && <button onClick={()=>{go("dashboard");setOpen(false)}}>Dashboard</button>}
        {isAdmin && <button onClick={()=>{go("admin");setOpen(false)}}>Admin</button>}
        {isCustomer || isAdmin ? <button className="outline-btn" onClick={logout}><LogOut size={15}/> Logout</button> :
          <button className="primary-btn small" onClick={()=>go("login")}><LogIn size={15}/> Login</button>}
      </nav>
    </div>
  </header>;
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
  const d = program[selected] || demoProgram[selected];
  const remaining = Math.max(0, Math.ceil((new Date(customer.endDate)-new Date())/(1000*60*60*24)));
  return <motion.main className="page" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
    <div className="container">
      <div className="dash-head"><div><div className="section-label">CLIENT DASHBOARD</div><h1>Good morning, <span>{customer.name.split(" ")[0]}.</span></h1><p>Stay consistent. Small actions, big results.</p></div><button className="outline-dark" onClick={()=>go("profile")}><User size={17}/> My profile</button></div>
      <div className="dash-stats"><Stat icon={Target} label="Goal" value={customer.goal}/><Stat icon={Flame} label="Current weight" value={`${customer.weight} kg`}/><Stat icon={Clock3} label="Plan remaining" value={`${remaining} days`}/><Stat icon={ShieldCheck} label="Package" value={customer.package}/></div>
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
  const [selected,setSelected]=useState(customers[0]?.id);
  const [tab,setTab]=useState("customers");
  const selectedCustomer=customers.find(x=>x.id===selected)||customers[0];
  const update=(key,val)=>setCustomers(customers.map(c=>c.id===selected?{...c,[key]:val}:c));
  const add=()=>{const c={...demoCustomer,id:crypto.randomUUID(),name:"New Customer",email:"new@example.com"};setCustomers([...customers,c]);setSelected(c.id);notify("Customer added.");};
  const saveProgram=(day,key,val)=>setProgram({...program,[day]:{...program[day],[key]:val}});
  return <motion.main className="page" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}><div className="container">
    <div className="admin-head"><div><div className="section-label">COACH CONTROL CENTER</div><h1>Admin <span>dashboard.</span></h1><p>Manage clients, programs, meals and package validity.</p></div><button className="primary-btn" onClick={add}><Plus size={17}/> Add customer</button></div>
    <div className="admin-tabs"><button className={tab==="customers"?"active":""} onClick={()=>setTab("customers")}><Users/> Customers</button><button className={tab==="program"?"active":""} onClick={()=>setTab("program")}><Dumbbell/> Weekly program</button></div>
    {tab==="customers" ? <div className="admin-grid"><div className="customer-list">{customers.map(c=><button className={selected===c.id?"selected":""} key={c.id} onClick={()=>setSelected(c.id)}><span className="customer-avatar">{c.name[0]}</span><span><b>{c.name}</b><small>{c.package}</small></span><ChevronDown size={15}/></button>)}</div>{selectedCustomer&&<div className="admin-editor panel"><div className="editor-title"><div><div className="section-label">CLIENT</div><h2>{selectedCustomer.name}</h2></div><span className="status">ACTIVE</span></div><div className="editor-grid">{[["name","Name"],["email","Email"],["age","Age"],["height","Height"],["weight","Weight"],["goal","Goal"],["allergies","Allergies"],["health","Health notes"],["package","Package"],["startDate","Start date"],["endDate","Validity end date"]].map(([key,label])=><label key={key}>{label}<input value={selectedCustomer[key]??""} onChange={e=>update(key,e.target.value)}/></label>)}</div><button className="primary-btn" onClick={()=>notify("Customer information saved.")}><Save size={17}/> Save customer</button></div>}</div> :
    <div className="panel program-admin"><div className="section-label">PROGRAM BUILDER</div><h2>Monday → Sunday</h2><div className="admin-day-list">{days.map(day=><div className="day-editor" key={day}><div className="day-title"><b>{day}</b><span>{program[day]?.workout}</span></div><label>Workout title<input value={program[day]?.workout||""} onChange={e=>saveProgram(day,"workout",e.target.value)}/></label><label>Exercises<input value={(program[day]?.exercises||[]).join(" | ")} onChange={e=>saveProgram(day,"exercises",e.target.value.split("|").map(x=>x.trim()).filter(Boolean))}/></label><label>Meals<input value={(program[day]?.meals||[]).join(" | ")} onChange={e=>saveProgram(day,"meals",e.target.value.split("|").map(x=>x.trim()).filter(Boolean))}/></label></div>)}</div><button className="primary-btn" onClick={()=>notify("Weekly program saved.")}><Save size={17}/> Save program</button></div>}
  </div></motion.main>
}

function Auth({mode,onSubmit,switchMode}) {
  const [form,setForm]=useState({email:"",password:"",name:"",age:"",height:"",weight:"",goal:""});
  return <motion.main className="auth-page" initial={{opacity:0}} animate={{opacity:1}}><div className="auth-box"><div className="brand static"><span className="brand-mark">C</span><span>COACH<span className="accent">FLOW</span></span></div><div className="section-label">{mode==="login"?"WELCOME BACK":"START YOUR JOURNEY"}</div><h1>{mode==="login"?"Sign in to your":"Create your"} <span>account.</span></h1><p>{mode==="login"?"Access your personalized coaching dashboard.":"Tell us a little about yourself to get started."}</p>{mode==="signup"&&<><label>Full name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label><div className="form-row"><label>Age<input value={form.age} onChange={e=>setForm({...form,age:e.target.value})}/></label><label>Height<input value={form.height} onChange={e=>setForm({...form,height:e.target.value})}/></label><label>Weight<input value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})}/></label></div><label>Main goal<input value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} placeholder="e.g. Fat loss"/></label></>}<label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••"/></label><button className="primary-btn full" onClick={()=>onSubmit(form)}>{mode==="login"?"Sign in":"Create account"} <ArrowRight size={17}/></button>{mode==="login"&&<button className="google-btn" onClick={()=>onSubmit({...form,email:"demo@google.local"})}>Continue with Google</button>}<p className="switch">{mode==="login"?"Don't have an account?":"Already have an account?"} <button onClick={switchMode}>{mode==="login"?"Sign up":"Sign in"}</button></p><small className="demo-hint">Demo mode: admin@coachflow.demo / admin123</small></div></motion.main>
}

function AuthOverlay({mode,close,onSubmit}) { return <div className="overlay"><button className="overlay-close" onClick={close}><X/></button><Auth mode={mode} onSubmit={onSubmit} switchMode={()=>{}}/></div> }

function Reveal({children,delay=0}) { return <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.15}} transition={{duration:.6,delay}}>{children}</motion.div> }
function Toast({message}) { return <motion.div className="toast" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}><Check size={17}/>{message}</motion.div> }
function Footer(){return <footer><div className="container footer-inner"><div className="brand"><span className="brand-mark">C</span><span>COACH<span className="accent">FLOW</span></span></div><span>© 2026 CoachFlow. Personal coaching platform.</span><span className="social"><Instagram size={17}/></span></div></footer>}

export default App;
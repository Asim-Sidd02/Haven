"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion, AnimatePresence, useInView, useScroll, useTransform, animate, type Variants,
} from "framer-motion";
import { clientServices, supplyServices, interfaces, usps } from "./content";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease, delay: i * 0.08 } }),
};

function Reveal({ children, i = 0, className }: { children: React.ReactNode; i?: number; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
      {children}
    </motion.div>
  );
}

function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.8, ease, onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{prefix}{v}{suffix}</span>;
}

const Arrow = () => (
  <svg className="arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/* ---------------- NAV ---------------- */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <motion.header className={`nav ${scrolled ? "scrolled" : ""}`} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease }}>
      <div className="container">
        <div className="nav-inner">
          <a href="#" className="logo"><img src="/mark.svg" alt="" />Haven</a>
          <nav className="nav-links">
            <a href="#services">Services</a>
            <a href="#partners">For agencies</a>
            <a href="#how">How it works</a>
            <a href="#platform">Platform</a>
            <a href="#why">Why Haven</a>
          </nav>
          <a href="#book" className="btn btn-dark">Book security <Arrow /></a>
        </div>
      </div>
    </motion.header>
  );
}

/* ---------------- HERO ---------------- */
function HeroPhone() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 2200);
    return () => clearInterval(t);
  }, []);
  const checks = ["Inside 150m geofence", "Uniform selfie captured", "Start-OTP verified"];
  return (
    <div className="device">
      <div className="screen">
        <div className="screen-top"><span>9:41</span><span>Live shift</span></div>
        <div className="map">
          <div className="road" style={{ left: 0, right: 0, top: "62%", height: 14 }} />
          <div className="road" style={{ top: 0, bottom: 0, left: "28%", width: 12 }} />
          {[200, 140, 80].map((s, i) => (
            <motion.div key={s} className="ring" style={{ width: s, height: s }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }} />
          ))}
          <div className="pin" />
          <motion.div className="guard-dot" initial={false}
            animate={step === 0 ? { left: "8%", top: "70%" } : { left: "54%", top: "32%" }}
            transition={{ duration: 1.6, ease }}>RK</motion.div>
        </div>
        <div className="card">
          <div className="row">
            <div><div className="muted">Assigned guard</div><div style={{ fontWeight: 600, marginTop: 2 }}>Ravi K. · 6&apos;2&quot; · Black suit</div></div>
            <div className="muted" style={{ color: "#0a0a0a", fontWeight: 600 }}>PSARA ✓</div>
          </div>
        </div>
        <div className="card">
          {checks.map((c, i) => (
            <motion.div className="check" key={c} animate={{ opacity: step > i ? 1 : 0.3 }} transition={{ duration: 0.4 }}>
              <motion.i animate={{ scale: step > i ? 1 : 0.6, background: step > i ? "#0a0a0a" : "#d4d4d4" }}>✓</motion.i>{c}
            </motion.div>
          ))}
        </div>
        <div className="card">
          <div className="row">
            <span className="muted">Start-OTP</span>
            <div className="otp">
              {["4", "8", "2", "7"].map((d, i) => (
                <span key={i}><AnimatePresence>{step >= 3 && <motion.b initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.1 }}>{d}</motion.b>}</AnimatePresence></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const lines = [["Verified security,"], ["booked with"], ["care."]];
  return (
    <section className="hero" ref={ref}>
      <div className="hero-grid-bg" />
      <div className="container hero-inner">
        <div>
          <motion.div className="pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.1 }}>
            <b>Hyderabad pilot</b> PSARA-licensed &amp; police-verified
          </motion.div>
          <h1>
            {lines.map((l, i) => (
              <span className="line" key={i}>
                <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease, delay: 0.2 + i * 0.1 }}
                  className={i === 2 ? "serif" : undefined}>{l[0]}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="lead" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.6 }}>
            Bouncers, door staff, bodyguards and lady security for weddings, nightlife and VIPs. Upfront pricing,
            live proof of presence, and a backup on standby if anyone cancels.
          </motion.p>
          <motion.div className="hero-ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.75 }}>
            <a href="#book" className="btn btn-dark">Book a bouncer <Arrow /></a>
            <a href="#partners" className="btn btn-ghost">Partner as an agency</a>
          </motion.div>
          <motion.div className="hero-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1 }}>
            <div><strong>100%</strong><span>PSARA &amp; PCC verified</span></div>
            <div><strong>150m</strong><span>Geofenced check-in</span></div>
            <div><strong>&lt;2 min</strong><span>Agency dispatch</span></div>
          </motion.div>
        </div>
        <motion.div className="device-wrap" style={{ y }} initial={{ opacity: 0, y: 60, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 1.3, ease, delay: 0.35 }}>
          <HeroPhone />
          <motion.div className="float-card" style={{ left: -30, top: 90 }} animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
            <span className="muted">Instant quote · 8h shift</span><strong>₹4,720 incl. GST</strong>
          </motion.div>
          <motion.div className="float-card" style={{ right: -20, bottom: 70 }} animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
            <span className="muted">Payout on End-OTP</span><strong>Sent to UPI ✓</strong>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Weddings & sangeets", "Nightclubs & pubs", "Concerts", "Corporate galas", "VIP escorts", "Ladies' nights", "Store openings", "Gated communities", "Exhibitions"];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...items, ...items].map((t, i) => <div className="marquee-item" key={i}>{t}</div>)}
      </div>
    </div>
  );
}

/* ---------------- SERVICES ---------------- */
function Services() {
  return (
    <section className="section" id="services">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">For clients</span>
            <h2 className="h2">Security for every<br /><span className="serif">kind of door.</span></h2>
          </Reveal>
          <Reveal i={1}><p className="lead">For wedding and event planners, nightclub operators, corporate facility heads, residential societies and private individuals.</p></Reveal>
        </div>
        <div className="services">
          {clientServices.map((s, i) => (
            <motion.article className="svc" key={s.k} variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
              <span className="svc-k">{s.k}</span>
              <h3>{s.title}</h3>
              <p className="svc-body">{s.body}</p>
              <div className="tags">{s.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- SUPPLY ---------------- */
const supplyIcons = [
  <path key="a" d="M4 12h16M12 4v16" />,
  <><rect key="b" x="4" y="6" width="16" height="12" rx="2" /><path key="b2" d="M8 12h8" /></>,
  <><circle key="c" cx="9" cy="9" r="3" /><circle key="c2" cx="16" cy="15" r="3" /><path key="c3" d="M11 11l3 2" /></>,
  <><path key="d" d="M4 18l5-6 4 3 7-9" /></>,
];

function Partners() {
  return (
    <section className="section dark" id="partners">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">For agencies &amp; bouncers</span>
            <h2 className="h2">Steady shifts.<br /><span className="serif">Zero paperwork.</span></h2>
          </Reveal>
          <Reveal i={1}><p className="lead">Grow revenue for PSARA-licensed firms and verified professionals, without the administrative friction.</p></Reveal>
        </div>
        <div className="supply-grid">
          {supplyServices.map((s, i) => (
            <motion.div className="supply" key={s.title} variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <div className="supply-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">{supplyIcons[i]}</svg>
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="stats">
          <Reveal className="stat"><div className="stat-num"><Counter to={2} prefix="<" />m</div><p>Average dispatch time for agency managers</p></Reveal>
          <Reveal className="stat" i={1}><div className="stat-num"><Counter to={0} />%</div><p>Middleman deductions from guard wages</p></Reveal>
          <Reveal className="stat" i={2}><div className="stat-num"><Counter to={3} /></div><p>Languages: English, Telugu and Hindi</p></Reveal>
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW ---------------- */
function How() {
  const steps = [
    ["Build your booking", "Choose shift length, dress code, height and language in the Custom Booking Builder."],
    ["See the price upfront", "An instant quote with base rate, platform fee and GST. No calls, no haggling."],
    ["Verify on arrival", "Geofence check, live uniform selfie and your Start-OTP start the billable clock."],
    ["Close and settle", "Enter the End-OTP. You get a GST invoice; the guard gets paid instantly."],
  ];
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">How it works</span>
            <h2 className="h2">From request to <span className="serif">guarded door.</span></h2>
          </Reveal>
        </div>
        <div className="steps">
          {steps.map(([t, b], i) => (
            <Reveal className="step" key={t} i={i}>
              <div className="step-line">
                <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease, delay: 0.3 + i * 0.25 }} />
              </div>
              <div className="step-n" />
              <small>Step 0{i + 1}</small>
              <h3>{t}</h3>
              <p>{b}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- PLATFORM ---------------- */
function Platform() {
  const [active, setActive] = useState(0);
  const cur = interfaces[active];
  return (
    <section className="section" id="platform" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-head">
          <Reveal>
            <span className="eyebrow">One platform, three interfaces</span>
            <h2 className="h2">Built for everyone<br /><span className="serif">at the door.</span></h2>
          </Reveal>
        </div>
        <Reveal>
          <div className="tabs" role="tablist">
            {interfaces.map((it, i) => (
              <button key={it.id} role="tab" aria-selected={active === i} className={`tab ${active === i ? "active" : ""}`} onClick={() => setActive(i)}>
                {active === i && <motion.div layoutId="tabbg" className="tab-bg" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        </Reveal>
        <AnimatePresence mode="wait">
          <motion.div key={cur.id} className="panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.5, ease }}>
            <div className="panel-intro">
              <span className="eyebrow">{cur.who}</span>
              <h3>{cur.label}</h3>
              <p className="benefit">{cur.benefit}</p>
            </div>
            <div className="feat-list">
              {cur.features.map(([t, b], i) => (
                <motion.div className="feat" key={t} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.07 }}>
                  <div className="feat-i">0{i + 1}</div>
                  <div><h4>{t}</h4><p>{b}</p></div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ---------------- USPs ---------------- */
function Why() {
  return (
    <section className="section" id="why" style={{ paddingTop: 40 }}>
      <div className="container usp-wrap">
        <div className="usp-sticky">
          <Reveal>
            <span className="eyebrow">Why Haven</span>
            <h2 className="h2">Five promises<br /><span className="serif">we keep.</span></h2>
            <p className="lead">Most manpower apps send whoever is free. Haven proves who arrived, that they&apos;re licensed, and that they&apos;re dressed for your room.</p>
          </Reveal>
          <div className="usp-visual">
            {[100, 72, 44].map((p, i) => (
              <motion.div key={p} className="ring" style={{ width: `${p}%`, height: `${p}%` }}
                initial={{ scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
                transition={{ duration: 1.4, ease, delay: i * 0.15 }} />
            ))}
            <motion.div className="ring" style={{ width: "100%", height: "100%", borderColor: "transparent", borderTopColor: "#0a0a0a" }}
              animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
            <img src="/mark.svg" alt="" style={{ position: "absolute", left: "50%", top: "50%", width: "22%", transform: "translate(-50%,-50%)" }} />
            <span className="muted" style={{ position: "absolute", left: "50%", bottom: "-4%", transform: "translateX(-50%)" }}>150m geofence</span>
          </div>
        </div>
        <div className="usp-list">
          {usps.map((u, i) => (
            <Reveal className="usp" key={u.title}>
              <span className="usp-n">0{i + 1}</span>
              <div><h3>{u.title}</h3><p>{u.body}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA + FOOTER ---------------- */
function CTA() {
  return (
    <section className="cta" id="book">
      <div className="container">
        <motion.div className="cta-box" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease }}>
          <div className="cta-glow" />
          <span className="eyebrow">Now live in Hyderabad</span>
          <h2 className="h2">Your next event deserves <span className="serif">a calmer door.</span></h2>
          <p className="lead">Book verified security in minutes, or bring your agency&apos;s bench onto Haven and start filling weekend shifts.</p>
          <div className="hero-ctas">
            <a href="#" className="btn btn-light">Book security <Arrow /></a>
            <a href="#" className="btn btn-ghost">Join as an agency</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <a href="#" className="logo"><img src="/mark.svg" alt="" />Haven</a>
            <p className="muted" style={{ marginTop: 12, fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>PSARA-licensed, police-verified security staffing for events, nightlife and VIPs.</p>
          </div>
          <div className="footer-cols">
            <div><h5>Clients</h5><a href="#services">Event bouncers</a><a href="#services">Door staff</a><a href="#services">Bodyguards</a><a href="#services">Lady security</a></div>
            <div><h5>Partners</h5><a href="#partners">Agencies</a><a href="#partners">Bouncers</a><a href="#platform">Agency portal</a></div>
            <div><h5>Company</h5><a href="#why">Why Haven</a><a href="#how">How it works</a><a href="#book">Contact</a></div>
          </div>
        </div>
        <div className="wordmark">Haven</div>
        <div className="footer-bottom"><span>© 2026 Haven. All rights reserved.</span><span>Safety, booked with care.</span></div>
      </div>
    </footer>
  );
}

export default function Site() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Services />
        <Partners />
        <How />
        <Platform />
        <Why />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

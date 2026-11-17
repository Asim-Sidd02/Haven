"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useInView, animate, useMotionValue, useTransform } from "framer-motion";
import { clientServices, supplyServices, interfaces, usps } from "./content";

const ease = [0.22, 1, 0.36, 1] as const;

function Num({ value, prefix = "", suffix = "", inr = false }: { value: number; prefix?: string; suffix?: string; inr?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    if (!seen) return;
    const c = animate(last.current, value, { duration: 1.1, ease, onUpdate: (x) => { last.current = x; setV(Math.round(x)); } });
    return () => c.stop();
  }, [seen, value]);
  return <span ref={ref}>{prefix}{inr ? v.toLocaleString("en-IN") : v}{suffix}</span>;
}

/* cursor-following spotlight for cards */
function spot(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget, b = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - b.left}px`);
  el.style.setProperty("--my", `${e.clientY - b.top}px`);
}

function Fade({ children, d = 0, className }: { children: React.ReactNode; d?: number; className?: string }) {
  return (
    <motion.div className={className} onMouseMove={spot} initial={{ opacity: 0, y: 24, filter: "blur(6px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, ease, delay: d }}>
      {children}
    </motion.div>
  );
}

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const ArrowR = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10m0 0L9 4m4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function Head({ label, title, intro }: { label: string; title: string; intro?: string }) {
  return (
    <Fade className="head">
      <div className="label">{label}</div>
      <h2>{title}</h2>
      {intro && <p className="intro">{intro}</p>}
    </Fade>
  );
}

/* NAV */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <motion.div className="progress" style={{ scaleX: progress }} />
      <div className="topbar">
        <div className="wrap topbar-in">
          <span><i className="live" />Now operating in Hyderabad, Telangana</span>
          <span className="hide-sm">PSARA-licensed partners · 24/7 operations desk</span>
        </div>
      </div>
      <div className="wrap nav-in">
        <a href="#" className="brand"><img src="/mark.svg" alt="" />Haven</a>
        <nav className="links">
          <a href="#services">Services</a>
          <a href="#process">Process</a>
          <a href="#platform">Platform</a>
          <a href="#agencies">Agencies</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-cta">
          <a href="#agencies" className="link-plain hide-sm">Partner login</a>
          <a href="#book" className="btn btn-primary">Request a quote</a>
        </div>
      </div>
    </header>
  );
}

/* HERO */
function QuoteCard() {
  const [hours, setHours] = useState(8);
  const [guards, setGuards] = useState(2);
  const base = 450 * hours * guards;
  const fee = Math.round(base * 0.1);
  const gst = Math.round((base + fee) * 0.18);
  const fmt = (n: number) => <Num value={n} prefix="₹" inr />;
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 20 });
  return (
    <motion.div className="quote-wrap" style={{ perspective: 1200 }} initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, ease, delay: 0.4 }}>
    <motion.div className="quote" style={{ rotateX: rx, rotateY: ry }}
      onMouseMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - b.left) / b.width - 0.5); my.set((e.clientY - b.top) / b.height - 0.5); }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}>
      <div className="quote-head">
        <span>Instant estimate</span>
        <span className="badge">No obligation</span>
      </div>
      <div className="field">
        <label>Shift length</label>
        <div className="seg">
          {[4, 8, 12].map((h) => (
            <button key={h} className={hours === h ? "on" : ""} onClick={() => setHours(h)}>
              {hours === h && <motion.span layoutId="seg" className="seg-bg" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="seg-t">{h} hours</span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Number of guards</label>
        <div className="stepper">
          <button aria-label="Fewer" onClick={() => setGuards((g) => Math.max(1, g - 1))}>−</button>
          <span className="stepper-v"><AnimatePresence mode="popLayout" initial={false}><motion.span key={guards} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.25 }}>{guards}</motion.span></AnimatePresence></span>
          <button aria-label="More" onClick={() => setGuards((g) => Math.min(20, g + 1))}>+</button>
        </div>
      </div>
      <dl className="lines">
        <div><dt>Base rate</dt><dd>{fmt(base)}</dd></div>
        <div><dt>Platform fee</dt><dd>{fmt(fee)}</dd></div>
        <div><dt>GST (18%)</dt><dd>{fmt(gst)}</dd></div>
        <div className="total"><dt>Estimated total</dt><dd>{fmt(base + fee + gst)}</dd></div>
      </dl>
      <a href="#book" className="btn btn-primary btn-block">Continue booking <ArrowR /></a>
      <p className="fine">Illustrative pricing. Final quote depends on date, dress code and location.</p>
    </motion.div>
    <motion.div className="chip-float c1" animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}><Check /> Guard verified</motion.div>
    <motion.div className="chip-float c2" animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}><i className="live" /> Live tracking</motion.div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero-in">
        <div>
          <motion.div className="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>Security staffing platform</motion.div>
          <h1>
            {"Licensed, verified security for every event and venue.".split(" ").map((w, i) => (
              <span className="w" key={i}><motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, ease, delay: 0.1 + i * 0.05 }}>{w}&nbsp;</motion.span></span>
            ))}
          </h1>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.6 }}>
          <p className="hero-lead">
            Haven connects you with PSARA-licensed agencies for bouncers, door staff, bodyguards and female security.
            You get transparent pricing, verified attendance and guaranteed replacement cover.
          </p>
          <div className="actions">
            <a href="#book" className="btn btn-primary">Book security</a>
            <a href="#agencies" className="btn btn-outline">Become a partner agency</a>
          </div>
          <ul className="assure">
            <li><Check />Police clearance on every guard</li>
            <li><Check />GST invoice for every booking</li>
            <li><Check />Pay only for verified hours</li>
          </ul>
          </motion.div>
        </div>
        <QuoteCard />
      </div>
      <div className="wrap">
        <div className="facts">
          {([[100, "", "%", "Guards PSARA & PCC verified"], [2, "< ", " min", "Average agency dispatch"], [150, "", " m", "Geofenced check-in radius"], [24, "", "/7", "SOS & operations support"]] as const).map(([n, p, s, l], i) => (
            <Fade key={l} d={0.8 + i * 0.08}><strong><Num value={n} prefix={p} suffix={s} /></strong><span>{l}</span></Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

/* SERVICES */
function Services() {
  return (
    <section className="sec" id="services">
      <div className="wrap">
        <Head label="Services" title="Security coverage for every requirement"
          intro="For event planners, venue operators, corporate facility teams, residential societies and private clients." />
        <div className="svc-list">
          {clientServices.map((s, i) => (
            <Fade key={s.k} d={i * 0.04} className="svc-row">
              <span className="svc-n">{s.k}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="chips">{s.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

/* PROCESS */
function Process() {
  const steps = [
    ["Specify", "Choose shift length, dress code, height and language preferences."],
    ["Confirm", "Review an itemised quote with base rate, fee and GST, then pay securely."],
    ["Verify", "The guard checks in inside the geofence with a uniform photo and your Start-OTP."],
    ["Settle", "Enter the End-OTP. You receive a GST invoice and the guard is paid instantly."],
  ];
  return (
    <section className="sec sec-alt" id="process">
      <div className="wrap">
        <Head label="Process" title="Four steps from request to coverage" />
        <ol className="steps">
          {steps.map(([t, b], i) => (
            <Fade key={t} d={i * 0.06} className="step">
              <div className="step-top"><span className="step-n">{i + 1}</span><span className="step-bar"><motion.i initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease, delay: 0.3 + i * 0.2 }} /></span></div>
              <h3>{t}</h3>
              <p>{b}</p>
            </Fade>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ASSURANCE */
function Assurance() {
  return (
    <section className="sec" id="why">
      <div className="wrap assure-grid">
        <div>
          <Head label="Assurance" title="Accountability built into every shift"
            intro="Haven records who arrived, confirms they are licensed, and checks they are dressed for your venue." />
          <div className="compliance">
            <div className="comp-row"><span>PSARA licence</span><b>Verified</b></div>
            <div className="comp-row"><span>Police Clearance Certificate</span><b>Verified</b></div>
            <div className="comp-row"><span>Training record</span><b>On file</b></div>
            <div className="comp-row"><span>Geofence check-in</span><b>Within 150 m</b></div>
          </div>
        </div>
        <div className="usp-grid">
          {usps.map((u, i) => (
            <Fade key={u.title} d={i * 0.05} className="usp">
              <span className="usp-ic"><Check /></span>
              <h3>{u.title}</h3>
              <p>{u.body}</p>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}

/* PLATFORM */
function Platform() {
  const [active, setActive] = useState(0);
  const cur = interfaces[active];
  return (
    <section className="sec sec-alt" id="platform">
      <div className="wrap">
        <Head label="Platform" title="One system for clients, agencies and guards" />
        <div className="plat">
          <div className="plat-nav" role="tablist">
            {interfaces.map((it, i) => (
              <button key={it.id} role="tab" aria-selected={active === i} className={active === i ? "on" : ""} onClick={() => setActive(i)}>
                {active === i && <motion.span layoutId="platbar" className="plat-ind" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <strong>{it.label}</strong>
                <span>{it.who}</span>
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={cur.id} className="plat-body" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.35, ease }}>
              <div className="feat-grid">
                {cur.features.map(([t, b], i) => (
                  <motion.div className="feat" key={t} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.05 + i * 0.07 }}><h4>{t}</h4><p>{b}</p></motion.div>
                ))}
              </div>
              <div className="benefit"><span className="label">Outcome</span><p>{cur.benefit}</p></div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

/* AGENCIES */
function Agencies() {
  return (
    <section className="sec sec-dark" id="agencies">
      <div className="wrap agency-grid">
        <div>
          <Head label="For agencies & bouncers" title="More shifts, less administration"
            intro="Grow revenue for PSARA-licensed firms and verified professionals without the paperwork." />
          <a href="#book" className="btn btn-light">Apply as a partner</a>
        </div>
        <div>
          <div className="supply">
            {supplyServices.map((s, i) => (
              <Fade key={s.title} d={i * 0.05} className="supply-item">
                <span className="mono">0{i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.body}</p></div>
              </Fade>
            ))}
          </div>
          <div className="kpis">
            <div><strong><Num value={2} prefix="< " suffix=" min" /></strong><span>Dispatch time</span></div>
            <div><strong><Num value={0} suffix="%" /></strong><span>Middleman wage cuts</span></div>
            <div><strong><Num value={3} /></strong><span>App languages</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* FAQ */
const faqs = [
  ["How are guards verified?", "Every guard is deployed through a partner agency with an active Telangana PSARA licence, and must hold a valid Police Clearance Certificate and training record before they can accept shifts."],
  ["What if a guard cancels?", "A standby pool across partner agencies is notified at once, and a replacement is dispatched under our no-show guarantee."],
  ["When does billing start?", "The billable clock starts only when the guard is inside the 150 m geofence, has uploaded a uniform photo and you have shared your Start-OTP."],
  ["Do you provide GST invoices?", "Yes. Every booking produces a GST-compliant tax invoice that you can download once the shift is closed."],
  ["Can I request female security staff?", "Yes. You can book dedicated female bouncers and escorts for bridal events, ladies' nights and female VIP protection."],
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="sec" id="faq">
      <div className="wrap faq-grid">
        <Head label="FAQ" title="Common questions" intro="Can't find what you need? Our operations desk is available around the clock." />
        <div className="faq">
          {faqs.map(([q, a], i) => (
            <div key={q} className={`faq-item ${open === i ? "open" : ""}`}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {q}<span className="plus" aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} style={{ overflow: "hidden" }}>
                    <p>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* CTA + FOOTER */
function CTA() {
  return (
    <section className="cta" id="book">
      <motion.div className="wrap cta-in" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease }}>
        <div>
          <h2>Plan your security with confidence.</h2>
          <p>Request verified staff in minutes, or bring your agency onto Haven.</p>
        </div>
        <div className="actions">
          <a href="#" className="btn btn-primary">Book security</a>
          <a href="#" className="btn btn-outline">Talk to our team</a>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <a href="#" className="brand"><img src="/mark.svg" alt="" />Haven</a>
            <p>PSARA-licensed, police-verified security staffing for events, nightlife and private clients.</p>
          </div>
          <div><h5>Services</h5><a href="#services">Event security</a><a href="#services">Door staff</a><a href="#services">Close protection</a><a href="#services">Female security</a></div>
          <div><h5>Partners</h5><a href="#agencies">Agencies</a><a href="#agencies">Bouncers</a><a href="#platform">Agency portal</a></div>
          <div><h5>Company</h5><a href="#why">Assurance</a><a href="#process">Process</a><a href="#faq">FAQ</a><a href="#book">Contact</a></div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Haven. All rights reserved.</span>
          <span>Safety, booked with care.</span>
        </div>
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
        <Services />
        <Process />
        <Assurance />
        <Platform />
        <Agencies />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

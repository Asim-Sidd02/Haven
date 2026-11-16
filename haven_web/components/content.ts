export const clientServices = [
  { k: "01", title: "Event & Wedding Bouncers", body: "Crowd management, guest-list gatekeeping, stage protection and alcohol-moderated hospitality security for weddings, sangeets, concerts and corporate galas.", tags: ["Weddings", "Concerts", "Galas"] },
  { k: "02", title: "Nightclub & Pub Door Staff", body: "Trained door bouncers for age and ID checks, VIP table protection and calm verbal de-escalation, across nightly or weekend shifts.", tags: ["ID checks", "VIP tables", "Weekends"] },
  { k: "03", title: "Personal Bodyguards & VIP Escorts", body: "Short-notice close protection for executives, celebrities and individuals who need safe transit and personal security.", tags: ["Close protection", "Transit"] },
  { k: "04", title: "Female Bouncers", body: "Dedicated lady security and escorts for ladies' nights, bridal security, women-focused events and female VIP protection.", tags: ["Bridal", "Ladies' nights"] },
  { k: "05", title: "Short-Term & Backup Guards", body: "Temporary static guards for store openings, exhibitions and gated communities, or emergency cover when regular staff are absent.", tags: ["Retail", "Exhibitions", "Cover"] },
];

export const supplyServices = [
  { title: "On-demand bookings", body: "Pre-funded, short-term event and nightlife bookings delivered to PSARA-licensed agencies, with no in-house sales team needed." },
  { title: "Monetise idle bench", body: "Deploy off-duty or standby guards on high-paying weekend event shifts instead of letting capacity sit unused." },
  { title: "Host-agency onboarding", body: "Vetted independent bouncers are paired with partner PSARA agencies, so every gig they accept is legal and insured." },
  { title: "Dispatch & GST SaaS", body: "A digital roster, live GPS tracking and automated GST-compliant split settlements replace phone calls and paper logs." },
];

export const interfaces = [
  {
    id: "client", label: "Client App & Web", who: "Event planners, venues, individuals",
    features: [
      ["Custom Booking Builder", "Filter by shift length (4h / 8h / 12h), dress code, height (6ft+) and language."],
      ["Instant upfront pricing", "An automated quote showing base rate, platform fee and GST. No negotiating."],
      ["Live map & dual-OTP attendance", "Watch arrival in real time, then verify with Start-OTP and End-OTP."],
      ["Masked calling & 24/7 SOS", "Privacy-protected VOIP calls and one-tap emergency escalation."],
    ],
    benefit: "No multi-agency price haggling. Your contact details stay private until confirmation, you pay for exact duty hours, and help is one tap away.",
  },
  {
    id: "agency", label: "PSARA Agency Portal", who: "Licensed agency managers",
    features: [
      ["Compliance-gated roster", "Digital storage for Telangana PSARA licence, Police Clearance Certificates and training proofs."],
      ["1-click order dispatch", "Instant WhatsApp and dashboard alerts with rapid guard assignment."],
      ["Automated split-payout ledger", "Escrow settlement tracking and downloadable GST tax invoices."],
    ],
    benefit: "Unverified staff can't be deployed by accident, dispatch takes under 2 minutes, and statutory accounting runs itself.",
  },
  {
    id: "bouncer", label: "Bouncer App", who: "Android-first worker app",
    features: [
      ["Vernacular interface", "Fully usable in English, Telugu and Hindi."],
      ["Geofenced selfie check-in", "Unlocks only within 150m of the venue pin to verify uniform and arrival."],
      ["Direct wage wallet", "Instant UPI or bank settlement the moment the End-OTP is entered."],
    ],
    benefit: "Accepting shifts is effortless, ghost-guard disputes disappear, and pay arrives on time with no middleman cuts.",
  },
];

export const usps = [
  { title: "100% PSARA & police-verified", body: "Every deployed guard is backed by an active state PSARA licence and verified police clearance, shielding clubs, venues and corporates from statutory fines and liability." },
  { title: "No-show replacement guarantee", body: "A live standby pool across partner agencies dispatches rapid backup when someone cancels last-minute, the biggest fear of every event planner." },
  { title: "Proof of presence", body: "The billable clock starts only inside the 150m geofence, after a live uniform photo and your Start-OTP. Never pay for late arrivals or substitutes." },
  { title: "Fair, direct, timely payouts", body: "Escrow split-settlements send net wages straight to the guard's UPI or bank right after End-OTP, attracting ex-servicemen and disciplined professionals." },
  { title: "Dressed to order", body: "Specify the exact presentation standard, from sharp black suits for five-star weddings to tactical attire for concerts and clubs." },
];

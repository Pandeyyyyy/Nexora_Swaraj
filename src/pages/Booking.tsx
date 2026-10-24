import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BadgeCheck, Camera, CheckCircle2, ChevronLeft, Clock, ImagePlus,
  Lock, MapPin, MessageCircle, Mic, Navigation, Phone, ShieldCheck, Star,
  AlertTriangle, Wallet, RotateCcw, Send, Sparkles, Timer, FileText, ChevronRight,
} from "lucide-react";
import { workers } from "../data";
import type { OfferMsg } from "../data";
import { CustomerBottomNav, Stars, TrustRing } from "../components/shared";
import type { Page } from "../components/shared";

/* ================= BOOKING + FAIRFARE ================= */
export function BookingFlow({
  go, lang, workerId, onLocked,
}: {
  go: (p: Page, wid?: string) => void; lang: "en" | "hi"; workerId: string; onLocked: (price: number) => void;
}) {
  const w = workers.find((x) => x.id === workerId) ?? workers[0];
  const [step, setStep] = useState(1);
  const [schedule, setSchedule] = useState<"asap" | "later">("asap");
  const [date, setDate] = useState("Tomorrow, 10:00 AM");
  const [address, setAddress] = useState("B-42, Laxmi Nagar, Delhi 110092");
  const [desc, setDesc] = useState("Kitchen tap leaking continuously, needs washer + tap check.");
  const [photos, setPhotos] = useState(2);
  const [offers, setOffers] = useState<OfferMsg[]>([
    { id: 1, from: "system", text: `FairFare started · ${w.name.split(" ")[0]}'s starting quote`, price: w.price + 150, time: "10:02" },
    { id: 2, from: "worker", text: "Namaste! Seen your photos — tap washer + visit charge. I can come in 20 mins.", price: w.price + 150, time: "10:03" },
  ]);
  const [input, setInput] = useState("");
  const [locked, setLocked] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [offers, typing, step]);

  const sendOffer = (price?: number, text?: string) => {
    const val = price ?? parseInt(input.replace(/[^0-9]/g, "")) ?? 0;
    if (!val && !text) return;
    const msg: OfferMsg = { id: Date.now(), from: "customer", text: text ?? `I can do ₹${val}. Can you come ASAP?`, price: val || undefined, time: "now" };
    setOffers((o) => [...o, msg]);
    setInput("");
    // worker counter simulation
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (val && val >= w.price) {
        const lockPrice = val;
        setOffers((o) => [...o,
          { id: Date.now() + 1, from: "worker", text: `Done! ₹${lockPrice} works for me. Locking price…`, price: lockPrice, time: "now" },
          { id: Date.now() + 2, from: "system", text: `Price locked at ₹${lockPrice} · No hidden charges after this`, price: lockPrice, time: "now" },
        ]);
        setLocked(lockPrice);
      } else if (val) {
        const counter = Math.max(w.price, Math.round((val + w.price + 150) / 2 / 10) * 10);
        setOffers((o) => [...o, { id: Date.now() + 1, from: "worker", text: `Slightly low for parts + visit. I can do ₹${counter} with 30-day warranty?`, price: counter, time: "now" }]);
      } else {
        setOffers((o) => [...o, { id: Date.now() + 1, from: "worker", text: "Sure — tell me your budget and I'll try my best!", time: "now" }]);
      }
    }, 1600);
  };

  const quickOffers = [w.price - 50, w.price, w.price + 50];

  return (
    <div className="page-enter mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 md:pb-16">
      <button onClick={() => go("worker-profile", w.id)} className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold ring-1 ring-[#1B4332]/12"><ChevronLeft className="h-4 w-4" /> {w.name}</button>

      {/* steps */}
      <div className="mt-4 flex items-center gap-1.5 sm:gap-2">
        {["Details", "FairFare", "Confirm"].map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-1.5">
            <div className={`flex flex-1 items-center gap-2 rounded-full px-3 py-2 text-[12px] font-extrabold sm:px-4 ${step > i + 1 ? "bg-[#2D6A4F] text-white" : step === i + 1 ? "bg-[#1B4332] text-white" : "bg-white text-[#8a8a8a] ring-1 ring-[#1B4332]/10"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${step >= i + 1 ? "bg-white/20" : "bg-[#1B4332]/10"}`}>{step > i + 1 ? "✓" : i + 1}</span> {s}
            </div>
            {i < 2 && <ChevronRight className="h-4 w-4 shrink-0 text-[#8a8a8a]" />}
          </div>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[1fr_400px]">
        <div>
          {step === 1 && (
            <div className="animate-slide-up rounded-[22px] bg-white p-5 ring-1 ring-[#1B4332]/10 card-shadow sm:p-6">
              <h2 className="text-[18px] font-extrabold">Tell {w.name.split(" ")[0]} about the job</h2>
              <p className="mt-1 text-[13px] font-semibold text-[#4A4A4A]">Clear details = accurate quote, no surprises.</p>

              <p className="mt-5 text-[12px] font-extrabold uppercase tracking-wide text-[#4A4A4A]">When? • ASAP / Schedule</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => setSchedule("asap")} className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-left ring-2 transition ${schedule === "asap" ? "bg-[#EFFAF1] ring-[#2D6A4F]" : "bg-[#FAF9F6] ring-[#1B4332]/10"}`}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E76F51] text-white"><Timer className="h-5 w-5" /></span>
                  <span><span className="block text-[13.5px] font-extrabold">ASAP</span><span className="block text-[11.5px] font-bold text-[#4A4A4A]">Arrives {w.eta}</span></span>
                </button>
                <button onClick={() => setSchedule("later")} className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-left ring-2 transition ${schedule === "later" ? "bg-[#EFFAF1] ring-[#2D6A4F]" : "bg-[#FAF9F6] ring-[#1B4332]/10"}`}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1B4332] text-white"><Clock className="h-5 w-5" /></span>
                  <span><span className="block text-[13.5px] font-extrabold">Schedule</span><span className="block text-[11.5px] font-bold text-[#4A4A4A]">Pick slot</span></span>
                </button>
              </div>
              {schedule === "later" && (
                <div className="animate-fade-in mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["Today, 4 PM", "Tomorrow, 10 AM", "Tomorrow, 2 PM", "Sun, 11 AM"].map((d) => (
                    <button key={d} onClick={() => setDate(d)} className={`rounded-2xl px-3 py-2.5 text-[12.5px] font-extrabold ring-1 transition ${date === d ? "bg-[#1B4332] text-white" : "bg-[#FAF9F6] ring-[#1B4332]/12"}`}>{d}</button>
                  ))}
                </div>
              )}

              <p className="mt-5 text-[12px] font-extrabold uppercase tracking-wide text-[#4A4A4A]">Address</p>
              <label className="mt-2 flex items-start gap-2.5 rounded-2xl bg-[#FAF9F6] p-3.5 ring-1 ring-[#1B4332]/10 focus-within:ring-[#2D6A4F]">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#E76F51]" />
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full bg-transparent text-[13.5px] font-semibold outline-none" />
              </label>

              <p className="mt-4 text-[12px] font-extrabold uppercase tracking-wide text-[#4A4A4A]">Describe the work</p>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="mt-2 w-full rounded-2xl bg-[#FAF9F6] p-3.5 text-[13.5px] font-semibold outline-none ring-1 ring-[#1B4332]/10 focus:ring-[#2D6A4F]" />

              <p className="mt-4 text-[12px] font-extrabold uppercase tracking-wide text-[#4A4A4A]">Photos (optional, helps quote)</p>
              <div className="mt-2 flex gap-2">
                {[1, 2].slice(0, photos).map((i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-2xl ring-1 ring-[#1B4332]/15">
                    <img src={i === 1 ? "https://images.pexels.com/photos/19140578/pexels-photo-19140578.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" : "https://images.pexels.com/photos/29226620/pexels-photo-29226620.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"} alt="Job" className="h-full w-full object-cover" />
                    <button onClick={() => setPhotos(photos - 1)} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[10px] text-white">✕</button>
                  </div>
                ))}
                <button onClick={() => setPhotos(3)} className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-dashed border-[#1B4332]/25 bg-[#FAF9F6] text-[#1B4332] transition hover:border-[#2D6A4F]">
                  <span className="text-center"><ImagePlus className="mx-auto h-5 w-5" /><span className="text-[10px] font-extrabold">Add</span></span>
                </button>
              </div>

              <button onClick={() => setStep(2)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1B4332] py-4 text-[15px] font-extrabold text-white transition hover:bg-[#2D6A4F] active:scale-[0.98]">
                Continue to FairFare <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-slide-up overflow-hidden rounded-[22px] bg-white ring-1 ring-[#1B4332]/10 card-shadow">
              <div className="bg-[#122b21] px-5 py-4 text-white">
                <p className="flex items-center gap-2 text-[13px] font-extrabold"><Sparkles className="h-4 w-4 text-[#F4A261]" /> FAIRFARE™ NEGOTIATION <span className="ml-auto flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10.5px]"><Lock className="h-3 w-3" /> {locked ? "LOCKED" : "OPEN"}</span></p>
                <p className="mt-1 text-[12px] font-medium text-white/60">Offer → Counter → Lock. Fair for you, fair for {w.name.split(" ")[0]}. No hidden charges after lock.</p>
              </div>
              <div className="max-h-[380px] space-y-3 overflow-y-auto bg-[#FAF9F6] p-4 sm:p-5">
                {offers.map((m) => (
                  <div key={m.id} className={`animate-chat-in flex ${m.from === "customer" ? "justify-end" : m.from === "system" ? "justify-center" : "justify-start"}`}>
                    {m.from === "system" ? (
                      <div className="max-w-[90%] rounded-2xl bg-[#1B4332]/8 px-4 py-2.5 text-center text-[12px] font-bold text-[#1B4332] ring-1 ring-[#1B4332]/15">
                        🔒 {m.text} {m.price && <span className="font-extrabold">₹{m.price}</span>}
                      </div>
                    ) : (
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 card-shadow ${m.from === "customer" ? "rounded-tr-md bg-[#1B4332] text-white" : "rounded-tl-md bg-white ring-1 ring-[#1B4332]/10"}`}>
                        {m.from === "worker" && <p className="mb-1 flex items-center gap-1 text-[10.5px] font-extrabold text-[#2D6A4F]"><BadgeCheck className="h-3 w-3" /> {w.name.split(" ")[0]} • verified</p>}
                        <p className={`text-[13.5px] font-semibold leading-relaxed ${m.from === "customer" ? "text-white" : "text-[#1A1A1A]"}`}>{m.text}</p>
                        {m.price && <p className={`mt-1.5 inline-block rounded-full px-3 py-1 text-[14px] font-extrabold ${m.from === "customer" ? "bg-white/15 text-white" : "bg-[#FEF6EC] text-[#E76F51] ring-1 ring-[#E76F51]/25"}`}>₹{m.price}</p>}
                        <p className={`mt-1 text-right text-[10px] font-bold ${m.from === "customer" ? "text-white/60" : "text-[#8a8a8a]"}`}>{m.time} ✓✓</p>
                      </div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start"><div className="flex gap-1 rounded-2xl rounded-tl-md bg-white px-4 py-3 ring-1 ring-[#1B4332]/10">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#1B4332]/40" style={{ animationDelay: `${i * 200}ms` }} />)}</div></div>
                )}
                <div ref={bottomRef} />
              </div>
              {locked ? (
                <div className="animate-slide-up border-t-2 border-[#2D6A4F] bg-[#EFFAF1] p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#2D6A4F] text-white"><Lock className="h-5 w-5" /></span>
                    <div className="flex-1"><p className="text-[15px] font-extrabold text-[#1B4332]">Final Agreed Price: ₹{locked}</p><p className="text-[12px] font-bold text-[#4A4A4A]">{schedule === "asap" ? `ASAP • arrives ${w.eta}` : date} • No changes without your approval</p></div>
                    <CheckCircle2 className="h-7 w-7 text-[#2D6A4F]" />
                  </div>
                  <button onClick={() => { onLocked(locked); setStep(3); }} className="mt-3 w-full rounded-2xl bg-[#1B4332] py-4 text-[15px] font-extrabold text-white transition hover:bg-[#2D6A4F]">Confirm booking at ₹{locked} →</button>
                </div>
              ) : (
                <div className="border-t border-[#1B4332]/10 bg-white p-3.5 sm:p-4">
                  <div className="mb-2.5 flex gap-2">
                    {quickOffers.map((p) => (
                      <button key={p} onClick={() => sendOffer(p)} className="flex-1 rounded-full bg-[#FAF9F6] py-2 text-[12.5px] font-extrabold text-[#1B4332] ring-1 ring-[#1B4332]/15 transition hover:bg-[#1B4332] hover:text-white">Offer ₹{p}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-full bg-[#FAF9F6] px-4 ring-1 ring-[#1B4332]/15 focus-within:ring-[#2D6A4F]">
                      <span className="text-[14px] font-extrabold text-[#1B4332]">₹</span>
                      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendOffer()} inputMode="numeric" placeholder="Your offer… e.g. 450" className="h-12 w-full bg-transparent text-[14px] font-bold outline-none" />
                    </div>
                    <button onClick={() => sendOffer()} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#E76F51] text-white transition hover:bg-[#c65a3a] active:scale-90"><Send className="h-5 w-5" /></button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <ConfirmBooking go={go} wId={w.id} price={locked ?? w.price} schedule={schedule} date={date} address={address} lang={lang} />
          )}
        </div>

        {/* worker mini */}
        <aside className="rounded-[22px] bg-white p-5 ring-1 ring-[#1B4332]/10 card-shadow lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <img src={w.photo} alt={w.name} className="h-16 w-16 rounded-2xl object-cover" />
            <div className="flex-1"><p className="flex items-center gap-1 text-[15px] font-extrabold">{w.name} <BadgeCheck className="h-4 w-4 fill-[#52B788] text-white" /></p><p className="text-[12px] font-semibold text-[#4A4A4A]">{w.service} • {w.distance} • {w.eta}</p></div>
            <TrustRing score={w.trustDNA} size={56} stroke={6} />
          </div>
          <div className="mt-4 space-y-2 rounded-2xl bg-[#FAF9F6] p-4 text-[12.5px] font-semibold text-[#4A4A4A] ring-1 ring-[#1B4332]/8">
            <p className="flex justify-between">Starting quote <span className="font-extrabold text-[#1A1A1A]">₹{w.price + 150}</span></p>
            <p className="flex justify-between">Your target <span className="font-extrabold text-[#2D6A4F]">₹{w.price} – ₹{w.price + 150}</span></p>
            <p className="flex justify-between">Platform fee <span className="font-extrabold text-[#2D6A4F]">FREE</span></p>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#EFFAF1] p-3.5 text-[12px] font-semibold text-[#1B4332] ring-1 ring-[#2D6A4F]/20">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Pay only after work is done & you confirm. Tips go 100% to the worker.
          </div>
        </aside>
      </div>
      <CustomerBottomNav page="booking" go={go} onBook={() => { }} />
    </div>
  );
}

function ConfirmBooking({ go, wId, price, schedule, date, address, lang }: { go: (p: Page, w?: string) => void; wId: string; price: number; schedule: string; date: string; address: string; lang: string }) {
  const w = workers.find((x) => x.id === wId)!;
  const fee = 0; const total = price + fee;
  return (
    <div className="animate-slide-up rounded-[22px] bg-white p-5 ring-1 ring-[#1B4332]/10 card-shadow sm:p-6">
      <p className="flex items-center gap-2 text-[18px] font-extrabold"><CheckCircle2 className="h-6 w-6 text-[#2D6A4F]" /> Review & confirm</p>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#EFFAF1] p-4 ring-1 ring-[#2D6A4F]/25">
        <Lock className="h-6 w-6 text-[#2D6A4F]" />
        <div><p className="text-[13px] font-bold text-[#1B4332]">FAIRFARE LOCKED</p><p className="text-[22px] font-extrabold text-[#1B4332]">₹{price} <span className="text-[12px] font-bold text-[#4A4A4A]">final • no hidden charges</span></p></div>
      </div>
      <div className="mt-4 space-y-2.5 text-[13.5px] font-semibold">
        <div className="flex gap-2.5"><MapPin className="h-5 w-5 shrink-0 text-[#E76F51]" /><span>{address}</span></div>
        <div className="flex gap-2.5"><Clock className="h-5 w-5 shrink-0 text-[#1B4332]" /><span>{schedule === "asap" ? `ASAP — arrives ${w.eta}` : date}</span></div>
        <div className="flex gap-2.5"><Wallet className="h-5 w-5 shrink-0 text-[#1B4332]" /><span>Pay after work • UPI / Cash / Card</span></div>
      </div>
      <div className="mt-4 rounded-2xl bg-[#FAF9F6] p-4 text-[13px] font-semibold ring-1 ring-[#1B4332]/8">
        <p className="flex justify-between py-0.5">Agreed price <span className="font-extrabold">₹{price}</span></p>
        <p className="flex justify-between py-0.5">Platform fee <span className="font-extrabold text-[#2D6A4F]">FREE</span></p>
        <p className="flex justify-between border-t border-dashed border-[#1B4332]/15 pt-2 text-[15px] font-extrabold">You'll pay <span className="text-[#1B4332]">₹{total}</span></p>
      </div>
      <button onClick={() => go("tracking", wId)} className="mt-4 w-full rounded-2xl bg-[#1B4332] py-4 text-[15px] font-extrabold text-white transition hover:bg-[#2D6A4F] active:scale-[0.98]">
        {lang === "hi" ? "बुकिंग पक्की करें ✓" : "Confirm booking ✓"}
      </button>
      <p className="mt-2.5 text-center text-[11.5px] font-bold text-[#8a8a8a]">Free cancellation within 10 mins • SOS & support always on</p>
    </div>
  );
}

/* ================= TRACKING ================= */
const stages = ["Requested", "Accepted", "On the Way", "In Progress", "Completed"];

export function Tracking({ go, workerId, price }: { go: (p: Page, w?: string) => void; lang: "en" | "hi"; workerId: string; price: number }) {
  const w = workers.find((x) => x.id === workerId) ?? workers[0];
  const [stage, setStage] = useState(2);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState([{ from: "worker", text: "Namaste! I'm nearby, reaching in 8 mins. 🙏" }]);
  const [msg, setMsg] = useState("");
  const [proof, setProof] = useState(false);

  useEffect(() => {
    if (stage >= 4) return;
    const t = setTimeout(() => setStage((s) => Math.min(4, s + 1)), 9000);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="page-enter mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 md:pb-16">
      <div className="flex items-center justify-between">
        <button onClick={() => go("customer-home")} className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold ring-1 ring-[#1B4332]/12"><ChevronLeft className="h-4 w-4" /> Home</button>
        <span className="rounded-full bg-[#1B4332] px-3.5 py-1.5 text-[12px] font-extrabold text-white">Booking #SH-2481 • ₹{price}</span>
      </div>

      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div>
          {/* ETA hero */}
          <div className="relative overflow-hidden rounded-[22px] bg-[#122b21] p-5 text-white card-shadow-lg sm:p-6">
            <div className="jaali-pattern absolute inset-0 opacity-40" />
            <div className="relative flex flex-wrap items-center gap-4">
              <div className="relative">
                <img src={w.photo} alt={w.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-[#52B788]" />
                <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full bg-[#2D6A4F] ring-2 ring-[#122b21]"><CheckCircle2 className="h-4 w-4" /></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[17px] font-extrabold">{w.name} <BadgeCheck className="h-4.5 w-4.5 fill-[#52B788] text-white" /></p>
                <p className="text-[12.5px] font-semibold text-white/70">{w.service} • ◆ {w.trustDNA} TrustDNA • {w.rating} ★</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-extrabold text-[#F4A261]"><Navigation className="h-4 w-4" /> {stage < 2 ? `Arriving ${w.eta}` : stage === 2 ? "Arriving in ~8 mins" : stage === 3 ? "At your home — work started" : "Work completed ✓"}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setChatOpen(!chatOpen)} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 transition hover:bg-white/20"><MessageCircle className="h-5 w-5" /></button>
                <button className="grid h-12 w-12 place-items-center rounded-full bg-[#E76F51] transition hover:bg-[#c65a3a]"><Phone className="h-5 w-5" /></button>
              </div>
            </div>
            {/* progress */}
            <div className="relative mt-5">
              <div className="absolute left-0 right-0 top-[15px] h-1 rounded-full bg-white/15" />
              <div className="absolute left-0 top-[15px] h-1 rounded-full bg-[#52B788] transition-all duration-700" style={{ width: `${(stage / (stages.length - 1)) * 100}%` }} />
              <div className="relative flex justify-between">
                {stages.map((s, i) => (
                  <div key={s} className="flex w-14 flex-col items-center gap-1.5 text-center">
                    <span className={`grid h-8 w-8 place-items-center rounded-full text-[12px] font-extrabold ring-2 transition ${i < stage ? "bg-[#52B788] text-white ring-[#52B788]" : i === stage ? "bg-white text-[#1B4332] ring-white animate-pulse-ring" : "bg-white/10 text-white/50 ring-white/20"}`}>
                      {i < stage ? "✓" : i + 1}
                    </span>
                    <span className={`text-[9.5px] font-extrabold leading-tight sm:text-[10.5px] ${i <= stage ? "text-white" : "text-white/40"}`}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* demo stepper */}
            <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-white/8 p-2.5 ring-1 ring-white/10">
              <span className="px-2 text-[11px] font-extrabold uppercase tracking-wide text-white/50">Demo: simulate →</span>
              {stages.map((s, i) => (
                <button key={s} onClick={() => setStage(i)} className={`rounded-full px-3 py-1.5 text-[11.5px] font-extrabold transition ${stage === i ? "bg-[#F4A261] text-[#122b21]" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>{s}</button>
              ))}
            </div>
          </div>

          {/* map-ish */}
          <div className="dot-grid relative mt-4 h-56 overflow-hidden rounded-[22px] bg-[#EDE8DA] ring-1 ring-[#1B4332]/12">
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 800 300">
              <path d="M-20,150 C200,120 350,200 820,140" stroke="#fff" strokeWidth="30" fill="none" strokeLinecap="round" />
              <path d="M300,-20 C320,100 280,200 310,320" stroke="#fff" strokeWidth="18" fill="none" />
              <path d="M-20,150 C200,120 350,200 820,140" stroke="#2D6A4F" strokeWidth="4" strokeDasharray="12 10" fill="none" />
            </svg>
            <div className="absolute left-[16%] top-1/2 -translate-y-1/2 text-center">
              <div className="animate-float-slow grid h-12 w-12 place-items-center rounded-full bg-[#E76F51] text-white ring-4 ring-white card-shadow-lg"><span className="text-lg font-black">{w.name[0]}</span></div>
              <p className="mt-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold card-shadow">{w.name.split(" ")[0]} • 0.4 km</p>
            </div>
            <div className="absolute right-[14%] top-1/2 -translate-y-1/2 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1B4332] text-white ring-4 ring-white card-shadow-lg"><MapPin className="h-5 w-5" /></div>
              <p className="mt-1 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold card-shadow">Your home</p>
            </div>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#122b21] px-4 py-1.5 text-[11.5px] font-extrabold text-white">Live location shared with family ✓</p>
          </div>

          {/* proof of work */}
          <div className="mt-4 rounded-[22px] bg-white p-5 ring-1 ring-[#1B4332]/10 card-shadow sm:p-6">
            <p className="flex items-center gap-2 text-[15px] font-extrabold"><Camera className="h-5 w-5 text-[#E76F51]" /> Proof of Work {stage >= 3 && <span className="rounded-full bg-[#EFFAF1] px-2.5 py-0.5 text-[11px] text-[#1B4332]">photos added</span>}</p>
            {stage >= 3 ? (
              <div className="animate-fade-in mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <figure className="overflow-hidden rounded-2xl ring-1 ring-[#1B4332]/12"><img src="https://images.pexels.com/photos/19140578/pexels-photo-19140578.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" alt="Before" className="h-36 w-full object-cover" /><figcaption className="bg-[#FAF9F6] py-1.5 text-center text-[11px] font-extrabold text-[#8a8a8a]">BEFORE</figcaption></figure>
                  <figure className="overflow-hidden rounded-2xl ring-2 ring-[#2D6A4F]"><img src="https://images.pexels.com/photos/29226620/pexels-photo-29226620.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" alt="After" className="h-36 w-full object-cover" /><figcaption className="bg-[#EFFAF1] py-1.5 text-center text-[11px] font-extrabold text-[#1B4332]">AFTER ✓ FIXED</figcaption></figure>
                </div>
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-2xl bg-[#FAF9F6] p-3.5 ring-1 ring-[#1B4332]/10">
                  <input type="checkbox" checked={proof} onChange={() => setProof(!proof)} className="mt-0.5 h-5 w-5 accent-[#1B4332]" />
                  <span className="text-[13px] font-bold">I confirm the work is done properly and photos match reality. <span className="text-[#8a8a8a]">(Required before payment)</span></span>
                </label>
                <button disabled={!proof} onClick={() => go("payment", w.id)} className={`mt-3 w-full rounded-2xl py-4 text-[15px] font-extrabold text-white transition ${proof ? "bg-[#1B4332] hover:bg-[#2D6A4F]" : "cursor-not-allowed bg-[#d8cfbe]"}`}>
                  Confirm & Pay ₹{price} →
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[13px] font-semibold text-[#4A4A4A]">{w.name.split(" ")[0]} will upload before/after photos once work starts. You'll confirm before paying — no photo, no payment.</p>
            )}
          </div>
        </div>

        {/* side: invoice + safety */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-[22px] bg-white p-5 ring-1 ring-[#1B4332]/10 card-shadow">
            <p className="flex items-center gap-2 text-[14px] font-extrabold"><FileText className="h-4 w-4" /> Live invoice</p>
            <div className="mt-3 space-y-1.5 text-[13px] font-semibold text-[#4A4A4A]">
              <p className="flex justify-between">FairFare locked price <span className="font-extrabold text-[#1A1A1A]">₹{price}</span></p>
              <p className="flex justify-between">Spare parts (bill attached) <span className="font-extrabold text-[#1A1A1A]">₹120</span></p>
              <p className="flex justify-between">Platform fee <span className="font-extrabold text-[#2D6A4F]">FREE</span></p>
              <p className="flex justify-between border-t border-dashed border-[#1B4332]/15 pt-2 text-[15px] font-extrabold text-[#1A1A1A]">Total <span className="text-[#1B4332]">₹{price + 120}</span></p>
            </div>
          </div>
          <div className="rounded-[22px] bg-[#FFF1E8] p-5 ring-1 ring-[#E76F51]/25">
            <p className="flex items-center gap-2 text-[14px] font-extrabold text-[#9c3d1e]"><AlertTriangle className="h-4 w-4" /> Safety centre</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="rounded-2xl bg-[#E76F51] py-3 text-[13px] font-extrabold text-white">SOS Alert</button>
              <button className="rounded-2xl bg-white py-3 text-[13px] font-extrabold text-[#9c3d1e] ring-1 ring-[#E76F51]/30">Report issue</button>
            </div>
            <p className="mt-2.5 text-[11.5px] font-semibold text-[#9c3d1e]/80">Job GPS + worker ID shared with 2 family contacts. Support: 1800-SAHARAA</p>
          </div>
          {/* chat */}
          {chatOpen && (
            <div className="animate-slide-up overflow-hidden rounded-[22px] bg-white ring-1 ring-[#1B4332]/12 card-shadow-lg">
              <p className="bg-[#1B4332] px-4 py-3 text-[13px] font-extrabold text-white">Chat with {w.name.split(" ")[0]} • online</p>
              <div className="max-h-48 space-y-2 overflow-y-auto bg-[#FAF9F6] p-3.5">
                {chat.map((c, i) => (
                  <p key={i} className={`w-fit max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] font-semibold ${c.from === "me" ? "ml-auto bg-[#1B4332] text-white rounded-tr-md" : "bg-white ring-1 ring-[#1B4332]/10 rounded-tl-md"}`}>{c.text}</p>
                ))}
              </div>
              <div className="flex gap-2 p-2.5">
                <input value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && msg) { setChat([...chat, { from: "me", text: msg }]); setMsg(""); setTimeout(() => setChat((c) => [...c, { from: "worker", text: "Ji, noted! 👍" }]), 1200); } }} placeholder="Type…" className="h-10 w-full rounded-full bg-[#FAF9F6] px-4 text-[13px] font-semibold outline-none ring-1 ring-[#1B4332]/12" />
                <button onClick={() => { if (msg) { setChat([...chat, { from: "me", text: msg }]); setMsg(""); } }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1B4332] text-white"><Mic className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </aside>
      </div>
      <CustomerBottomNav page="tracking" go={go} onBook={() => go("booking", w.id)} />
    </div>
  );
}

/* ================= PAYMENT & REVIEW ================= */
export function PaymentReview({ go, lang, workerId, price }: { go: (p: Page, w?: string) => void; lang: "en" | "hi"; workerId: string; price: number }) {
  const w = workers.find((x) => x.id === workerId) ?? workers[0];
  const [stars, setStars] = useState(5);
  const [tip, setTip] = useState(50);
  const [review, setReview] = useState("");
  const [method, setMethod] = useState("UPI");
  const [paid, setPaid] = useState(false);
  const total = price + 120 + tip;

  if (paid) {
    return (
      <div className="page-enter mx-auto max-w-lg px-4 pb-28 pt-10 text-center sm:px-6">
        <div className="animate-slide-up rounded-[24px] bg-white p-8 ring-1 ring-[#1B4332]/10 card-shadow-lg">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#EFFAF1]"><CheckCircle2 className="h-10 w-10 text-[#2D6A4F]" /></div>
          <h1 className="font-display mt-4 text-[26px] font-black">Shukriya! 🙏</h1>
          <p className="mt-2 text-[14px] font-medium text-[#4A4A4A]">₹{total} paid to {w.name}. <span className="font-bold text-[#2D6A4F]">₹{tip} tip goes 100% to {w.name.split(" ")[0]}.</span> You helped a local family earn today.</p>
          <div className="mt-5 rounded-2xl bg-[#EFFAF1] p-4 text-left ring-1 ring-[#2D6A4F]/20">
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#1B4332]">Your livelihood impact</p>
            <p className="mt-1 text-[13.5px] font-bold">This was {w.name.split(" ")[0]}'s <span className="text-[#2D6A4F]">{w.jobs + 1}th job</span> on Saharaa. 68% of your payment stays in your neighbourhood.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => go("booking", w.id)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#1B4332] py-3.5 text-[13.5px] font-extrabold text-white"><RotateCcw className="h-4 w-4" /> Rebook</button>
            <button onClick={() => go("customer-home")} className="rounded-2xl py-3.5 text-[13.5px] font-extrabold text-[#1B4332] ring-1 ring-[#1B4332]/25">Home</button>
          </div>
          <button onClick={() => go("impact")} className="mt-3 w-full rounded-2xl bg-[#FEF6EC] py-3 text-[13px] font-extrabold text-[#c65a3a] ring-1 ring-[#E76F51]/25">See community impact →</button>
        </div>
        <CustomerBottomNav page="payment" go={go} onBook={() => go("booking", w.id)} />
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 md:pb-16">
      <h1 className="font-display text-[24px] font-black tracking-tight sm:text-[30px]">Payment & review</h1>
      <div className="mt-4 grid items-start gap-5 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {/* invoice */}
          <div className="rounded-[22px] bg-white p-5 ring-1 ring-[#1B4332]/10 card-shadow sm:p-6">
            <p className="flex items-center justify-between text-[15px] font-extrabold">Digital invoice <span className="rounded-full bg-[#EFFAF1] px-2.5 py-1 text-[11px] text-[#1B4332]">#SH-2481 • GST incl.</span></p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#FAF9F6] p-3.5 ring-1 ring-[#1B4332]/8">
              <img src={w.photo} alt={w.name} className="h-12 w-12 rounded-xl object-cover" />
              <div className="flex-1"><p className="flex items-center gap-1 text-[13.5px] font-extrabold">{w.name} <BadgeCheck className="h-3.5 w-3.5 fill-[#52B788] text-white" /></p><p className="text-[11.5px] font-semibold text-[#4A4A4A]">Tap repair • 45 mins • Photos confirmed ✓</p></div>
              <TrustRing score={w.trustDNA} size={48} stroke={5} />
            </div>
            <div className="mt-3 space-y-1.5 text-[13.5px] font-semibold text-[#4A4A4A]">
              <p className="flex justify-between">FairFare locked price <span className="font-extrabold text-[#1A1A1A]">₹{price}</span></p>
              <p className="flex justify-between">Spare parts (receipt ✓) <span className="font-extrabold text-[#1A1A1A]">₹120</span></p>
              <p className="flex justify-between">Platform fee <span className="font-extrabold text-[#2D6A4F]">FREE</span></p>
            </div>
            <p className="mt-4 text-[12px] font-extrabold uppercase tracking-wide text-[#4A4A4A]">Add a tip? <span className="text-[#2D6A4F]">100% goes to {w.name.split(" ")[0]}</span></p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[0, 30, 50, 100].map((t) => (
                <button key={t} onClick={() => setTip(t)} className={`rounded-2xl py-2.5 text-[13px] font-extrabold ring-1 transition ${tip === t ? "bg-[#1B4332] text-white ring-[#1B4332]" : "bg-[#FAF9F6] ring-[#1B4332]/12"}`}>{t === 0 ? "No tip" : `₹${t}`}</button>
              ))}
            </div>
            <p className="mt-4 text-[12px] font-extrabold uppercase tracking-wide text-[#4A4A4A]">Pay via</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {["UPI", "Card", "Cash"].map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={`rounded-2xl py-3 text-[13px] font-extrabold ring-1 transition ${method === m ? "bg-[#EFFAF1] text-[#1B4332] ring-[#2D6A4F]" : "bg-[#FAF9F6] ring-[#1B4332]/12"}`}>{m}</button>
              ))}
            </div>
          </div>
          {/* review */}
          <div className="rounded-[22px] bg-white p-5 ring-1 ring-[#1B4332]/10 card-shadow sm:p-6">
            <p className="text-[15px] font-extrabold">Rate {w.name.split(" ")[0]}'s work</p>
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setStars(s)} aria-label={`${s} stars`} className="transition active:scale-90">
                  <Star className={`h-10 w-10 transition ${s <= stars ? "fill-[#F4A261] text-[#F4A261]" : "fill-[#EFE9DD] text-[#EFE9DD] hover:fill-[#F4A261]/50"}`} />
                </button>
              ))}
            </div>
            <p className="mt-1 text-[12.5px] font-bold text-[#4A4A4A]">{["", "Needs improvement", "Okay", "Good", "Great!", "Outstanding! 🌟"][stars]} — your review updates {w.name.split(" ")[0]}'s TrustDNA.</p>
            <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={3} placeholder={lang === "hi" ? "अपना अनुभव लिखें… (वैकल्पिक)" : "Write a few words… (optional, means a lot to workers)"} className="mt-3 w-full rounded-2xl bg-[#FAF9F6] p-3.5 text-[13.5px] font-semibold outline-none ring-1 ring-[#1B4332]/10 focus:ring-[#2D6A4F]" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["On time", "Clean work", "Fair price", "Polite", "Expert"].map((t) => (
                <button key={t} onClick={() => setReview((r) => r ? `${r} • ${t}` : t)} className="rounded-full bg-[#FAF9F6] px-3 py-1.5 text-[11.5px] font-bold ring-1 ring-[#1B4332]/12 hover:bg-[#EFFAF1]">+ {t}</button>
              ))}
            </div>
          </div>
        </div>
        <aside className="rounded-[22px] bg-[#122b21] p-5 text-white card-shadow-lg sm:p-6 lg:sticky lg:top-24">
          <Stars rating={stars} />
          <p className="mt-3 flex justify-between text-[13px] font-semibold text-white/70">Subtotal <span className="text-white font-extrabold">₹{price + 120}</span></p>
          <p className="mt-1 flex justify-between text-[13px] font-semibold text-white/70">Tip (to worker) <span className="text-[#F4A261] font-extrabold">₹{tip}</span></p>
          <p className="font-display mt-2 flex justify-between border-t border-white/10 pt-3 text-[24px] font-black">Total <span>₹{total}</span></p>
          <button onClick={() => setPaid(true)} className="mt-4 w-full rounded-2xl bg-[#E76F51] py-4 text-[15px] font-extrabold text-white transition hover:bg-[#F4A261] hover:text-[#122b21] active:scale-[0.98]">
            Pay ₹{total} via {method} →
          </button>
          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-bold text-white/50"><ShieldCheck className="h-3.5 w-3.5" /> Secure • Receipt on SMS + WhatsApp</p>
          <button onClick={() => go("booking", w.id)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/10 py-3 text-[13px] font-extrabold ring-1 ring-white/15"><RotateCcw className="h-4 w-4" /> Rebook this worker</button>
        </aside>
      </div>
      <CustomerBottomNav page="payment" go={go} onBook={() => go("booking", w.id)} />
    </div>
  );
}

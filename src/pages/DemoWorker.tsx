import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, MapPin,
  RefreshCw, ShieldCheck, Sparkles, AlertCircle,
  CheckCheck, Send, XCircle, Navigation, Camera
} from "lucide-react";
import { workers, DEFAULT_DEMO_WORKER_ID } from "../data";
import {
  getDemoBookings,
  submitDemoOffer,
  acceptDemoOffer,
  updateDemoBookingStatus,
  type DemoBooking,
  type DemoOffer,
  type DemoBookingStatus
} from "../lib/demoBookings";
import type { Page } from "../components/shared";

export function DemoWorkerDashboard({
  go,
  lang: _lang,
  initialWorkerId = DEFAULT_DEMO_WORKER_ID,
}: {
  go: (p: Page, opts?: any) => void;
  lang: "en" | "hi";
  initialWorkerId?: string;
}) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(() => {
    // Check if there are existing bookings and default to worker with bookings
    const all = getDemoBookings();
    if (all.length > 0) {
      const workerWithBooking = all.find((b) => b.worker_id);
      if (workerWithBooking) return workerWithBooking.worker_id;
    }
    return initialWorkerId;
  });

  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>("");
  const [counterMsg, setCounterMsg] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const currentWorker = workers.find((w) => w.id === selectedWorkerId) || workers[0];

  const loadBookings = useCallback(() => {
    setActionError(null);
    const workerBookings = getDemoBookings(selectedWorkerId);
    setBookings(workerBookings);
    if (workerBookings.length > 0 && !activeBookingId) {
      setActiveBookingId(workerBookings[0].id);
    } else if (workerBookings.length === 0) {
      setActiveBookingId(null);
    }
  }, [selectedWorkerId, activeBookingId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const activeBooking = bookings.find((b) => b.id === activeBookingId) || bookings[0] || null;

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const handleWorkerAccept = (bookingId: string, offer: DemoOffer) => {
    try {
      setActionError(null);
      acceptDemoOffer(bookingId, offer.id, "worker");
      showToastMsg(`Accepted customer offer at ₹${offer.offered_price}! Price is now locked.`);
      loadBookings();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to accept offer");
    }
  };

  const handleWorkerCounter = (bookingId: string) => {
    try {
      setActionError(null);
      const priceVal = parseInt(counterPrice.replace(/[^0-9]/g, ""), 10);
      if (!priceVal || priceVal <= 0) {
        setActionError("Please enter a valid counteroffer amount greater than zero.");
        return;
      }
      submitDemoOffer(bookingId, "worker", priceVal, counterMsg || `Worker countered with ₹${priceVal}`);
      setCounterPrice("");
      setCounterMsg("");
      showToastMsg(`Counteroffer of ₹${priceVal} sent to customer!`);
      loadBookings();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to submit counteroffer");
    }
  };

  const handleWorkerStatusAdvance = (bookingId: string, nextStatus: DemoBookingStatus, note?: string) => {
    try {
      setActionError(null);
      updateDemoBookingStatus(bookingId, nextStatus, note);
      showToastMsg(`Booking moved to ${nextStatus.replace(/_/g, " ").toUpperCase()} ✓`);
      loadBookings();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleWorkerDecline = (bookingId: string) => {
    try {
      setActionError(null);
      updateDemoBookingStatus(bookingId, "cancelled", "Worker declined the service request");
      showToastMsg("Booking declined and marked cancelled.");
      loadBookings();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to decline booking");
    }
  };

  // Find workers with demo bookings count
  const allBookings = getDemoBookings();
  const getBookingCount = (wId: string) => allBookings.filter((b) => b.worker_id === wId).length;

  return (
    <div className="page-enter mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-16">
      {/* Toast */}
      {toast && (
        <div className="animate-slide-up fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#122b21] px-5 py-3 text-[13px] font-extrabold text-white shadow-2xl border border-[#52B788]/30">
          {toast}
        </div>
      )}

      {/* Mode Banner */}
      <div className="rounded-[22px] border border-dashed border-[#E76F51]/50 bg-[#FEF6EC] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#E76F51] px-2.5 py-0.5 text-[11px] font-black uppercase text-white">
                Hackathon Mode
              </span>
              <h1 className="text-[18px] font-extrabold text-[#8A4B10]">
                Demo Worker Dashboard <span className="text-xs font-bold text-[#E76F51]">• SIMULATED DATA</span>
              </h1>
            </div>
            <p className="mt-1 text-xs font-semibold text-[#6B5A4B] max-w-2xl leading-relaxed">
              Safe judging environment: Test assigned bookings, FairFare counteroffers, and lifecycle advancement without needing live Supabase worker credentials. All data is sandboxed in your current browser.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => go("customer-home")}
              className="rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-[#8A4B10] ring-1 ring-[#E76F51]/30 hover:bg-[#FAF9F6] transition"
            >
              Switch to Customer Marketplace →
            </button>
            <button
              onClick={loadBookings}
              title="Refresh demo bookings"
              className="grid h-9 w-9 place-items-center rounded-full bg-white ring-1 ring-[#E76F51]/30 text-[#8A4B10] hover:bg-[#FAF9F6]"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Worker Selector Strip */}
      <div className="mt-5 rounded-[22px] bg-white p-4 sm:p-5 ring-1 ring-[#1B4332]/10 card-shadow">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-extrabold text-[#1B4332]">
            Select Simulated Worker Persona ({workers.length} available)
          </p>
          <span className="text-[11px] font-bold text-[#8a8a8a]">
            {allBookings.length} total demo bookings in storage
          </span>
        </div>

        <div className="no-scrollbar mt-3 -mx-2 flex gap-2.5 overflow-x-auto px-2 pb-1">
          {workers.map((w) => {
            const count = getBookingCount(w.id);
            const isSelected = w.id === selectedWorkerId;
            return (
              <button
                key={w.id}
                onClick={() => {
                  setSelectedWorkerId(w.id);
                  setActiveBookingId(null);
                }}
                className={`flex shrink-0 items-center gap-2.5 rounded-2xl p-2.5 pr-4 text-left transition ${
                  isSelected
                    ? "bg-[#1B4332] text-white ring-2 ring-[#1B4332]"
                    : "bg-[#FAF9F6] ring-1 ring-[#1B4332]/10 hover:ring-[#1B4332]/30"
                }`}
              >
                <img
                  src={w.photo}
                  alt={w.name}
                  className="h-10 w-10 rounded-xl object-cover"
                />
                <div className="leading-tight">
                  <p className="text-[12.5px] font-extrabold flex items-center gap-1">
                    {w.name.split(" ")[0]}
                    {count > 0 && (
                      <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isSelected ? "bg-[#E76F51] text-white" : "bg-[#1B4332] text-white"
                      }`}>
                        {count}
                      </span>
                    )}
                  </p>
                  <p className={`text-[10.5px] font-semibold ${isSelected ? "text-white/70" : "text-[#4A4A4A]"}`}>
                    {w.service}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Worker Info Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#122b21] p-4 text-white card-shadow-lg sm:p-5">
        <div className="flex items-center gap-3">
          <img
            src={currentWorker.photo}
            alt={currentWorker.name}
            className="h-14 w-14 rounded-2xl object-cover ring-2 ring-[#52B788]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-extrabold">{currentWorker.name}</h2>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold text-[#F4A261]">
                SIMULATED PROFILE
              </span>
            </div>
            <p className="text-xs font-semibold text-white/70">
              {currentWorker.service} • {currentWorker.area} • Starts ₹{currentWorker.price}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-white/80">
          <span className="rounded-xl bg-white/10 px-3 py-1.5">
            📋 {bookings.length} assigned demo {bookings.length === 1 ? "booking" : "bookings"}
          </span>
          <button
            onClick={() => go("booking", currentWorker.id)}
            className="rounded-xl bg-[#E76F51] px-3.5 py-1.5 font-extrabold text-white transition hover:bg-[#c65a3a]"
          >
            + Create Booking for {currentWorker.name.split(" ")[0]}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="animate-fade-in mt-3 flex items-center gap-2 rounded-2xl bg-[#FFEBEE] px-4 py-3 text-[12.5px] font-bold text-[#C62828] ring-1 ring-[#EF5350]/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#C62828]" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Workspace */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[340px_1fr]">
        {/* Bookings Queue */}
        <div className="space-y-3">
          <p className="text-[14px] font-extrabold text-[#1A1A1A]">
            Assigned Bookings ({bookings.length})
          </p>

          {bookings.length === 0 ? (
            <div className="rounded-[20px] border-2 border-dashed border-[#1B4332]/15 bg-white p-7 text-center">
              <p className="text-[14px] font-extrabold text-[#1A1A1A]">No demo bookings yet</p>
              <p className="mt-1 text-xs font-semibold text-[#4A4A4A] leading-relaxed">
                No customer has booked {currentWorker.name} in this browser session.
              </p>
              <button
                onClick={() => go("booking", currentWorker.id)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#2D6A4F]"
              >
                Simulate a customer booking →
              </button>
            </div>
          ) : (
            bookings.map((b) => {
              const isSelected = b.id === (activeBooking?.id || bookings[0].id);
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setActiveBookingId(b.id);
                    setActionError(null);
                  }}
                  className={`w-full rounded-[20px] p-4 text-left transition ${
                    isSelected
                      ? "bg-white ring-2 ring-[#2D6A4F] card-shadow-lg"
                      : "bg-white/80 ring-1 ring-[#1B4332]/10 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-black text-[#8A4B10]">
                      {b.booking_number}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        b.booking_status === "accepted"
                          ? "bg-[#2D6A4F] text-white"
                          : b.booking_status === "negotiating"
                          ? "bg-[#E76F51] text-white"
                          : b.booking_status === "completed"
                          ? "bg-[#1B4332] text-white"
                          : b.booking_status === "cancelled"
                          ? "bg-gray-200 text-gray-700"
                          : "bg-[#FEF6EC] text-[#9c3d1e]"
                      }`}
                    >
                      {b.booking_status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="mt-2 text-[14px] font-extrabold text-[#1A1A1A] truncate">
                    {b.job_title}
                  </p>
                  <p className="text-xs font-semibold text-[#4A4A4A] truncate">
                    {b.customer?.full_name || "Customer"} • {b.service_address.split(",")[0]}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between border-t border-[#1B4332]/8 pt-2">
                    <span className="text-[11px] font-semibold text-[#8a8a8a]">
                      {b.offers.length} {b.offers.length === 1 ? "offer" : "offers"}
                    </span>
                    <span className="text-[14px] font-black text-[#1B4332]">
                      ₹{b.locked_price}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Booking Details & Actions */}
        {activeBooking ? (
          <div className="space-y-4">
            {/* Header Card */}
            <div className="rounded-[22px] bg-white p-5 sm:p-6 ring-1 ring-[#1B4332]/10 card-shadow">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1B4332]/8 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[18px] font-black text-[#1A1A1A]">
                      {activeBooking.job_title}
                    </h3>
                    <span className="rounded-full bg-[#1B4332]/10 px-2.5 py-0.5 text-[10.5px] font-mono font-extrabold text-[#1B4332]">
                      {activeBooking.booking_number}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#4A4A4A] flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#E76F51]" />
                    {activeBooking.service_address}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-extrabold uppercase text-[#8a8a8a]">
                    Agreed / Current Price
                  </p>
                  <p className="text-[24px] font-black text-[#1B4332]">
                    ₹{activeBooking.locked_price}
                  </p>
                </div>
              </div>

              {/* Status & Lifecycle Actions */}
              <div className="mt-4 rounded-2xl bg-[#FAF9F6] p-4 ring-1 ring-[#1B4332]/8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#4A4A4A]">
                    Current Status: <strong className="text-[#1A1A1A] uppercase">{activeBooking.booking_status.replace(/_/g, " ")}</strong>
                  </span>
                  <span className="text-[11px] font-semibold text-[#8a8a8a]">
                    Created: {new Date(activeBooking.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Worker action buttons according to status */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeBooking.booking_status === "accepted" && (
                    <button
                      onClick={() => handleWorkerStatusAdvance(activeBooking.id, "on_the_way")}
                      className="flex items-center gap-1.5 rounded-xl bg-[#1B4332] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#2D6A4F]"
                    >
                      <Navigation className="h-4 w-4" /> Start Travel (Mark On The Way) →
                    </button>
                  )}

                  {activeBooking.booking_status === "on_the_way" && (
                    <button
                      onClick={() => handleWorkerStatusAdvance(activeBooking.id, "in_progress")}
                      className="flex items-center gap-1.5 rounded-xl bg-[#2D6A4F] px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1B4332]"
                    >
                      <Camera className="h-4 w-4" /> Arrived On Site (Start Work) →
                    </button>
                  )}

                  {activeBooking.booking_status === "in_progress" && (
                    <button
                      onClick={() => handleWorkerStatusAdvance(activeBooking.id, "completed")}
                      className="flex items-center gap-1.5 rounded-xl bg-[#1B4332] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#2D6A4F]"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#52B788]" /> Mark Job Completed ✓
                    </button>
                  )}

                  {["pending", "negotiating", "accepted", "on_the_way"].includes(activeBooking.booking_status) && (
                    <button
                      onClick={() => handleWorkerDecline(activeBooking.id)}
                      className="flex items-center gap-1 rounded-xl bg-white px-3.5 py-2.5 text-xs font-extrabold text-[#C62828] ring-1 ring-[#EF5350]/30 hover:bg-[#FFEBEE] transition"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Decline / Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <p className="text-xs font-extrabold uppercase text-[#4A4A4A]">Customer Job Description</p>
                <p className="mt-1 rounded-xl bg-[#FAF9F6] p-3 text-xs font-semibold text-[#1A1A1A] leading-relaxed ring-1 ring-[#1B4332]/8">
                  {activeBooking.job_description}
                </p>
              </div>
            </div>

            {/* FairFare Negotiation Workspace */}
            <div className="rounded-[22px] bg-white p-5 sm:p-6 ring-1 ring-[#1B4332]/10 card-shadow">
              <div className="flex items-center justify-between border-b border-[#1B4332]/8 pb-3">
                <h4 className="flex items-center gap-2 text-[15px] font-extrabold text-[#1B4332]">
                  <Sparkles className="h-4 w-4 text-[#E76F51]" />
                  FairFare™ Negotiation Engine (Worker View)
                </h4>
                <span className="rounded-full bg-[#1B4332]/10 px-2.5 py-0.5 text-xs font-black text-[#1B4332]">
                  Round {activeBooking.offers.length}
                </span>
              </div>

              {/* Offer History */}
              <div className="mt-4 space-y-2.5">
                {activeBooking.offers.map((offer) => {
                  const isWorker = offer.proposer_role === "worker";
                  const isPending = offer.offer_status === "pending";
                  return (
                    <div
                      key={offer.id}
                      className={`flex ${isWorker ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 card-shadow ${
                          isWorker
                            ? "bg-[#1B4332] text-white rounded-tr-sm"
                            : "bg-[#FAF9F6] ring-1 ring-[#1B4332]/12 rounded-tl-sm text-[#1A1A1A]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className={`text-[10px] font-extrabold uppercase ${isWorker ? "text-white/70" : "text-[#2D6A4F]"}`}>
                            {isWorker ? "You (Worker)" : "Customer (Priya Sharma)"} • Round {offer.round_number}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                              offer.offer_status === "accepted"
                                ? "bg-[#2D6A4F] text-white"
                                : offer.offer_status === "pending"
                                ? "bg-[#E76F51] text-white"
                                : "bg-black/10 text-gray-700"
                            }`}
                          >
                            {offer.offer_status}
                          </span>
                        </div>

                        <p className="text-[13px] font-semibold">{offer.message || `Offered ₹${offer.offered_price}`}</p>
                        <p className={`mt-1 text-[17px] font-black ${isWorker ? "text-[#52B788]" : "text-[#E76F51]"}`}>
                          ₹{offer.offered_price}
                        </p>
                        <p className={`mt-0.5 text-right text-[10px] font-semibold ${isWorker ? "text-white/60" : "text-[#8a8a8a]"}`}>
                          {new Date(offer.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>

                        {/* If customer submitted an offer and it is pending, worker can accept */}
                        {!isWorker && isPending && (
                          <div className="mt-3 border-t border-black/10 pt-2 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#2D6A4F]">Eligible to accept:</span>
                            <button
                              onClick={() => handleWorkerAccept(activeBooking.id, offer)}
                              className="rounded-full bg-[#1B4332] px-4 py-1.5 text-xs font-extrabold text-white transition hover:bg-[#2D6A4F]"
                            >
                              Accept ₹{offer.offered_price} ✓
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Worker Counteroffer Submission Form */}
              {(activeBooking.booking_status === "pending" || activeBooking.booking_status === "negotiating") && (
                <div className="mt-5 border-t border-[#1B4332]/10 pt-4">
                  <p className="text-xs font-extrabold uppercase text-[#4A4A4A]">Submit Worker Counteroffer</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <div className="flex flex-1 min-w-[140px] items-center gap-1.5 rounded-2xl bg-[#FAF9F6] px-3.5 py-2 ring-1 ring-[#1B4332]/15 focus-within:ring-[#2D6A4F]">
                      <span className="text-xs font-black text-[#1B4332]">₹</span>
                      <input
                        value={counterPrice}
                        onChange={(e) => setCounterPrice(e.target.value)}
                        placeholder="Counter price (e.g. 350)"
                        inputMode="numeric"
                        className="w-full bg-transparent text-xs font-bold outline-none"
                      />
                    </div>
                    <input
                      value={counterMsg}
                      onChange={(e) => setCounterMsg(e.target.value)}
                      placeholder="Optional reason (e.g. Includes inspection & parts warranty)"
                      className="flex-[2] min-w-[200px] rounded-2xl bg-[#FAF9F6] px-3.5 py-2 text-xs font-semibold ring-1 ring-[#1B4332]/15 outline-none focus:ring-[#2D6A4F]"
                    />
                    <button
                      onClick={() => handleWorkerCounter(activeBooking.id)}
                      className="flex items-center gap-1.5 rounded-2xl bg-[#E76F51] px-5 py-2 text-xs font-extrabold text-white transition hover:bg-[#c65a3a]"
                    >
                      <Send className="h-3.5 w-3.5" /> Counter Offer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Audit Timeline */}
            <div className="rounded-[22px] bg-white p-5 sm:p-6 ring-1 ring-[#1B4332]/10 card-shadow">
              <div className="flex items-center justify-between border-b border-[#1B4332]/8 pb-3">
                <h4 className="flex items-center gap-2 text-[14px] font-extrabold text-[#1A1A1A]">
                  <ShieldCheck className="h-4 w-4 text-[#2D6A4F]" />
                  Simulated Booking Milestones & Audit Timeline
                </h4>
                <span className="text-[11px] font-bold text-[#8a8a8a]">
                  {activeBooking.events.length} audit entries
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {activeBooking.events.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EFFAF1] text-[#2D6A4F] ring-1 ring-[#2D6A4F]/20">
                      <CheckCheck className="h-3 w-3" />
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-[#1A1A1A]">{evt.notes || evt.event_type}</p>
                      <p className="text-[10.5px] font-semibold text-[#8a8a8a]">
                        {new Date(evt.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} • Actor: {evt.actor_id || "System"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

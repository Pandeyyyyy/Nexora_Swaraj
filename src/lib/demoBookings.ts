import { isDemoWorkerId, workers } from "../data";

export type DemoBookingStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "on_the_way"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DemoOfferRole = "customer" | "worker";

export interface DemoOffer {
  id: string;
  booking_id: string;
  proposer_id: string;
  proposer_role: DemoOfferRole;
  offered_price: number;
  message: string | null;
  offer_status: "pending" | "countered" | "accepted" | "expired";
  round_number: number;
  created_at: string;
}

export interface DemoEvent {
  id: string;
  booking_id: string;
  actor_id: string | null;
  event_type: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DemoBooking {
  id: string;
  booking_number: string;
  customer_id: string;
  worker_id: string;
  service_id: string;
  job_title: string;
  job_description: string;
  service_address: string;
  service_location: string;
  booking_type: "asap" | "schedule";
  scheduled_at: string | null;
  locked_price: number;
  spare_parts_approved: boolean;
  spare_parts_amount: number;
  tip_amount: number;
  total_amount: number;
  booking_status: DemoBookingStatus;
  payment_status: string;
  created_at: string;
  updated_at: string;
  offers: DemoOffer[];
  events: DemoEvent[];
  worker?: {
    id: string;
    full_name: string;
    hindi_name?: string;
    avatar_url?: string;
    phone?: string;
  };
  customer?: {
    id: string;
    full_name: string;
    phone?: string;
  };
}

export const STORAGE_KEY = "saharaa_demo_bookings_v1";

const validStatuses = new Set<DemoBookingStatus>([
  "pending",
  "negotiating",
  "accepted",
  "on_the_way",
  "in_progress",
  "completed",
  "cancelled",
]);

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Validates a single DemoOffer object from storage.
 */
function isValidDemoOffer(val: unknown): val is DemoOffer {
  if (!val || typeof val !== "object") return false;
  const o = val as Partial<DemoOffer>;
  return (
    typeof o.id === "string" &&
    typeof o.booking_id === "string" &&
    typeof o.proposer_id === "string" &&
    (o.proposer_role === "customer" || o.proposer_role === "worker") &&
    typeof o.offered_price === "number" &&
    Number.isFinite(o.offered_price) &&
    o.offered_price > 0 &&
    (o.offer_status === "pending" ||
      o.offer_status === "countered" ||
      o.offer_status === "accepted" ||
      o.offer_status === "expired") &&
    typeof o.round_number === "number" &&
    typeof o.created_at === "string"
  );
}

/**
 * Validates a single DemoEvent object from storage.
 */
function isValidDemoEvent(val: unknown): val is DemoEvent {
  if (!val || typeof val !== "object") return false;
  const e = val as Partial<DemoEvent>;
  return (
    typeof e.id === "string" &&
    typeof e.booking_id === "string" &&
    typeof e.event_type === "string" &&
    typeof e.created_at === "string"
  );
}

/**
 * Populates worker and customer helper metadata onto a DemoBooking for UI presentation.
 */
function enrichBooking(booking: DemoBooking): DemoBooking {
  const matchedWorker = workers.find((w) => w.id === booking.worker_id);
  const workerInfo = {
    id: booking.worker_id,
    full_name: matchedWorker ? matchedWorker.name : "Simulated Worker",
    hindi_name: matchedWorker ? matchedWorker.hindiName : "सिम्युलेटेड कारीगर",
    avatar_url: matchedWorker
      ? matchedWorker.photo
      : "https://images.pexels.com/photos/9271168/pexels-photo-9271168.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    phone: "+91 98118-XX482",
  };

  const customerInfo = {
    id: booking.customer_id || "demo-customer",
    full_name: "Priya Sharma (Demo Customer)",
    phone: "+91 98765-43210",
  };

  return {
    ...booking,
    worker: workerInfo,
    customer: customerInfo,
  };
}

/**
 * Validates a parsed object as a genuine DemoBooking.
 */
function isValidDemoBooking(val: unknown): val is DemoBooking {
  if (!val || typeof val !== "object") return false;
  const b = val as Partial<DemoBooking>;
  return (
    typeof b.id === "string" &&
    b.id.startsWith("demo-booking-") &&
    typeof b.booking_number === "string" &&
    typeof b.worker_id === "string" &&
    typeof b.service_id === "string" &&
    typeof b.job_title === "string" &&
    typeof b.job_description === "string" &&
    typeof b.service_address === "string" &&
    typeof b.locked_price === "number" &&
    Number.isFinite(b.locked_price) &&
    b.locked_price > 0 &&
    typeof b.booking_status === "string" &&
    validStatuses.has(b.booking_status as DemoBookingStatus) &&
    Array.isArray(b.offers) &&
    b.offers.every(isValidDemoOffer) &&
    Array.isArray(b.events) &&
    b.events.every(isValidDemoEvent)
  );
}

/**
 * Reads and parses demo bookings from browser localStorage with graceful error handling.
 */
function readStorage(): DemoBooking[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn("Saharaa: corrupted demo booking JSON in localStorage, preserving valid data where possible.", parseErr);
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    const validBookings: DemoBooking[] = [];
    for (const item of parsed) {
      if (isValidDemoBooking(item)) {
        validBookings.push(enrichBooking(item));
      } else {
        console.warn("Saharaa: filtered out malformed demo booking object from localStorage:", item);
      }
    }

    return validBookings;
  } catch (err) {
    console.warn("Saharaa: unexpected error reading localStorage:", err);
    return [];
  }
}

/**
 * Writes demo bookings to browser localStorage with explicit error handling.
 */
function writeStorage(bookings: DemoBooking[]): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      throw new Error("Browser local storage is not available in this environment.");
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("quota") || message.includes("QuotaExceededError")) {
      throw new Error("Browser storage is full. Please clear space to save simulated bookings.");
    }
    throw new Error(`Failed to save demo booking to local storage: ${message}`);
  }
}

function saveBooking(booking: DemoBooking): DemoBooking {
  const all = readStorage();
  const at = all.findIndex((item) => item.id === booking.id);
  const enriched = enrichBooking(booking);

  if (at >= 0) {
    all[at] = enriched;
  } else {
    all.unshift(enriched);
  }

  writeStorage(all);
  return enriched;
}

function addEvent(
  booking: DemoBooking,
  type: string,
  notes: string | null,
  actor: string | null,
  metadata?: Record<string, unknown>
): void {
  booking.events.push({
    id: generateId("demo-event"),
    booking_id: booking.id,
    actor_id: actor,
    event_type: type,
    notes,
    metadata: { mode: "demo", ...metadata },
    created_at: nowIso(),
  });
}

export function isDemoBookingId(value?: string | null): boolean {
  return Boolean(value && typeof value === "string" && value.startsWith("demo-booking-"));
}

export function getDemoBooking(bookingId: string): DemoBooking | null {
  if (!isDemoBookingId(bookingId)) return null;
  const found = readStorage().find((b) => b.id === bookingId);
  return found ?? null;
}

export function getDemoBookings(workerId?: string): DemoBooking[] {
  const all = readStorage();
  if (!workerId) return all;
  return all.filter((b) => b.worker_id === workerId);
}

export function clearDemoBookings(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Creates a simulated booking using localStorage.
 */
export function createDemoBooking(input: {
  workerId: string;
  serviceId: string;
  jobTitle: string;
  jobDescription: string;
  serviceAddress: string;
  serviceLocation?: string;
  bookingType?: "asap" | "schedule";
  scheduledAt?: string | null;
  initialPrice: number;
  customerNote?: string;
}): DemoBooking {
  if (!isDemoWorkerId(input.workerId)) {
    throw new Error("Choose a valid demo worker from the Saharaa catalogue.");
  }
  if (!Number.isFinite(input.initialPrice) || input.initialPrice <= 0) {
    throw new Error("Please enter a valid price greater than zero.");
  }
  if (!input.jobTitle.trim() || !input.jobDescription.trim() || !input.serviceAddress.trim()) {
    throw new Error("Please complete the job title, description, and service address.");
  }

  const createdAt = nowIso();
  const bookingId = generateId("demo-booking");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingNumber = `DEMO-2026-${randomSuffix}`;

  const booking: DemoBooking = {
    id: bookingId,
    booking_number: bookingNumber,
    customer_id: "demo-customer",
    worker_id: input.workerId,
    service_id: input.serviceId,
    job_title: input.jobTitle.trim(),
    job_description: input.jobDescription.trim(),
    service_address: input.serviceAddress.trim(),
    service_location: input.serviceLocation || "Laxmi Nagar, Delhi",
    booking_type: input.bookingType || "asap",
    scheduled_at: input.scheduledAt || null,
    locked_price: input.initialPrice,
    spare_parts_approved: false,
    spare_parts_amount: 0,
    tip_amount: 0,
    total_amount: input.initialPrice,
    booking_status: "pending",
    payment_status: "demo_pending",
    created_at: createdAt,
    updated_at: createdAt,
    offers: [],
    events: [],
  };

  // Add initial FairFare offer
  booking.offers.push({
    id: generateId("demo-offer"),
    booking_id: bookingId,
    proposer_id: "demo-customer",
    proposer_role: "customer",
    offered_price: input.initialPrice,
    message: input.customerNote?.trim() || "Initial FairFare demo offer",
    offer_status: "pending",
    round_number: 1,
    created_at: createdAt,
  });

  addEvent(
    booking,
    "booking_created",
    `Simulated booking ${bookingNumber} created in browser storage. Initial FairFare offer: ₹${input.initialPrice}`,
    "demo-customer"
  );

  return saveBooking(booking);
}

/**
 * Submits a new price offer or counteroffer in the FairFare negotiation flow.
 * Centralized business logic:
 * - Proposer must be customer or worker.
 * - Price must be finite positive number.
 * - No negotiation permitted after completion or cancellation.
 * - Only one pending offer exists at any time. Previous pending offer becomes 'countered'.
 * - Transitions status to 'negotiating' if currently 'pending'.
 */
export function submitDemoOffer(
  bookingId: string,
  role: DemoOfferRole,
  price: number,
  message?: string
): DemoBooking {
  const booking = getDemoBooking(bookingId);
  if (!booking) throw new Error("Demo booking was not found.");

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Offer price must be greater than zero.");
  }

  if (booking.booking_status === "completed" || booking.booking_status === "cancelled") {
    throw new Error(`This demo booking is ${booking.booking_status} and can no longer be negotiated.`);
  }

  if (booking.booking_status === "accepted") {
    throw new Error("This demo booking is already accepted with price locked. Subsequent negotiation is not allowed.");
  }

  const proposerId = role === "worker" ? booking.worker_id : "demo-customer";

  // When counteroffering, existing pending offers become 'countered'
  booking.offers.forEach((offer) => {
    if (offer.offer_status === "pending") {
      offer.offer_status = "countered";
    }
  });

  const roundNum = booking.offers.length + 1;
  const newOfferId = generateId("demo-offer");
  const createdAt = nowIso();

  booking.offers.push({
    id: newOfferId,
    booking_id: booking.id,
    proposer_id: proposerId,
    proposer_role: role,
    offered_price: price,
    message: message?.trim() || `Demo ${role} offer: ₹${price}`,
    offer_status: "pending",
    round_number: roundNum,
    created_at: createdAt,
  });

  booking.booking_status = "negotiating";
  booking.updated_at = createdAt;

  addEvent(
    booking,
    "offer_submitted",
    message?.trim() || `Round ${roundNum}: ${role === "worker" ? "Worker" : "Customer"} submitted FairFare offer: ₹${price}`,
    proposerId,
    { round: roundNum, offeredPrice: price, role }
  );

  return saveBooking(booking);
}

/**
 * Accepts a FairFare price offer.
 * Enforces:
 * - Anti-self-acceptance: only the counterparty can accept an offer.
 * - Offer must be pending.
 * - Locks the exact agreed price into locked_price and total_amount.
 * - Marks other pending offers as countered.
 * - Moves status to 'accepted'.
 */
export function acceptDemoOffer(
  bookingId: string,
  offerId: string,
  actor: DemoOfferRole
): DemoBooking {
  const booking = getDemoBooking(bookingId);
  if (!booking) throw new Error("Demo booking was not found.");

  const offer = booking.offers.find((item) => item.id === offerId);
  if (!offer) throw new Error("Demo offer was not found.");

  if (offer.offer_status !== "pending") {
    throw new Error(`Cannot accept this offer because its status is ${offer.offer_status}.`);
  }

  if (offer.proposer_role === actor) {
    throw new Error("You cannot accept your own pending offer. Only the counterparty can accept it.");
  }

  if (!Number.isFinite(offer.offered_price) || offer.offered_price <= 0) {
    throw new Error("Offer price must be greater than zero.");
  }

  const actorId = actor === "worker" ? booking.worker_id : "demo-customer";
  const acceptedAt = nowIso();

  // Accept the selected offer
  offer.offer_status = "accepted";

  // Expire or counter all other pending offers
  booking.offers.forEach((item) => {
    if (item.id !== offer.id && item.offer_status === "pending") {
      item.offer_status = "countered";
    }
  });

  booking.locked_price = offer.offered_price;
  booking.total_amount = offer.offered_price + booking.spare_parts_amount + booking.tip_amount;
  booking.booking_status = "accepted";
  booking.updated_at = acceptedAt;

  addEvent(
    booking,
    "offer_accepted",
    `FairFare price locked at ₹${offer.offered_price} (accepted by ${actor}). Guaranteed price with no hidden charges.`,
    actorId,
    { agreedPrice: offer.offered_price, acceptedOfferId: offer.id }
  );

  return saveBooking(booking);
}

/**
 * Lifecycle state transitions:
 * pending -> accepted, cancelled
 * negotiating -> accepted, cancelled
 * accepted -> on_the_way, cancelled
 * on_the_way -> in_progress, cancelled
 * in_progress -> completed, cancelled
 * completed -> []
 * cancelled -> []
 */
const allowedTransitions: Record<DemoBookingStatus, DemoBookingStatus[]> = {
  pending: ["accepted", "cancelled"],
  negotiating: ["accepted", "cancelled"],
  accepted: ["on_the_way", "cancelled"],
  on_the_way: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/**
 * Updates booking lifecycle status and preserves data integrity:
 * - Validates allowed transitions.
 * - For 'accepted', verifies or accepts the customer's pending offer.
 * - For 'cancelled', expires any pending offers.
 * - Locked price remains locked during job progression.
 * - Audit timeline is updated.
 */
export function updateDemoBookingStatus(
  bookingId: string,
  nextStatus: DemoBookingStatus,
  notes?: string
): DemoBooking {
  const booking = getDemoBooking(bookingId);
  if (!booking) throw new Error("Demo booking was not found.");

  if (!validStatuses.has(nextStatus)) {
    throw new Error(`Invalid target status: ${nextStatus}.`);
  }

  if (booking.booking_status === "completed" || booking.booking_status === "cancelled") {
    throw new Error(`Cannot modify a booking that is already ${booking.booking_status}.`);
  }

  const validNext = allowedTransitions[booking.booking_status];
  if (!validNext.includes(nextStatus)) {
    throw new Error(
      `Invalid lifecycle transition from '${booking.booking_status}' to '${nextStatus}'.`
    );
  }

  const updatedAt = nowIso();

  if (nextStatus === "accepted") {
    // Check if an offer is already accepted
    const alreadyAcceptedOffer = booking.offers.find((o) => o.offer_status === "accepted");
    if (!alreadyAcceptedOffer) {
      // Find the latest pending customer offer to accept
      const pendingCustomerOffer = [...booking.offers]
        .reverse()
        .find((o) => o.offer_status === "pending" && o.proposer_role === "customer");

      if (!pendingCustomerOffer) {
        throw new Error("No pending customer offer is available to accept for this booking.");
      }

      pendingCustomerOffer.offer_status = "accepted";
      booking.offers.forEach((o) => {
        if (o.id !== pendingCustomerOffer.id && o.offer_status === "pending") {
          o.offer_status = "countered";
        }
      });
      booking.locked_price = pendingCustomerOffer.offered_price;
      booking.total_amount = pendingCustomerOffer.offered_price + booking.spare_parts_amount + booking.tip_amount;
    }
  } else if (nextStatus === "cancelled") {
    // Expire any lingering pending offers
    booking.offers.forEach((offer) => {
      if (offer.offer_status === "pending") {
        offer.offer_status = "expired";
      }
    });
  }

  booking.booking_status = nextStatus;
  booking.updated_at = updatedAt;

  const defaultNotes: Record<DemoBookingStatus, string> = {
    pending: "Booking requested by customer.",
    negotiating: "FairFare negotiation in progress.",
    accepted: `Booking accepted by assigned worker. Price locked at ₹${booking.locked_price}.`,
    on_the_way: "Worker has departed and is on the way to the customer address.",
    in_progress: "Worker has arrived on site; work is actively in progress.",
    completed: `Service completed successfully! Total amount: ₹${booking.total_amount}.`,
    cancelled: notes || "Booking was cancelled. No charges applied.",
  };

  addEvent(
    booking,
    `status_${nextStatus}`,
    notes || defaultNotes[nextStatus],
    nextStatus === "accepted" || nextStatus === "on_the_way" || nextStatus === "in_progress" || nextStatus === "completed"
      ? booking.worker_id
      : "demo-customer",
    { nextStatus, lockedPrice: booking.locked_price }
  );

  return saveBooking(booking);
}

export function demoWorkerName(idValue: string): string {
  return workers.find((w) => w.id === idValue)?.name || "Simulated Worker";
}

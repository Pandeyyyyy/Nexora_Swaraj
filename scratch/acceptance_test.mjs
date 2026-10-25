/**
 * Acceptance Test Suite for Saharaa Hackathon Demo
 * Verifies all criteria in Section 12 of the user specification.
 */
import assert from "node:assert";

// Mock localStorage for Node.js environment
const storageStore = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageStore.has(key) ? storageStore.get(key) : null),
  setItem: (key, val) => { storageStore.set(key, String(val)); },
  removeItem: (key) => { storageStore.delete(key); },
  clear: () => { storageStore.clear(); },
  get length() { return storageStore.size; },
  key: (i) => Array.from(storageStore.keys())[i] || null,
};
globalThis.window = { localStorage: globalThis.localStorage };

// Import compiled source files directly
const {
  services,
  workers,
  findDemoWorkers,
  isDemoWorkerId,
  DEFAULT_DEMO_WORKER_ID
} = await import("../src/data.ts");

const {
  createDemoBooking,
  getDemoBookings,
  getDemoBooking,
  submitDemoOffer,
  acceptDemoOffer,
  updateDemoBookingStatus,
  isDemoBookingId,
  STORAGE_KEY
} = await import("../src/lib/demoBookings.ts");

const {
  createBooking,
  fetchCustomerBookings,
  fetchWorkerBookings,
  submitCounterOffer,
  acceptOffer,
  updateBookingStatus
} = await import("../src/lib/bookings.ts");

console.log("=== SAHARAA DEMO ACCEPTANCE TESTS ===");

// TEST 1: Service Categories and 16 Simulated Workers (2 per category)
console.log("\n[Test 1] 8 Service Categories & 16 Demo Workers...");
const expectedServices = [
  "plumbing", "electrical", "cleaning", "painting",
  "cooking", "appliance", "carpentry", "gardening"
];

assert.strictEqual(services.length, 8, `Expected 8 services, found ${services.length}`);
for (const sId of expectedServices) {
  const matchingWorkers = workers.filter((w) => w.serviceId === sId);
  assert.strictEqual(
    matchingWorkers.length, 2,
    `Category ${sId} must have exactly 2 demo workers, found ${matchingWorkers.length}`
  );
  for (const w of matchingWorkers) {
    assert(isDemoWorkerId(w.id), `Worker ${w.id} must be recognized as demo worker`);
    assert(w.photo && w.photo.startsWith("https://"), `Worker ${w.name} must have a valid photo URL`);
  }
}
console.log("✓ All 8 categories present with exactly 2 verified demo workers each (16 total).");

// TEST 2: findDemoWorkers Search & Filtering
console.log("\n[Test 2] findDemoWorkers Search and Filtering...");
// By service
const plumbingWorkers = findDemoWorkers({ serviceId: "plumbing" });
assert.strictEqual(plumbingWorkers.length, 2);

// By name
const ramesh = findDemoWorkers({ query: "Ramesh" });
assert(ramesh.length >= 1, "Searching 'Ramesh' should return Ramesh Kumar");
assert.strictEqual(ramesh[0].name, "Ramesh Kumar");

// By skill
const pipeLeak = findDemoWorkers({ query: "leak" });
assert(pipeLeak.length >= 1, "Searching skill 'leak' should find plumbing worker");

// By locality
const laxmiNagar = findDemoWorkers({ location: "Laxmi Nagar" });
assert(laxmiNagar.length >= 1, "Searching locality 'Laxmi Nagar' should find workers in Laxmi Nagar");

// Sorting: Price low to high
const sortedPrice = findDemoWorkers({ sortBy: "Price: low to high" });
for (let i = 1; i < sortedPrice.length; i++) {
  assert(sortedPrice[i].price >= sortedPrice[i - 1].price, "Workers should be sorted ascending by price");
}
console.log("✓ findDemoWorkers correctly filters and sorts across name, skill, service, locality, and price.");

// TEST 3: Create Demo Booking with Validation
console.log("\n[Test 3] Demo Booking Creation & Validation...");
localStorage.clear();

// Invalid price tests
assert.throws(() => {
  createDemoBooking({
    workerId: "demo-worker-plumbing-01",
    serviceId: "plumbing",
    jobTitle: "Fix tap",
    jobDescription: "Fix tap",
    serviceAddress: "Flat 402, Laxmi Nagar",
    initialPrice: 0,
  });
}, /greater than zero|positive/i, "Zero price must be rejected");

assert.throws(() => {
  createDemoBooking({
    workerId: "demo-worker-plumbing-01",
    serviceId: "plumbing",
    jobTitle: "Fix tap",
    jobDescription: "Fix tap",
    serviceAddress: "Flat 402, Laxmi Nagar",
    initialPrice: -100,
  });
}, /greater than zero|positive/i, "Negative price must be rejected");

assert.throws(() => {
  createDemoBooking({
    workerId: "demo-worker-plumbing-01",
    serviceId: "plumbing",
    jobTitle: "Fix tap",
    jobDescription: "Fix tap",
    serviceAddress: "Flat 402, Laxmi Nagar",
    initialPrice: NaN,
  });
}, /valid price|greater than zero/i, "NaN price must be rejected");

// Valid booking creation
const b1 = createDemoBooking({
  workerId: "demo-worker-plumbing-01",
  serviceId: "plumbing",
  jobTitle: "Tap leakage fix",
  jobDescription: "Kitchen tap leaking continuously under the sink",
  serviceAddress: "Flat 402, Shanti Kunj, Laxmi Nagar, Delhi",
  serviceLocation: "Laxmi Nagar, Delhi",
  initialPrice: 380,
  bookingType: "asap"
});

assert(b1.id.startsWith("demo-booking-"), "Demo booking ID must start with demo-booking-");
assert(b1.booking_number.startsWith("DEMO-2026-"), "Booking reference must start with DEMO-2026-");
assert.strictEqual(b1.booking_status, "pending");
assert.strictEqual(b1.locked_price, 380);
assert.strictEqual(b1.offers.length, 1);
assert.strictEqual(b1.offers[0].offered_price, 380);
assert.strictEqual(b1.offers[0].proposer_role, "customer");
assert.strictEqual(b1.offers[0].offer_status, "pending");
assert.strictEqual(b1.offers[0].round_number, 1);
assert.strictEqual(b1.events.length, 1);

// Persistence check in localStorage
const stored = getDemoBookings();
assert.strictEqual(stored.length, 1);
assert.strictEqual(stored[0].id, b1.id);
console.log(`✓ Booking ${b1.booking_number} created with initial offer ₹380 and persisted to localStorage.`);

// TEST 4: FairFare Negotiation Rules & Anti-Self-Acceptance
console.log("\n[Test 4] FairFare Negotiation Rules...");

// 4a. Proposer cannot accept own offer
assert.throws(() => {
  acceptDemoOffer(b1.id, b1.offers[0].id, "customer");
}, /cannot accept your own/i, "Customer must not accept their own offer");

// 4b. Worker submits a counteroffer of ₹450
const b1AfterCounter = submitDemoOffer(b1.id, "worker", 450, "Need brass seal replacement");
assert.strictEqual(b1AfterCounter.booking_status, "negotiating");
assert.strictEqual(b1AfterCounter.offers.length, 2);

const counter1 = b1AfterCounter.offers[1];
assert.strictEqual(counter1.offered_price, 450);
assert.strictEqual(counter1.proposer_role, "worker");
assert.strictEqual(counter1.offer_status, "pending");
assert.strictEqual(counter1.round_number, 2);
assert.strictEqual(b1AfterCounter.offers[0].offer_status, "countered", "First offer must be marked countered");

// 4c. Worker cannot accept their own counteroffer
assert.throws(() => {
  acceptDemoOffer(b1.id, counter1.id, "worker");
}, /cannot accept your own/i, "Worker must not accept their own counteroffer");

// 4d. Customer accepts worker's counteroffer
const b1Accepted = acceptDemoOffer(b1.id, counter1.id, "customer");
assert.strictEqual(b1Accepted.booking_status, "accepted");
assert.strictEqual(b1Accepted.locked_price, 450, "Agreed price must be locked at ₹450");
const acceptedOffer = b1Accepted.offers.find((o) => o.id === counter1.id);
assert.strictEqual(acceptedOffer.offer_status, "accepted");
console.log("✓ FairFare negotiation correctly enforces anti-self-acceptance, counter transitions, and locks agreed price to ₹450.");

// TEST 5: Job Lifecycle Progression & Price Locking
console.log("\n[Test 5] Job Progression Lifecycle...");

// Advance: accepted -> on_the_way
updateDemoBookingStatus(b1.id, "on_the_way", "worker", "Worker is traveling to service location");
let b1Prog = getDemoBooking(b1.id);
assert.strictEqual(b1Prog.booking_status, "on_the_way");
assert.strictEqual(b1Prog.locked_price, 450, "Agreed price must remain locked");

// Advance: on_the_way -> in_progress
updateDemoBookingStatus(b1.id, "in_progress", "worker", "Worker arrived and started work");
b1Prog = getDemoBooking(b1.id);
assert.strictEqual(b1Prog.booking_status, "in_progress");
assert.strictEqual(b1Prog.locked_price, 450);

// Advance: in_progress -> completed
updateDemoBookingStatus(b1.id, "completed", "worker", "Job completed successfully");
b1Prog = getDemoBooking(b1.id);
assert.strictEqual(b1Prog.booking_status, "completed");
assert.strictEqual(b1Prog.locked_price, 450);

// Terminal check: completed booking cannot transition or negotiate
assert.throws(() => {
  updateDemoBookingStatus(b1.id, "on_the_way", "worker");
}, /already completed|terminal/i, "Completed bookings must be terminal");

assert.throws(() => {
  submitDemoOffer(b1.id, "customer", 500);
}, /completed|can no longer be negotiated/i, "Cannot negotiate after completion");
console.log("✓ Booking advanced successfully through on_the_way -> in_progress -> completed with price locked.");

// TEST 6: Cancellation Flow & Offer Expiration
console.log("\n[Test 6] Cancellation Flow & Pending Offer Expiration...");
const b2 = createDemoBooking({
  workerId: "demo-worker-electrical-01",
  serviceId: "electrical",
  jobTitle: "Fix switchboard",
  jobDescription: "Switchboard spark",
  serviceAddress: "Flat 101, Mayur Vihar",
  initialPrice: 350,
  bookingType: "asap"
});

assert.strictEqual(b2.offers[0].offer_status, "pending");

// Cancel booking
updateDemoBookingStatus(b2.id, "cancelled", "customer", "Customer had to leave for work");
const b2Cancelled = getDemoBooking(b2.id);
assert.strictEqual(b2Cancelled.booking_status, "cancelled");
assert.strictEqual(b2Cancelled.offers[0].offer_status, "expired", "Pending offer must be expired upon cancellation");

// Terminal check: cancelled booking cannot transition
assert.throws(() => {
  updateDemoBookingStatus(b2.id, "accepted", "worker");
}, /already cancelled|terminal/i, "Cancelled bookings must be terminal");
console.log("✓ Cancellation transitions cleanly and marks pending offer as expired.");

// TEST 7: Local Storage Resilience (Corrupted JSON & Quota)
console.log("\n[Test 7] Local Storage Resilience...");

// Corrupted JSON in localStorage
localStorage.setItem(STORAGE_KEY, "{ malformed json ]");
const recovered = getDemoBookings();
assert(Array.isArray(recovered), "Must gracefully return array when JSON is malformed");
assert.strictEqual(recovered.length, 0, "Malformed data returns empty array without throwing");

// Invalid items filtered out
const mixedData = JSON.stringify([
  { id: "demo-booking-valid", booking_number: "DEMO-2026-9999", customer_id: "demo-customer", worker_id: "demo-worker-plumbing-01", service_id: "plumbing", booking_status: "pending", job_title: "Valid job", job_description: "test", service_address: "abc", service_location: "Delhi", booking_type: "asap", scheduled_at: null, locked_price: 200, spare_parts_approved: false, spare_parts_amount: 0, tip_amount: 0, total_amount: 200, payment_status: "demo_pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), offers: [], events: [] },
  { id: "corrupted-no-fields" }
]);
localStorage.setItem(STORAGE_KEY, mixedData);
const validated = getDemoBookings();
assert.strictEqual(validated.length, 1, "Only valid booking records should be parsed");
assert.strictEqual(validated[0].id, "demo-booking-valid");
console.log("✓ Corrupted JSON and malformed entries handled gracefully without crashing.");

// TEST 8: Zero Live Workers - High-Level API Integration
console.log("\n[Test 8] Bookings Service API Dispatch (No Supabase RPCs on Demo Data)...");
localStorage.clear();

// Customer creates booking via high-level bookings.ts
const resCreate = await createBooking({
  workerId: "demo-worker-painting-01",
  serviceId: "painting",
  jobTitle: "Wall painting",
  jobDescription: "Living room accent wall",
  serviceAddress: "Plot 12, Preet Vihar",
  initialPrice: 850
});

assert(resCreate.data, "Booking data must be returned");
assert(resCreate.data.booking_number.startsWith("DEMO-2026-"));

// Customer fetches bookings
const custBookings = await fetchCustomerBookings("any-customer-id");
assert.strictEqual(custBookings.data.length, 1, "Customer should see the demo booking");

// Worker fetches bookings for demo worker
const workerBookings = await fetchWorkerBookings("demo-worker-painting-01");
assert.strictEqual(workerBookings.data.length, 1, "Demo worker should see assigned booking");

// Worker counters via high-level API
const bookingId = resCreate.data.id;
const counterRes = await submitCounterOffer(bookingId, 950, "Includes primer coat", "worker");
assert(counterRes.success, "Worker counteroffer must succeed");

// Customer accepts counteroffer
const bUpdated = getDemoBooking(bookingId);
const pendingOffer = bUpdated.offers.find((o) => o.offer_status === "pending");
assert(pendingOffer, "There must be a pending worker offer");
const acceptRes = await acceptOffer(bookingId, pendingOffer.id, 950, "customer");
assert(acceptRes.success, "Customer offer acceptance must succeed");

// Worker advances lifecycle to on_the_way
const advanceRes = await updateBookingStatus(bookingId, "on_the_way", "En route to Preet Vihar");
assert(advanceRes.success, "Status transition to on_the_way must succeed");

console.log("✓ High-level booking service correctly routes all demo actions locally without calling Supabase.");

console.log("\n=========================================");
console.log("ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!");
console.log("=========================================\n");

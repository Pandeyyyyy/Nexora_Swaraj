import { useState } from "react";
import { TopNav, DemoBar, type Page } from "./components/shared";
import Landing from "./pages/Landing";
import { CustomerHome, WorkerListing, WorkerProfile } from "./pages/Customer";
import { BookingFlow, Tracking, PaymentReview } from "./pages/Booking";
import { WorkerDashboard, WorkerOnboarding, WorkerJobs, WorkerEarnings, Auth } from "./pages/Worker";
import { Admin, Impact } from "./pages/AdminImpact";

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [role, setRole] = useState<"customer" | "worker" | "admin" | null>(null);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [location, setLocation] = useState("Laxmi Nagar, Delhi");
  const [selectedService, setSelectedService] = useState("All");
  const [selectedWorker, setSelectedWorker] = useState("ramesh");
  const [lockedPrice, setLockedPrice] = useState(450);

  const go = (p: Page, wid?: string) => {
    if (wid) setSelectedWorker(wid);
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const isWorkerPage = ["worker-dashboard", "worker-onboarding", "worker-jobs", "worker-earnings"].includes(page);
  const hideDemo = page === "auth";

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A]">
      <TopNav page={page} go={go} lang={lang} setLang={setLang} role={role} location={location} />

      <main key={page + selectedWorker} className={isWorkerPage ? "bg-[#FAF9F6]" : ""}>
        {page === "landing" && <Landing go={go} lang={lang} location={location} setLocation={setLocation} />}
        {page === "auth" && <Auth go={go} setRole={setRole} lang={lang} />}
        {page === "customer-home" && (
          <CustomerHome go={go} lang={lang} location={location} selectedService={selectedService} setSelectedService={setSelectedService} selectedWorker={selectedWorker} setSelectedWorker={setSelectedWorker} />
        )}
        {page === "workers" && (
          <WorkerListing go={go} lang={lang} selectedService={selectedService} setSelectedService={setSelectedService} setSelectedWorker={setSelectedWorker} />
        )}
        {page === "worker-profile" && (
          <WorkerProfile go={go} lang={lang} workerId={selectedWorker} setSelectedWorker={setSelectedWorker} />
        )}
        {page === "booking" && (
          <BookingFlow go={go} lang={lang} workerId={selectedWorker} onLocked={(p) => setLockedPrice(p)} />
        )}
        {page === "tracking" && <Tracking go={go} lang={lang} workerId={selectedWorker} price={lockedPrice} />}
        {page === "payment" && <PaymentReview go={go} lang={lang} workerId={selectedWorker} price={lockedPrice} />}
        {page === "worker-dashboard" && <WorkerDashboard go={go} lang={lang} />}
        {page === "worker-onboarding" && <WorkerOnboarding go={go} />}
        {page === "worker-jobs" && <WorkerJobs go={go} />}
        {page === "worker-earnings" && <WorkerEarnings go={go} lang={lang} />}
        {page === "admin" && <Admin go={go} />}
        {page === "impact" && <Impact go={go} lang={lang} />}
      </main>

      {!hideDemo && <DemoBar go={go} role={role} setRole={setRole} />}
    </div>
  );
}

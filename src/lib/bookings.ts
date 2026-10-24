import { supabase, isSupabaseConfigured } from './supabase';

export type BookingStatus =
  | 'pending'
  | 'negotiating'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type BookingType = 'asap' | 'schedule';

export interface DbBooking {
  id: string;
  booking_number: string;
  customer_id: string;
  worker_id: string | null;
  service_id: string;
  job_title: string;
  job_description: string;
  service_address: string;
  service_location: string;
  booking_type: BookingType;
  scheduled_at: string | null;
  locked_price: number;
  spare_parts_approved: boolean;
  spare_parts_amount: number;
  tip_amount: number;
  total_amount: number;
  booking_status: BookingStatus;
  payment_status: string;
  created_at: string;
  updated_at: string;
  // Joined or counterparty data
  worker?: {
    id: string;
    full_name: string;
    hindi_name?: string;
    avatar_url?: string;
    phone?: string;
  } | null;
  customer?: {
    id: string;
    full_name: string;
    phone?: string;
  } | null;
}

export interface DbNegotiationOffer {
  id: string;
  booking_id: string;
  proposer_id: string;
  proposer_role: 'customer' | 'worker' | 'system';
  offered_price: number;
  message: string | null;
  offer_status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'expired';
  round_number: number;
  created_at: string;
}

export interface DbBookingEvent {
  id: string;
  booking_id: string;
  actor_id: string | null;
  event_type: string;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface CreateBookingParams {
  workerId: string;
  serviceId: string;
  jobTitle: string;
  jobDescription: string;
  serviceAddress: string;
  serviceLocation?: string;
  bookingType?: BookingType;
  scheduledAt?: string | null;
  initialPrice: number;
  customerNote?: string;
}

/**
 * Creates a new booking atomically with its initial FairFare negotiation offer.
 * Uses the PostgreSQL RPC so that the booking, its initial offer, and its audit event
 * either all succeed or all roll back together.
 */
export async function createBooking(
  params: CreateBookingParams
): Promise<{ data: DbBooking | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Authentication required to create a booking' };
  }

  if (params.initialPrice <= 0) {
    return { data: null, error: 'Please enter a valid price greater than zero' };
  }

  // Atomic RPC only. Do not fall back to independent client writes: they can leave a
  // partially-created booking if the offer or audit-event insert fails.
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_booking_atomic', {
      p_worker_id: params.workerId,
      p_service_id: params.serviceId,
      p_job_title: params.jobTitle,
      p_job_description: params.jobDescription,
      p_service_address: params.serviceAddress,
      p_service_location: params.serviceLocation || 'Laxmi Nagar, Delhi',
      p_booking_type: params.bookingType || 'asap',
      p_scheduled_at: params.scheduledAt || null,
      p_initial_price: params.initialPrice,
      p_customer_note: params.customerNote || 'Initial FairFare booking offer',
    });

    if (!rpcErr && rpcRes && rpcRes.booking_id) {
      // Fetch the full inserted booking row
      return await fetchBookingById(rpcRes.booking_id);
    }
    return { data: null, error: rpcErr?.message || 'Booking service did not return a booking ID' };
  } catch (rpcEx) {
    return { data: null, error: rpcEx instanceof Error ? rpcEx.message : 'Booking service is unavailable' };
  }
}

/**
 * Loads bookings for an authenticated customer.
 */
export async function fetchCustomerBookings(
  customerId?: string
): Promise<{ data: DbBooking[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured' };
  }

  try {
    let targetId = customerId;
    if (!targetId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetId = user?.id;
    }

    if (!targetId) {
      return { data: [], error: 'User is not authenticated' };
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        worker:worker_id (
          id,
          full_name,
          hindi_name,
          avatar_url,
          phone
        )
      `)
      .eq('customer_id', targetId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as DbBooking[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to load customer bookings' };
  }
}

/**
 * Loads assigned and pending bookings for an authenticated worker.
 */
export async function fetchWorkerBookings(
  workerId?: string
): Promise<{ data: DbBooking[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured' };
  }

  try {
    let targetId = workerId;
    if (!targetId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetId = user?.id;
    }

    if (!targetId) {
      return { data: [], error: 'Worker is not authenticated' };
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          phone
        )
      `)
      .or(`worker_id.eq.${targetId},and(worker_id.is.null,booking_status.eq.pending)`)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as DbBooking[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to load worker bookings' };
  }
}

/**
 * Loads a single booking by ID with counterparty profiles.
 */
export async function fetchBookingById(
  bookingId: string
): Promise<{ data: DbBooking | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        worker:worker_id (
          id,
          full_name,
          hindi_name,
          avatar_url,
          phone
        ),
        customer:customer_id (
          id,
          full_name,
          phone
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as DbBooking, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to fetch booking' };
  }
}

/**
 * Loads all FairFare negotiation offers for a booking in chronological order.
 */
export async function fetchBookingOffers(
  bookingId: string
): Promise<{ data: DbNegotiationOffer[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('negotiation_offers')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as DbNegotiationOffer[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to load offers' };
  }
}

/**
 * Loads booking timeline audit events in chronological order.
 */
export async function fetchBookingEvents(
  bookingId: string
): Promise<{ data: DbBookingEvent[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: 'Supabase is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('booking_events')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data as DbBookingEvent[]) || [], error: null };
  } catch (err: any) {
    return { data: [], error: err.message || 'Failed to load booking events' };
  }
}

/**
 * Submits a new price offer or counteroffer in the FairFare negotiation flow.
 */
export async function submitCounterOffer(
  bookingId: string,
  price: number,
  message?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  if (price <= 0) {
    return { success: false, error: 'Offer price must be greater than zero' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required' };
  }

  // Atomic RPC only; a multi-step fallback could race with another offer.
  try {
    const { error: rpcErr } = await supabase.rpc('submit_negotiation_offer', {
      p_booking_id: bookingId,
      p_offered_price: price,
      p_message: message || null,
    });

    if (!rpcErr) {
      return { success: true, error: null };
    }
    return { success: false, error: rpcErr.message };
  } catch (ex) {
    return { success: false, error: ex instanceof Error ? ex.message : 'FairFare service is unavailable' };
  }
}

/**
 * Accepts a FairFare price offer. Consistently locks price and updates booking status to 'accepted'.
 * Anti-self-acceptance is enforced: only the counterparty can accept an offer.
 */
export async function acceptOffer(
  bookingId: string,
  offerId: string,
  agreedPrice: number
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required' };
  }

  // Atomic RPC only; acceptance changes both the offer and booking price.
  try {
    const { error: rpcErr } = await supabase.rpc('accept_negotiation_offer', {
      p_booking_id: bookingId,
      p_offer_id: offerId,
    });

    if (!rpcErr) {
      return { success: true, error: null };
    }
    return { success: false, error: rpcErr.message };
  } catch (ex) {
    return { success: false, error: ex instanceof Error ? ex.message : 'FairFare service is unavailable' };
  }
}

/**
 * Updates booking lifecycle status (accepted -> on_the_way -> in_progress -> completed, or cancelled).
 */
export async function updateBookingStatus(
  bookingId: string,
  nextStatus: BookingStatus,
  notes?: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Authentication required' };
  }

  // Atomic RPC only; lifecycle updates must keep the audit timeline synchronized.
  try {
    const { error: rpcErr } = await supabase.rpc('update_booking_status', {
      p_booking_id: bookingId,
      p_next_status: nextStatus,
      p_notes: notes || null,
    });

    if (!rpcErr) {
      return { success: true, error: null };
    }
    return { success: false, error: rpcErr.message };
  } catch (ex) {
    return { success: false, error: ex instanceof Error ? ex.message : 'Booking service is unavailable' };
  }
}

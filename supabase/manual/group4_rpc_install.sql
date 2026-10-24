-- SAHARAA Group 4: manual SQL Editor installer
-- This script creates/replaces only the four RPCs used by src/lib/bookings.ts.
-- It does not create or alter tables, enums, policies, RLS, triggers, or data.
-- Run the preflight block first in the Supabase SQL Editor. It aborts safely if
-- the schema expected by these RPCs is not present.

DO $$
DECLARE
  v_table text;
  v_type text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['profiles', 'services', 'worker_profiles', 'bookings', 'negotiation_offers', 'booking_events'] LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'Required table public.% is missing; no RPCs were installed', v_table;
    END IF;
  END LOOP;
  FOREACH v_type IN ARRAY ARRAY['booking_type', 'booking_status', 'payment_status', 'offer_status', 'actor_role', 'user_role', 'verification_status'] LOOP
    IF to_regtype('public.' || v_type) IS NULL THEN
      RAISE EXCEPTION 'Required enum public.% is missing; no RPCs were installed', v_type;
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings'
      AND column_name IN ('id','booking_number','customer_id','worker_id','service_id','job_title','job_description','service_address','service_location','booking_type','scheduled_at','locked_price','spare_parts_approved','spare_parts_amount','tip_amount','total_amount','booking_status','payment_status','created_at','updated_at')
    GROUP BY table_schema, table_name HAVING count(*) = 20
  ) THEN
    RAISE EXCEPTION 'public.bookings does not have the required Group 4 columns; no RPCs were installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role' AND udt_name = 'user_role')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'worker_profiles' AND column_name = 'verification_status' AND udt_name = 'verification_status')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'worker_profiles' AND column_name = 'primary_service_id' AND udt_name = 'text')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'worker_profiles' AND column_name = 'skills' AND udt_name = '_text')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'is_active' AND data_type = 'boolean')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'negotiation_offers' AND column_name IN ('booking_id', 'proposer_id', 'proposer_role', 'offered_price', 'offer_status', 'round_number') GROUP BY table_schema, table_name HAVING count(*) = 6)
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_events' AND column_name IN ('booking_id', 'actor_id', 'event_type', 'metadata') GROUP BY table_schema, table_name HAVING count(*) = 4) THEN
    RAISE EXCEPTION 'A required profile, worker, service, offer, or event column is missing; no RPCs were installed';
  END IF;
  IF (SELECT count(*) FROM (VALUES
      ('id','uuid'), ('booking_number','text'), ('customer_id','uuid'), ('worker_id','uuid'), ('service_id','text'),
      ('job_title','text'), ('job_description','text'), ('service_address','text'), ('service_location','text'),
      ('booking_type','booking_type'), ('scheduled_at','timestamptz'), ('locked_price','numeric'), ('spare_parts_approved','bool'),
      ('spare_parts_amount','numeric'), ('tip_amount','numeric'), ('total_amount','numeric'), ('booking_status','booking_status'),
      ('payment_status','payment_status'), ('created_at','timestamptz'), ('updated_at','timestamptz')
    ) AS expected(column_name, udt_name)
    JOIN information_schema.columns actual ON actual.table_schema = 'public' AND actual.table_name = 'bookings'
      AND actual.column_name = expected.column_name AND actual.udt_name = expected.udt_name) <> 20 THEN
    RAISE EXCEPTION 'public.bookings types do not match the Group 4 contract; no RPCs were installed';
  END IF;
  IF (SELECT count(*) FROM (VALUES
      ('booking_id','uuid'), ('proposer_id','uuid'), ('proposer_role','actor_role'), ('offered_price','numeric'),
      ('offer_status','offer_status'), ('round_number','int4')
    ) AS expected(column_name, udt_name)
    JOIN information_schema.columns actual ON actual.table_schema = 'public' AND actual.table_name = 'negotiation_offers'
      AND actual.column_name = expected.column_name AND actual.udt_name = expected.udt_name) <> 6 THEN
    RAISE EXCEPTION 'public.negotiation_offers types do not match the Group 4 contract; no RPCs were installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f' AND c.conrelid = 'public.bookings'::regclass AND c.confrelid = 'public.profiles'::regclass AND a.attname = 'customer_id')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f' AND c.conrelid = 'public.bookings'::regclass AND c.confrelid = 'public.profiles'::regclass AND a.attname = 'worker_id')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f' AND c.conrelid = 'public.negotiation_offers'::regclass AND c.confrelid = 'public.bookings'::regclass AND a.attname = 'booking_id')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f' AND c.conrelid = 'public.booking_events'::regclass AND c.confrelid = 'public.bookings'::regclass AND a.attname = 'booking_id') THEN
    RAISE EXCEPTION 'Required Group 4 foreign-key relationships are missing; no RPCs were installed';
  END IF;
END $$;

-- Creates a booking, the initial customer FairFare offer, and an audit event in
-- one transaction. The caller must be an authenticated customer with a profile;
-- the service must be active and the assigned worker must have a worker profile.
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_worker_id uuid,
  p_service_id text,
  p_job_title text,
  p_job_description text,
  p_service_address text,
  p_service_location text DEFAULT 'Laxmi Nagar, Delhi',
  p_booking_type public.booking_type DEFAULT 'asap',
  p_scheduled_at timestamptz DEFAULT NULL,
  p_initial_price numeric DEFAULT 0,
  p_customer_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_booking_id uuid;
  v_offer_id uuid;
  v_booking_number text;
BEGIN
  IF v_customer_id IS NULL THEN RAISE EXCEPTION 'Authentication required to create a booking'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_customer_id AND role = 'customer'::public.user_role) THEN
    RAISE EXCEPTION 'A customer profile is required to create a booking';
  END IF;
  IF p_worker_id IS NULL THEN RAISE EXCEPTION 'An assigned worker is required'; END IF;
  IF p_worker_id = v_customer_id THEN RAISE EXCEPTION 'Customers cannot book themselves as the worker'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.worker_profiles wp ON wp.id = p.id
    WHERE p.id = p_worker_id
      AND p.role = 'worker'::public.user_role
      AND wp.verification_status = 'verified'::public.verification_status
      AND wp.primary_service_id = p_service_id
  ) THEN
    RAISE EXCEPTION 'The selected worker is not a verified worker';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id AND is_active) THEN
    RAISE EXCEPTION 'Selected service % is invalid or inactive', p_service_id;
  END IF;
  IF coalesce(btrim(p_job_title), '') = '' OR coalesce(btrim(p_job_description), '') = '' OR coalesce(btrim(p_service_address), '') = '' THEN
    RAISE EXCEPTION 'Job title, description, and service address are required';
  END IF;
  IF p_initial_price IS NULL OR p_initial_price <= 0 THEN RAISE EXCEPTION 'Initial proposed price must be greater than zero'; END IF;
  IF p_booking_type = 'schedule'::public.booking_type AND p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'A scheduled booking requires scheduled_at';
  END IF;

  v_booking_number := 'BK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));
  INSERT INTO public.bookings (
    booking_number, customer_id, worker_id, service_id, job_title, job_description,
    service_address, service_location, booking_type, scheduled_at, locked_price,
    spare_parts_approved, spare_parts_amount, tip_amount, total_amount,
    booking_status, payment_status, created_at, updated_at
  ) VALUES (
    v_booking_number, v_customer_id, p_worker_id, p_service_id, p_job_title, p_job_description,
    p_service_address, coalesce(nullif(btrim(p_service_location), ''), 'Laxmi Nagar, Delhi'), p_booking_type, p_scheduled_at, p_initial_price,
    false, 0, 0, p_initial_price, 'pending'::public.booking_status, 'pending'::public.payment_status, now(), now()
  ) RETURNING id INTO v_booking_id;

  INSERT INTO public.negotiation_offers (
    booking_id, proposer_id, proposer_role, offered_price, message, offer_status, round_number, created_at
  ) VALUES (
    v_booking_id, v_customer_id, 'customer'::public.actor_role, p_initial_price,
    coalesce(p_customer_note, 'Initial FairFare booking offer'), 'pending'::public.offer_status, 1, now()
  ) RETURNING id INTO v_offer_id;

  INSERT INTO public.booking_events (booking_id, actor_id, event_type, notes, metadata, created_at)
  VALUES (v_booking_id, v_customer_id, 'booking_created', 'Booking created with FairFare initial offer ₹' || p_initial_price::text,
    jsonb_build_object('booking_number', v_booking_number, 'service_id', p_service_id, 'initial_price', p_initial_price, 'booking_type', p_booking_type::text), now());

  RETURN jsonb_build_object('booking_id', v_booking_id, 'booking_number', v_booking_number, 'offer_id', v_offer_id, 'status', 'pending', 'price', p_initial_price);
END;
$$;

-- Serializes a counter-offer by locking the booking, closes any pending offer,
-- then records the new offer and its audit event.
CREATE OR REPLACE FUNCTION public.submit_negotiation_offer(
  p_booking_id uuid, p_offered_price numeric, p_message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid(); v_booking public.bookings%ROWTYPE;
  v_role public.actor_role; v_round integer; v_offer_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_offered_price IS NULL OR p_offered_price <= 0 THEN RAISE EXCEPTION 'Offered price must be greater than zero'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_caller_id = v_booking.customer_id THEN v_role := 'customer'::public.actor_role;
  ELSIF v_caller_id = v_booking.worker_id THEN v_role := 'worker'::public.actor_role;
  ELSE RAISE EXCEPTION 'Unauthorized: you are not a participant in this booking'; END IF;
  IF v_booking.booking_status IN ('accepted'::public.booking_status, 'on_the_way'::public.booking_status, 'in_progress'::public.booking_status, 'completed'::public.booking_status, 'cancelled'::public.booking_status) THEN
    RAISE EXCEPTION 'Cannot negotiate on a % booking', v_booking.booking_status;
  END IF;
  UPDATE public.negotiation_offers SET offer_status = 'countered'::public.offer_status
  WHERE booking_id = p_booking_id AND offer_status = 'pending'::public.offer_status;
  SELECT coalesce(max(round_number), 0) + 1 INTO v_round FROM public.negotiation_offers WHERE booking_id = p_booking_id;
  INSERT INTO public.negotiation_offers (booking_id, proposer_id, proposer_role, offered_price, message, offer_status, round_number, created_at)
  VALUES (p_booking_id, v_caller_id, v_role, p_offered_price, coalesce(p_message, v_role::text || ' countered with ₹' || p_offered_price::text), 'pending'::public.offer_status, v_round, now())
  RETURNING id INTO v_offer_id;
  UPDATE public.bookings SET booking_status = 'negotiating'::public.booking_status, updated_at = now() WHERE id = p_booking_id;
  INSERT INTO public.booking_events (booking_id, actor_id, event_type, notes, metadata, created_at)
  VALUES (p_booking_id, v_caller_id, 'offer_proposed', v_role::text || ' proposed ₹' || p_offered_price::text,
    jsonb_build_object('offer_id', v_offer_id, 'price', p_offered_price, 'round', v_round), now());
  RETURN jsonb_build_object('offer_id', v_offer_id, 'booking_id', p_booking_id, 'offered_price', p_offered_price, 'proposer_role', v_role, 'round_number', v_round, 'status', 'pending');
END;
$$;

-- Locks the booking and selected pending offer, requires the other participant
-- to accept it, then locks the agreed price and closes competing pending offers.
CREATE OR REPLACE FUNCTION public.accept_negotiation_offer(
  p_booking_id uuid, p_offer_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid(); v_booking public.bookings%ROWTYPE;
  v_offer public.negotiation_offers%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.booking_status IN ('accepted'::public.booking_status, 'on_the_way'::public.booking_status, 'in_progress'::public.booking_status, 'completed'::public.booking_status, 'cancelled'::public.booking_status) THEN
    RAISE EXCEPTION 'Cannot accept an offer for a % booking', v_booking.booking_status;
  END IF;
  IF v_caller_id <> v_booking.customer_id AND v_caller_id <> v_booking.worker_id THEN RAISE EXCEPTION 'Unauthorized: only booking participants can accept offers'; END IF;
  SELECT * INTO v_offer FROM public.negotiation_offers WHERE id = p_offer_id AND booking_id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found for this booking'; END IF;
  IF v_offer.offer_status <> 'pending'::public.offer_status THEN RAISE EXCEPTION 'Offer is no longer pending'; END IF;
  IF v_offer.proposer_id = v_caller_id THEN RAISE EXCEPTION 'Cannot accept your own offer'; END IF;
  IF NOT (
    (v_offer.proposer_id = v_booking.customer_id AND v_offer.proposer_role = 'customer'::public.actor_role AND v_caller_id = v_booking.worker_id)
    OR
    (v_offer.proposer_id = v_booking.worker_id AND v_offer.proposer_role = 'worker'::public.actor_role AND v_caller_id = v_booking.customer_id)
  ) THEN RAISE EXCEPTION 'Offer proposer does not match the booking counterparty'; END IF;
  UPDATE public.negotiation_offers SET offer_status = 'accepted'::public.offer_status WHERE id = p_offer_id;
  UPDATE public.negotiation_offers SET offer_status = 'countered'::public.offer_status
  WHERE booking_id = p_booking_id AND id <> p_offer_id AND offer_status = 'pending'::public.offer_status;
  UPDATE public.bookings SET locked_price = v_offer.offered_price,
    total_amount = v_offer.offered_price + spare_parts_amount + tip_amount,
    booking_status = 'accepted'::public.booking_status, updated_at = now() WHERE id = p_booking_id;
  INSERT INTO public.booking_events (booking_id, actor_id, event_type, notes, metadata, created_at)
  VALUES (p_booking_id, v_caller_id, 'offer_accepted', 'FairFare price locked at ₹' || v_offer.offered_price::text,
    jsonb_build_object('offer_id', p_offer_id, 'agreed_price', v_offer.offered_price), now());
  RETURN jsonb_build_object('booking_id', p_booking_id, 'locked_price', v_offer.offered_price, 'booking_status', 'accepted');
END;
$$;

-- Enforces lifecycle transitions and records the status change. It deliberately
-- does not update worker_profiles.total_jobs: the initial schema's anti-tampering
-- trigger prohibits an authenticated worker from changing that metric.
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id uuid, p_next_status public.booking_status, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid(); v_booking public.bookings%ROWTYPE;
  v_initial_offer public.negotiation_offers%ROWTYPE;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF p_next_status = 'cancelled'::public.booking_status THEN
    IF v_booking.booking_status IN ('completed'::public.booking_status, 'cancelled'::public.booking_status) THEN RAISE EXCEPTION 'Cannot cancel a % booking', v_booking.booking_status; END IF;
    IF v_caller_id <> v_booking.customer_id AND v_caller_id <> v_booking.worker_id THEN RAISE EXCEPTION 'Unauthorized to cancel this booking'; END IF;
  ELSIF p_next_status = 'accepted'::public.booking_status THEN
    IF v_caller_id <> v_booking.worker_id THEN RAISE EXCEPTION 'Only the assigned worker can accept a booking'; END IF;
    IF v_booking.booking_status NOT IN ('pending'::public.booking_status, 'negotiating'::public.booking_status) THEN RAISE EXCEPTION 'Invalid transition from % to accepted', v_booking.booking_status; END IF;
    SELECT * INTO v_initial_offer FROM public.negotiation_offers WHERE booking_id = p_booking_id AND proposer_id = v_booking.customer_id AND proposer_role = 'customer'::public.actor_role AND offer_status = 'pending'::public.offer_status ORDER BY round_number DESC, created_at DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No pending customer offer is available to accept'; END IF;
    UPDATE public.negotiation_offers SET offer_status = 'accepted'::public.offer_status WHERE id = v_initial_offer.id;
    UPDATE public.negotiation_offers SET offer_status = 'countered'::public.offer_status WHERE booking_id = p_booking_id AND id <> v_initial_offer.id AND offer_status = 'pending'::public.offer_status;
    UPDATE public.bookings SET locked_price = v_initial_offer.offered_price, total_amount = v_initial_offer.offered_price + spare_parts_amount + tip_amount, updated_at = now() WHERE id = p_booking_id;
  ELSIF p_next_status = 'on_the_way'::public.booking_status THEN
    IF v_caller_id <> v_booking.worker_id OR v_booking.booking_status <> 'accepted'::public.booking_status THEN RAISE EXCEPTION 'Only the assigned worker can transition an accepted booking to on_the_way'; END IF;
  ELSIF p_next_status = 'in_progress'::public.booking_status THEN
    IF v_caller_id <> v_booking.worker_id OR v_booking.booking_status NOT IN ('accepted'::public.booking_status, 'on_the_way'::public.booking_status) THEN RAISE EXCEPTION 'Only the assigned worker can start an accepted or on_the_way booking'; END IF;
  ELSIF p_next_status = 'completed'::public.booking_status THEN
    IF v_caller_id <> v_booking.worker_id OR v_booking.booking_status <> 'in_progress'::public.booking_status THEN RAISE EXCEPTION 'Only the assigned worker can complete an in-progress booking'; END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported status transition to %', p_next_status;
  END IF;
  UPDATE public.bookings SET booking_status = p_next_status, updated_at = now() WHERE id = p_booking_id;
  INSERT INTO public.booking_events (booking_id, actor_id, event_type, notes, metadata, created_at)
  VALUES (p_booking_id, v_caller_id, 'status_changed_' || p_next_status::text,
    coalesce(p_notes, 'Status transitioned from ' || v_booking.booking_status::text || ' to ' || p_next_status::text),
    jsonb_build_object('from_status', v_booking.booking_status, 'to_status', p_next_status), now());
  RETURN jsonb_build_object('booking_id', p_booking_id, 'from_status', v_booking.booking_status, 'to_status', p_next_status);
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_atomic(uuid, text, text, text, text, text, public.booking_type, timestamptz, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_negotiation_offer(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_negotiation_offer(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_booking_status(uuid, public.booking_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid, text, text, text, text, text, public.booking_type, timestamptz, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_negotiation_offer(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_negotiation_offer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, public.booking_status, text) TO authenticated;

-- The initial schema grants authenticated users direct INSERT/UPDATE privileges
-- on these tables. Those grants, combined with participant-wide RLS policies,
-- permit bypassing the atomic offer and status rules above. The application has
-- no remaining direct mutations of these tables; preserve SELECT access and
-- require the RPCs for all Group 4 writes.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.bookings FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.negotiation_offers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.booking_events FROM authenticated;
GRANT SELECT ON TABLE public.bookings, public.negotiation_offers, public.booking_events TO authenticated;

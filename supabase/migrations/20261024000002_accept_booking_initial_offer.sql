-- Preserve the already-pushed Group 4 migration. This forward-only repair
-- makes a worker accepting a customer's initial FairFare offer transactional.
-- It does not change RLS policies, tables, or grants.

CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_next_status booking_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_booking RECORD;
  v_curr_status booking_status;
  v_initial_offer RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_curr_status := v_booking.booking_status;

  IF p_next_status = 'cancelled' THEN
    IF v_curr_status IN ('completed', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot cancel a % booking', v_curr_status;
    END IF;
    IF v_caller_id != v_booking.customer_id AND v_caller_id != v_booking.worker_id THEN
      RAISE EXCEPTION 'Unauthorized to cancel this booking';
    END IF;
    UPDATE public.negotiation_offers
    SET offer_status = 'expired'
    WHERE booking_id = p_booking_id
      AND offer_status = 'pending';

  ELSIF p_next_status = 'accepted' THEN
    IF v_caller_id != v_booking.worker_id THEN
      RAISE EXCEPTION 'Only the assigned worker can accept a booking';
    END IF;
    IF v_curr_status NOT IN ('pending', 'negotiating') THEN
      RAISE EXCEPTION 'Invalid transition from % to accepted', v_curr_status;
    END IF;

    SELECT * INTO v_initial_offer
    FROM public.negotiation_offers
    WHERE booking_id = p_booking_id
      AND proposer_id = v_booking.customer_id
      AND proposer_role = 'customer'
      AND offer_status = 'pending'
    ORDER BY round_number DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'No pending customer offer is available to accept';
    END IF;
    IF v_initial_offer.offered_price IS NULL OR v_initial_offer.offered_price <= 0 THEN
      RAISE EXCEPTION 'Initial offer price must be greater than zero';
    END IF;

    UPDATE public.negotiation_offers
    SET offer_status = 'accepted'
    WHERE id = v_initial_offer.id;

    UPDATE public.negotiation_offers
    SET offer_status = 'countered'
    WHERE booking_id = p_booking_id
      AND id != v_initial_offer.id
      AND offer_status = 'pending';

    UPDATE public.bookings
    SET locked_price = v_initial_offer.offered_price,
        total_amount = v_initial_offer.offered_price + spare_parts_amount + tip_amount,
        updated_at = now()
    WHERE id = p_booking_id;

  ELSIF p_next_status = 'on_the_way' THEN
    IF v_caller_id != v_booking.worker_id THEN
      RAISE EXCEPTION 'Only the assigned worker can update status to on_the_way';
    END IF;
    IF v_curr_status != 'accepted' THEN
      RAISE EXCEPTION 'Invalid transition from % to on_the_way (must be accepted first)', v_curr_status;
    END IF;

  ELSIF p_next_status = 'in_progress' THEN
    IF v_caller_id != v_booking.worker_id THEN
      RAISE EXCEPTION 'Only the assigned worker can start work';
    END IF;
    IF v_curr_status != 'on_the_way' AND v_curr_status != 'accepted' THEN
      RAISE EXCEPTION 'Invalid transition from % to in_progress', v_curr_status;
    END IF;

  ELSIF p_next_status = 'completed' THEN
    IF v_caller_id != v_booking.worker_id THEN
      RAISE EXCEPTION 'Only the assigned worker can complete a booking';
    END IF;
    IF v_curr_status != 'in_progress' THEN
      RAISE EXCEPTION 'Invalid transition from % to completed (work must be in_progress)', v_curr_status;
    END IF;

  ELSE
    RAISE EXCEPTION 'Unsupported status transition to %', p_next_status;
  END IF;

  UPDATE public.bookings
  SET booking_status = p_next_status,
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_events (
    booking_id, actor_id, event_type, notes, metadata, created_at
  ) VALUES (
    p_booking_id,
    v_caller_id,
    'status_changed_' || p_next_status::text,
    COALESCE(p_notes, 'Status transitioned from ' || v_curr_status::text || ' to ' || p_next_status::text),
    jsonb_build_object('from_status', v_curr_status, 'to_status', p_next_status),
    now()
  );

  RETURN jsonb_build_object(
    'booking_id', p_booking_id,
    'from_status', v_curr_status,
    'to_status', p_next_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_booking_status(uuid, public.booking_status, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_booking_status(uuid, public.booking_status, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, public.booking_status, text) TO authenticated;

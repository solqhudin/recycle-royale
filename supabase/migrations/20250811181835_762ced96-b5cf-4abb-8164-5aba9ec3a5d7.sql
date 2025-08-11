
CREATE OR REPLACE FUNCTION public.redeem_points(p_user_id uuid, p_points integer, p_money numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  current_points INTEGER;
BEGIN
  -- Only admins can redeem points
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can redeem points';
  END IF;

  -- Validate input
  IF p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'Redeemed points must be a positive integer';
  END IF;

  -- Lock the profile row to prevent race conditions
  SELECT points INTO current_points
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_points IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF current_points < p_points THEN
    RAISE EXCEPTION 'Insufficient points. User has % points, trying to redeem %', current_points, p_points;
  END IF;

  -- Deduct points
  UPDATE public.profiles
  SET points = points - p_points,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Record the redemption
  INSERT INTO public.point_redemptions (user_id, points_redeemed, money_amount)
  VALUES (p_user_id, p_points, p_money);
END;
$function$;

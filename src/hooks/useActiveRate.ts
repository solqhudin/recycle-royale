import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActiveRate = {
  bottles_per_unit: number;
  money_per_unit: number;
} | null;

export function useActiveRate() {
  const { data, isLoading } = useQuery({
    queryKey: ["active-rate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bottle_rates")
        .select("bottles_per_unit, money_per_unit")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as { bottles_per_unit: number; money_per_unit: number } | null;
    },
    staleTime: 60_000,
  });

  const pointsToMoney = useMemo(() => {
    return (points: number) => {
      if (!data || !data.bottles_per_unit || !data.money_per_unit) return 0;
      const units = Math.floor(points / data.bottles_per_unit);
      return units * data.money_per_unit;
    };
  }, [data]);

  return {
    rate: data,
    loading: isLoading,
    pointsToMoney,
  };
}

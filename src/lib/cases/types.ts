import type { Database } from "@/integrations/supabase/types";

export type WantedPerson = Database["public"]["Tables"]["wanted_persons"]["Row"];
export type MissingPerson = Database["public"]["Tables"]["missing_persons"]["Row"];

export interface WantedListItem {
  id: string;
  full_name: string;
  age: number | null;
  height_cm: number | null;
  build: string | null;
  crime_category: string | null;
  danger_level: "high" | "medium" | "low";
  armed: boolean;
  last_seen_location: string | null;
  last_seen_at: string | null;
  reward_amount: number | null;
  photos: string[];
  created_at: string;
}

export interface MissingListItem {
  id: string;
  full_name: string;
  age_at_disappearance: number | null;
  height_cm: number | null;
  build: string | null;
  circumstances: Database["public"]["Enums"]["disappearance_circumstance"];
  last_seen_location: string | null;
  last_seen_at: string | null;
  is_endangered: boolean;
  vulnerability_indicators: string[];
  photos: string[];
  created_at: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Crime {
  charge: string;
  date?: string;
  severity?: "high" | "medium" | "low";
}
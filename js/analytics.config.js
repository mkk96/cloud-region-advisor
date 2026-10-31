/**
 * Visit statistics backend (Supabase). Leave both empty to switch the
 * feature off: nothing is sent and the footer stats stay hidden.
 *
 * Both values are public by design (they ship to every browser). The
 * database only lets this key log a visit and read totals — see
 * supabase/setup.sql.
 */
export const ANALYTICS = {
  supabaseUrl: "https://ajzrkcznhlcemaboonqy.supabase.co",
  supabaseKey: "sb_publishable_8ZUje25gb5SmIiX7rdnmkQ_xCG-lDnU",
};

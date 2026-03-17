const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const ENDPOINT = `${SUPABASE_URL}/rest/v1/leaderboard`;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

export interface LeaderboardEntry {
  name: string;
  score: number;
  distance: number;
  created_at: string;
}

export async function submitScore(name: string, score: number, distance: number): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ name, score, distance: Math.floor(distance) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTopScores(limit = 20): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(
      `${ENDPOINT}?select=name,score,distance,created_at&order=score.desc&limit=${limit}`,
      { headers },
    );
    if (!res.ok) return [];
    return await res.json() as LeaderboardEntry[];
  } catch {
    return [];
  }
}

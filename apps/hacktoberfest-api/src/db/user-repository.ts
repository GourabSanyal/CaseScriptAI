import type { DbPool } from './client.js';

export type AppUserRole = 'therapist' | 'patient';

export type AppUser = {
  id: string;
  clerkUserId: string;
  email: string | null;
  role: AppUserRole;
  createdAt: Date;
  lastSeenAt: Date;
};

export type UpsertUserInput = {
  clerkUserId: string;
  email: string | null;
};

type UserRow = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  role: string;
  created_at: Date;
  last_seen_at: Date;
};

const mapRow = (row: UserRow): AppUser => {
  if (row.role !== 'therapist' && row.role !== 'patient') {
    throw new Error(`invalid_user_role:${row.role}`);
  }
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
};

export const createUserRepository = (pool: DbPool) => {
  const upsertByClerkId = async (input: UpsertUserInput): Promise<AppUser> => {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (clerk_user_id, email, role)
       VALUES ($1, $2, 'therapist')
       ON CONFLICT (clerk_user_id) DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         last_seen_at = now()
       RETURNING id, clerk_user_id, email, role, created_at, last_seen_at`,
      [input.clerkUserId, input.email],
    );
    return mapRow(result.rows[0]);
  };

  return { upsertByClerkId };
};

export type UserRepository = ReturnType<typeof createUserRepository>;

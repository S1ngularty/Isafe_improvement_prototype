# CityShield Database Schemas

## Applying schemas

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Paste the contents of the `.sql` file
4. Click **Run**

## Files

| File | Purpose |
|---|---|
| `profiles.sql` | Creates `profiles` table, RLS policies, auto-create trigger |

## After running `profiles.sql`

Promote your account to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = '<your-user-uuid>';
```

Find your user UUID in **Authentication → Users** in the Supabase dashboard.

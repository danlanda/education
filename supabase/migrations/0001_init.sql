-- שומרי הזמן – מבנה מסד הנתונים
-- בנוי לכמה משפחות: כל הורה רואה רק את המשפחה שלו (Row Level Security)

create extension if not exists pgcrypto;

-- ===================== משפחות והורים =====================
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'helper')),
  display_name text,
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- ===================== ילדים =====================
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  grade int,
  intake jsonb not null default '{}'::jsonb,     -- שאלון ההורה (תחומי עניין, רמת קריאה...)
  settings jsonb not null default '{}'::jsonb,   -- כרטיס = כמה דקות, משימה יומית, קוד הורים...
  created_at timestamptz not null default now()
);

-- מצב המשחק של הילד (מטבעות, שלבים, כוכבים, ציוד...)
create table public.game_states (
  child_id uuid primary key references public.children(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- יומן פעילות (שלב הושלם, משימה יומית...)
create table public.events (
  id bigserial primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_child_idx on public.events(child_id, created_at desc);

-- ===================== פרסים בעולם האמיתי =====================
-- כל כרטיס שנצבר (+) או מומש (−)
create table public.ticket_ledger (
  id bigserial primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  delta int not null,
  reason text,
  created_at timestamptz not null default now()
);
create index ticket_ledger_child_idx on public.ticket_ledger(child_id, created_at desc);

-- בקשת מימוש מהילד, ההורה מאשר
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  tickets int not null check (tickets > 0),
  minutes int not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  kid_seen boolean not null default false,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ===================== ההורה בתוך המשחק =====================
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  level_id text,
  text text not null,
  reply text,
  reply_nikud text,
  replied_at timestamptz,
  reply_seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- גלגל הצלה – "טלפון לחבר"
create table public.lifelines (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  level_id text,
  payload jsonb not null default '{}'::jsonb,   -- השאלה, האפשרויות, התשובה הנכונה, הטקסט שקרא
  status text not null default 'open' check (status in ('open', 'answered', 'cancelled', 'expired')),
  answer text,
  answer_nikud text,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

-- חידות שההורה כותב
create table public.riddles (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  question text not null,
  question_nikud text,
  answers text[] not null default '{}',
  hint text,
  hint_nikud text,
  reward_tickets int not null default 1,
  reward_coins int not null default 20,
  status text not null default 'active' check (status in ('active', 'solved', 'archived')),
  created_at timestamptz not null default now(),
  solved_at timestamptz
);

-- מכשירים שמקבלים התראות
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ===================== הרשאות =====================
create or replace function public.is_family_member(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_members where family_id = fid and user_id = auth.uid());
$$;

create or replace function public.is_child_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from children c join family_members m on m.family_id = c.family_id
    where c.id = cid and m.user_id = auth.uid()
  );
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.children enable row level security;
alter table public.game_states enable row level security;
alter table public.events enable row level security;
alter table public.ticket_ledger enable row level security;
alter table public.redemptions enable row level security;
alter table public.letters enable row level security;
alter table public.lifelines enable row level security;
alter table public.riddles enable row level security;
alter table public.push_subscriptions enable row level security;

create policy families_rw on public.families for all
  using (public.is_family_member(id)) with check (public.is_family_member(id));
create policy members_read on public.family_members for select
  using (public.is_family_member(family_id));
create policy children_rw on public.children for all
  using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy game_states_rw on public.game_states for all
  using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy events_rw on public.events for all
  using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy ledger_rw on public.ticket_ledger for all
  using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy redemptions_rw on public.redemptions for all
  using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy letters_rw on public.letters for all
  using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy lifelines_rw on public.lifelines for all
  using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy riddles_rw on public.riddles for all
  using (public.is_child_member(child_id)) with check (public.is_child_member(child_id));
create policy push_own on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_family_member(family_id));

-- ===================== פעולות =====================
-- הרשמה ראשונה: יוצר משפחה, מצרף את ההורה ויוצר ילד ראשון
create or replace function public.create_family_with_child(
  p_family_name text, p_child_name text, p_grade int, p_intake jsonb, p_settings jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid; cid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select family_id into fid from family_members where user_id = auth.uid() limit 1;
  if fid is null then
    insert into families(name) values (coalesce(nullif(p_family_name, ''), 'המשפחה שלי')) returning id into fid;
    insert into family_members(family_id, user_id, role) values (fid, auth.uid(), 'owner');
  end if;
  insert into children(family_id, name, grade, intake, settings)
    values (fid, p_child_name, p_grade, coalesce(p_intake, '{}'::jsonb), coalesce(p_settings, '{}'::jsonb))
    returning id into cid;
  insert into game_states(child_id) values (cid);
  return cid;
end $$;

-- אישור או דחייה של בקשת מימוש
create or replace function public.decide_redemption(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r redemptions;
begin
  select * into r from redemptions where id = p_id;
  if r.id is null or not public.is_child_member(r.child_id) then raise exception 'not allowed'; end if;
  if r.status <> 'pending' then return; end if;
  update redemptions set status = case when p_approve then 'approved' else 'declined' end, decided_at = now()
    where id = p_id;
  if p_approve then
    insert into ticket_ledger(child_id, delta, reason) values (r.child_id, -r.tickets, 'מימוש: ' || r.minutes || ' דקות');
  end if;
end $$;

-- עדכונים בזמן אמת (תשובה בגלגל ההצלה מגיעה לילד מיד)
alter publication supabase_realtime add table public.lifelines;
alter publication supabase_realtime add table public.redemptions;
alter publication supabase_realtime add table public.letters;

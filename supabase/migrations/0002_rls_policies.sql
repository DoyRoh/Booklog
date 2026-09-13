-- 책숲 Phase 0 — Row Level Security
-- Principle applied to every table: "본인 소유 또는 소속 그룹만 접근"
-- (only rows a user owns, or that belong to a group the user is an
-- approved member/operator of, are visible or writable).

-- ========== helper functions ==========
-- child_guardians and group_members each need a policy that checks
-- membership in that *same* table (e.g. "can I see other guardians of a
-- child I also guard?"). A policy that queries its own table directly
-- causes "infinite recursion detected in policy" the moment RLS evaluates
-- the inner query. SECURITY DEFINER functions owned by the migration role
-- (which owns these tables and therefore bypasses RLS on them) break the
-- cycle: the inner lookup runs unfiltered, and the outer policy just asks
-- it a yes/no question.
create function public.is_child_guardian(p_child_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from child_guardians cg
    where cg.child_id = p_child_id and cg.user_id = p_user_id
  );
$$;

create function public.has_group_role(p_group_id uuid, p_roles text[], p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = p_user_id
      and gm.role = any(p_roles)
      and gm.status = 'approved'
  );
$$;

-- Also used from groups' own RLS ("is this user an approved participant of
-- this group, as staff or as a member child's guardian?"). Routing it
-- through a SECURITY DEFINER function (rather than an inline exists() on
-- group_members) matters here specifically because groups <-> group_members
-- policies reference each other: group_members' insert/select policies
-- check groups, and groups' policies check group_members. An inline
-- subquery on either side re-triggers the other table's RLS and Postgres
-- detects that as infinite recursion; a SECURITY DEFINER function is opaque
-- to the planner and breaks the cycle.
create function public.is_approved_group_participant(p_group_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members gm
    where gm.group_id = p_group_id
      and gm.status = 'approved'
      and (
        gm.user_id = p_user_id
        or exists (
          select 1 from child_guardians cg
          where cg.child_id = gm.child_id and cg.user_id = p_user_id
        )
      )
  );
$$;

-- A user requesting to join a group (or an open group they're about to
-- follow) can't yet SELECT that group's row under RLS -- an approval-type
-- group isn't visible to non-members, and that's by design. So the
-- group_members insert policies below can't check groups.join_policy with
-- a plain subquery (RLS would filter it to zero rows and reject every
-- legitimate join request). This function looks up join_policy without
-- going through groups' RLS.
create function public.group_join_policy(p_group_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select join_policy from groups where id = p_group_id;
$$;

-- ========== users ==========
alter table users enable row level security;

create policy "users select own row"
on users for select
using (id = auth.uid());

create policy "users update own row"
on users for update
using (id = auth.uid())
with check (id = auth.uid());
-- insert happens via the on_auth_user_created trigger (security definer),
-- which bypasses RLS, so no insert policy is needed here.

-- ========== consents ==========
alter table consents enable row level security;

create policy "users manage own consents"
on consents for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ========== children ==========
alter table children enable row level security;

create policy "guardians select own children"
on children for select
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = children.id and cg.user_id = auth.uid()
));

create policy "guardians insert children"
on children for insert
with check (true);
-- Any authenticated user can create a child row; they must immediately
-- link themselves via child_guardians (below) to gain any further access.

create policy "guardians update own children"
on children for update
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = children.id and cg.user_id = auth.uid()
));

create policy "owners delete own children"
on children for delete
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = children.id and cg.user_id = auth.uid() and cg.role = 'owner'
));

-- ========== child_guardians ==========
alter table child_guardians enable row level security;

create policy "users manage own guardian links"
on child_guardians for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "guardians view co-guardians of their children"
on child_guardians for select
using (public.is_child_guardian(child_guardians.child_id));

-- ========== groups ==========
alter table groups enable row level security;

create policy "open groups are publicly visible"
on groups for select
using (join_policy = 'open');

create policy "approval groups visible to approved members"
on groups for select
using (join_policy = 'approval' and public.is_approved_group_participant(groups.id));

create policy "owners select own groups"
on groups for select
using (owner_id = auth.uid());

create policy "users create groups they own"
on groups for insert
with check (owner_id = auth.uid());

create policy "owners update own groups"
on groups for update
using (owner_id = auth.uid());

create policy "owners delete own groups"
on groups for delete
using (owner_id = auth.uid());

-- ========== group_members ==========
alter table group_members enable row level security;

create policy "users can request to join approval groups"
on group_members for insert
with check (
  status = 'pending'
  and public.group_join_policy(group_id) = 'approval'
);

create policy "users can follow open groups immediately"
on group_members for insert
with check (
  status = 'approved'
  and public.group_join_policy(group_id) = 'open'
);

create policy "members view their own membership rows"
on group_members for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from child_guardians cg
    where cg.child_id = group_members.child_id and cg.user_id = auth.uid()
  )
);

create policy "operators view members of their group"
on group_members for select
using (public.has_group_role(group_members.group_id, array['teacher','admin','curator']));

create policy "teachers approve members of their group"
on group_members for update
using (public.has_group_role(group_members.group_id, array['teacher','admin']));

create policy "operators self-enroll as approved group staff"
on group_members for insert
with check (
  user_id = auth.uid()
  and role in ('teacher','admin','curator')
  and status = 'approved'
  and exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
);

create policy "members leave their own membership"
on group_members for delete
using (
  user_id = auth.uid()
  or exists (
    select 1 from child_guardians cg
    where cg.child_id = group_members.child_id and cg.user_id = auth.uid()
  )
);

-- ========== books / book_isbns ==========
-- Shared catalog data: no per-row owner, readable/extendable by any
-- signed-in user, never deletable through the client.
alter table books enable row level security;
alter table book_isbns enable row level security;

create policy "authenticated users read books"
on books for select
to authenticated
using (true);

create policy "authenticated users add books"
on books for insert
to authenticated
with check (true);

create policy "authenticated users update books"
on books for update
to authenticated
using (true);

create policy "authenticated users read book_isbns"
on book_isbns for select
to authenticated
using (true);

create policy "authenticated users add book_isbns"
on book_isbns for insert
to authenticated
with check (true);

-- ========== book_lists / book_list_items ==========
alter table book_lists enable row level security;
alter table book_list_items enable row level security;

create policy "group visibility extends to book_lists"
on book_lists for select
using (exists (
  select 1 from groups g where g.id = book_lists.group_id
));
-- groups.select policies already gate which groups are visible; since
-- Postgres re-checks the referenced table's own RLS, this exists() only
-- succeeds for groups the current user is allowed to see.

create policy "operators manage book_lists"
on book_lists for all
using (exists (
  select 1 from group_members gm
  where gm.group_id = book_lists.group_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin','curator')
    and gm.status = 'approved'
))
with check (exists (
  select 1 from group_members gm
  where gm.group_id = book_lists.group_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin','curator')
    and gm.status = 'approved'
));

create policy "group visibility extends to book_list_items"
on book_list_items for select
using (exists (
  select 1 from book_lists bl where bl.id = book_list_items.book_list_id
));

create policy "operators manage book_list_items"
on book_list_items for all
using (exists (
  select 1 from book_lists bl
  join group_members gm on gm.group_id = bl.group_id
  where bl.id = book_list_items.book_list_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin','curator')
    and gm.status = 'approved'
))
with check (exists (
  select 1 from book_lists bl
  join group_members gm on gm.group_id = bl.group_id
  where bl.id = book_list_items.book_list_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin','curator')
    and gm.status = 'approved'
));

-- ========== reading_records ==========
alter table reading_records enable row level security;

create policy "guardians manage own child's records"
on reading_records for all
using (exists (
  select 1 from child_guardians cg
  where cg.child_id = reading_records.child_id and cg.user_id = auth.uid()
))
with check (exists (
  select 1 from child_guardians cg
  where cg.child_id = reading_records.child_id and cg.user_id = auth.uid()
));

create policy "teachers view records of their approved group"
on reading_records for select
using (exists (
  select 1 from group_members gm
  where gm.group_id = reading_records.group_id
    and gm.user_id = auth.uid()
    and gm.role = 'teacher'
    and gm.status = 'approved'
));

-- ⚠️ Supabase(Postgres 15+)에서는 view에 security_invoker=true를 설정해야
--    호출자 권한으로 RLS가 적용됩니다.
create view teacher_reading_view
with (security_invoker = true) as
select id, child_id, book_id, group_id, read_date, rating, emotion, favorite, transcript, created_at
from reading_records;
-- 위 정책은 reading_records 테이블에 직접 걸리므로, 앱에서는 teacher_reading_view를
-- 통해서만 교사 화면에 노출하고 photo_url/voice_url/parent_memo는 화면에서 제외할 것

-- ========== assignments / assignment_books / assignment_missions ==========
alter table assignments enable row level security;
alter table assignment_books enable row level security;
alter table assignment_missions enable row level security;

create policy "approved group members view assignments"
on assignments for select
using (exists (
  select 1 from group_members gm
  where gm.group_id = assignments.group_id
    and gm.status = 'approved'
    and (gm.user_id = auth.uid() or exists (
      select 1 from child_guardians cg
      where cg.child_id = gm.child_id and cg.user_id = auth.uid()
    ))
));

create policy "teachers manage assignments"
on assignments for all
using (exists (
  select 1 from group_members gm
  where gm.group_id = assignments.group_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin')
    and gm.status = 'approved'
))
with check (exists (
  select 1 from group_members gm
  where gm.group_id = assignments.group_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin')
    and gm.status = 'approved'
));

create policy "assignment visibility extends to assignment_books"
on assignment_books for select
using (exists (
  select 1 from assignments am where am.id = assignment_books.assignment_id
));

create policy "teachers manage assignment_books"
on assignment_books for all
using (exists (
  select 1 from assignments am
  join group_members gm on gm.group_id = am.group_id
  where am.id = assignment_books.assignment_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin')
    and gm.status = 'approved'
))
with check (exists (
  select 1 from assignments am
  join group_members gm on gm.group_id = am.group_id
  where am.id = assignment_books.assignment_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin')
    and gm.status = 'approved'
));

create policy "assignment visibility extends to assignment_missions"
on assignment_missions for select
using (exists (
  select 1 from assignments am where am.id = assignment_missions.assignment_id
));

create policy "teachers manage assignment_missions"
on assignment_missions for all
using (exists (
  select 1 from assignments am
  join group_members gm on gm.group_id = am.group_id
  where am.id = assignment_missions.assignment_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin')
    and gm.status = 'approved'
))
with check (exists (
  select 1 from assignments am
  join group_members gm on gm.group_id = am.group_id
  where am.id = assignment_missions.assignment_id
    and gm.user_id = auth.uid()
    and gm.role in ('teacher','admin')
    and gm.status = 'approved'
));

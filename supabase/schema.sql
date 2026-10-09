-- Investa: contas e dados na nuvem (Supabase).
-- Cole este arquivo inteiro em Supabase → SQL Editor → New query → Run.
-- Pode rodar de novo sem problema: ele só cria o que ainda não existe e
-- atualiza as funções.

-- ---------------------------------------------------------------------------
-- Tabelas

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null,
  name text not null,
  email text,
  role text not null default 'usuario' check (role in ('dono', 'adm', 'usuario')),
  status text not null default 'ativo' check (status in ('ativo', 'bloqueado')),
  avatar_hue int not null default 200,
  data jsonb not null default '{}'::jsonb,
  data_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Configuração da IA compartilhada por todas as contas (só o Dono altera).
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  ai jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Funções auxiliares

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and status = 'ativo'
$$;

-- Toda conta criada ganha um perfil. A primeira de todas é a do Dono; as
-- outras sempre começam como Usuário, não importa o que o aplicativo mande.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, name, email, role, avatar_hue)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Usuário'),
    nullif(new.raw_user_meta_data->>'contact_email', ''),
    case when exists (select 1 from profiles) then 'usuario' else 'dono' end,
    coalesce((new.raw_user_meta_data->>'avatar_hue')::int, 200)
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Regras de cargo: só o Dono muda cargos, ninguém se bloqueia, sempre existe
-- um Dono, e ninguém mexe nos dados financeiros de outra pessoa.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := my_role();
begin
  if auth.uid() is null then
    return new; -- alteração feita pelo painel do Supabase
  end if;
  if new.id <> old.id or new.username <> old.username then
    raise exception 'O nome de usuário não pode ser trocado.';
  end if;
  if new.role is distinct from old.role then
    if r is distinct from 'dono' then
      raise exception 'Apenas o Dono pode mudar cargos.';
    end if;
    if old.role = 'dono' and (select count(*) from profiles where role = 'dono') <= 1 then
      raise exception 'O aplicativo precisa ter pelo menos um Dono.';
    end if;
  end if;
  if new.status is distinct from old.status then
    if new.id = auth.uid() then
      raise exception 'Você não pode bloquear a própria conta.';
    end if;
    if old.role = 'dono' and new.status = 'bloqueado' and (select count(*) from profiles where role = 'dono' and status = 'ativo') <= 1 then
      raise exception 'Não é possível bloquear o único Dono.';
    end if;
  end if;
  if new.id <> auth.uid() then
    if new.data is distinct from old.data then
      raise exception 'Sem permissão para alterar os dados de outra conta.';
    end if;
    if r = 'adm' and old.role <> 'usuario' then
      raise exception 'Administradores só gerenciam contas de Usuário.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

-- ---------------------------------------------------------------------------
-- Permissões (Row Level Security)

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "ler perfis" on public.profiles;
create policy "ler perfis" on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() in ('dono', 'adm'));

drop policy if exists "alterar perfis" on public.profiles;
create policy "alterar perfis" on public.profiles for update to authenticated
  using (
    id = auth.uid()
    or public.my_role() = 'dono'
    or (public.my_role() = 'adm' and role = 'usuario')
  );

drop policy if exists "ler configuracao" on public.app_settings;
create policy "ler configuracao" on public.app_settings for select to authenticated
  using (public.my_role() is not null);

drop policy if exists "alterar configuracao" on public.app_settings;
create policy "alterar configuracao" on public.app_settings for update to authenticated
  using (public.my_role() = 'dono');

-- ---------------------------------------------------------------------------
-- Ações de administração (rodam no servidor, com as regras acima)

create or replace function public.admin_set_password(target uuid, new_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  r text := my_role();
  t text;
begin
  select role into t from profiles where id = target;
  if t is null then raise exception 'Usuário não encontrado.'; end if;
  if not (r = 'dono' or (r = 'adm' and t = 'usuario')) then
    raise exception 'Você não pode alterar a senha desta conta.';
  end if;
  if length(new_password) < 6 then
    raise exception 'A senha precisa ter pelo menos 6 caracteres.';
  end if;
  update auth.users set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')) where id = target;
end $$;

create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  r text := my_role();
  t text;
begin
  if target = auth.uid() then raise exception 'Você não pode excluir a própria conta por aqui.'; end if;
  select role into t from profiles where id = target;
  if t is null then raise exception 'Usuário não encontrado.'; end if;
  if not (r = 'dono' or (r = 'adm' and t = 'usuario')) then
    raise exception 'Você não pode excluir esta conta.';
  end if;
  if t = 'dono' and (select count(*) from profiles where role = 'dono') <= 1 then
    raise exception 'O aplicativo precisa ter pelo menos um Dono.';
  end if;
  delete from auth.users where id = target;
end $$;

-- Ranking das aulas: só nome e progresso de cada conta, sem dados financeiros.
drop function if exists public.leaderboard();
create or replace function public.leaderboard() returns table (id uuid, name text, username text, avatar_hue int, learning jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.username, p.avatar_hue, coalesce(p.data->'learning', '{}'::jsonb)
  from profiles p
  where p.status = 'ativo' and public.my_role() is not null
$$;

revoke all on function public.admin_set_password(uuid, text) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
revoke all on function public.leaderboard() from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.leaderboard() to authenticated;

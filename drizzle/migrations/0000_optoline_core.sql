
-- ROLES
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, app_role) to authenticated, anon;

create or replace function public.assign_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created_first_admin
after insert on auth.users for each row execute function public.assign_first_admin();

create or replace function public.update_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'eyeglasses',
  gender text not null default 'unisex',
  price integer not null default 0,
  old_price integer,
  description text not null default '',
  frame_shape text not null default 'rectangle',
  frame_color text not null default '#1f2937',
  image_url text,
  image_path text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  stock integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Anyone sees active products" on public.products for select to anon, authenticated using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert products" on public.products for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update products" on public.products for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete products" on public.products for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger products_updated before update on public.products for each row execute function public.update_updated_at();

-- SITE SETTINGS
create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  hero_title text not null default 'Clear vision for the whole family',
  hero_subtitle text not null default 'Stylish, affordable glasses, contact lenses and expert eye tests.',
  hero_image_path text,
  announcement text not null default 'Free eye test with every pair of glasses',
  phone text not null default '+92 300 0000000',
  whatsapp text not null default '+92 300 0000000',
  email text not null default 'hello@optoline.pk',
  address text not null default 'Shop 12, Main Boulevard, Karachi',
  opening_hours text not null default 'Mon–Sat 11am–10pm · Sun 2pm–9pm',
  delivery_fee integer not null default 250,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon;
grant select, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "Anyone reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger settings_updated before update on public.site_settings for each row execute function public.update_updated_at();
insert into public.site_settings (id) values (1);

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial,
  customer_name text not null,
  phone text not null,
  email text,
  address text not null,
  city text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null default 0,
  payment_method text not null default 'cod',
  payment_status text not null default 'pending',
  status text not null default 'new',
  prescription_path text,
  prescription_notes text,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Admins read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- place_order: prices always come from the products table
create or replace function public.place_order(
  _customer_name text, _phone text, _email text, _address text, _city text,
  _items jsonb, _payment_method text, _prescription_path text, _prescription_notes text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _item jsonb; _product public.products%rowtype; _qty integer;
  _lines jsonb := '[]'::jsonb; _subtotal integer := 0; _fee integer; _order public.orders%rowtype;
begin
  if coalesce(trim(_customer_name), '') = '' or coalesce(trim(_phone), '') = '' or coalesce(trim(_address), '') = '' or coalesce(trim(_city), '') = '' then
    raise exception 'Please fill in name, phone, address and city';
  end if;
  if length(_customer_name) > 120 or length(_phone) > 30 or length(_address) > 500 or length(_city) > 80 or length(coalesce(_prescription_notes,'')) > 1000 then
    raise exception 'Some details are too long';
  end if;
  if _payment_method not in ('cod', 'card') then raise exception 'Invalid payment method'; end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 30 then
    raise exception 'Your cart is empty';
  end if;
  for _item in select * from jsonb_array_elements(_items) loop
    select * into _product from public.products where id = (_item->>'product_id')::uuid and is_active;
    if not found then raise exception 'A product in your cart is no longer available'; end if;
    _qty := greatest(1, least(10, coalesce((_item->>'quantity')::integer, 1)));
    _subtotal := _subtotal + _product.price * _qty;
    _lines := _lines || jsonb_build_object('product_id', _product.id, 'name', _product.name, 'price', _product.price, 'quantity', _qty);
  end loop;
  select delivery_fee into _fee from public.site_settings where id = 1;
  _fee := coalesce(_fee, 0);
  insert into public.orders (customer_name, phone, email, address, city, items, subtotal, delivery_fee, total, payment_method, prescription_path, prescription_notes)
  values (trim(_customer_name), trim(_phone), nullif(trim(coalesce(_email,'')), ''), trim(_address), trim(_city), _lines, _subtotal, _fee, _subtotal + _fee, _payment_method, nullif(_prescription_path, ''), nullif(trim(coalesce(_prescription_notes,'')), ''))
  returning * into _order;
  return jsonb_build_object('id', _order.id, 'order_number', _order.order_number, 'total', _order.total);
end;
$$;
grant execute on function public.place_order(text, text, text, text, text, jsonb, text, text, text) to anon, authenticated;

-- APPOINTMENTS
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  service text not null default 'Eye examination',
  preferred_date date not null,
  preferred_time text not null,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant insert on public.appointments to anon;
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "Anyone books appointment" on public.appointments for insert to anon, authenticated
  with check (status = 'new' and length(name) between 1 and 120 and length(phone) between 5 and 30 and length(coalesce(notes,'')) <= 1000);
create policy "Admins read appointments" on public.appointments for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update appointments" on public.appointments for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete appointments" on public.appointments for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- OWNER CHAT
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  visitor_phone text,
  access_token uuid not null default gen_random_uuid(),
  unread_for_admin integer not null default 0,
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "Admins read conversations" on public.conversations for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update conversations" on public.conversations for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete conversations" on public.conversations for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_conv_idx on public.chat_messages (conversation_id, created_at);
grant select, insert, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "Admins read messages" on public.chat_messages for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins reply" on public.chat_messages for insert to authenticated with check (public.has_role(auth.uid(), 'admin') and sender = 'admin' and length(body) between 1 and 2000);
create policy "Admins delete messages" on public.chat_messages for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
     set last_message = left(new.body, 200),
         last_message_at = new.created_at,
         unread_for_admin = case when new.sender = 'customer' then unread_for_admin + 1 else 0 end
   where id = new.conversation_id;
  return new;
end; $$;
create trigger chat_message_touch after insert on public.chat_messages for each row execute function public.touch_conversation();

create or replace function public.start_conversation(_name text, _phone text, _message text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _conv public.conversations%rowtype;
begin
  if coalesce(trim(_name), '') = '' or length(_name) > 80 then raise exception 'Please enter your name'; end if;
  if coalesce(trim(_message), '') = '' or length(_message) > 2000 then raise exception 'Please write a message'; end if;
  if length(coalesce(_phone, '')) > 30 then raise exception 'Phone number is too long'; end if;
  insert into public.conversations (visitor_name, visitor_phone) values (trim(_name), nullif(trim(coalesce(_phone,'')), '')) returning * into _conv;
  insert into public.chat_messages (conversation_id, sender, body) values (_conv.id, 'customer', trim(_message));
  return jsonb_build_object('id', _conv.id, 'token', _conv.access_token);
end; $$;

create or replace function public.send_visitor_message(_conversation_id uuid, _token uuid, _message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(_message), '') = '' or length(_message) > 2000 then raise exception 'Please write a message'; end if;
  if not exists (select 1 from public.conversations where id = _conversation_id and access_token = _token) then
    raise exception 'Chat not found';
  end if;
  insert into public.chat_messages (conversation_id, sender, body) values (_conversation_id, 'customer', trim(_message));
end; $$;

create or replace function public.get_visitor_messages(_conversation_id uuid, _token uuid)
returns table (id uuid, sender text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.sender, m.body, m.created_at
    from public.chat_messages m
    join public.conversations c on c.id = m.conversation_id
   where c.id = _conversation_id and c.access_token = _token
   order by m.created_at asc
   limit 500
$$;
grant execute on function public.start_conversation(text, text, text) to anon, authenticated;
grant execute on function public.send_visitor_message(uuid, uuid, text) to anon, authenticated;
grant execute on function public.get_visitor_messages(uuid, uuid) to anon, authenticated;

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.conversations;

-- STORAGE POLICIES
create policy "Anyone views product images" on storage.objects for select to anon, authenticated using (bucket_id = 'product-images');
create policy "Admins upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "Customers upload prescriptions" on storage.objects for insert to anon, authenticated with check (bucket_id = 'prescriptions');
create policy "Admins view prescriptions" on storage.objects for select to authenticated using (bucket_id = 'prescriptions' and public.has_role(auth.uid(), 'admin'));

-- SEED PRODUCTS
insert into public.products (name, category, gender, price, old_price, description, frame_shape, frame_color, image_url, is_featured, stock) values
('Harbor Round', 'eyeglasses', 'unisex', 4500, 5500, 'Lightweight round acetate frame in classic tortoiseshell. Comfortable all day, perfect for reading and screen time.', 'round', '#7a4a24', '/images/products/harbor-round.jpg', true, 15),
('Metro Rectangle', 'eyeglasses', 'men', 3900, null, 'Clean matte-black rectangle frame with spring hinges. A dependable everyday pair for work and study.', 'rectangle', '#111827', '/images/products/metro-rectangle.jpg', true, 20),
('Bloom Cat-Eye', 'eyeglasses', 'women', 5200, 6200, 'Soft rose cat-eye frame with a subtle lift. Elegant, light and made for long days.', 'cat-eye', '#c2737d', '/images/products/bloom-cat-eye.jpg', true, 12),
('Sky Aviator', 'sunglasses', 'unisex', 6500, null, 'Gold metal aviator with polarized UV400 lenses. Cuts glare on the road and at the beach.', 'aviator', '#b8902f', '/images/products/sky-aviator.jpg', true, 10),
('Coast Square Shades', 'sunglasses', 'unisex', 4800, 5800, 'Bold black square sunglasses with full UV protection. Everyday style for the whole family.', 'square', '#0f172a', '/images/products/coast-square.jpg', false, 18),
('Little Explorer', 'kids', 'kids', 2900, null, 'Flexible, bend-proof frame in bright blue for kids aged 5–10. Soft nose pads and safe edges.', 'round', '#2563eb', '/images/products/little-explorer.jpg', true, 25),
('Focus Blue-Light', 'blue-light', 'unisex', 3500, 4200, 'Transparent frame with blue-light filtering lenses. Less eye strain during long hours on phones and laptops.', 'rectangle', '#94a3b8', '/images/products/focus-blue-light.jpg', false, 30),
('Daily Comfort Lenses (30 pack)', 'contact-lenses', 'unisex', 2400, null, 'Daily disposable soft contact lenses with high moisture for all-day comfort. Box of 30.', 'none', '#0ea5e9', '/images/products/daily-lenses.jpg', false, 50);

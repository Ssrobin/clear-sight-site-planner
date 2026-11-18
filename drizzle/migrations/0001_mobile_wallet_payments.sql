
alter table public.orders add column transaction_ref text;
alter table public.site_settings add column jazzcash_number text not null default '0300 0000000';
alter table public.site_settings add column easypaisa_number text not null default '0300 0000000';
alter table public.site_settings add column account_title text not null default 'Optoline Optics';

drop function if exists public.place_order(text, text, text, text, text, jsonb, text, text, text);

create or replace function public.place_order(
  _customer_name text, _phone text, _email text, _address text, _city text,
  _items jsonb, _payment_method text, _transaction_ref text, _prescription_path text, _prescription_notes text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _item jsonb; _product public.products%rowtype; _qty integer;
  _lines jsonb := '[]'::jsonb; _subtotal integer := 0; _fee integer; _order public.orders%rowtype;
begin
  if coalesce(trim(_customer_name), '') = '' or coalesce(trim(_phone), '') = '' or coalesce(trim(_address), '') = '' or coalesce(trim(_city), '') = '' then
    raise exception 'Please fill in name, phone, address and city';
  end if;
  if length(_customer_name) > 120 or length(_phone) > 30 or length(_address) > 500 or length(_city) > 80
     or length(coalesce(_prescription_notes,'')) > 1000 or length(coalesce(_transaction_ref,'')) > 60 then
    raise exception 'Some details are too long';
  end if;
  if _payment_method not in ('cod', 'jazzcash', 'easypaisa') then raise exception 'Invalid payment method'; end if;
  if _payment_method in ('jazzcash', 'easypaisa') and coalesce(trim(_transaction_ref), '') = '' then
    raise exception 'Please enter the transaction ID from your payment';
  end if;
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
  insert into public.orders (customer_name, phone, email, address, city, items, subtotal, delivery_fee, total, payment_method, transaction_ref, prescription_path, prescription_notes)
  values (trim(_customer_name), trim(_phone), nullif(trim(coalesce(_email,'')), ''), trim(_address), trim(_city), _lines, _subtotal, _fee, _subtotal + _fee, _payment_method,
          case when _payment_method = 'cod' then null else trim(_transaction_ref) end,
          nullif(_prescription_path, ''), nullif(trim(coalesce(_prescription_notes,'')), ''))
  returning * into _order;
  return jsonb_build_object('id', _order.id, 'order_number', _order.order_number, 'total', _order.total);
end;
$$;
grant execute on function public.place_order(text, text, text, text, text, jsonb, text, text, text, text) to anon, authenticated;

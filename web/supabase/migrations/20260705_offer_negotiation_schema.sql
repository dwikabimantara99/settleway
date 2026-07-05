-- Offer and Negotiation Lifecycle Schema

create table if not exists offers (
  id text primary key,
  listing_id text references listings(id),
  buyer_request_id text references buyer_requests(id),
  buyer_id text references profiles(id) not null,
  seller_id text references profiles(id) not null,
  initiated_by_id text references profiles(id) not null,
  commodity text not null,
  volume_kg numeric,
  price_per_kg_idr numeric,
  principal_idr numeric not null,
  terms_note text,
  status text not null check (status in ('negotiating', 'awaiting_counterparty_acceptance', 'terms_accepted', 'awaiting_counterparty_open', 'active_escrow')),
  latest_message_preview text,
  terms_submitted_at timestamptz,
  terms_accepted_at timestamptz,
  terms_accepted_by_id text references profiles(id),
  buyer_open_room_at timestamptz,
  seller_open_room_at timestamptz,
  active_deal_id text references deals(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists offer_messages (
  id text primary key,
  offer_id text references offers(id) not null,
  author_id text references profiles(id) not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id text primary key,
  recipient_id text references profiles(id) not null,
  offer_id text references offers(id) not null,
  type text not null check (type in ('offer_received', 'offer_accepted', 'message_received', 'counterparty_opened_room', 'deal_room_activated')),
  message text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_offers_buyer on offers(buyer_id);
create index if not exists idx_offers_seller on offers(seller_id);
create index if not exists idx_offer_messages_offer on offer_messages(offer_id, created_at);
create index if not exists idx_notifications_recipient on notifications(recipient_id, created_at);

-- RLS
alter table offers enable row level security;
alter table offer_messages enable row level security;
alter table notifications enable row level security;

-- Offers: Only buyer and seller can read/update
create policy "Offers read by participants." on offers for select
using (auth.uid()::text = buyer_id or auth.uid()::text = seller_id);

create policy "Offers update by participants." on offers for update
using (auth.uid()::text = buyer_id or auth.uid()::text = seller_id);

create policy "Offers insert by participants." on offers for insert
with check (auth.uid()::text = buyer_id or auth.uid()::text = seller_id);

-- Offer Messages: Only offer participants can read/insert
create policy "Offer messages read by participants." on offer_messages for select
using (exists (select 1 from offers o where o.id = offer_id and (o.buyer_id = auth.uid()::text or o.seller_id = auth.uid()::text)));

create policy "Offer messages insert by participants." on offer_messages for insert
with check (exists (select 1 from offers o where o.id = offer_id and (o.buyer_id = auth.uid()::text or o.seller_id = auth.uid()::text)));

-- Notifications: Only recipient can read/update
create policy "Notifications read by recipient." on notifications for select
using (auth.uid()::text = recipient_id);

create policy "Notifications update by recipient." on notifications for update
using (auth.uid()::text = recipient_id);

create policy "Notifications insert by system/counterparty." on notifications for insert
with check (exists (select 1 from offers o where o.id = offer_id and (o.buyer_id = auth.uid()::text or o.seller_id = auth.uid()::text)));

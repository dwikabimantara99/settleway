-- Phase 10 RLS Policies

alter table profiles enable row level security;
alter table listings enable row level security;
alter table buyer_requests enable row level security;
alter table deals enable row level security;
alter table escrow_events enable row level security;
alter table evidence_files enable row level security;
alter table reputation_events enable row level security;
alter table stellar_operations enable row level security;

-- Profiles: anyone can read
create policy "Profiles are public." on profiles for select using (true);

-- Listings: anyone can read
create policy "Listings are public." on listings for select using (true);

-- Buyer requests: anyone can read
create policy "Buyer requests are public." on buyer_requests for select using (true);

-- Deals: Only buyer and seller can read/update
create policy "Deals read by participants." on deals for select
using (auth.uid()::text = buyer_id or auth.uid()::text = seller_id);

create policy "Deals update by participants." on deals for update
using (auth.uid()::text = buyer_id or auth.uid()::text = seller_id);

create policy "Deals insert by participants." on deals for insert
with check (auth.uid()::text = buyer_id or auth.uid()::text = seller_id);

-- Escrow Events: Only deal participants can read
create policy "Escrow events read by participants." on escrow_events for select
using (exists (select 1 from deals d where d.id = deal_id and (d.buyer_id = auth.uid()::text or d.seller_id = auth.uid()::text)));

create policy "Escrow events insert by participants." on escrow_events for insert
with check (exists (select 1 from deals d where d.id = deal_id and (d.buyer_id = auth.uid()::text or d.seller_id = auth.uid()::text)));

-- Evidence Files: if public anyone, if private/deal_only only participants
create policy "Evidence files read." on evidence_files for select
using (
  display_visibility = 'public' 
  or exists (select 1 from deals d where d.id = deal_id and (d.buyer_id = auth.uid()::text or d.seller_id = auth.uid()::text))
);

create policy "Evidence files insert by participants." on evidence_files for insert
with check (exists (select 1 from deals d where d.id = deal_id and (d.buyer_id = auth.uid()::text or d.seller_id = auth.uid()::text)));

-- Reputation Events: anyone can read
create policy "Reputation events are public." on reputation_events for select using (true);
create policy "Reputation events insert by participants." on reputation_events for insert
with check (exists (select 1 from deals d where d.id = deal_id and (d.buyer_id = auth.uid()::text or d.seller_id = auth.uid()::text)));

-- Stellar operations: only participants
create policy "Stellar operations read by participants." on stellar_operations for select
using (exists (select 1 from deals d where d.id = deal_id and (d.buyer_id = auth.uid()::text or d.seller_id = auth.uid()::text)));

create policy "Stellar operations modify by participants." on stellar_operations for all
using (exists (select 1 from deals d where d.id = deal_id and (d.buyer_id = auth.uid()::text or d.seller_id = auth.uid()::text)));

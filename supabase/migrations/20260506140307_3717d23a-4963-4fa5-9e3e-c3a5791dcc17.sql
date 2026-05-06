
insert into storage.buckets (id, name, public) values ('order-tickets', 'order-tickets', true)
on conflict (id) do nothing;

create policy "Anyone can upload order tickets"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'order-tickets');

create policy "Anyone can read order tickets"
on storage.objects for select to anon, authenticated
using (bucket_id = 'order-tickets');

begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select throws_ok(
  $$update sources set automated_allowed = true where id = 'eeq'$$,
  '23514', null, 'the EEQ source can never be automated'
);
select throws_ok(
  $$insert into sources (id, name, automated_allowed, base_url) values ('x', 'x', true, 'https://cronogramas.eeq.com.ec/')$$,
  '23514', null, 'no source on an eeq.com.ec host can be automated'
);
select is((select public from storage.buckets where id = 'source-documents'), false, 'source documents stay private');

select * from finish();
rollback;

begin;

select plan(24);

-- 1-3. Tables exist
select has_table('public', 'incident_municipal_observers', 'incident_municipal_observers table exists');
select has_table('public', 'intermunicipal_assistance_requests', 'intermunicipal_assistance_requests table exists');
select has_table('public', 'intermunicipal_coordination_events', 'intermunicipal_coordination_events table exists');

-- 4-6. RLS enabled
select row_security_active('public.incident_municipal_observers');
select row_security_active('public.intermunicipal_assistance_requests');
select row_security_active('public.intermunicipal_coordination_events');

-- 7-9. No direct privileges for public/anon/authenticated
select table_privs_are('public', 'incident_municipal_observers', 'anon', ARRAY[]::text[]);
select table_privs_are('public', 'intermunicipal_assistance_requests', 'authenticated', ARRAY[]::text[]);
select table_privs_are('public', 'intermunicipal_coordination_events', 'public', ARRAY[]::text[]);

-- Prepare transaction-local fixtures with non-colliding UUIDs
do $$
declare
  v_origin_muni_id uuid := '11111111-aaaa-4111-8111-111111111111';
  v_observer_muni_id uuid := '22222222-bbbb-4222-8222-222222222222';
  v_observer2_muni_id uuid := '22222222-cccc-4222-8222-222222222222';
  v_user_origin uuid := '33333333-cccc-4333-8333-333333333333';
  v_user_observer uuid := '44444444-dddd-4444-8444-444444444444';
  v_station_id uuid := '55555555-eeee-4555-8555-555555555555';
  v_station2_id uuid := '55555555-ffff-4555-8555-555555555555';
  v_report_id uuid := '66666666-ffff-4666-8666-666666666666';
  v_dispatch_id uuid := '77777777-aaaa-4777-8777-777777777777';
  v_observer_id uuid := '88888888-bbbb-4888-8888-888888888888';
begin
  insert into public.municipalities (id, name, province)
  values
    (v_origin_muni_id, 'Test Origin Municipality', 'Antique'),
    (v_observer_muni_id, 'Test Observer Municipality', 'Antique'),
    (v_observer2_muni_id, 'Test Observer Municipality 2', 'Antique')
  on conflict (id) do nothing;

  insert into public.users (id, email, password_hash, role, account_status)
  values
    (v_user_origin, 'origin_admin_coord@test.gov.ph', 'scrypt$dummy$origin', 'MUNICIPAL_BFP', 'ACTIVE'),
    (v_user_observer, 'observer_admin_coord@test.gov.ph', 'scrypt$dummy$observer', 'MUNICIPAL_BFP', 'ACTIVE')
  on conflict (id) do nothing;

  insert into public.bfp_personnel_profiles (id, user_id, display_name, rank_or_position)
  values
    (gen_random_uuid(), v_user_origin, 'Origin Admin', 'Senior Fire Officer'),
    (gen_random_uuid(), v_user_observer, 'Observer Admin', 'Senior Fire Officer')
  on conflict (user_id) do nothing;

  insert into public.bfp_municipality_assignments (municipality_id, personnel_profile_id, assignment_role, status)
  select v_origin_muni_id, id, 'MUNICIPAL_ADMIN', 'ACTIVE'
  from public.bfp_personnel_profiles where user_id = v_user_origin
  on conflict (personnel_profile_id) do nothing;

  insert into public.bfp_municipality_assignments (municipality_id, personnel_profile_id, assignment_role, status)
  select v_observer_muni_id, id, 'MUNICIPAL_ADMIN', 'ACTIVE'
  from public.bfp_personnel_profiles where user_id = v_user_observer
  on conflict (personnel_profile_id) do nothing;

  insert into public.municipal_bfp_stations (id, municipality_id, station_name, latitude, longitude, status)
  values
    (v_station_id, v_observer_muni_id, 'Observer Station', 10.700000, 122.000000, 'ACTIVE'),
    (v_station2_id, v_observer2_muni_id, 'Observer Station 2', 10.720000, 122.020000, 'ACTIVE')
  on conflict (id) do nothing;

  insert into public.fire_reports (
    id, municipality_id, report_source, fire_type, description, status,
    latitude, longitude, location_method, is_within_antique, submitted_at,
    reference_number, caller_name, caller_phone, created_by_user_id
  )
  values (
    v_report_id, v_origin_muni_id, 'PHONE_CALL', 'HOUSE_BUILDING',
    'Test coordination fire report', 'RESPONDING',
    10.710000, 122.010000, 'GPS', true, now(),
    'TEST-COORD-001', 'Juan Caller', '+639111111111', v_user_origin
  )
  on conflict (id) do nothing;

  insert into public.incident_dispatches (
    id, fire_report_id, municipality_id, dispatched_by_user_id, status, dispatched_at, created_at, updated_at
  )
  values (
    v_dispatch_id, v_report_id, v_origin_muni_id, v_user_origin, 'ACTIVE', now(), now(), now()
  )
  on conflict (id) do nothing;

  insert into public.incident_municipal_observers (
    id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id,
    nearest_station_id, station_latitude_snapshot, station_longitude_snapshot,
    distance_meters, status, selected_at
  )
  values (
    v_observer_id, v_report_id, v_dispatch_id, v_origin_muni_id, v_observer_muni_id,
    v_station_id, 10.700000, 122.000000, 1500.00, 'ACTIVE', now()
  )
  on conflict (id) do nothing;
end;
$$;

-- 10. Acknowledgment check: fails if actor is populated without timestamp
select throws_ok(
  $$
  insert into public.incident_municipal_observers (
    id, fire_report_id, dispatch_id, origin_municipality_id, observer_municipality_id,
    nearest_station_id, station_latitude_snapshot, station_longitude_snapshot,
    distance_meters, status, selected_at, acknowledged_by_user_id, acknowledged_at
  )
  values (
    gen_random_uuid(), '66666666-ffff-4666-8666-666666666666', '77777777-aaaa-4777-8777-777777777777',
    '11111111-aaaa-4111-8111-111111111111', '22222222-cccc-4222-8222-222222222222',
    '55555555-ffff-4555-8555-555555555555', 10.72, 122.02, 1600.0, 'ACTIVE', now(),
    '44444444-dddd-4444-8444-444444444444', null
  );
  $$,
  '23514',
  NULL,
  'Observer fails when acknowledged_by_user_id is set without acknowledged_at'
);

-- 11. Valid REQUESTED row succeeds
select lives_ok(
  $$
  insert into public.intermunicipal_assistance_requests (
    id, fire_report_id, dispatch_id, observer_id, requester_municipality_id, recipient_municipality_id,
    requested_by_user_id, requested_firetrucks, requested_personnel, status, requested_at, updated_at
  )
  values (
    '99999999-0001-4999-8999-999999999999',
    '66666666-ffff-4666-8666-666666666666',
    '77777777-aaaa-4777-8777-777777777777',
    '88888888-bbbb-4888-8888-888888888888',
    '11111111-aaaa-4111-8111-111111111111',
    '22222222-bbbb-4222-8222-222222222222',
    '33333333-cccc-4333-8333-333333333333',
    2, 6, 'REQUESTED', now(), now()
  );
  $$,
  'Valid REQUESTED assistance request succeeds'
);

-- 12. Partial unique index rejects two open requests for same dispatch and recipient
select throws_ok(
  $$
  insert into public.intermunicipal_assistance_requests (
    id, fire_report_id, dispatch_id, observer_id, requester_municipality_id, recipient_municipality_id,
    requested_by_user_id, requested_firetrucks, requested_personnel, status, requested_at, updated_at
  )
  values (
    '99999999-0002-4999-8999-999999999999',
    '66666666-ffff-4666-8666-666666666666',
    '77777777-aaaa-4777-8777-777777777777',
    '88888888-bbbb-4888-8888-888888888888',
    '11111111-aaaa-4111-8111-111111111111',
    '22222222-bbbb-4222-8222-222222222222',
    '33333333-cccc-4333-8333-333333333333',
    1, 2, 'REQUESTED', now(), now()
  );
  $$,
  '23505',
  NULL,
  'Duplicate open request for same dispatch and recipient violates unique index'
);

-- 13. Invalid ACCEPTED shape fails (quantities mismatch)
select throws_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'ACCEPTED',
         offered_firetrucks = 1, -- requested was 2!
         offered_personnel = 6,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  '23514',
  NULL,
  'ACCEPTED shape check fails when offered_firetrucks does not match requested'
);

-- 14. Valid ACCEPTED shape succeeds
select lives_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'ACCEPTED',
         offered_firetrucks = 2,
         offered_personnel = 6,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  'Valid ACCEPTED shape succeeds'
);

-- 15. Invalid PARTIALLY_ACCEPTED shape fails (sum is 0)
select throws_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'PARTIALLY_ACCEPTED',
         offered_firetrucks = 0,
         offered_personnel = 0,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  '23514',
  NULL,
  'PARTIALLY_ACCEPTED fails when offered sum is 0'
);

-- 16. Valid PARTIALLY_ACCEPTED shape succeeds
select lives_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'PARTIALLY_ACCEPTED',
         offered_firetrucks = 1,
         offered_personnel = 4,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  'Valid PARTIALLY_ACCEPTED shape succeeds'
);

-- 17. Invalid REJECTED shape fails (offered not 0)
select throws_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'REJECTED',
         offered_firetrucks = 1,
         offered_personnel = 0,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  '23514',
  NULL,
  'REJECTED fails when offered quantities are not 0'
);

-- 18. Valid REJECTED shape succeeds
select lives_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'REJECTED',
         offered_firetrucks = 0,
         offered_personnel = 0,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  'Valid REJECTED shape succeeds'
);

-- 19. Invalid CANCELLED shape fails (responder is populated)
select throws_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'CANCELLED',
         offered_firetrucks = null,
         offered_personnel = null,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  '23514',
  NULL,
  'CANCELLED fails when responder is populated'
);

-- 20. Valid CANCELLED shape succeeds
select lives_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'CANCELLED',
         offered_firetrucks = null,
         offered_personnel = null,
         responded_by_user_id = null,
         responded_at = null
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  'Valid CANCELLED shape succeeds'
);

-- 21. Valid COMPLETED shape succeeds
select lives_ok(
  $$
  update public.intermunicipal_assistance_requests
     set status = 'COMPLETED',
         offered_firetrucks = 2,
         offered_personnel = 6,
         responded_by_user_id = '44444444-dddd-4444-8444-444444444444',
         responded_at = now(),
         completed_at = now()
   where id = '99999999-0001-4999-8999-999999999999';
  $$,
  'Valid COMPLETED shape succeeds'
);

-- 22. Audit insertion succeeds
select lives_ok(
  $$
  insert into public.intermunicipal_coordination_events (
    id, fire_report_id, dispatch_id, assistance_request_id, actor_user_id,
    origin_municipality_id, recipient_municipality_id, event_type, created_at
  )
  values (
    'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    '66666666-ffff-4666-8666-666666666666',
    '77777777-aaaa-4777-8777-777777777777',
    '99999999-0001-4999-8999-999999999999',
    '33333333-cccc-4333-8333-333333333333',
    '11111111-aaaa-4111-8111-111111111111',
    '22222222-bbbb-4222-8222-222222222222',
    'ASSISTANCE_REQUESTED',
    now()
  );
  $$,
  'Audit event insertion succeeds'
);

-- 23. Updating audit event fails due to trigger
select throws_ok(
  $$
  update public.intermunicipal_coordination_events
     set new_status = 'MUTATED'
   where id = 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa';
  $$,
  'P0001',
  'intermunicipal coordination events are immutable',
  'Audit event update raises immutable exception'
);

-- 24. Deleting audit event fails due to trigger
select throws_ok(
  $$
  delete from public.intermunicipal_coordination_events
   where id = 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa';
  $$,
  'P0001',
  'intermunicipal coordination events are immutable',
  'Audit event delete raises immutable exception'
);

select * from finish();
rollback;

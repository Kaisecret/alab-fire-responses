alter table public.resident_security_settings
  alter column pin_hash drop not null,
  drop constraint resident_security_settings_pin_hash_check,
  add constraint resident_security_settings_pin_hash_check
    check (pin_hash is null or char_length(trim(pin_hash)) between 60 and 255);

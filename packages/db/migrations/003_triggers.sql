BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mailbox_connection_updated_at
BEFORE UPDATE ON "MailboxConnection"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_phone_number_updated_at
BEFORE UPDATE ON "PhoneNumber"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lead_updated_at
BEFORE UPDATE ON "Lead"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_derived_profile_updated_at
BEFORE UPDATE ON "DerivedLeadProfile"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;

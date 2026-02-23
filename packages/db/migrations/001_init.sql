BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE "Team" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stale_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  sla_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_rules JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES "Team"(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('AGENT', 'TEAM_LEAD')),
  language TEXT NOT NULL
);

CREATE TABLE "MailboxConnection" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email_address CITEXT NOT NULL,
  mailbox_type TEXT NOT NULL CHECK (mailbox_type IN ('primary', 'shared', 'delegated')),
  delegated_from CITEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'error', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, email_address, mailbox_type, delegated_from)
);

CREATE TABLE "PhoneNumber" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio')),
  number TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (number)
);

CREATE TABLE "Lead" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES "Team"(id) ON DELETE CASCADE,
  owner_agent_id UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  state TEXT NOT NULL CHECK (state IN ('New', 'Active', 'At-Risk', 'Stale')),
  source TEXT NOT NULL CHECK (source IN ('email', 'sms', 'call', 'manual')),
  primary_email CITEXT,
  primary_phone TEXT,
  last_touch_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "ConversationEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'call', 'note', 'system')),
  type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  mailbox_connection_id UUID REFERENCES "MailboxConnection"(id) ON DELETE SET NULL,
  phone_number_id UUID REFERENCES "PhoneNumber"(id) ON DELETE SET NULL,
  provider_event_id TEXT,
  raw_body BYTEA,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Attachment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_event_id UUID NOT NULL REFERENCES "ConversationEvent"(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "DerivedLeadProfile" (
  lead_id UUID PRIMARY KEY REFERENCES "Lead"(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL,
  fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Task" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'done', 'snoozed', 'cancelled')),
  type TEXT NOT NULL CHECK (type IN ('contact_now', 'follow_up', 'rescue', 'call_outcome', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "AuditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_team_role ON "User"(team_id, role);

CREATE INDEX idx_mailbox_user_status ON "MailboxConnection"(user_id, status);
CREATE INDEX idx_mailbox_provider_email ON "MailboxConnection"(provider, email_address);

CREATE INDEX idx_phone_team_status ON "PhoneNumber"(team_id, status);

CREATE INDEX idx_lead_team_state_next_action ON "Lead"(team_id, state, next_action_at);
CREATE INDEX idx_lead_owner_state_next_action ON "Lead"(owner_agent_id, state, next_action_at);
CREATE INDEX idx_lead_email ON "Lead"(primary_email);
CREATE INDEX idx_lead_phone ON "Lead"(primary_phone);
CREATE INDEX idx_lead_last_touch ON "Lead"(last_touch_at);

CREATE INDEX idx_event_lead_created_at ON "ConversationEvent"(lead_id, created_at DESC);
CREATE INDEX idx_event_channel_created_at ON "ConversationEvent"(channel, created_at DESC);
CREATE INDEX idx_event_mailbox_created_at ON "ConversationEvent"(mailbox_connection_id, created_at DESC);
CREATE INDEX idx_event_phone_created_at ON "ConversationEvent"(phone_number_id, created_at DESC);

CREATE UNIQUE INDEX ux_event_email_provider_id
ON "ConversationEvent"(mailbox_connection_id, provider_event_id)
WHERE channel = 'email' AND provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX ux_event_sms_provider_id
ON "ConversationEvent"(phone_number_id, provider_event_id)
WHERE channel = 'sms' AND provider_event_id IS NOT NULL;

CREATE UNIQUE INDEX ux_event_call_provider_id
ON "ConversationEvent"(phone_number_id, provider_event_id)
WHERE channel = 'call' AND provider_event_id IS NOT NULL;

CREATE INDEX idx_attachment_event ON "Attachment"(conversation_event_id);
CREATE INDEX idx_attachment_filename ON "Attachment"(lower(filename));
CREATE INDEX idx_attachment_mime ON "Attachment"(mime_type);

CREATE INDEX idx_profile_language ON "DerivedLeadProfile"(language);
CREATE INDEX idx_profile_updated_at ON "DerivedLeadProfile"(updated_at DESC);

CREATE INDEX idx_task_owner_status_due ON "Task"(owner_id, status, due_at);
CREATE INDEX idx_task_lead_status_due ON "Task"(lead_id, status, due_at);

CREATE INDEX idx_audit_lead_time ON "AuditLog"(lead_id, "timestamp" DESC);
CREATE INDEX idx_audit_actor_time ON "AuditLog"(actor_id, "timestamp" DESC);

COMMIT;

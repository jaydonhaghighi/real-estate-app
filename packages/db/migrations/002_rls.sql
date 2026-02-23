BEGIN;

CREATE OR REPLACE FUNCTION app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app_team_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.team_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.role', true), '');
$$;

ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailboxConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhoneNumber" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DerivedLeadProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_select_policy ON "Team"
  FOR SELECT
  USING (id = app_team_id());

CREATE POLICY team_update_policy ON "Team"
  FOR UPDATE
  USING (id = app_team_id() AND app_role() = 'TEAM_LEAD')
  WITH CHECK (id = app_team_id() AND app_role() = 'TEAM_LEAD');

CREATE POLICY user_select_policy ON "User"
  FOR SELECT
  USING (team_id = app_team_id());

CREATE POLICY user_insert_policy ON "User"
  FOR INSERT
  WITH CHECK (team_id = app_team_id() AND app_role() = 'TEAM_LEAD');

CREATE POLICY user_update_policy ON "User"
  FOR UPDATE
  USING (team_id = app_team_id() AND app_role() = 'TEAM_LEAD')
  WITH CHECK (team_id = app_team_id() AND app_role() = 'TEAM_LEAD');

CREATE POLICY mailbox_select_policy ON "MailboxConnection"
  FOR SELECT
  USING (
    user_id = app_user_id()
    OR (
      app_role() = 'TEAM_LEAD'
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = "MailboxConnection".user_id
          AND u.team_id = app_team_id()
      )
    )
  );

CREATE POLICY mailbox_insert_policy ON "MailboxConnection"
  FOR INSERT
  WITH CHECK (
    user_id = app_user_id()
    OR (
      app_role() = 'TEAM_LEAD'
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = "MailboxConnection".user_id
          AND u.team_id = app_team_id()
      )
    )
  );

CREATE POLICY mailbox_update_policy ON "MailboxConnection"
  FOR UPDATE
  USING (
    user_id = app_user_id()
    OR (
      app_role() = 'TEAM_LEAD'
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = "MailboxConnection".user_id
          AND u.team_id = app_team_id()
      )
    )
  )
  WITH CHECK (
    user_id = app_user_id()
    OR (
      app_role() = 'TEAM_LEAD'
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = "MailboxConnection".user_id
          AND u.team_id = app_team_id()
      )
    )
  );

CREATE POLICY phone_select_policy ON "PhoneNumber"
  FOR SELECT
  USING (team_id = app_team_id());

CREATE POLICY phone_insert_policy ON "PhoneNumber"
  FOR INSERT
  WITH CHECK (team_id = app_team_id() AND app_role() = 'TEAM_LEAD');

CREATE POLICY phone_update_policy ON "PhoneNumber"
  FOR UPDATE
  USING (team_id = app_team_id() AND app_role() = 'TEAM_LEAD')
  WITH CHECK (team_id = app_team_id() AND app_role() = 'TEAM_LEAD');

CREATE POLICY lead_select_policy ON "Lead"
  FOR SELECT
  USING (
    team_id = app_team_id()
    AND (
      app_role() = 'TEAM_LEAD'
      OR owner_agent_id = app_user_id()
    )
  );

CREATE POLICY lead_insert_policy ON "Lead"
  FOR INSERT
  WITH CHECK (
    team_id = app_team_id()
    AND (
      app_role() = 'TEAM_LEAD'
      OR owner_agent_id = app_user_id()
    )
  );

CREATE POLICY lead_update_policy ON "Lead"
  FOR UPDATE
  USING (
    team_id = app_team_id()
    AND (
      app_role() = 'TEAM_LEAD'
      OR owner_agent_id = app_user_id()
    )
  )
  WITH CHECK (
    team_id = app_team_id()
    AND (
      app_role() = 'TEAM_LEAD'
      OR owner_agent_id = app_user_id()
    )
  );

CREATE POLICY lead_delete_policy ON "Lead"
  FOR DELETE
  USING (team_id = app_team_id() AND app_role() = 'TEAM_LEAD');

CREATE POLICY event_select_policy ON "ConversationEvent"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "ConversationEvent".lead_id
        AND l.team_id = app_team_id()
        AND (
          (app_role() = 'AGENT' AND l.owner_agent_id = app_user_id())
          OR (app_role() = 'TEAM_LEAD' AND l.state = 'Stale')
        )
    )
  );

CREATE POLICY event_insert_policy ON "ConversationEvent"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "ConversationEvent".lead_id
        AND l.team_id = app_team_id()
        AND (
          (app_role() = 'AGENT' AND l.owner_agent_id = app_user_id())
          OR (app_role() = 'TEAM_LEAD' AND l.state = 'Stale')
        )
    )
  );

CREATE POLICY event_update_policy ON "ConversationEvent"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "ConversationEvent".lead_id
        AND l.team_id = app_team_id()
        AND (
          (app_role() = 'AGENT' AND l.owner_agent_id = app_user_id())
          OR (app_role() = 'TEAM_LEAD' AND l.state = 'Stale')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "ConversationEvent".lead_id
        AND l.team_id = app_team_id()
        AND (
          (app_role() = 'AGENT' AND l.owner_agent_id = app_user_id())
          OR (app_role() = 'TEAM_LEAD' AND l.state = 'Stale')
        )
    )
  );

CREATE POLICY attachment_select_policy ON "Attachment"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "ConversationEvent" e
      JOIN "Lead" l ON l.id = e.lead_id
      WHERE e.id = "Attachment".conversation_event_id
        AND l.team_id = app_team_id()
        AND (
          (app_role() = 'AGENT' AND l.owner_agent_id = app_user_id())
          OR (app_role() = 'TEAM_LEAD' AND l.state = 'Stale')
        )
    )
  );

CREATE POLICY attachment_insert_policy ON "Attachment"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "ConversationEvent" e
      JOIN "Lead" l ON l.id = e.lead_id
      WHERE e.id = "Attachment".conversation_event_id
        AND l.team_id = app_team_id()
        AND (
          (app_role() = 'AGENT' AND l.owner_agent_id = app_user_id())
          OR (app_role() = 'TEAM_LEAD' AND l.state = 'Stale')
        )
    )
  );

CREATE POLICY derived_select_policy ON "DerivedLeadProfile"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "DerivedLeadProfile".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  );

CREATE POLICY derived_insert_policy ON "DerivedLeadProfile"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "DerivedLeadProfile".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  );

CREATE POLICY derived_update_policy ON "DerivedLeadProfile"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "DerivedLeadProfile".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "DerivedLeadProfile".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  );

CREATE POLICY task_select_policy ON "Task"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "Task".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  );

CREATE POLICY task_insert_policy ON "Task"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "Task".lead_id
        AND l.team_id = app_team_id()
        AND (
          (app_role() = 'AGENT' AND l.owner_agent_id = app_user_id() AND "Task".owner_id = app_user_id())
          OR app_role() = 'TEAM_LEAD'
        )
    )
  );

CREATE POLICY task_update_policy ON "Task"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "Task".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "Task".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  );

CREATE POLICY audit_select_policy ON "AuditLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "AuditLog".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  );

CREATE POLICY audit_insert_policy ON "AuditLog"
  FOR INSERT
  WITH CHECK (
    actor_id = app_user_id()
    AND EXISTS (
      SELECT 1 FROM "Lead" l
      WHERE l.id = "AuditLog".lead_id
        AND l.team_id = app_team_id()
        AND (
          app_role() = 'TEAM_LEAD'
          OR l.owner_agent_id = app_user_id()
        )
    )
  );

CREATE OR REPLACE FUNCTION team_event_metadata(p_lead_id UUID)
RETURNS TABLE (
  id UUID,
  channel TEXT,
  type TEXT,
  direction TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF app_role() <> 'TEAM_LEAD' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT e.id, e.channel, e.type, e.direction, e.created_at
  FROM "ConversationEvent" e
  JOIN "Lead" l ON l.id = e.lead_id
  WHERE e.lead_id = p_lead_id
    AND l.team_id = app_team_id();
END;
$$;

REVOKE ALL ON FUNCTION team_event_metadata(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION team_event_metadata(UUID) TO PUBLIC;

COMMIT;

# PRD v1.2

**Messaging-First Follow-Up Execution Platform**
Real Estate Team Communication + Privacy-First Oversight

**Status:** Draft
**Date:** 2026-02-20
**Owner:** TBD

---

# 1. Product Summary

Build a mobile-first messaging, SMS, and calling workspace for real estate agents that centralizes client communication and converts follow-up into a swipeable Task Deck.

The system enforces privacy-by-default:

* Agents can only access raw conversations for their own leads.
* Team Leads receive summary-level oversight for Active and At-Risk leads.
* When a lead becomes Stale, raw access unlocks for rescue and reassignment.
* All privileged access is logged.

The product is language-aware and supports any user-selected language for UI, templates, AI summaries, and draft replies.

---

# 2. Goals and Non-Goals

## 2.1 Goals

* Reduce missed follow-ups via frictionless daily execution (Task Deck).
* Centralize email, SMS, and calling into a unified lead timeline.
* Provide summary-first governance without exposing sensitive content.
* Enable structured rescue workflows when leads become Stale.
* Support multi-language UX and AI-assisted drafting (human-in-the-loop only).
* Support multi-mailbox operations for agents and team workflows.

## 2.2 Non-Goals

* Full CRM parity (advanced pipelines, forecasting, complex reporting).
* MLS comparables engine or pricing automation.
* Transaction management, document signing, accounting, and commissions.
* Deep third-party portal integrations beyond messaging channels.
* Autonomous AI outreach or auto-send behavior without human approval.
* Real-time team chat, typing indicators, or presence features.

---

# 3. Users and Roles

## Agent

**Primary Goals**

* Clear daily follow-ups efficiently.
* Maintain conversation context on callbacks.
* Communicate from one unified interface.

**Constraints**

* Low tolerance for admin friction.
* Mobile-first workflow.
* Ownership of assigned leads.

---

## Team Lead

**Primary Goals**

* Enforce SLAs and response discipline.
* Reduce lead leakage and waste.
* Intervene only when necessary.
* Manage rescue and reassignment workflows.

**Constraints**

* Must not see raw client content for Active leads.
* Requires auditability and measurable oversight.

---

# 4. Problem Statement

Agents manage follow-ups across calls, texts, and email, fragmenting context and making reminders memory-dependent. Traditional CRMs are underused due to manual entry overhead and misalignment with real communication workflows.

As volume increases:

* Follow-ups are missed.
* Context is lost during callbacks.
* Leads go cold.
* Team Leads lack structured oversight without violating privacy or ownership boundaries.

---

# 5. Proposed Solution

A messaging-first execution platform that:

* Connects to agent mailboxes (Gmail / Outlook).
* Supports call initiation via native phone app with Twilio-based routing.
* Supports in-app two-way SMS.
* Presents a Task Deck as the primary daily workflow.
* Maintains a unified lead thread.
* Enforces privacy-by-default with summary-level governance.
* Automatically escalates Stale leads into a Rescue Queue.

All AI suggestions are editable and never auto-sent.

---

# 6. Product Scope

## 6.1 Channels

### Email

* OAuth connection (Gmail / Outlook)
* Inbound and outbound sync
* Reply from app
* Logged in timeline
* Full historical backfill and ongoing incremental sync
* Attachment ingestion, download, and search
* Shared inbox and delegated mailbox support

**Email sync requirements (explicit)**

* **Per user**: one or more connected mailboxes, including delegated/shared mailboxes.
* **What we ingest**:
  * Inbound mail delivered to Inbox and relevant folders.
  * Outbound mail sent from the app.
  * Outbound mail sent outside the app (Gmail web, Outlook desktop/web), captured via provider sync.
* **Continuity requirement**:
  * Replies must preserve provider-native thread continuity.

### Calling

* Native call initiation through the device phone app
* Twilio-based routing for business-number workflows
* Call event logging (direction, time, duration, status)
* Post-call outcome capture

**Calling requirements (explicit)**

* Tapping Call opens the native phone dialer with Twilio-configured routing.
* The app logs intent-to-call before switching to the native phone app.
* Post-call outcome capture is required before task completion.
* Duration/status is pulled from Twilio call records when available; otherwise captured manually.

### SMS

* Provisioned business number
* Two-way texting from app
* Delivery and failure status logging
* Full capture in lead timeline across iOS and Android

---

## 6.2 Core UX: Task Deck

The home screen is a swipeable queue of action cards due Today.

**Card Sources**

* New leads
* Scheduled follow-ups
* At-Risk leads nearing SLA breach
* Stale leads (Rescue)

**Primary Actions**

* Send (email or SMS)
* Call
* Schedule follow-up
* Snooze
* Mark Done

**Gestures**

* Swipe right -> Done/Sent
* Swipe left -> Snooze (Later Today / Tomorrow / Next Week)

---

## 6.3 Unified Lead Thread

Each lead has a single timeline view:

* Emails
* SMS messages
* Call events
* Notes
* Tasks
* Outcomes
* Attachments

At the top: **Client Memory Panel**

* AI-generated summary
* Extracted structured fields
* Last touch timestamp
* Next action

Language adapts to user preference or detected conversation language.

---

## 6.4 Stale Rescue

When inactivity thresholds trigger a Stale state:

* Lead enters Rescue Queue.
* Raw thread access unlocks for Team Lead.
* All privileged access is logged in AuditLog.
* Team Lead may:

  * Message
  * Call
  * Reassign

If the lead responds:

* Ownership can revert to original agent.
* Auto-generated recap provided.

---

## 6.5 Implementation Notes (to remove ambiguity)

### Lead States + Defaults (initial)

Defaults should be team-configurable and ship with baseline values:

| State / Concept | Default | Notes |
| --- | --- | --- |
| New lead SLA (time to first outbound) | 60 minutes | Drives "Contact Now" urgency. |
| Active lead stale threshold (no touch) | 48 hours | "Touch" = outbound email/SMS/call + logged outcome/note. |
| At-Risk threshold | 80% of SLA/stale window | Drives earlier Task Deck priority. |
| Stale | crosses stale threshold | Triggers Rescue Queue + unlock rules. |

### What counts as a "Touch"

For SLA / stale detection, the following update `last_touch_at`:

* Outbound email
* Outbound SMS
* Call completion with outcome submitted
* Manual note marked as "Client Interaction"

Inbound messages update the lead timeline but do **not** automatically clear follow-up tasks unless an agent explicitly marks it done or schedules next action.

### Derived vs Raw (privacy definitions)

To align with the Permissions Matrix:

* **Raw Content includes**: email subject lines, message bodies (HTML/text), SMS bodies, headers, attachments, and free-text notes.
* **Derived Profile includes**: AI summary (no quotes by default), extracted structured fields, last-touch timestamp, next action, and aggregate metrics.
* Team Lead views for **Active / At-Risk** leads show:
  * Derived profile
  * Event **types + timestamps only** (e.g., "Inbound Email", "Outbound SMS", "Call", "Note"), without subjects/bodies
* Team Lead may access raw content only when **Stale**, and every access must write an `AuditLog` entry with a reason.

### Messaging ingestion correctness

* Ingestion must be **idempotent** (duplicate webhooks must not create duplicate `ConversationEvent`s).
* Inbound message -> task creation must meet **< 1 minute p95** end-to-end.
* Reply-from-app must preserve thread continuity via provider-specific reply mechanisms.
* Outbound sync from external clients must be captured and associated to existing threads.

# 7. Functional Requirements

| ID    | Requirement                              | Acceptance Criteria                                                                 |
| ----- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| FR-1  | Email OAuth connect + sync               | Mailbox connects; inbound/outbound sync works; ingest within 1 minute (p95).       |
| FR-2  | Lead match/create + dedup                | Unknown sender creates lead; known sender attaches to existing lead.                |
| FR-3  | Reply from app                           | Provider thread continuity preserved; outbound logs to timeline.                    |
| FR-4  | Native dialer calling + Twilio routing   | Call launches via native phone app; Twilio routing and call events are logged.      |
| FR-5  | Post-call outcome                        | Outcome form creates follow-up task and updates last-touch.                         |
| FR-6  | Task Deck                                | Tasks generate correctly; swipe actions persist.                                    |
| FR-7  | Template library (multi-language)        | User can select/edit template; templates persist by language preference.            |
| FR-8  | AI draft + summary                       | Editable only; never auto-send; summary updates after new events; language-aware.   |
| FR-9  | Lead states + stale detection            | State transitions follow inactivity rules; Stale triggers Rescue Queue.             |
| FR-10 | Privacy enforcement                      | API-level access control; agents cannot access other agents' raw threads.           |
| FR-11 | Summary-first oversight                  | Team Lead sees derived profile for Active/At-Risk leads only.                       |
| FR-12 | Unlock raw on Stale + audit              | Raw thread opens only when Stale; all access logged.                                |
| FR-13 | Two-way SMS                              | Inbound/outbound SMS send/receive in-app and persist in timeline.                   |
| FR-14 | Twilio call routing configuration         | Outbound calls follow configured Twilio route and map to the correct lead timeline. |
| FR-15 | Multi-mailbox + shared/delegated support | User can connect multiple mailboxes and operate delegated/shared inboxes.           |
| FR-16 | Full mail sync + backfill                | Historical backfill completes; external outbound is captured and linked to lead.    |
| FR-17 | Attachment handling                      | Attachments ingest, can be downloaded, and are searchable by filename/metadata.     |
| FR-18 | SLA dashboards + escalation rules        | Team Lead can view SLA metrics and configure escalation triggers.                    |
| FR-19 | Automated rescue sequences               | Stale leads can enter configurable rescue sequence with audit trail and outcomes.    |

## 7.1 Acceptance Tests (non-exhaustive)

* **FR-1/2 (ingestion + lead creation)**
  * Given the same provider message is delivered twice (duplicate webhook), only **one** `ConversationEvent` exists.
  * Given an unknown sender, a new `Lead` is created and linked.
* **FR-3 (reply continuity)**
  * Given an inbound email thread, sending a reply from the app appears in the same provider thread for the recipient.
* **FR-6 (Task Deck persistence)**
  * Given a swipe action (Done/Snooze), the next app launch shows the updated queue.
* **FR-10/11/12 (privacy enforcement)**
  * Team Lead cannot retrieve raw event bodies for Active/At-Risk leads via any API route.
  * Team Lead can retrieve raw content for Stale leads only; every raw access creates an `AuditLog` record.
* **FR-13 (SMS)**
  * Given inbound SMS, the lead timeline updates and an actionable task is generated.
* **FR-15/16 (mailbox + sync)**
  * Given a delegated mailbox and a primary mailbox, both sync successfully and route to correct lead threads.
  * Given an email sent from an external mail client, the outbound appears in the lead timeline within sync SLA.
* **FR-17 (attachments)**
  * Given an inbound email attachment, user can open it and find it via filename search.

---

# 8. Permissions Matrix

**Raw Content** = message bodies, full email content, attachments, notes
**Derived Profile** = AI summary, extracted fields, metrics

| Role          | Active: Raw     | Active: Derived | Stale: Raw      | Actions on Stale       |
| ------------- | --------------- | --------------- | --------------- | ---------------------- |
| Agent (Owner) | Yes (own leads) | Yes             | Yes             | Send / Call / Schedule |
| Team Lead     | No              | Yes (team-wide) | Yes (team-wide) | Send / Call / Reassign |

---

# 9. End-to-End Flows

## Flow A - Inbound Email to First Contact

1. Email ingested.
2. Lead matched or created (State: New).
3. Task card appears: "Contact Now".
4. Agent selects template or AI draft, edits, sends.
5. Lead becomes Active.
6. Follow-up task scheduled.

---

## Flow B - Call to Follow-Up

1. Agent taps Call.
2. Call event logged.
3. Post-call outcome captured.
4. Follow-up task created.
5. Last-touch updated.

---

## Flow C - Stale Rescue

1. Inactivity threshold reached.
2. State changes to Stale.
3. Lead enters Rescue Queue.
4. Team Lead gains raw access (logged).
5. Rescue message or call executed.
6. If response occurs -> hand back with recap.

---

# 10. Minimal Data Model

```
User(id, team_id, role, language)

Team(id, stale_rules, sla_rules, escalation_rules)

MailboxConnection(
  id,
  user_id,
  provider,
  email_address,
  mailbox_type,
  delegated_from,
  status,
  created_at,
  updated_at
) [restricted]

PhoneNumber(
  id,
  team_id,
  provider,
  number,
  capabilities,
  status,
  created_at,
  updated_at
)

Lead(
  id,
  team_id,
  owner_agent_id,
  state,
  source,
  primary_email,
  primary_phone,
  last_touch_at,
  next_action_at,
  created_at,
  updated_at
)

ConversationEvent(
  id,
  lead_id,
  channel,
  type,
  direction,
  mailbox_connection_id,
  phone_number_id,
  provider_event_id,
  raw_body,
  meta,
  created_at
) [restricted]

Attachment(
  id,
  conversation_event_id,
  filename,
  mime_type,
  storage_key,
  size_bytes,
  created_at
) [restricted]

DerivedLeadProfile(
  lead_id,
  summary,
  language,
  fields_json,
  metrics_json,
  updated_at
) [shareable]

Task(
  id,
  lead_id,
  owner_id,
  due_at,
  status,
  type,
  created_at
)

AuditLog(
  id,
  actor_id,
  lead_id,
  action,
  reason,
  timestamp
)
```

---

# 11. Metrics

* Time to first contact
* Inbound -> outbound response time
* Tasks due vs completed per day
* Average time-to-clear Task Deck
* Stale rate (pre/post intervention)
* Rescue conversion rate
* Daily / weekly active agents
* SMS response and delivery success rate
* Mail sync coverage (in-app + external outbound capture rate)

---

# 12. Non-Functional Requirements

## 12.1 Security

* Strict API-level authorization.
* Encryption at rest for raw content.
* Logged privileged access.
* Derived summaries must avoid direct quotes by default.

## 12.2 Performance

* Task Deck load < 2 seconds.
* AI draft target < 3 seconds (fallback to templates).
* Message ingestion -> task creation < 1 minute (p95).
* Idempotent ingestion (no duplicate leads/events).

---

# 13. Capability Baseline (No Timeframe Constraint)

The following capabilities are all required in the product scope:

* Email connect, backfill, and ongoing bidirectional sync
* In-app two-way SMS with business number
* Native dialer calling with Twilio routing and logging
* Task Deck with swipe actions
* Template library
* AI drafts and summaries (language-aware)
* Unified lead thread across all channels
* Attachments ingestion/download/search
* Multi-mailbox and shared/delegated mailbox support
* Role-based privacy enforcement
* Stale detection + Rescue Queue
* SLA dashboards + escalation rules
* Automated rescue sequences
* Audit logging

---

# 14. Open Questions

* Confirm legal/compliance requirements for call recording and transcription by region.
* Confirm attachment retention policy and storage limits by plan tier.
* Confirm Twilio routing constraints by carrier/region and expected fallback behavior.
* Confirm strictness of summary redaction policy (names visible vs masked).

---

# 15. Explicitly Out of Scope

* Full CRM parity (complex pipeline and forecasting modules).
* MLS comparables or pricing automation.
* Transaction operations (document signing, accounting, commissions).
* Real-time internal team chat/presence features.
* Autonomous AI sending without human approval.

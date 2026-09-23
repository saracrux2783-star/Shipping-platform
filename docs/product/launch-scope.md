# Launch scope

## Included in Phase 1

- Product requirements, user flows, business rules, and architecture decisions.
- A pure TypeScript shipment state transition model.
- Tests for the complete authoritative transition matrix, invalid transitions, terminal states, authority restrictions, and payment evidence.
- Explicit handling rules for duplicate, concurrent, stale, and out-of-order provider events.

## Deferred

- PostgreSQL or any persistence schema.
- Stripe or another payment integration.
- Carrier APIs, tracking webhooks, rate shopping, label purchasing, and label void APIs.
- Authentication, production infrastructure, observability, queues, and operational dashboards.
- Legal, tax, refund, dispute, and carrier-contract policy.

## Launch gates for future phases

Before production use, later phases must define persistence constraints, provider idempotency and signature verification, authorization, audit retention, reconciliation jobs, refund policy, label purchasing/voiding policy, and operational recovery for every open decision.

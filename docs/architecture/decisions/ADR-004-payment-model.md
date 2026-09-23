# ADR-004: Payment model

- **Status:** Accepted for Phase 1 boundary; provider details deferred
- **Decision:** Payment is a separate state machine. The shipment may enter `paid` only after verified payment-provider evidence is accepted by the server. Client redirects and client-provided status are never evidence.
- **Why:** Payment success must be authoritative, replay-safe, and independent from label or tracking state.
- **Consequences:** Duplicate and concurrent callbacks require provider event/payment idempotency. Refunds, disputes, financial ledger design, and exact payment states are open for a later phase.

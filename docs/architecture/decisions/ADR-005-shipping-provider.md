# ADR-005: Shipping provider

- **Status:** Accepted for Phase 1 boundary; provider selection deferred
- **Decision:** Treat a shipping provider as an adapter that supplies verified label and carrier evidence. The domain remains provider-neutral.
- **Why:** Carrier capabilities differ, and the product must support skipped tracking states, duplicate events, and out-of-order delivery without embedding an SDK in domain code.
- **Consequences:** Later adapters must verify signatures/authenticity, preserve provider event IDs and timestamps, map provider states, and reconcile timeouts. Provider choice, SLA, and commercial contract are open decisions.

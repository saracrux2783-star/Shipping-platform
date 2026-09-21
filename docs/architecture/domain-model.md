# Domain model

Phase 1 defines boundaries, not storage or integrations.

- **Shipment**: server-authoritative lifecycle state plus immutable address and
  finalized-financial snapshots. Its valid transitions are in ADR-003.
- **Payment**: independent lifecycle: `requires_payment`, `processing`,
  `succeeded`, `failed`, `refunded`. Provider evidence, amount, and currency are
  prerequisites for a successful payment.
- **Label**: independent lifecycle: `pending`, `purchasing`, `purchased`,
  `failed`, `void_requested`, `voided`. Void request and void confirmation differ.
- **Tracking event**: immutable provider event record, deduplicated by provider
  event identity and processed idempotently.
- **Shipment status history**: immutable record of accepted shipment transitions.

Shipment status does not encode payment or label status. For example, a label
purchase can fail after payment succeeds without erasing `Payment.succeeded`.
Persistence, constraints, transaction boundaries, and provider adapters are
explicitly deferred to Phase 2 or later.

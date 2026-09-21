# ADR-005: Shipping provider boundary

**Status:** Accepted for domain separation

Carrier/provider evidence is required for label creation, label void
confirmation, and carrier-derived shipment states. Labels have their own state
machine: `pending` → `purchasing` → `purchased` / `failed`, with `purchased` →
`void_requested` → `voided`. Tracking events are immutable and provider-event
processing must be idempotent, tolerate out-of-order events, allow skipped
intermediate states, and never regress a newer shipment state. Carrier selection,
API integration, webhook handling, label purchase, and storage are deferred.

# Product requirements — Phase 1

Phase 1 specifies the shipment lifecycle needed before persistence work begins. It
adds no database, payment, carrier, label-purchase, tracking-webhook, or
production-infrastructure implementation.

## Requirements

1. Shipment status is server-authoritative; clients submit operations, never a
   status value.
2. Only the transitions in [ADR-003](../architecture/decisions/ADR-003-shipment-state-machine.md)
   are valid. Terminal shipment states cannot reopen.
3. Shipment status history and tracking events must be immutable when persistence
   is introduced.
4. Payment, label, and shipment status are separate state machines.
5. Payment success requires verified provider evidence whose amount and currency
   match finalized shipment financial fields. A shipment has at most one
   successful payment.
6. A successful payment is required before label creation; a shipment has at
   most one active label.
7. Carrier-derived shipment changes require verified provider evidence. Provider
   event handling must be idempotent and tolerate skipped or out-of-order events.
8. Shipment address snapshots and finalized financial fields are immutable after
   successful payment.

The domain package supplies framework-independent transition validation only;
application, provider, and persistence adapters are deferred.

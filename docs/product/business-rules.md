# Business rules

## Ownership and authority

- The client can request an operation but never chooses shipment status.
- Payment success requires verified payment-provider evidence.
- Carrier-derived states require verified carrier evidence.
- System transitions must be made through the domain transition policy, not direct field mutation.

## Separate lifecycles

Shipment state, payment state, and label state are separate state machines. `paid` does not mean a label exists; `label_created` does not mean the package is in transit. Tracking events are immutable facts and do not become mutable shipment commands.

## Idempotency and ordering

Provider event identities are idempotency keys. Duplicate payment and carrier events produce no additional effect. Carrier events may arrive out of order: all verified facts are retained, but a stale event cannot regress the current state. A carrier can skip intermediate tracking states and go directly to `delivered`.

## Finalization

The address, package, selected service, and financial values used for payment are immutable snapshots after payment succeeds. Any change requires a new quote/payment flow or an explicit void-and-reissue process. Financial information cannot silently change after payment.

## Cancellation and voiding

Cancellation is a business operation with authorization and policy checks. It is not arbitrary assignment of `cancelled`. A label void request is distinct from confirmed `label_voided`; only verified confirmation can enter the terminal voided state.

## Terminal states

`delivered`, `returned`, `cancelled`, `label_voided`, and `failed` cannot transition to any other state. Duplicate terminal events are idempotent no-ops when they repeat the existing state.

## Open decisions

- Whether retryable label purchase failure returns to `paid` or uses a separate operational retry status.
- Timeout SLA and reconciliation schedule for label purchases and voids.
- Exact cancellation/refund rules after payment and after label purchase.
- The canonical ordering policy when provider event time conflicts with receipt time.
- Retention, privacy, and redaction rules for immutable tracking events.

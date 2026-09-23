# User flows

## Prepare and pay

1. The consumer enters origin, destination, package, and service preferences.
2. The system validates the request and creates immutable address/package snapshots for the payment attempt.
3. The shipment starts in `draft`.
4. The consumer requests checkout; the server moves it to `pending_payment`.
5. The server starts payment processing and moves it to `payment_processing`.
6. Only verified provider evidence can move the shipment to `paid`. Failed or unverified payment evidence cannot do so.

## Purchase a label

1. A paid shipment may request label purchase and move to `label_purchasing`.
2. A confirmed provider response moves it to `label_created`.
3. A provider failure returns it to `paid` or moves it to `failed` according to the operation result; a timeout remains an explicit pending operational decision until reconciliation.
4. A label void request is separate from a confirmed `label_voided` transition.

## Track delivery

1. Tracking facts are appended as immutable events with provider event IDs, timestamps, and verification metadata.
2. Verified carrier evidence may move the shipment to `in_transit`, `out_for_delivery`, `delivery_exception`, `returned`, or `delivered`.
3. Carriers may skip intermediate states, so a verified event may move directly to `delivered`.
4. Duplicate events are no-ops. Late events are retained for audit but cannot regress the current shipment state.

## Cancellation and changes

Cancellation is a business operation, not a status mutation. Before payment it may cancel a draft or pending payment. After payment, cancellation requires policy checks and may be refused once a shipment is already in irreversible fulfillment work.

## Explicit behavior matrix

| Situation | Behavior |
| --- | --- |
| Payment succeeds but label purchase fails | Keep payment state successful; return shipment operation to `paid` when retryable, otherwise `failed`; never pretend payment was reversed. |
| Duplicate payment webhook | Idempotent no-op after the first verified event; reconcile by provider event ID. |
| Duplicate carrier webhook | Idempotent no-op; retain one immutable event record. |
| Concurrent payment callbacks | Serialize/idempotently apply by provider payment/event identity; only one payment result wins. |
| Concurrent label purchases | Enforce one active purchase operation; reconcile provider idempotency key before retrying. |
| Carrier jumps directly to delivered | Accept if verified; intermediate tracking states are optional. |
| Stale/out-of-order carrier events | Store the fact, but do not regress the shipment state; ordering uses provider event time plus reconciliation rules. |
| Address/package changes after payment | Reject in-place mutation; require a new payment/label flow or explicit void-and-reissue decision. |
| Cancellation before payment | Allow through the business operation from `draft` or `pending_payment`. |
| Cancellation after payment | Policy-gated; never directly mutate status. A paid shipment can be cancelled only before irreversible fulfillment work. |
| Cancellation after label purchase | Do not silently cancel; require carrier label-void workflow and policy approval. |
| Duplicate delivered events | Idempotent no-op after the first delivered state. |
| Label purchase timeout | Remains pending for provider reconciliation; do not blindly retry or report failure. Retry policy and timeout SLA are open decisions. |
| Pending label void | Keep the label-void request separate from confirmed `label_voided`; do not expose confirmation until verified. |

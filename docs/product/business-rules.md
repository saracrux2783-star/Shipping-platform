# Business rules

## Authority and invariants

- Shipment status is server-authoritative; undefined transitions are rejected.
- Application authority controls draft/payment initiation, cancellation, and
  internal failure handling. Payment success requires verified payment evidence.
  Carrier-derived transitions and confirmed label creation/voiding require
  verified carrier/provider evidence.
- Terminal states (`returned`, `delivered`, `cancelled`, `label_voided`, and
  `failed`) cannot reopen.
- Every transition will be represented in immutable shipment status history;
  tracking events are an immutable, idempotent event stream.
- A shipment permits one successful payment and one active label. Label creation
  requires successful payment. Address snapshots and finalized financial fields
  cannot silently change after payment.

## Edge-case policy

| Case                                                            | Required behavior / open decision                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Duplicate payment or carrier webhook; duplicate delivered event | Idempotently avoid a duplicate payment, transition, or tracking event.                                  |
| Concurrent payment callbacks / two successes                    | Persist a uniqueness guarantee for one successful payment; reject or reconcile the loser.               |
| Concurrent label purchases / two racing requests                | Serialize with an active-label uniqueness guarantee; only one purchase may become active.               |
| Payment succeeds, label purchase fails                          | Preserve payment success; represent the label failure separately and do not pretend payment was undone. |
| Carrier skips to delivered                                      | Accept the explicit allowed direct delivery transition with verified evidence.                          |
| Out-of-order event or stale event after delivered               | Do not regress shipment status; retain immutable evidence. Exact history display policy is open.        |
| Address or package changes after payment                        | Do not silently modify snapshots/finalized financial fields. Whether to cancel/refund/requote is open.  |
| Label purchase timeout                                          | Do not infer purchase failure; reconcile provider outcome idempotently.                                 |
| Void requested, confirmation absent                             | Keep label `void_requested`; do not set shipment `label_voided` until verified confirmation.            |
| Cancellation before payment                                     | Allowed from `draft` and `pending_payment`.                                                             |
| Cancellation after payment                                      | Allowed from `paid`; refund policy is open and separate from shipment state.                            |
| Cancellation after label purchase                               | Not a shipment transition; label void/refund policy is open.                                            |

Generic `failed` must carry structured failure category, code, source, and
retryability when stored; it is not an unexplained catch-all.

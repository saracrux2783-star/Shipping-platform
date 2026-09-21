# Shipment user flows

## Create and pay

A server creates a shipment in `draft`, validates it, then moves it to
`pending_payment`. It may move to `payment_processing`. Only verified payment
provider evidence can move it to `paid`; failed or abandoned processing follows
the state matrix.

## Purchase a label

After `paid`, the server may enter `label_purchasing`. Verified provider evidence
creates the label and moves the shipment to `label_created`. A purchase failure
moves to `failed`; a retryable purchase outcome returns to `paid`, preserving the
separate successful payment record.

## Delivery lifecycle

Verified carrier events advance a labelled shipment through transit, delivery
exception, return, or delivery. Carriers may report `delivered` directly from
`label_created` or `in_transit`; the server must not manufacture intermediate
events. Stale and duplicate events are recorded/idempotently ignored according
to the future event-processing policy.

## Cancel or void

Cancellation is a server-side business operation, not a generic client status
write. It is available only from `draft`, `pending_payment`, or `paid`. After a
label exists, label voiding is a separate operation: requested and confirmed
voids belong to the label state machine; confirmed provider evidence moves the
shipment from `label_created` to `label_voided`.

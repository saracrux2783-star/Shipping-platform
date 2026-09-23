# ADR-003: Shipment state machine

- **Status:** Accepted; this is the single authoritative transition matrix

## States

`draft`, `pending_payment`, `payment_processing`, `paid`, `label_purchasing`, `label_created`, `in_transit`, `out_for_delivery`, `delivery_exception`, `returned`, `delivered`, `cancelled`, `label_voided`, `failed`.

## Allowed transitions

| From | To |
| --- | --- |
| `draft` | `pending_payment`, `cancelled` |
| `pending_payment` | `payment_processing`, `cancelled` |
| `payment_processing` | `paid`, `pending_payment`, `failed` |
| `paid` | `label_purchasing`, `cancelled` |
| `label_purchasing` | `label_created`, `paid`, `failed` |
| `label_created` | `in_transit`, `delivered`, `label_voided` |
| `in_transit` | `out_for_delivery`, `delivered`, `delivery_exception`, `returned` |
| `out_for_delivery` | `delivered`, `delivery_exception`, `returned` |
| `delivery_exception` | `in_transit`, `out_for_delivery`, `returned` |

Every other transition is invalid. Terminal states are `delivered`, `returned`, `cancelled`, `label_voided`, and `failed`; they cannot reopen.

## Authority rules

The client never chooses status. `payment_processing -> paid` requires verified payment-provider evidence. Carrier-derived targets (`in_transit`, `out_for_delivery`, `delivery_exception`, `returned`, and `delivered`) require verified carrier evidence. A label void request is not a confirmed `label_voided` transition.

## Consequences

This matrix is implemented as pure lookup/validation logic in `packages/domain/src/shipment-state.ts` and tested exhaustively. Payment and label lifecycles remain separate, and immutable tracking events are inputs rather than transitions themselves.

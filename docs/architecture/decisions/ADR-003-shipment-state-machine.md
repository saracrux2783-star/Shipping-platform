# ADR-003: Shipment state machine

**Status:** Accepted

Shipment state is server-authoritative and distinct from payment and label state.
Every transition not in this matrix is rejected.

| From                                                           | Allowed to                                                        | Required authority                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `draft`                                                        | `pending_payment`, `cancelled`                                    | application                        |
| `pending_payment`                                              | `payment_processing`, `cancelled`                                 | application                        |
| `payment_processing`                                           | `paid`                                                            | verified payment-provider evidence |
| `payment_processing`                                           | `pending_payment`, `failed`                                       | application                        |
| `paid`                                                         | `label_purchasing`, `cancelled`                                   | application                        |
| `label_purchasing`                                             | `label_created`                                                   | verified carrier/provider evidence |
| `label_purchasing`                                             | `paid`, `failed`                                                  | application                        |
| `label_created`                                                | `in_transit`, `delivered`, `label_voided`                         | verified carrier/provider evidence |
| `in_transit`                                                   | `out_for_delivery`, `delivered`, `delivery_exception`, `returned` | verified carrier/provider evidence |
| `out_for_delivery`                                             | `delivered`, `delivery_exception`, `returned`                     | verified carrier/provider evidence |
| `delivery_exception`                                           | `in_transit`, `out_for_delivery`, `returned`                      | verified carrier/provider evidence |
| `returned`, `delivered`, `cancelled`, `label_voided`, `failed` | none                                                              | terminal                           |

Prerequisites: payment success needs verified evidence and matching finalized
amount/currency; label creation needs successful payment; carrier transitions
need verified carrier/provider evidence. Client commands never set state
directly. Future persistence must append immutable status history and must make
provider-event processing idempotent and non-regressive.

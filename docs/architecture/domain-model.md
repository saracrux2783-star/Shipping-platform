# Domain model

Phase 1 defines concepts, not persistence tables.

## Aggregate concepts

- **Shipment**: owns the server-controlled shipment state and references immutable address/package snapshots.
- **Payment**: separate lifecycle for authorization, processing, success, failure, refund, and provider evidence.
- **Label**: separate lifecycle for purchase request, provider response, void request, and confirmed void.
- **Tracking event**: immutable carrier fact containing provider identity, event identity, event time, received time, mapped state, and verification result.
- **Address snapshot**: immutable origin/destination values captured for a quote/payment/label operation.
- **Package snapshot**: immutable dimensions, weight, and packaging values captured for the operation.

## Boundaries

The domain accepts verified evidence and business commands. Adapters later translate Stripe/carrier/database records into those inputs. The domain does not import a provider SDK or transport framework. It decides whether a requested transition is structurally and authoritatively valid; persistence and idempotency storage will be implemented later.

## Invariants

- Shipment status is never client-assigned.
- Payment success is not inferred from a client redirect.
- Carrier status is not inferred without verified carrier evidence.
- Snapshot values and finalized financial values cannot be silently edited.
- Tracking facts are append-only.
- Terminal shipment states cannot reopen.

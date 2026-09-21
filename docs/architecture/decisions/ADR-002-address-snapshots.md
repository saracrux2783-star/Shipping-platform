# ADR-002: Address snapshots

**Status:** Accepted

A shipment uses immutable origin and destination address snapshots. Customer
profile/address-book edits must not mutate a shipment snapshot. After successful
payment, changing a package or address must not silently change finalized price,
currency, or shipment inputs. The later product decision is whether such changes
require cancellation, refund, or a newly quoted shipment.

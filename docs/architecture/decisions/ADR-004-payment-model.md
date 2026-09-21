# ADR-004: Payment model

**Status:** Accepted for domain separation

Payment is independent from shipment state: `requires_payment` → `processing` →
`succeeded` / `failed` / `refunded`. `payment_processing` → `paid` is the only
shipment transition requiring payment-provider evidence. A successful payment
must match finalized shipment amount and currency, and a shipment can have at
most one successful payment. No payment provider, collection flow, refund
workflow, or database implementation is selected in Phase 1.

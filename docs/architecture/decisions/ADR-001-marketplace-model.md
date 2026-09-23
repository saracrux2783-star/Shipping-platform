# ADR-001: Marketplace model

- **Status:** Accepted for Phase 1 product modeling
- **Decision:** Model the platform as a consumer-facing shipping marketplace/orchestrator. The platform compares options and coordinates payment, label, and tracking workflows while providers remain systems of record for their own evidence.
- **Why:** This preserves provider-neutral domain logic and prevents coupling shipment behavior to one carrier or payment vendor.
- **Consequences:** Provider adapters and normalization are required later. Provider-specific capabilities and commercial terms remain outside this domain package.

# ADR-002: Address snapshots

- **Status:** Accepted
- **Decision:** Copy origin and destination addresses into immutable operation snapshots when an amount or label workflow is finalized. Package and service selections are snapshot values as well.
- **Why:** Quotes, payments, labels, and audits must refer to the exact values used at that time.
- **Consequences:** A post-payment change cannot mutate history. It requires a new operation or an explicit void-and-reissue flow. Storage and redaction details remain future work.

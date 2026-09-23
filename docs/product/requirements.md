# Product requirements

## Phase 1 objective

Phase 1 defines the product contract for shipment creation, payment, label purchase, and tracking without connecting to a database, payment provider, carrier, or production infrastructure. The deliverable is documentation plus framework-independent domain tests.

## Product capabilities

The eventual product will let a consumer prepare a shipment, compare shipping options, pay, purchase a label, and track delivery. Phase 1 specifies the rules that later application and integration layers must enforce.

The shipment status is server-owned. A client may request an operation, but it may not assign a shipment status directly. Payment, label, and shipment lifecycles are separate state machines.

## Phase 1 requirements

1. The authoritative shipment states and transitions are documented in [ADR-003](../architecture/decisions/ADR-003-shipment-state-machine.md).
2. Invalid shipment transitions and reopening terminal states are rejected by pure TypeScript domain logic.
3. Payment completion requires verified payment-provider evidence.
4. Carrier-derived shipment changes require verified carrier evidence.
5. Provider events are handled idempotently, and tracking events are immutable facts rather than mutable status commands.
6. Address and package data used for payment and label purchase are finalized snapshots.
7. The repository remains framework-independent at the domain boundary and does not add PostgreSQL, Stripe, carrier APIs, label purchasing, webhooks, or production infrastructure.

## Non-goals

The Phase 1 implementation does not persist entities, call providers, expose HTTP endpoints, calculate rates, create labels, or process real money.

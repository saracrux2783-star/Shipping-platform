export const shipmentStates = [
  'draft',
  'pending_payment',
  'payment_processing',
  'paid',
  'label_purchasing',
  'label_created',
  'in_transit',
  'out_for_delivery',
  'delivery_exception',
  'returned',
  'delivered',
  'cancelled',
  'label_voided',
  'failed',
] as const;

export type ShipmentState = (typeof shipmentStates)[number];
export type TransitionAuthority =
  | 'application'
  | 'payment_provider'
  | 'carrier_provider';

export type PaymentState =
  | 'requires_payment'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export type LabelState =
  | 'pending'
  | 'purchasing'
  | 'purchased'
  | 'failed'
  | 'void_requested'
  | 'voided';

export interface TransitionCommand {
  from: ShipmentState;
  to: ShipmentState;
  authority: TransitionAuthority;
  paymentEvidence?: { providerEventId: string };
  carrierEvidence?: { providerEventId: string };
}

export const allowedTransitions: Readonly<
  Record<ShipmentState, readonly ShipmentState[]>
> = {
  draft: ['pending_payment', 'cancelled'],
  pending_payment: ['payment_processing', 'cancelled'],
  payment_processing: ['paid', 'pending_payment', 'failed'],
  paid: ['label_purchasing', 'cancelled'],
  label_purchasing: ['label_created', 'paid', 'failed'],
  label_created: ['in_transit', 'delivered', 'label_voided'],
  in_transit: [
    'out_for_delivery',
    'delivered',
    'delivery_exception',
    'returned',
  ],
  out_for_delivery: ['delivered', 'delivery_exception', 'returned'],
  delivery_exception: ['in_transit', 'out_for_delivery', 'returned'],
  returned: [],
  delivered: [],
  cancelled: [],
  label_voided: [],
  failed: [],
};

const paymentProviderTransitions = new Set<`${ShipmentState}:${ShipmentState}`>([
  'payment_processing:paid',
]);

const carrierProviderTransitions = new Set<`${ShipmentState}:${ShipmentState}`>([
  'label_purchasing:label_created',
  'label_created:in_transit',
  'label_created:delivered',
  'label_created:label_voided',
  'in_transit:out_for_delivery',
  'in_transit:delivered',
  'in_transit:delivery_exception',
  'in_transit:returned',
  'out_for_delivery:delivered',
  'out_for_delivery:delivery_exception',
  'out_for_delivery:returned',
  'delivery_exception:in_transit',
  'delivery_exception:out_for_delivery',
  'delivery_exception:returned',
]);

function transitionKey(
  from: ShipmentState,
  to: ShipmentState,
): `${ShipmentState}:${ShipmentState}` {
  return `${from}:${to}`;
}

export function getAllowedTransitions(
  from: ShipmentState,
): readonly ShipmentState[] {
  return allowedTransitions[from];
}

export function isTerminalShipmentState(state: ShipmentState): boolean {
  return allowedTransitions[state].length === 0;
}

export function isAllowedShipmentTransition(
  from: ShipmentState,
  to: ShipmentState,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function requiredAuthority(
  from: ShipmentState,
  to: ShipmentState,
): TransitionAuthority {
  const key = transitionKey(from, to);
  if (paymentProviderTransitions.has(key)) return 'payment_provider';
  if (carrierProviderTransitions.has(key)) return 'carrier_provider';
  return 'application';
}

export function validateShipmentTransition(command: TransitionCommand): void {
  const { from, to, authority, paymentEvidence, carrierEvidence } = command;

  if (!isAllowedShipmentTransition(from, to)) {
    throw new Error(`Shipment transition ${from} -> ${to} is not allowed`);
  }

  const required = requiredAuthority(from, to);
  if (authority !== required) {
    throw new Error(
      `Shipment transition ${from} -> ${to} requires ${required} authority`,
    );
  }

  if (required === 'payment_provider' && paymentEvidence === undefined) {
    throw new Error(
      `Shipment transition ${from} -> ${to} requires payment evidence`,
    );
  }

  if (required === 'carrier_provider' && carrierEvidence === undefined) {
    throw new Error(
      `Shipment transition ${from} -> ${to} requires carrier evidence`,
    );
  }
}

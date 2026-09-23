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
  'failed'
] as const;

export type ShipmentState = (typeof shipmentStates)[number];

export type TransitionAuthority =
  | 'application'
  | 'payment_provider'
  | 'label_provider'
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

export interface PaymentEvidence {
  providerEventId: string;
  amountCents: number;
  currency: string;
}

export interface LabelEvidence {
  providerEventId: string;
  kind: 'label_created' | 'label_voided';
}

export interface CarrierEvidence {
  providerEventId: string;
  status:
    | 'label_created'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'delivery_exception'
    | 'returned';
}

export interface TransitionCommand {
  from: ShipmentState;
  to: ShipmentState;
  authority: TransitionAuthority;
  paymentEvidence?: PaymentEvidence;
  labelEvidence?: LabelEvidence;
  carrierEvidence?: CarrierEvidence;
}

export interface TransitionResult {
  accepted: boolean;
  reason:
    | 'accepted'
    | 'duplicate'
    | 'stale'
    | 'invalid'
    | 'unauthorized'
    | 'missing_evidence'
    | 'invalid_evidence';
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
    'returned'
  ],
  out_for_delivery: ['delivered', 'delivery_exception', 'returned'],
  delivery_exception: ['in_transit', 'out_for_delivery', 'returned'],
  returned: [],
  delivered: [],
  cancelled: [],
  label_voided: [],
  failed: []
};

const applicationTransitions = new Set<`${ShipmentState}:${ShipmentState}`>([
  'draft:pending_payment',
  'draft:cancelled',
  'pending_payment:payment_processing',
  'pending_payment:cancelled',
  'payment_processing:pending_payment',
  'payment_processing:failed',
  'paid:label_purchasing',
  'paid:cancelled',
  'label_purchasing:paid',
  'label_purchasing:failed'
]);

const paymentProviderTransitions = new Set<`${ShipmentState}:${ShipmentState}`>([
  'payment_processing:paid'
]);

const labelProviderTransitions = new Set<`${ShipmentState}:${ShipmentState}`>([
  'label_purchasing:label_created',
  'label_created:label_voided'
]);

const carrierProviderTransitions = new Set<`${ShipmentState}:${ShipmentState}`>([
  'label_created:in_transit',
  'label_created:delivered',
  'in_transit:out_for_delivery',
  'in_transit:delivered',
  'in_transit:delivery_exception',
  'in_transit:returned',
  'out_for_delivery:delivered',
  'out_for_delivery:delivery_exception',
  'out_for_delivery:returned',
  'delivery_exception:in_transit',
  'delivery_exception:out_for_delivery',
  'delivery_exception:returned'
]);

function transitionKey(
  from: ShipmentState,
  to: ShipmentState
): `${ShipmentState}:${ShipmentState}` {
  return `${from}:${to}`;
}

function hasProviderEventId(command: TransitionCommand): boolean {
  return Boolean(
    command.paymentEvidence?.providerEventId ||
      command.labelEvidence?.providerEventId ||
      command.carrierEvidence?.providerEventId
  );
}

export function getAllowedTransitions(
  from: ShipmentState
): readonly ShipmentState[] {
  return allowedTransitions[from];
}

export function isTerminalShipmentState(state: ShipmentState): boolean {
  return allowedTransitions[state].length === 0;
}

export function isAllowedShipmentTransition(
  from: ShipmentState,
  to: ShipmentState
): boolean {
  return allowedTransitions[from].includes(to);
}

export function requiredAuthority(
  from: ShipmentState,
  to: ShipmentState
): TransitionAuthority {
  const key = transitionKey(from, to);

  if (paymentProviderTransitions.has(key)) return 'payment_provider';
  if (labelProviderTransitions.has(key)) return 'label_provider';
  if (carrierProviderTransitions.has(key)) return 'carrier_provider';
  return 'application';
}

function validateEvidence(command: TransitionCommand): void {
  const required = requiredAuthority(command.from, command.to);

  if (required === 'payment_provider') {
    if (!command.paymentEvidence) {
      throw new Error(
        `Shipment transition ${command.from} -> ${command.to} requires payment evidence`
      );
    }
    if (
      !Number.isInteger(command.paymentEvidence.amountCents) ||
      command.paymentEvidence.amountCents < 0 ||
      !command.paymentEvidence.currency
    ) {
      throw new Error('Payment evidence must contain amount and currency');
    }
    return;
  }

  if (required === 'label_provider') {
    if (!command.labelEvidence) {
      throw new Error(
        `Shipment transition ${command.from} -> ${command.to} requires label evidence`
      );
    }
    const expectedKind =
      command.to === 'label_created' ? 'label_created' : 'label_voided';
    if (command.labelEvidence.kind !== expectedKind) {
      throw new Error('Label evidence kind does not match shipment transition');
    }
    return;
  }

  if (required === 'carrier_provider') {
    if (!command.carrierEvidence) {
      throw new Error(
        `Shipment transition ${command.from} -> ${command.to} requires carrier evidence`
      );
    }
    if (command.carrierEvidence.status !== command.to) {
      throw new Error('Carrier evidence status does not match shipment transition');
    }
  }
}

export function validateShipmentTransition(command: TransitionCommand): void {
  if (!isAllowedShipmentTransition(command.from, command.to)) {
    throw new Error(
      `Shipment transition ${command.from} -> ${command.to} is not allowed`
    );
  }

  const required = requiredAuthority(command.from, command.to);
  if (command.authority !== required) {
    throw new Error(
      `Shipment transition ${command.from} -> ${command.to} requires ${required} authority`
    );
  }

  validateEvidence(command);
}

/**
 * Pure state-machine decision for an already-verified provider event.
 *
 * Persistence is responsible for deduplicating providerEventId values and for
 * supplying the actual current state. This function only decides whether an
 * event may advance that state. Provider events cannot reopen terminal states.
 */
export function evaluateProviderTransition(
  currentState: ShipmentState,
  command: TransitionCommand,
  eventAlreadyProcessed = false
): TransitionResult {
  if (eventAlreadyProcessed) {
    return { accepted: false, reason: 'duplicate' };
  }

  if (!isAllowedShipmentTransition(command.from, command.to)) {
    return { accepted: false, reason: 'invalid' };
  }

  if (command.from !== currentState) {
    return { accepted: false, reason: 'stale' };
  }

  try {
    validateShipmentTransition(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('requires') && message.includes('evidence')) {
      return { accepted: false, reason: 'missing_evidence' };
    }
    if (message.includes('evidence')) {
      return { accepted: false, reason: 'invalid_evidence' };
    }
    if (message.includes('authority')) {
      return { accepted: false, reason: 'unauthorized' };
    }
    return { accepted: false, reason: 'invalid' };
  }

  if (!hasProviderEventId(command)) {
    return { accepted: false, reason: 'missing_evidence' };
  }

  return { accepted: true, reason: 'accepted' };
}

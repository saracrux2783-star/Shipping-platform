export const SHIPMENT_STATES = [
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

export type ShipmentState = (typeof SHIPMENT_STATES)[number];
export type TransitionAuthority =
  | 'system'
  | 'payment_provider'
  | 'shipping_provider'
  | 'carrier'
  | 'client';

export const TERMINAL_SHIPMENT_STATES: ReadonlySet<ShipmentState> = new Set([
  'delivered',
  'returned',
  'cancelled',
  'label_voided',
  'failed',
]);

export const LABEL_PROVIDER_STATES: ReadonlySet<ShipmentState> = new Set([
  'label_created',
  'label_voided',
]);

export const CARRIER_DERIVED_STATES: ReadonlySet<ShipmentState> = new Set([
  'in_transit',
  'out_for_delivery',
  'delivery_exception',
  'returned',
  'delivered',
]);

export const PAYMENT_SUCCESS_STATE: ShipmentState = 'paid';

const TRANSITIONS: Readonly<Record<ShipmentState, ReadonlySet<ShipmentState>>> = {
  draft: new Set(['pending_payment', 'cancelled']),
  pending_payment: new Set(['payment_processing', 'cancelled']),
  payment_processing: new Set(['paid', 'pending_payment', 'failed']),
  paid: new Set(['label_purchasing', 'cancelled']),
  label_purchasing: new Set(['label_created', 'paid', 'failed']),
  label_created: new Set(['in_transit', 'delivered', 'label_voided']),
  in_transit: new Set([
    'out_for_delivery',
    'delivered',
    'delivery_exception',
    'returned',
  ]),
  out_for_delivery: new Set(['delivered', 'delivery_exception', 'returned']),
  delivery_exception: new Set(['in_transit', 'out_for_delivery', 'returned']),
  returned: new Set(),
  delivered: new Set(),
  cancelled: new Set(),
  label_voided: new Set(),
  failed: new Set(),
};

export function allowedTransitions(from: ShipmentState): ReadonlySet<ShipmentState> {
  return TRANSITIONS[from];
}

export function isTerminalShipmentState(state: ShipmentState): boolean {
  return TERMINAL_SHIPMENT_STATES.has(state);
}

export interface TransitionEvidence {
  readonly authority: TransitionAuthority;
  readonly evidenceVerified?: boolean;
}

export type TransitionRejection =
  | 'source_is_terminal'
  | 'transition_not_allowed'
  | 'client_cannot_set_status'
  | 'application_authority_required'
  | 'verified_evidence_required'
  | 'label_evidence_required'
  | 'carrier_evidence_required';

export type TransitionValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: TransitionRejection };

export function validateShipmentTransition(
  from: ShipmentState,
  to: ShipmentState,
  evidence: TransitionEvidence,
): TransitionValidation {
  if (isTerminalShipmentState(from)) {
    return { valid: false, reason: 'source_is_terminal' };
  }
  if (!allowedTransitions(from).has(to)) {
    return { valid: false, reason: 'transition_not_allowed' };
  }
  if (evidence.authority === 'client') {
    return { valid: false, reason: 'client_cannot_set_status' };
  }
  if (to === PAYMENT_SUCCESS_STATE) {
    if (
      evidence.authority !== 'payment_provider' ||
      evidence.evidenceVerified !== true
    ) {
      return { valid: false, reason: 'verified_evidence_required' };
    }
    return { valid: true };
  }
  if (LABEL_PROVIDER_STATES.has(to)) {
    if (
      evidence.authority !== 'shipping_provider' ||
      evidence.evidenceVerified !== true
    ) {
      return { valid: false, reason: 'label_evidence_required' };
    }
    return { valid: true };
  }
  if (CARRIER_DERIVED_STATES.has(to)) {
    if (
      evidence.authority !== 'carrier' ||
      evidence.evidenceVerified !== true
    ) {
      return { valid: false, reason: 'carrier_evidence_required' };
    }
    return { valid: true };
  }
  if (evidence.authority !== 'system') {
    return { valid: false, reason: 'application_authority_required' };
  }
  return { valid: true };
}

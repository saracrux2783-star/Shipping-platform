import { describe, expect, it } from 'vitest';
import {
  CARRIER_DERIVED_STATES,
  LABEL_PROVIDER_STATES,
  PAYMENT_SUCCESS_STATE,
  SHIPMENT_STATES,
  TERMINAL_SHIPMENT_STATES,
  allowedTransitions,
  isTerminalShipmentState,
  validateShipmentTransition,
  type ShipmentState,
} from './shipment-state.js';

const allTransitions: ReadonlyArray<readonly [ShipmentState, ShipmentState[]]> = [
  ['draft', ['pending_payment', 'cancelled']],
  ['pending_payment', ['payment_processing', 'cancelled']],
  ['payment_processing', ['paid', 'pending_payment', 'failed']],
  ['paid', ['label_purchasing', 'cancelled']],
  ['label_purchasing', ['label_created', 'paid', 'failed']],
  ['label_created', ['in_transit', 'delivered', 'label_voided']],
  ['in_transit', ['out_for_delivery', 'delivered', 'delivery_exception', 'returned']],
  ['out_for_delivery', ['delivered', 'delivery_exception', 'returned']],
  ['delivery_exception', ['in_transit', 'out_for_delivery', 'returned']],
];

const systemTransitions: ReadonlyArray<readonly [ShipmentState, ShipmentState]> = [
  ['draft', 'pending_payment'],
  ['draft', 'cancelled'],
  ['pending_payment', 'payment_processing'],
  ['pending_payment', 'cancelled'],
  ['payment_processing', 'pending_payment'],
  ['payment_processing', 'failed'],
  ['paid', 'label_purchasing'],
  ['paid', 'cancelled'],
  ['label_purchasing', 'paid'],
  ['label_purchasing', 'failed'],
];

describe('shipment state machine', () => {
  it.each(
    allTransitions.flatMap(([from, targets]) =>
      targets.map((to) => [from, to] as const),
    ),
  )('allows %s -> %s', (from, to) => {
    expect(allowedTransitions(from)).toContain(to);
    const authority =
      PAYMENT_SUCCESS_STATE === to
        ? 'payment_provider'
        : LABEL_PROVIDER_STATES.has(to)
          ? 'shipping_provider'
          : CARRIER_DERIVED_STATES.has(to)
            ? 'carrier'
            : 'system';
    const evidence =
      authority === 'system' ? { authority } : { authority, evidenceVerified: true };

    expect(validateShipmentTransition(from, to, evidence)).toEqual({ valid: true });
  });

  it.each([
    ['draft', 'paid'],
    ['paid', 'delivered'],
    ['label_created', 'out_for_delivery'],
    ['in_transit', 'paid'],
    ['delivery_exception', 'delivered'],
  ] as const)('rejects invalid transition %s -> %s', (from, to) => {
    expect(validateShipmentTransition(from, to, { authority: 'system' })).toEqual({
      valid: false,
      reason: 'transition_not_allowed',
    });
  });

  it.each([...TERMINAL_SHIPMENT_STATES])(
    'recognizes %s as terminal and cannot reopen',
    (state) => {
      expect(isTerminalShipmentState(state)).toBe(true);
      for (const target of SHIPMENT_STATES) {
        expect(
          validateShipmentTransition(state, target, { authority: 'system' }),
        ).toEqual({ valid: false, reason: 'source_is_terminal' });
      }
    },
  );

  it('rejects all client-authored status changes', () => {
    expect(
      validateShipmentTransition('draft', 'pending_payment', {
        authority: 'client',
      }),
    ).toEqual({ valid: false, reason: 'client_cannot_set_status' });
  });

  it.each(systemTransitions)(
    'rejects provider authority from system transition %s -> %s',
    (from, to) => {
      expect(
        validateShipmentTransition(from, to, {
          authority: 'payment_provider',
          evidenceVerified: true,
        }),
      ).toEqual({ valid: false, reason: 'application_authority_required' });
      expect(
        validateShipmentTransition(from, to, {
          authority: 'carrier',
          evidenceVerified: true,
        }),
      ).toEqual({ valid: false, reason: 'application_authority_required' });
    },
  );

  it('requires verified payment evidence for payment success', () => {
    expect(
      validateShipmentTransition('payment_processing', PAYMENT_SUCCESS_STATE, {
        authority: 'payment_provider',
      }),
    ).toEqual({ valid: false, reason: 'verified_evidence_required' });
    expect(
      validateShipmentTransition('payment_processing', PAYMENT_SUCCESS_STATE, {
        authority: 'payment_provider',
        evidenceVerified: false,
      }),
    ).toEqual({ valid: false, reason: 'verified_evidence_required' });
    expect(
      validateShipmentTransition('payment_processing', PAYMENT_SUCCESS_STATE, {
        authority: 'payment_provider',
        evidenceVerified: true,
      }),
    ).toEqual({ valid: true });
  });

  it.each([...LABEL_PROVIDER_STATES])(
    'requires verified shipping-provider evidence for %s',
    (target) => {
      const from = target === 'label_created' ? 'label_purchasing' : 'label_created';
      expect(
        validateShipmentTransition(from, target, {
          authority: 'shipping_provider',
        }),
      ).toEqual({ valid: false, reason: 'label_evidence_required' });
      expect(
        validateShipmentTransition(from, target, {
          authority: 'shipping_provider',
          evidenceVerified: false,
        }),
      ).toEqual({ valid: false, reason: 'label_evidence_required' });
      expect(
        validateShipmentTransition(from, target, {
          authority: 'shipping_provider',
          evidenceVerified: true,
        }),
      ).toEqual({ valid: true });
    },
  );

  it.each([...CARRIER_DERIVED_STATES])(
    'requires verified carrier evidence for %s',
    (target) => {
      const from = target === 'in_transit' || target === 'delivered' ? 'label_created' : 'in_transit';
      expect(
        validateShipmentTransition(from, target, { authority: 'carrier' }),
      ).toEqual({ valid: false, reason: 'carrier_evidence_required' });
      expect(
        validateShipmentTransition(from, target, {
          authority: 'carrier',
          evidenceVerified: false,
        }),
      ).toEqual({ valid: false, reason: 'carrier_evidence_required' });
      expect(
        validateShipmentTransition(from, target, {
          authority: 'carrier',
          evidenceVerified: true,
        }),
      ).toEqual({ valid: true });
    },
  );
});

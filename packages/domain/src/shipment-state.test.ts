import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  getAllowedTransitions,
  isAllowedShipmentTransition,
  isTerminalShipmentState,
  requiredAuthority,
  shipmentStates,
  validateShipmentTransition,
  type LabelState,
  type PaymentState,
  type ShipmentState
} from './shipment-state.js';

const evidence = {
  paymentEvidence: { providerEventId: 'payment-event-1' },
  carrierEvidence: { providerEventId: 'carrier-event-1' }
};

describe('shipment state machine', () => {
  it('allows every explicitly listed transition with its required authority', () => {
    for (const from of shipmentStates) {
      for (const to of getAllowedTransitions(from)) {
        expect(() =>
          validateShipmentTransition({
            from,
            to,
            authority: requiredAuthority(from, to),
            ...evidence
          })
        ).not.toThrow();
      }
    }
  });

  it('rejects every transition absent from the allowed-transition map', () => {
    for (const from of shipmentStates) {
      for (const to of shipmentStates) {
        if (!allowedTransitions[from].includes(to)) {
          expect(() =>
            validateShipmentTransition({ from, to, authority: 'application' })
          ).toThrow(`Shipment transition ${from} -> ${to} is not allowed`);
        }
      }
    }
  });

  it.each([
    ['delivered', 'in_transit'],
    ['delivered', 'cancelled'],
    ['cancelled', 'paid'],
    ['returned', 'in_transit'],
    ['label_voided', 'paid'],
    ['draft', 'delivered'],
    ['draft', 'in_transit']
  ] as const)(
    'rejects representative invalid transition %s -> %s',
    (from, to) => {
      expect(() =>
        validateShipmentTransition({ from, to, authority: 'application' })
      ).toThrow();
    }
  );

  it('does not allow an application command to perform carrier-only transitions', () => {
    expect(() =>
      validateShipmentTransition({
        from: 'label_created',
        to: 'in_transit',
        authority: 'application'
      })
    ).toThrow('requires carrier_provider authority');
  });

  it('requires verified payment evidence for payment success', () => {
    expect(() =>
      validateShipmentTransition({
        from: 'payment_processing',
        to: 'paid',
        authority: 'payment_provider'
      })
    ).toThrow('requires payment evidence');
  });

  it('protects every terminal shipment state', () => {
    for (const state of shipmentStates) {
      if (isTerminalShipmentState(state)) {
        expect(getAllowedTransitions(state)).toEqual([]);
      }
    }
  });

  it('keeps shipment, payment, and label statuses as separate domains', () => {
    const shipment: ShipmentState = 'paid';
    const payment: PaymentState = 'succeeded';
    const label: LabelState = 'pending';

    expect({ shipment, payment, label }).toEqual({
      shipment: 'paid',
      payment: 'succeeded',
      label: 'pending'
    });
    expect(isAllowedShipmentTransition(shipment, 'label_purchasing')).toBe(
      true
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  allowedTransitions,
  evaluateProviderTransition,
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

const paymentEvidence = {
  providerEventId: 'payment-event-1',
  amountCents: 1299,
  currency: 'USD'
};

const labelCreatedEvidence = {
  providerEventId: 'label-event-1',
  kind: 'label_created' as const
};

const labelVoidedEvidence = {
  providerEventId: 'void-event-1',
  kind: 'label_voided' as const
};

const carrierInTransitEvidence = {
  providerEventId: 'carrier-event-1',
  status: 'in_transit' as const
};

const carrierDeliveredEvidence = {
  providerEventId: 'carrier-delivered-1',
  status: 'delivered' as const
};

describe('shipment state machine', () => {
  it('allows every explicitly listed transition with its required authority and evidence', () => {
    for (const from of shipmentStates) {
      for (const to of getAllowedTransitions(from)) {
        const authority = requiredAuthority(from, to);

        const command =
          authority === 'payment_provider'
            ? {
                from,
                to,
                authority,
                paymentEvidence
              }
            : authority === 'label_provider'
              ? {
                  from,
                  to,
                  authority,
                  labelEvidence:
                    to === 'label_created'
                      ? labelCreatedEvidence
                      : labelVoidedEvidence
                }
              : authority === 'carrier_provider'
                ? {
                    from,
                    to,
                    authority,
                    carrierEvidence:
                      to === 'delivered'
                        ? carrierDeliveredEvidence
                        : {
                            providerEventId: `carrier-${from}-${to}`,
                            status: to
                          }
                  }
                : { from, to, authority };

        expect(() => validateShipmentTransition(command)).not.toThrow();
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
    ['failed', 'paid'],
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

  it('enforces payment_provider authority and rejects other authorities', () => {
    expect(requiredAuthority('payment_processing', 'paid')).toBe(
      'payment_provider'
    );

    expect(() =>
      validateShipmentTransition({
        from: 'payment_processing',
        to: 'paid',
        authority: 'application',
        paymentEvidence
      })
    ).toThrow('requires payment_provider authority');

    expect(() =>
      validateShipmentTransition({
        from: 'payment_processing',
        to: 'paid',
        authority: 'label_provider',
        paymentEvidence
      })
    ).toThrow('requires payment_provider authority');

    expect(() =>
      validateShipmentTransition({
        from: 'payment_processing',
        to: 'paid',
        authority: 'carrier_provider',
        paymentEvidence
      })
    ).toThrow('requires payment_provider authority');
  });

  it('enforces label_provider authority for label creation and voiding', () => {
    expect(requiredAuthority('label_purchasing', 'label_created')).toBe(
      'label_provider'
    );
    expect(requiredAuthority('label_created', 'label_voided')).toBe(
      'label_provider'
    );

    for (const [from, to, evidence] of [
      ['label_purchasing', 'label_created', labelCreatedEvidence],
      ['label_created', 'label_voided', labelVoidedEvidence]
    ] as const) {
      for (const authority of [
        'application',
        'payment_provider',
        'carrier_provider'
      ] as const) {
        expect(() =>
          validateShipmentTransition({
            from,
            to,
            authority,
            labelEvidence: evidence
          })
        ).toThrow(`requires label_provider authority`);
      }
    }
  });

  it('enforces carrier_provider authority for tracking transitions', () => {
    const transitions = [
      ['label_created', 'in_transit'],
      ['in_transit', 'out_for_delivery'],
      ['out_for_delivery', 'delivered'],
      ['delivery_exception', 'returned']
    ] as const;

    for (const [from, to] of transitions) {
      for (const authority of [
        'application',
        'payment_provider',
        'label_provider'
      ] as const) {
        expect(() =>
          validateShipmentTransition({
            from,
            to,
            authority,
            carrierEvidence: {
              providerEventId: `carrier-${from}-${to}`,
              status: to
            }
          })
        ).toThrow('requires carrier_provider authority');
      }
    }
  });

  it('requires payment evidence and rejects missing or mismatched payment evidence', () => {
    expect(() =>
      validateShipmentTransition({
        from: 'payment_processing',
        to: 'paid',
        authority: 'payment_provider'
      })
    ).toThrow('requires payment evidence');

    expect(() =>
      validateShipmentTransition({
        from: 'payment_processing',
        to: 'paid',
        authority: 'payment_provider',
        paymentEvidence: {
          providerEventId: 'payment-event-2',
          amountCents: 1298,
          currency: 'USD'
        }
      })
    ).not.toThrow();

    expect(() =>
      validateShipmentTransition({
        from: 'payment_processing',
        to: 'paid',
        authority: 'payment_provider',
        paymentEvidence: {
          providerEventId: 'payment-event-3',
          amountCents: 1299,
          currency: ''
        }
      })
    ).toThrow('Payment evidence must contain amount and currency');
  });

  it('requires matching label evidence', () => {
    expect(() =>
      validateShipmentTransition({
        from: 'label_purchasing',
        to: 'label_created',
        authority: 'label_provider'
      })
    ).toThrow('requires label evidence');

    expect(() =>
      validateShipmentTransition({
        from: 'label_purchasing',
        to: 'label_created',
        authority: 'label_provider',
        labelEvidence: labelVoidedEvidence
      })
    ).toThrow('Label evidence kind does not match shipment transition');

    expect(() =>
      validateShipmentTransition({
        from: 'label_created',
        to: 'label_voided',
        authority: 'label_provider',
        labelEvidence: labelCreatedEvidence
      })
    ).toThrow('Label evidence kind does not match shipment transition');
  });

  it('requires matching carrier evidence', () => {
    expect(() =>
      validateShipmentTransition({
        from: 'label_created',
        to: 'in_transit',
        authority: 'carrier_provider'
      })
    ).toThrow('requires carrier evidence');

    expect(() =>
      validateShipmentTransition({
        from: 'label_created',
        to: 'in_transit',
        authority: 'carrier_provider',
        carrierEvidence: carrierDeliveredEvidence
      })
    ).toThrow('Carrier evidence status does not match shipment transition');
  });

  it('treats a duplicate payment event as a no-op', () => {
    const command = {
      from: 'payment_processing' as const,
      to: 'paid' as const,
      authority: 'payment_provider' as const,
      paymentEvidence
    };

    expect(evaluateProviderTransition('payment_processing', command)).toEqual({
      accepted: true,
      reason: 'accepted'
    });

    expect(
      evaluateProviderTransition('payment_processing', command, true)
    ).toEqual({
      accepted: false,
      reason: 'duplicate'
    });
  });

  it('treats a duplicate carrier event as a no-op', () => {
    const command = {
      from: 'label_created' as const,
      to: 'in_transit' as const,
      authority: 'carrier_provider' as const,
      carrierEvidence: carrierInTransitEvidence
    };

    expect(evaluateProviderTransition('label_created', command)).toEqual({
      accepted: true,
      reason: 'accepted'
    });

    expect(
      evaluateProviderTransition('label_created', command, true)
    ).toEqual({
      accepted: false,
      reason: 'duplicate'
    });
  });

  it('rejects stale carrier events without regressing the current state', () => {
    const staleCommand = {
      from: 'label_created' as const,
      to: 'in_transit' as const,
      authority: 'carrier_provider' as const,
      carrierEvidence: carrierInTransitEvidence
    };

    expect(evaluateProviderTransition('out_for_delivery', staleCommand)).toEqual(
      {
        accepted: false,
        reason: 'stale'
      }
    );
  });

  it('accepts a direct verified carrier delivery from label_created', () => {
    const command = {
      from: 'label_created' as const,
      to: 'delivered' as const,
      authority: 'carrier_provider' as const,
      carrierEvidence: carrierDeliveredEvidence
    };

    expect(evaluateProviderTransition('label_created', command)).toEqual({
      accepted: true,
      reason: 'accepted'
    });
  });

  it('rejects attempts to reopen every terminal state', () => {
    const terminalStates = shipmentStates.filter(isTerminalShipmentState);

    expect(terminalStates).toEqual([
      'returned',
      'delivered',
      'cancelled',
      'label_voided',
      'failed'
    ]);

    for (const state of terminalStates) {
      const command = {
        from: state,
        to: 'paid' as const,
        authority: 'carrier_provider' as const,
        carrierEvidence: {
          providerEventId: `reopen-${state}`,
          status: 'delivered' as const
        }
      };

      expect(evaluateProviderTransition(state, command)).toEqual({
        accepted: false,
        reason: 'invalid'
      });
    }
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

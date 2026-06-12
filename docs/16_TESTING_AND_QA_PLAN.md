# 16 - Testing and QA Plan

## Minimum checks per phase

Run where applicable:

```bash
cd web
pnpm lint
pnpm build
```

## State-machine tests

Test these transitions:

- waiting -> buyer funded;
- waiting -> seller funded;
- buyer funded -> locked after seller deposit;
- seller funded -> locked after buyer deposit;
- locked -> proof submitted;
- proof submitted -> delivered;
- delivered -> completed;
- invalid proof before locked rejected;
- completed cannot mutate.

## Contract tests

The Soroban contract must test:

- create escrow;
- buyer deposit;
- seller deposit;
- lock;
- submit proof hash;
- complete;
- expire before locked;
- invalid transition failure.

## Manual demo QA

Run this in browser:

1. Reset demo.
2. Open marketplace.
3. Open listing detail.
4. Open Deal Room.
5. Buyer deposit.
6. Seller deposit.
7. Confirm locked status.
8. Submit proof.
9. Accept delivery.
10. Confirm completed status.
11. Open profile.
12. Confirm reputation updated.

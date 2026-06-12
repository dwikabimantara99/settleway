# 09 - Proof and Evidence Specification

## Evidence goal

Evidence protects honest participants in physical commodity trade.

## MVP evidence types

- photo placeholder or actual upload;
- file name;
- timestamp;
- uploader;
- SHA-256 hash;
- proof hash recorded in Deal Room;
- optional Stellar event/tx hash.

## Storage rule

Raw evidence files stay off-chain. Only the hash and event metadata are recorded on-chain.

## Hash function

Use SHA-256.

Browser/server implementation can use Web Crypto API or Node crypto. Normalize output as lowercase hex.

```text
proof_hash = sha256(file_bytes)
```

## UI requirements

Evidence panel must show:

- proof requirement checklist;
- upload/simulate evidence button;
- file name;
- proof hash;
- recorded status;
- Stellar tx hash if available.

## Hackathon honesty

If camera-only capture is not implemented, do not claim tamper-proof capture. Say: "For MVP, evidence can be uploaded or simulated; the file hash is recorded for integrity checking. Strong in-app capture is roadmap."

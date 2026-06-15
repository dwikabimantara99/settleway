import { describe, expect, it } from "vitest";
import {
  buildOperatorJsonOutput,
  loadTestnetSmokeOperatorInput,
  runTestnetSmokeOperator,
  TESTNET_SMOKE_ENV,
} from "./operator-env";

function readManualEnvironment(name: string): string | undefined {
  if (
    process.env.npm_lifecycle_event === "smoke:testnet:preflight" &&
    name === TESTNET_SMOKE_ENV.command
  ) {
    return "preflight";
  }
  if (
    process.env.npm_lifecycle_event === "smoke:testnet:signer-preflight" &&
    name === TESTNET_SMOKE_ENV.command
  ) {
    return "signer_preflight";
  }
  return process.env[name];
}

describe("local Testnet smoke operator manual runner", () => {
  it("runs the requested local operator command", async () => {
    const loaded = loadTestnetSmokeOperatorInput(readManualEnvironment);
    if (!loaded.ok) {
      const output = buildOperatorJsonOutput({
        ok: false,
        command: null,
        errors: loaded.errors,
        summary: null,
      });
      process.stdout.write(`${output.json}\n`);
      expect(loaded.ok).toBe(true);
      return;
    }

    const result = await runTestnetSmokeOperator(loaded.input);
    const output = buildOperatorJsonOutput(result);
    process.stdout.write(`${output.json}\n`);
    expect(output.ok).toBe(true);
    expect(result.ok).toBe(true);
  });
});

import { spawn } from "node:child_process";
import type { Readable, Writable } from "node:stream";

export interface StellarCliProcessRequest {
  readonly executable_path: string;
  readonly args: readonly string[];
  readonly stdin_text: string;
  readonly timeout_ms: number;
  readonly max_stdout_bytes: number;
  readonly max_stderr_bytes: number;
}

export interface StellarCliProcessResult {
  readonly exit_code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timed_out: boolean;
  readonly stdout_truncated: boolean;
  readonly stderr_truncated: boolean;
}

export interface StellarCliProcessRunner {
  run(request: StellarCliProcessRequest): Promise<StellarCliProcessResult>;
}

export interface StellarCliSpawnOptions {
  readonly shell: false;
  readonly stdio: "pipe";
  readonly windowsHide: true;
}

export interface StellarCliChildProcess {
  readonly stdin: Writable;
  readonly stdout: Readable;
  readonly stderr: Readable;
  kill(signal?: NodeJS.Signals): boolean;
  on(event: "error", listener: (error: Error) => void): this;
  on(
    event: "close",
    listener: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): this;
}

export type StellarCliSpawn = (
  command: string,
  args: readonly string[],
  options: StellarCliSpawnOptions,
) => StellarCliChildProcess;

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OUTPUT_BYTES = 16_384;

function containsNullByte(value: string): boolean {
  return value.includes("\0");
}

function shouldMaskChildEnvironmentKey(key: string): boolean {
  const normalized = key.toUpperCase();
  return (
    normalized === "CI" ||
    normalized === "NODE_ENV" ||
    normalized === "VITEST" ||
    normalized.startsWith("VITEST_") ||
    normalized.startsWith("SETTLEWAY_SMOKE_")
  );
}

function maskChildEnvironment(): () => void {
  const maskedValues = new Map<string, string>();
  for (const key of Object.keys(process.env)) {
    if (shouldMaskChildEnvironmentKey(key)) {
      const value = process.env[key];
      if (value !== undefined) {
        maskedValues.set(key, value);
      }
      delete process.env[key];
    }
  }
  return () => {
    for (const [key, value] of maskedValues) {
      process.env[key] = value;
    }
  };
}

function spawnWithMaskedEnvironment(input: {
  readonly spawnProcess: StellarCliSpawn;
  readonly command: string;
  readonly args: readonly string[];
  readonly onRestore: (restore: () => void) => void;
}): StellarCliChildProcess {
  const restore = maskChildEnvironment();
  input.onRestore(restore);
  try {
    return input.spawnProcess(input.command, input.args, {
      shell: false,
      stdio: "pipe",
      windowsHide: true,
    });
  } catch (error) {
    restore();
    throw error;
  }
}

function appendBoundedText(input: {
  readonly chunks: string[];
  readonly chunk: string | Uint8Array;
  readonly maxBytes: number;
  currentBytes: number;
  truncated: boolean;
}): { readonly currentBytes: number; readonly truncated: boolean } {
  const chunkText = typeof input.chunk === "string"
    ? input.chunk
    : Buffer.from(input.chunk).toString("utf8");
  const chunkBytes = Buffer.byteLength(chunkText, "utf8");
  const remainingBytes = input.maxBytes - input.currentBytes;

  if (remainingBytes <= 0) {
    return { currentBytes: input.currentBytes, truncated: true };
  }

  if (chunkBytes <= remainingBytes) {
    input.chunks.push(chunkText);
    return {
      currentBytes: input.currentBytes + chunkBytes,
      truncated: input.truncated,
    };
  }

  input.chunks.push(Buffer.from(chunkText, "utf8").subarray(0, remainingBytes).toString("utf8"));
  return {
    currentBytes: input.maxBytes,
    truncated: true,
  };
}

export class NodeStellarCliProcessRunner implements StellarCliProcessRunner {
  readonly #spawnProcess: StellarCliSpawn;

  constructor(spawnProcess: StellarCliSpawn = spawn as StellarCliSpawn) {
    this.#spawnProcess = spawnProcess;
  }

  async run(request: StellarCliProcessRequest): Promise<StellarCliProcessResult> {
    if (
      containsNullByte(request.executable_path) ||
      containsNullByte(request.stdin_text) ||
      request.args.some(containsNullByte)
    ) {
      return {
        exit_code: null,
        stdout: "",
        stderr: "",
        timed_out: false,
        stdout_truncated: false,
        stderr_truncated: false,
      };
    }

    const timeoutMs = Number.isSafeInteger(request.timeout_ms) && request.timeout_ms > 0
      ? request.timeout_ms
      : DEFAULT_TIMEOUT_MS;
    const maxStdoutBytes =
      Number.isSafeInteger(request.max_stdout_bytes) && request.max_stdout_bytes > 0
        ? request.max_stdout_bytes
        : DEFAULT_MAX_OUTPUT_BYTES;
    const maxStderrBytes =
      Number.isSafeInteger(request.max_stderr_bytes) && request.max_stderr_bytes > 0
        ? request.max_stderr_bytes
        : DEFAULT_MAX_OUTPUT_BYTES;

    return new Promise<StellarCliProcessResult>((resolve) => {
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let stdoutTruncated = false;
      let stderrTruncated = false;
      let timedOut = false;
      let settled = false;
      let childClosed = false;
      let stdoutEnded = false;
      let stderrEnded = false;
      let childExitCode: number | null = null;
      let restoreChildEnvironment = (): void => {};

      const child = spawnWithMaskedEnvironment({
        spawnProcess: this.#spawnProcess,
        command: request.executable_path,
        args: request.args,
        onRestore: (restore) => {
          restoreChildEnvironment = restore;
        },
      });

      const finish = (exitCode: number | null): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        restoreChildEnvironment();
        resolve({
          exit_code: exitCode,
          stdout: stdoutChunks.join(""),
          stderr: stderrChunks.join(""),
          timed_out: timedOut,
          stdout_truncated: stdoutTruncated,
          stderr_truncated: stderrTruncated,
        });
      };

      const finishWhenComplete = (): void => {
        if (childClosed && stdoutEnded && stderrEnded) {
          finish(childExitCode);
        }
      };

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, timeoutMs);

      child.stdout.on("data", (chunk: string | Uint8Array) => {
        const result = appendBoundedText({
          chunks: stdoutChunks,
          chunk,
          maxBytes: maxStdoutBytes,
          currentBytes: stdoutBytes,
          truncated: stdoutTruncated,
        });
        stdoutBytes = result.currentBytes;
        stdoutTruncated = result.truncated;
      });

      child.stderr.on("data", (chunk: string | Uint8Array) => {
        const result = appendBoundedText({
          chunks: stderrChunks,
          chunk,
          maxBytes: maxStderrBytes,
          currentBytes: stderrBytes,
          truncated: stderrTruncated,
        });
        stderrBytes = result.currentBytes;
        stderrTruncated = result.truncated;
      });

      child.stdout.on("end", () => {
        stdoutEnded = true;
        finishWhenComplete();
      });
      child.stderr.on("end", () => {
        stderrEnded = true;
        finishWhenComplete();
      });
      child.on("error", () => finish(null));
      child.on("close", (code) => {
        childClosed = true;
        childExitCode = code;
        finishWhenComplete();
      });
      child.stdin.end(request.stdin_text, "utf8");
    });
  }
}

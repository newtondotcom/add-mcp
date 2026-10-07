#!/usr/bin/env tsx

import assert from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildInstallPlanForEntry } from "../src/find.js";
import {
  detectManifestSource,
  loadServerManifest,
  parseServerManifest,
} from "../src/server-json.js";

let passed = 0;
let failed = 0;
let testChain = Promise.resolve();
const tempDirs: string[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  testChain = testChain
    .then(fn)
    .then(() => {
      console.log(`✓ ${name}`);
      passed++;
    })
    .catch((err: unknown) => {
      console.log(`✗ ${name}`);
      console.error(`  ${(err as Error).message}`);
      failed++;
    });
}

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "add-mcp-server-json-"));
  tempDirs.push(dir);
  return dir;
}

const remoteManifest = {
  name: "io.github.example/weather",
  title: "Weather",
  description: "Weather forecasts",
  version: "1.0.2",
  remotes: [
    {
      type: "streamable-http",
      url: "https://weather.example.com/mcp",
      headers: [{ name: "Authorization", isRequired: true, isSecret: true }],
    },
  ],
};

const npmManifest = {
  name: "io.github.example/fs",
  title: "Filesystem",
  description: "Local files",
  version: "1.2.0",
  packages: [
    {
      registryType: "npm",
      identifier: "@example/mcp-fs",
      version: "1.2.0",
      transport: { type: "stdio" },
      environmentVariables: [{ name: "ALLOWED_DIR", isRequired: true }],
      packageArguments: [
        { type: "positional", valueHint: "root", isRequired: true },
      ],
    },
  ],
};

test("detectManifestSource accepts a local server.json path", () => {
  assert.deepStrictEqual(detectManifestSource("./server.json"), {
    kind: "file",
    location: "./server.json",
  });
  assert.deepStrictEqual(detectManifestSource("server.json"), {
    kind: "file",
    location: "server.json",
  });
  assert.deepStrictEqual(detectManifestSource("./My Server/server.json"), {
    kind: "file",
    location: "./My Server/server.json",
  });
});

test("detectManifestSource accepts an http(s) URL ending in .json", () => {
  assert.deepStrictEqual(
    detectManifestSource("https://example.com/server.json"),
    { kind: "url", location: "https://example.com/server.json" },
  );
  assert.deepStrictEqual(
    detectManifestSource("https://example.com/server.json?token=1"),
    {
      kind: "url",
      location: "https://example.com/server.json?token=1",
    },
  );
  assert.strictEqual(detectManifestSource("https://mcp.example.com/mcp"), null);
});

test("detectManifestSource leaves commands and packages alone", () => {
  assert.strictEqual(detectManifestSource("node ./server.json"), null);
  assert.strictEqual(detectManifestSource("@example/mcp-fs"), null);
  assert.strictEqual(detectManifestSource("io.github.example/weather"), null);
});

test("parseServerManifest reads a bare remote manifest", () => {
  const loaded = parseServerManifest(
    JSON.stringify(remoteManifest),
    "server.json",
  );
  assert.strictEqual(loaded.entry.name, "io.github.example/weather");
  assert.strictEqual(loaded.entry.title, "Weather");
  assert.strictEqual(loaded.entry.remotes?.[0]?.type, "streamable-http");
  assert.strictEqual(
    loaded.entry.remotes?.[0]?.url,
    "https://weather.example.com/mcp",
  );
  assert.strictEqual(
    loaded.entry.remotes?.[0]?.headers?.[0]?.name,
    "Authorization",
  );
  assert.strictEqual(loaded.entry.package, undefined);
  assert.deepStrictEqual(loaded.skipped, []);
});

test("parseServerManifest unwraps a registry envelope", () => {
  const loaded = parseServerManifest(
    JSON.stringify({ server: remoteManifest, _meta: { official: true } }),
    "https://example.com/server.json",
  );
  assert.strictEqual(loaded.entry.name, "io.github.example/weather");
  assert.strictEqual(loaded.entry.description, "Weather forecasts");
});

test("parseServerManifest rejects a manifest with no install target", () => {
  assert.throws(
    () =>
      parseServerManifest(
        JSON.stringify({
          name: "io.github.example/empty",
          description: "Nothing",
          version: "1.0.0",
        }),
        "server.json",
      ),
    /no packages or remotes/,
  );
});

test("parseServerManifest rejects a pypi-only manifest", () => {
  assert.throws(
    () =>
      parseServerManifest(
        JSON.stringify({
          name: "io.github.example/py",
          description: "Python server",
          version: "1.0.0",
          packages: [
            {
              registryType: "pypi",
              identifier: "example-mcp",
              version: "1.0.0",
              transport: { type: "stdio" },
            },
          ],
        }),
        "server.json",
      ),
    /registry type "pypi"/,
  );
});

test("parseServerManifest keeps a remote and reports a skipped pypi package", () => {
  const loaded = parseServerManifest(
    JSON.stringify({
      ...remoteManifest,
      packages: [
        {
          registryType: "pypi",
          identifier: "example-mcp",
          transport: { type: "stdio" },
        },
      ],
    }),
    "server.json",
  );
  assert.strictEqual(loaded.entry.package, undefined);
  assert.strictEqual(loaded.entry.remotes?.length, 1);
  assert.match(loaded.skipped.join("\n"), /pypi/);
});

test("parseServerManifest uses the first npm package and skips the rest", () => {
  const loaded = parseServerManifest(
    JSON.stringify({
      name: "io.github.example/multi",
      description: "Two packages",
      version: "1.0.0",
      packages: [
        {
          registryType: "npm",
          identifier: "@example/first",
          version: "1.0.0",
          transport: { type: "stdio" },
        },
        {
          registryType: "npm",
          identifier: "@example/second",
          version: "2.0.0",
          transport: { type: "stdio" },
        },
      ],
    }),
    "server.json",
  );
  assert.strictEqual(loaded.entry.package?.identifier, "@example/first");
  assert.match(loaded.skipped.join("\n"), /@example\/second/);
});

test("parseServerManifest rejects invalid JSON and a missing name", () => {
  assert.throws(
    () => parseServerManifest("{", "server.json"),
    /not valid JSON/,
  );
  assert.throws(
    () =>
      parseServerManifest(
        JSON.stringify({ description: "x", version: "1" }),
        "server.json",
      ),
    /missing "name"/,
  );
});

test("loadServerManifest reads a local file", async () => {
  const dir = tempDir();
  const filePath = join(dir, "server.json");
  writeFileSync(filePath, JSON.stringify(npmManifest));
  const loaded = await loadServerManifest(filePath);
  assert.strictEqual(loaded.entry.package?.identifier, "@example/mcp-fs");
  assert.strictEqual(loaded.entry.package?.version, "1.2.0");
  assert.strictEqual(
    loaded.entry.package?.environmentVariables?.[0]?.name,
    "ALLOWED_DIR",
  );
  assert.strictEqual(
    loaded.entry.package?.packageArguments?.[0]?.valueHint,
    "root",
  );
});

test("loadServerManifest reports a missing file", async () => {
  const dir = tempDir();
  await assert.rejects(
    () => loadServerManifest(join(dir, "server.json")),
    /Server manifest not found/,
  );
});

test("loadServerManifest fetches a URL", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: true,
      text: async () => JSON.stringify({ server: npmManifest }),
    }) as Response) as typeof fetch;
  try {
    const loaded = await loadServerManifest("https://example.com/server.json");
    assert.strictEqual(loaded.entry.name, "io.github.example/fs");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadServerManifest surfaces an HTTP error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({
      ok: false,
      status: 404,
      text: async () => "missing",
    }) as Response) as typeof fetch;
  try {
    await assert.rejects(
      () => loadServerManifest("https://example.com/missing.json"),
      /HTTP 404/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a remote manifest installs the remote URL with -y", async () => {
  const loaded = parseServerManifest(
    JSON.stringify(remoteManifest),
    "server.json",
  );
  const plan = await buildInstallPlanForEntry(loaded.entry, {
    yes: true,
    pinPackageVersion: true,
  });
  assert.ok(plan);
  assert.strictEqual(plan?.target, "https://weather.example.com/mcp");
  assert.strictEqual(plan?.transport, "http");
  assert.strictEqual(plan?.serverName, "weather");
  assert.deepStrictEqual(plan?.headers, {
    Authorization: "<your-header-value-here>",
  });
});

test("an npm manifest pins the package version and fills required inputs with -y", async () => {
  const loaded = parseServerManifest(
    JSON.stringify(npmManifest),
    "server.json",
  );
  const plan = await buildInstallPlanForEntry(loaded.entry, {
    yes: true,
    pinPackageVersion: true,
  });
  assert.ok(plan);
  assert.strictEqual(plan?.target, "@example/mcp-fs@1.2.0");
  assert.strictEqual(plan?.serverName, "filesystem");
  assert.deepStrictEqual(plan?.env, {
    ALLOWED_DIR: "<your-variable-value-here>",
  });
  assert.deepStrictEqual(plan?.args, ["<your-variable-value-here>"]);
});

test("a manifest with a remote and an npm package prefers the remote with -y", async () => {
  const loaded = parseServerManifest(
    JSON.stringify({
      ...remoteManifest,
      packages: npmManifest.packages,
    }),
    "server.json",
  );
  const plan = await buildInstallPlanForEntry(loaded.entry, {
    yes: true,
    pinPackageVersion: true,
  });
  assert.strictEqual(plan?.target, "https://weather.example.com/mcp");
  assert.strictEqual(plan?.transport, "http");
});

test("pinPackageVersion keeps an identifier that already includes a version", async () => {
  const plan = await buildInstallPlanForEntry(
    {
      name: "io.github.example/fs",
      description: "Local files",
      version: "1.2.0",
      package: {
        registryType: "npm",
        identifier: "@example/mcp-fs@9.9.9",
        version: "1.2.0",
        transport: { type: "stdio" },
      },
    },
    { yes: true, pinPackageVersion: true },
  );
  assert.strictEqual(plan?.target, "@example/mcp-fs@9.9.9");
});

testChain.then(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
});

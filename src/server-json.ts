import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type {
  RegistryHeaderDefinition,
  RegistryNamedVariableDefinition,
  RegistryPackageArgumentDefinition,
  RegistryPackageDefinition,
  RegistryRemoteDefinition,
  RegistryServerEntry,
  RegistryVariableDefinition,
} from "./find.js";
import { looksLikePath } from "./source-parser.js";

const SERVER_NAME_PATTERN = /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/;

export interface LoadedServerManifest {
  entry: RegistryServerEntry;
  /** Packages this install slice cannot launch. The entry still installs. */
  skipped: string[];
}

export type ManifestSource =
  | { kind: "file"; location: string }
  | { kind: "url"; location: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A server.json manifest is either a local JSON file or an http(s) URL whose
 * path ends in `.json`. Other URLs stay remote MCP endpoints.
 */
export function detectManifestSource(input: string): ManifestSource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isHttpUrl(trimmed)) {
    const url = new URL(trimmed);
    if (url.pathname.toLowerCase().endsWith(".json")) {
      return { kind: "url", location: trimmed };
    }
    return null;
  }

  if (!trimmed.toLowerCase().endsWith(".json")) return null;
  // "node ./server.json" is a command. A path that itself contains spaces
  // ("./My Server/server.json") is still a file.
  if (trimmed.includes(" ") && !looksLikePath(trimmed)) return null;
  if (/^(npx|node|python3?|bunx?|uvx?|docker)\s/.test(trimmed)) return null;
  return { kind: "file", location: trimmed };
}

function isHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function expandHome(input: string): string {
  if (input === "~") return homedir();
  if (input.startsWith("~/") || input.startsWith("~\\")) {
    return join(homedir(), input.slice(2));
  }
  return input;
}

export async function loadServerManifest(
  input: string,
): Promise<LoadedServerManifest> {
  const source = detectManifestSource(input);
  if (!source) {
    throw new Error(`Not a server.json manifest: ${input}`);
  }

  if (source.kind === "url") {
    const text = await fetchManifestText(source.location);
    return parseServerManifest(text, source.location);
  }

  const filePath = isAbsolute(expandHome(source.location))
    ? expandHome(source.location)
    : resolve(expandHome(source.location));
  let text: string;
  try {
    text = await readFile(filePath, "utf-8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code === "ENOENT") {
      throw new Error(`Server manifest not found: ${filePath}`);
    }
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Failed to read server manifest ${filePath}: ${detail}`);
  }
  return parseServerManifest(text, filePath);
}

async function fetchManifestText(url: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network error";
    throw new Error(`Failed to fetch server manifest ${url}: ${detail}`);
  }
  if (!response.ok) {
    throw new Error(
      `Failed to fetch server manifest ${url}: HTTP ${response.status}`,
    );
  }
  return response.text();
}

export function parseServerManifest(
  text: string,
  label: string,
): LoadedServerManifest {
  const parsed = parseJson(text, label);
  const server = unwrapServer(parsed);
  const name = requireString(server, "name", label);
  if (!SERVER_NAME_PATTERN.test(name)) {
    throw new Error(
      `Server manifest ${label} has an invalid "name" (${name}). Expected a reverse-DNS name like "io.github.user/server".`,
    );
  }
  const description = requireString(server, "description", label);
  const version = requireString(server, "version", label);
  const title = optionalString(server.title);

  const remotes = readRemotes(server.remotes, label);
  const { package: npmPackage, skipped } = readPackages(server.packages, label);

  if (!npmPackage && remotes.length === 0) {
    const why =
      skipped.length > 0
        ? `${skipped.join(" ")} `
        : "It has no packages or remotes. ";
    throw new Error(
      `Cannot install ${name} from ${label}. ${why}Manifest installs support npm packages (stdio) and remote servers.`,
    );
  }

  const repositoryUrl = readRepositoryUrl(server.repository);

  return {
    entry: {
      name,
      title,
      description,
      version,
      repositoryUrl,
      remotes: remotes.length > 0 ? remotes : undefined,
      package: npmPackage,
    },
    skipped,
  };
}

/**
 * Drop env vars and headers the CLI already supplied so the install plan does
 * not prompt for them. Callers merge the supplied values back onto the plan.
 */
export function omitProvidedInputs(
  entry: RegistryServerEntry,
  provided: { env?: ReadonlySet<string>; headers?: ReadonlySet<string> },
): RegistryServerEntry {
  const env = provided.env ?? new Set<string>();
  const headers = provided.headers ?? new Set<string>();

  const pkg = entry.package
    ? {
        ...entry.package,
        environmentVariables: entry.package.environmentVariables?.filter(
          (variable) => !env.has(variable.name),
        ),
        headers: entry.package.headers?.filter(
          (header) => !headers.has(header.name),
        ),
      }
    : undefined;

  const remotes = entry.remotes?.map((remote) => ({
    ...remote,
    headers: remote.headers?.filter((header) => !headers.has(header.name)),
  }));

  return { ...entry, package: pkg, remotes };
}

function parseJson(text: string, label: string): unknown {
  const withoutBom = text.replace(/^\uFEFF/, "");
  try {
    return JSON.parse(withoutBom);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid JSON";
    throw new Error(`Server manifest ${label} is not valid JSON (${detail}).`);
  }
}

function unwrapServer(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error("Server manifest must be a JSON object.");
  }
  if (isRecord(value.server) && typeof value.server.name === "string") {
    return value.server;
  }
  return value;
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  label: string,
): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Server manifest ${label} is missing "${field}".`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRepositoryUrl(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return optionalString(value.url);
}

function readRemotes(
  value: unknown,
  label: string,
): RegistryRemoteDefinition[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Server manifest ${label} "remotes" must be an array.`);
  }

  const remotes: RegistryRemoteDefinition[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) {
      throw new Error(
        `Server manifest ${label} has a remote that is not an object.`,
      );
    }
    const type = raw.type;
    if (type !== "streamable-http" && type !== "sse") {
      throw new Error(
        `Server manifest ${label} has an unsupported remote transport "${String(type)}". Expected "streamable-http" or "sse".`,
      );
    }
    const url = optionalString(raw.url);
    if (!url) {
      throw new Error(`Server manifest ${label} has a remote missing "url".`);
    }
    remotes.push({
      type,
      url,
      variables: readVariables(raw.variables),
      headers: readHeaders(raw.headers, label),
    });
  }
  return remotes;
}

function readPackages(
  value: unknown,
  label: string,
): { package?: RegistryPackageDefinition; skipped: string[] } {
  if (value === undefined) return { skipped: [] };
  if (!Array.isArray(value)) {
    throw new Error(`Server manifest ${label} "packages" must be an array.`);
  }

  const skipped: string[] = [];
  const npmPackages: RegistryPackageDefinition[] = [];

  for (const raw of value) {
    if (!isRecord(raw)) {
      throw new Error(
        `Server manifest ${label} has a package that is not an object.`,
      );
    }
    const identifier = optionalString(raw.identifier) ?? "(missing identifier)";
    const registryType = optionalString(raw.registryType) ?? "unknown";
    const transportType = isRecord(raw.transport)
      ? optionalString(raw.transport.type)
      : undefined;

    if (registryType !== "npm" || transportType !== "stdio") {
      skipped.push(skipReason(identifier, registryType, transportType));
      continue;
    }
    if (
      typeof raw.identifier !== "string" ||
      raw.identifier.trim().length === 0
    ) {
      throw new Error(
        `Server manifest ${label} has an npm package missing "identifier".`,
      );
    }

    npmPackages.push({
      registryType: "npm",
      identifier: raw.identifier.trim(),
      version: optionalString(raw.version),
      environmentVariables: readEnvironmentVariables(
        raw.environmentVariables,
        label,
      ),
      headers: readHeaders(raw.headers, label),
      packageArguments: readPackageArguments(raw.packageArguments, label),
      transport: { type: "stdio" },
    });
  }

  const first = npmPackages[0];
  if (first) {
    for (const extra of npmPackages.slice(1)) {
      skipped.push(
        `Using npm package "${first.identifier}". Skipped additional npm package "${extra.identifier}".`,
      );
    }
  }

  return { package: first, skipped };
}

function copyOptionalStrings<K extends string>(
  raw: Record<string, unknown>,
  keys: readonly K[],
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const key of keys) {
    const value = optionalString(raw[key]);
    if (value) out[key] = value;
  }
  return out;
}

function copyBooleans<K extends string>(
  raw: Record<string, unknown>,
  keys: readonly K[],
): Partial<Record<K, boolean>> {
  const out: Partial<Record<K, boolean>> = {};
  for (const key of keys) {
    if (typeof raw[key] === "boolean") out[key] = raw[key];
  }
  return out;
}

function skipReason(
  identifier: string,
  registryType: string,
  transportType: string | undefined,
): string {
  if (registryType === "npm" && transportType !== "stdio") {
    return `Skipped ${identifier}: package transport "${transportType ?? "unknown"}" is not supported.`;
  }
  return `Skipped ${identifier}: registry type "${registryType}" is not supported.`;
}

function readEnvironmentVariables(
  value: unknown,
  label: string,
): RegistryNamedVariableDefinition[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(
      `Server manifest ${label} "environmentVariables" must be an array.`,
    );
  }
  const variables: RegistryNamedVariableDefinition[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.name !== "string") {
      throw new Error(
        `Server manifest ${label} has an environment variable missing "name".`,
      );
    }
    variables.push({
      name: raw.name,
      ...readVariableFields(raw),
    });
  }
  return variables.length > 0 ? variables : undefined;
}

function readHeaders(
  value: unknown,
  label: string,
): RegistryHeaderDefinition[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Server manifest ${label} "headers" must be an array.`);
  }
  const headers: RegistryHeaderDefinition[] = [];
  for (const raw of value) {
    if (
      !isRecord(raw) ||
      typeof raw.name !== "string" ||
      raw.name.trim() === ""
    ) {
      throw new Error(`Server manifest ${label} has a header missing "name".`);
    }
    headers.push({
      name: raw.name,
      ...copyOptionalStrings(raw, ["description"]),
      ...copyBooleans(raw, ["isRequired", "isSecret"]),
    });
  }
  return headers.length > 0 ? headers : undefined;
}

function readVariables(
  value: unknown,
): Record<string, RegistryVariableDefinition> | undefined {
  if (!isRecord(value)) return undefined;
  const variables: Record<string, RegistryVariableDefinition> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue;
    variables[key] = readVariableFields(raw);
  }
  return Object.keys(variables).length > 0 ? variables : undefined;
}

function readVariableFields(
  raw: Record<string, unknown>,
): RegistryVariableDefinition {
  const definition: RegistryVariableDefinition = {
    ...copyOptionalStrings(raw, ["description", "default"]),
    ...copyBooleans(raw, ["isRequired", "isSecret"]),
  };
  if (
    Array.isArray(raw.choices) &&
    raw.choices.every((choice) => typeof choice === "string")
  ) {
    definition.choices = raw.choices;
  }
  return definition;
}

function readPackageArguments(
  value: unknown,
  label: string,
): RegistryPackageArgumentDefinition[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(
      `Server manifest ${label} "packageArguments" must be an array.`,
    );
  }
  const args: RegistryPackageArgumentDefinition[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) {
      throw new Error(
        `Server manifest ${label} has a package argument that is not an object.`,
      );
    }
    const definition: RegistryPackageArgumentDefinition = {
      ...copyOptionalStrings(raw, [
        "name",
        "value",
        "valueHint",
        "description",
        "default",
        "format",
      ]),
      ...copyBooleans(raw, ["isRequired", "isSecret", "isRepeated"]),
    };
    if (raw.type === "positional" || raw.type === "named" || raw.type === "") {
      definition.type = raw.type;
    }
    args.push(definition);
  }
  return args.length > 0 ? args : undefined;
}

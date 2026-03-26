// Copyright 2026 Gaurav Mathur (mail.gauravmathur@gmail.com). All rights reserved.
import * as yaml from "js-yaml";

// ── sort keys ────────────────────────────────────────────────────────────────

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

// ── flatten / unflatten ──────────────────────────────────────────────────────

export function flattenJson(
  obj: unknown,
  prefix = "",
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      flattenJson(v, prefix ? `${prefix}[${i}]` : `[${i}]`, result);
    });
  } else if (obj !== null && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (
        (v !== null && typeof v === "object" && !Array.isArray(v)) ||
        Array.isArray(v)
      ) {
        flattenJson(v, key, result);
      } else {
        result[key] = v;
      }
    }
  } else {
    result[prefix] = obj;
  }
  return result;
}

export function unflattenJson(obj: Record<string, unknown>): unknown {
  const result: Record<string, unknown> = {};
  for (const [flatKey, value] of Object.entries(obj)) {
    const parts = flatKey.replace(/\[(\d+)\]/g, ".$1").split(".");
    let cur: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const nextIsIndex = /^\d+$/.test(nextPart);
      if (cur[part] === undefined) {
        cur[part] = nextIsIndex ? [] : {};
      }
      cur = cur[part] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
  }
  return result;
}

// ── remove empty ─────────────────────────────────────────────────────────────

export function removeEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(removeEmpty)
      .filter((v) => v !== null && v !== undefined && v !== "");
  }
  if (value !== null && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const c = removeEmpty(v);
      if (
        c !== null &&
        c !== undefined &&
        c !== "" &&
        !(Array.isArray(c) && c.length === 0) &&
        !(
          typeof c === "object" &&
          !Array.isArray(c) &&
          Object.keys(c as object).length === 0
        )
      ) {
        cleaned[k] = c;
      }
    }
    return cleaned;
  }
  return value;
}

// ── csv ──────────────────────────────────────────────────────────────────────

export function csvToJson(csv: string): unknown[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have a header row and at least one data row.");
  }
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  };
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] ?? "").trim();
    });
    return obj;
  });
}

// ── yaml ─────────────────────────────────────────────────────────────────────

export function jsonToYamlStr(parsed: unknown): string {
  return yaml.dump(parsed, { indent: 2, lineWidth: -1 });
}

export function yamlToJsonParsed(yamlStr: string): unknown {
  return yaml.load(yamlStr);
}

// ── jsonpath ─────────────────────────────────────────────────────────────────

export function jsonPathQuery(root: unknown, path: string): unknown[] {
  if (path === "$") {
    return [root];
  }

  type Token =
    | { kind: "key"; key: string }
    | { kind: "index"; index: number }
    | { kind: "wildcard" }
    | { kind: "recursive"; key: string | null };

  const tokens: Token[] = [];
  let rest = path.replace(/^\$/, "");
  while (rest.length > 0) {
    const recMatch = rest.match(/^\.\.(\*|[a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (recMatch) {
      tokens.push({
        kind: "recursive",
        key: recMatch[1] === "*" ? null : recMatch[1],
      });
      rest = rest.slice(recMatch[0].length);
      continue;
    }
    const dotMatch = rest.match(/^\.(\*|[a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (dotMatch) {
      tokens.push(
        dotMatch[1] === "*"
          ? { kind: "wildcard" }
          : { kind: "key", key: dotMatch[1] }
      );
      rest = rest.slice(dotMatch[0].length);
      continue;
    }
    const bracketKeyMatch = rest.match(/^\[['"]([^'"]+)['"]\]/);
    if (bracketKeyMatch) {
      tokens.push({ kind: "key", key: bracketKeyMatch[1] });
      rest = rest.slice(bracketKeyMatch[0].length);
      continue;
    }
    const bracketMatch = rest.match(/^\[(\*|\d+)\]/);
    if (bracketMatch) {
      tokens.push(
        bracketMatch[1] === "*"
          ? { kind: "wildcard" }
          : { kind: "index", index: parseInt(bracketMatch[1], 10) }
      );
      rest = rest.slice(bracketMatch[0].length);
      continue;
    }
    throw new Error(`Cannot parse JSONPath at: ${rest}`);
  }

  function evalTokens(nodes: unknown[], toks: Token[]): unknown[] {
    if (toks.length === 0) return nodes;
    const [tok, ...remaining] = toks;
    const next: unknown[] = [];
    for (const node of nodes) {
      if (tok.kind === "key") {
        if (node !== null && typeof node === "object" && !Array.isArray(node)) {
          const v = (node as Record<string, unknown>)[tok.key];
          if (v !== undefined) next.push(v);
        }
      } else if (tok.kind === "index") {
        if (Array.isArray(node) && tok.index < node.length) {
          next.push(node[tok.index]);
        }
      } else if (tok.kind === "wildcard") {
        if (Array.isArray(node)) next.push(...node);
        else if (node !== null && typeof node === "object")
          next.push(...Object.values(node as object));
      } else if (tok.kind === "recursive") {
        function collectRec(val: unknown): void {
          if (tok.kind !== "recursive") return;
          if (tok.key === null) {
            next.push(val);
          } else if (
            val !== null &&
            typeof val === "object" &&
            !Array.isArray(val)
          ) {
            const v = (val as Record<string, unknown>)[tok.key];
            if (v !== undefined) next.push(v);
          }
          if (Array.isArray(val)) val.forEach(collectRec);
          else if (val !== null && typeof val === "object")
            Object.values(val as object).forEach(collectRec);
        }
        collectRec(node);
      }
    }
    return evalTokens(next, remaining);
  }

  return evalTokens([root], tokens);
}

// ── typescript interface ──────────────────────────────────────────────────────

export function inferType(value: unknown, indent: string, depth: number): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    return `${inferType(value[0], indent, depth)}[]`;
  }
  if (typeof value === "object") {
    const pad = indent.repeat(depth + 1);
    const closePad = indent.repeat(depth);
    const fields = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
        return `${pad}${safeKey}: ${inferType(v, indent, depth + 1)};`;
      })
      .join("\n");
    return `{\n${fields}\n${closePad}}`;
  }
  return typeof value;
}

export function generateTsInterface(parsed: unknown, indent: string): string {
  if (Array.isArray(parsed)) {
    return `type Root = ${inferType(parsed[0] ?? {}, indent, 0)}[];`;
  }
  if (typeof parsed === "object" && parsed !== null) {
    const pad = indent;
    const fields = Object.entries(parsed as Record<string, unknown>)
      .map(([k, v]) => {
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
        return `${pad}${safeKey}: ${inferType(v, indent, 1)};`;
      })
      .join("\n");
    return `interface Root {\n${fields}\n}`;
  }
  return `type Root = ${typeof parsed};`;
}

// ── json schema ───────────────────────────────────────────────────────────────

export function generateSchema(value: unknown, title?: string): unknown {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    const schema: Record<string, unknown> = { type: "array" };
    if (value.length > 0) schema.items = generateSchema(value[0]);
    if (title) schema.title = title;
    return schema;
  }
  if (typeof value === "object") {
    const props: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      props[k] = generateSchema(v);
      if (v !== null && v !== undefined) required.push(k);
    }
    const schema: Record<string, unknown> = { type: "object", properties: props };
    if (required.length > 0) schema.required = required;
    if (title) schema.title = title;
    schema.additionalProperties = false;
    return schema;
  }
  return { type: typeof value };
}

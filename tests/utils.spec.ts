// Copyright 2026 Gaurav Mathur (mail.gauravmathur@gmail.com). All rights reserved.
import { test, expect } from "@playwright/test";
import {
  sortKeysDeep,
  flattenJson,
  unflattenJson,
  removeEmpty,
  csvToJson,
  jsonToYamlStr,
  yamlToJsonParsed,
  jsonPathQuery,
  inferType,
  generateTsInterface,
  generateSchema,
} from "../src/utils";

// ── sortKeysDeep ─────────────────────────────────────────────────────────────

test.describe("sortKeysDeep", () => {
  test("sorts top-level keys alphabetically", () => {
    const input = { z: 1, a: 2, m: 3 };
    expect(Object.keys(sortKeysDeep(input) as object)).toEqual(["a", "m", "z"]);
  });

  test("sorts keys recursively in nested objects", () => {
    const input = { b: { d: 1, c: 2 }, a: 3 };
    const result = sortKeysDeep(input) as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(["a", "b"]);
    expect(Object.keys(result.b as object)).toEqual(["c", "d"]);
  });

  test("sorts object keys inside arrays", () => {
    const input = [{ z: 1, a: 2 }, { y: 3, b: 4 }];
    const result = sortKeysDeep(input) as object[];
    expect(Object.keys(result[0])).toEqual(["a", "z"]);
    expect(Object.keys(result[1])).toEqual(["b", "y"]);
  });

  test("leaves primitives unchanged", () => {
    expect(sortKeysDeep(42)).toBe(42);
    expect(sortKeysDeep("hello")).toBe("hello");
    expect(sortKeysDeep(null)).toBe(null);
    expect(sortKeysDeep(true)).toBe(true);
  });

  test("handles empty object", () => {
    expect(sortKeysDeep({})).toEqual({});
  });

  test("handles empty array", () => {
    expect(sortKeysDeep([])).toEqual([]);
  });
});

// ── flattenJson ───────────────────────────────────────────────────────────────

test.describe("flattenJson", () => {
  test("flattens one level of nesting", () => {
    expect(flattenJson({ a: { b: 1 } })).toEqual({ "a.b": 1 });
  });

  test("flattens deeply nested objects", () => {
    expect(flattenJson({ a: { b: { c: 42 } } })).toEqual({ "a.b.c": 42 });
  });

  test("flattens arrays with bracket notation", () => {
    const result = flattenJson({ items: [10, 20] });
    expect(result).toEqual({ "items[0]": 10, "items[1]": 20 });
  });

  test("flattens mixed nested structure", () => {
    const result = flattenJson({ user: { name: "Alice", scores: [1, 2] } });
    expect(result).toEqual({
      "user.name": "Alice",
      "user.scores[0]": 1,
      "user.scores[1]": 2,
    });
  });

  test("leaves flat object unchanged", () => {
    expect(flattenJson({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test("handles null values", () => {
    expect(flattenJson({ a: null })).toEqual({ a: null });
  });

  test("handles empty object", () => {
    expect(flattenJson({})).toEqual({});
  });
});

// ── unflattenJson ─────────────────────────────────────────────────────────────

test.describe("unflattenJson", () => {
  test("restores one level of nesting", () => {
    expect(unflattenJson({ "a.b": 1 })).toEqual({ a: { b: 1 } });
  });

  test("restores deeply nested objects", () => {
    expect(unflattenJson({ "a.b.c": 42 })).toEqual({ a: { b: { c: 42 } } });
  });

  test("restores arrays from bracket notation", () => {
    const result = unflattenJson({ "items[0]": 10, "items[1]": 20 }) as Record<string, unknown>;
    expect(result.items).toEqual([10, 20]);
  });

  test("flat-then-unflatten round-trips correctly", () => {
    const original = { user: { name: "Alice", age: 30 }, active: true };
    const flat = flattenJson(original);
    expect(unflattenJson(flat)).toEqual(original);
  });

  test("handles flat (no dots) keys unchanged", () => {
    expect(unflattenJson({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });
});

// ── removeEmpty ───────────────────────────────────────────────────────────────

test.describe("removeEmpty", () => {
  test("removes null values", () => {
    expect(removeEmpty({ a: 1, b: null })).toEqual({ a: 1 });
  });

  test("removes empty string values", () => {
    expect(removeEmpty({ a: "hello", b: "" })).toEqual({ a: "hello" });
  });

  test("removes empty arrays", () => {
    expect(removeEmpty({ a: 1, b: [] })).toEqual({ a: 1 });
  });

  test("removes empty objects", () => {
    expect(removeEmpty({ a: 1, b: {} })).toEqual({ a: 1 });
  });

  test("removes recursively", () => {
    expect(removeEmpty({ a: { b: null, c: 1 } })).toEqual({ a: { c: 1 } });
  });

  test("removes null elements from arrays", () => {
    expect(removeEmpty([1, null, 2, ""])).toEqual([1, 2]);
  });

  test("removes nested empty objects after cleaning", () => {
    expect(removeEmpty({ a: { b: null } })).toEqual({});
  });

  test("leaves clean objects unchanged", () => {
    const input = { a: 1, b: "hello", c: true };
    expect(removeEmpty(input)).toEqual(input);
  });

  test("handles primitives", () => {
    expect(removeEmpty(42)).toBe(42);
    expect(removeEmpty("text")).toBe("text");
  });
});

// ── csvToJson ─────────────────────────────────────────────────────────────────

test.describe("csvToJson", () => {
  test("converts basic CSV to array of objects", () => {
    const csv = "name,age\nAlice,30\nBob,25";
    expect(csvToJson(csv)).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  test("handles quoted fields with commas", () => {
    const csv = 'name,city\nAlice,"New York, NY"\nBob,London';
    const result = csvToJson(csv) as Record<string, string>[];
    expect(result[0].city).toBe("New York, NY");
  });

  test("handles escaped double quotes inside quoted fields", () => {
    const csv = 'name,desc\nAlice,"She said ""hello"""\n';
    const result = csvToJson(csv) as Record<string, string>[];
    expect(result[0].desc).toBe('She said "hello"');
  });

  test("trims whitespace from headers", () => {
    const csv = " name , age \nAlice,30";
    const result = csvToJson(csv) as Record<string, string>[];
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("age");
  });

  test("throws when only one line (no data row)", () => {
    expect(() => csvToJson("name,age")).toThrow();
  });

  test("throws on empty string", () => {
    expect(() => csvToJson("")).toThrow();
  });

  test("handles missing values as empty string", () => {
    const csv = "a,b,c\n1,,3";
    const result = csvToJson(csv) as Record<string, string>[];
    expect(result[0].b).toBe("");
  });
});

// ── jsonToYamlStr / yamlToJsonParsed ─────────────────────────────────────────

test.describe("YAML conversion", () => {
  test("converts simple object to YAML string", () => {
    const yamlStr = jsonToYamlStr({ name: "Alice", age: 30 });
    expect(yamlStr).toContain("name: Alice");
    expect(yamlStr).toContain("age: 30");
  });

  test("converts YAML string back to object", () => {
    const yamlStr = "name: Alice\nage: 30\n";
    expect(yamlToJsonParsed(yamlStr)).toEqual({ name: "Alice", age: 30 });
  });

  test("round-trips JSON → YAML → JSON", () => {
    const original = { users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] };
    const yamlStr = jsonToYamlStr(original);
    expect(yamlToJsonParsed(yamlStr)).toEqual(original);
  });

  test("handles arrays", () => {
    const yamlStr = jsonToYamlStr([1, 2, 3]);
    expect(yamlToJsonParsed(yamlStr)).toEqual([1, 2, 3]);
  });

  test("handles nested objects", () => {
    const input = { a: { b: { c: 42 } } };
    expect(yamlToJsonParsed(jsonToYamlStr(input))).toEqual(input);
  });

  test("handles null values", () => {
    const input = { a: null };
    expect(yamlToJsonParsed(jsonToYamlStr(input))).toEqual(input);
  });
});

// ── jsonPathQuery ─────────────────────────────────────────────────────────────

test.describe("jsonPathQuery", () => {
  const data = {
    store: {
      books: [
        { title: "Moby Dick", price: 10, author: "Melville" },
        { title: "1984", price: 15, author: "Orwell" },
        { title: "Dune", price: 20, author: "Herbert" },
      ],
      name: "Books R Us",
    },
  };

  test("$ returns root", () => {
    expect(jsonPathQuery(data, "$")).toEqual([data]);
  });

  test("$.store.name returns string value", () => {
    expect(jsonPathQuery(data, "$.store.name")).toEqual(["Books R Us"]);
  });

  test("$.store.books[0] returns first element", () => {
    expect(jsonPathQuery(data, "$.store.books[0]")).toEqual([data.store.books[0]]);
  });

  test("$.store.books[*].title returns all titles", () => {
    expect(jsonPathQuery(data, "$.store.books[*].title")).toEqual([
      "Moby Dick",
      "1984",
      "Dune",
    ]);
  });

  test("$.store.books[*].price returns all prices", () => {
    expect(jsonPathQuery(data, "$.store.books[*].price")).toEqual([10, 15, 20]);
  });

  test("$..title recursive descent finds all titles", () => {
    expect(jsonPathQuery(data, "$..title")).toEqual(["Moby Dick", "1984", "Dune"]);
  });

  test("$.store.* wildcard returns all store values", () => {
    const result = jsonPathQuery(data, "$.store.*");
    expect(result).toHaveLength(2);
  });

  test("bracket notation ['key'] works", () => {
    expect(jsonPathQuery(data, "$['store']['name']")).toEqual(["Books R Us"]);
  });

  test("returns empty array when key not found", () => {
    expect(jsonPathQuery(data, "$.store.missing")).toEqual([]);
  });

  test("returns empty array for out-of-bounds index", () => {
    expect(jsonPathQuery(data, "$.store.books[99]")).toEqual([]);
  });

  test("throws on unparseable path", () => {
    expect(() => jsonPathQuery(data, "$.!!!")).toThrow();
  });

  test("works on array root", () => {
    expect(jsonPathQuery([1, 2, 3], "$[1]")).toEqual([2]);
  });
});

// ── inferType ────────────────────────────────────────────────────────────────

test.describe("inferType", () => {
  const indent = "  ";

  test("infers string", () => {
    expect(inferType("hello", indent, 0)).toBe("string");
  });

  test("infers number", () => {
    expect(inferType(42, indent, 0)).toBe("number");
  });

  test("infers boolean", () => {
    expect(inferType(true, indent, 0)).toBe("boolean");
  });

  test("infers null", () => {
    expect(inferType(null, indent, 0)).toBe("null");
  });

  test("infers empty array as unknown[]", () => {
    expect(inferType([], indent, 0)).toBe("unknown[]");
  });

  test("infers string array", () => {
    expect(inferType(["a", "b"], indent, 0)).toBe("string[]");
  });

  test("infers object type with fields", () => {
    const result = inferType({ name: "Alice", age: 30 }, indent, 0);
    expect(result).toContain("name: string");
    expect(result).toContain("age: number");
  });

  test("wraps special key names in quotes", () => {
    const result = inferType({ "my-key": 1 }, indent, 0);
    expect(result).toContain('"my-key"');
  });
});

// ── generateTsInterface ──────────────────────────────────────────────────────

test.describe("generateTsInterface", () => {
  const indent = "  ";

  test("generates interface for object", () => {
    const result = generateTsInterface({ id: 1, name: "Alice" }, indent);
    expect(result).toContain("interface Root");
    expect(result).toContain("id: number");
    expect(result).toContain("name: string");
  });

  test("generates type alias for array", () => {
    const result = generateTsInterface([{ id: 1 }], indent);
    expect(result).toContain("type Root =");
    expect(result).toContain("[]");
  });

  test("generates type alias for primitives", () => {
    expect(generateTsInterface(42, indent)).toBe("type Root = number;");
    expect(generateTsInterface("hi", indent)).toBe("type Root = string;");
  });

  test("generates nested interface", () => {
    const result = generateTsInterface({ user: { name: "Alice" } }, indent);
    expect(result).toContain("user:");
    expect(result).toContain("name: string");
  });

  test("handles boolean fields", () => {
    const result = generateTsInterface({ active: true }, indent);
    expect(result).toContain("active: boolean");
  });

  test("handles null fields", () => {
    const result = generateTsInterface({ value: null }, indent);
    expect(result).toContain("value: null");
  });
});

// ── generateSchema ────────────────────────────────────────────────────────────

test.describe("generateSchema", () => {
  test("generates schema for simple object", () => {
    const schema = generateSchema({ id: 1, name: "Alice" }) as Record<string, unknown>;
    expect(schema.type).toBe("object");
    const props = schema.properties as Record<string, unknown>;
    expect((props.id as Record<string, unknown>).type).toBe("number");
    expect((props.name as Record<string, unknown>).type).toBe("string");
  });

  test("sets required fields for non-null values", () => {
    const schema = generateSchema({ a: 1, b: "x" }) as Record<string, unknown>;
    expect(schema.required).toEqual(["a", "b"]);
  });

  test("does not add null fields to required", () => {
    const schema = generateSchema({ a: 1, b: null }) as Record<string, unknown>;
    expect(schema.required as string[]).not.toContain("b");
  });

  test("sets additionalProperties to false", () => {
    const schema = generateSchema({ a: 1 }) as Record<string, unknown>;
    expect(schema.additionalProperties).toBe(false);
  });

  test("generates array schema", () => {
    const schema = generateSchema([{ id: 1 }]) as Record<string, unknown>;
    expect(schema.type).toBe("array");
    expect(schema.items).toBeDefined();
  });

  test("generates null schema", () => {
    expect(generateSchema(null)).toEqual({ type: "null" });
  });

  test("generates boolean schema", () => {
    expect(generateSchema(true)).toEqual({ type: "boolean" });
  });

  test("generates number schema", () => {
    expect(generateSchema(42)).toEqual({ type: "number" });
  });

  test("generates string schema", () => {
    expect(generateSchema("hello")).toEqual({ type: "string" });
  });

  test("sets title when provided", () => {
    const schema = generateSchema({ a: 1 }, "MySchema") as Record<string, unknown>;
    expect(schema.title).toBe("MySchema");
  });

  test("generates nested object schema", () => {
    const schema = generateSchema({ user: { name: "Alice" } }) as Record<string, unknown>;
    const props = schema.properties as Record<string, unknown>;
    const userSchema = props.user as Record<string, unknown>;
    expect(userSchema.type).toBe("object");
  });
});

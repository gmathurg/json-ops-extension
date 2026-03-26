# JSON Ops

A VS Code / Cursor extension providing a comprehensive suite of JSON utilities — all accessible from the command palette or the right-click context menu.

## Features

### In-place operations
These commands replace the selected text (or the entire document if nothing is selected).

| Command | Description |
|---------|-------------|
| **JSON Ops: Format (Pretty Print)** | Indent JSON using the editor's configured tab size |
| **JSON Ops: Minify** | Strip all whitespace into a compact single line |
| **JSON Ops: Sort Keys** | Recursively sort all object keys alphabetically |
| **JSON Ops: Flatten** | Convert nested JSON to dot-notation keys — `{"a":{"b":1}}` → `{"a.b":1}` |
| **JSON Ops: Unflatten** | Restore dot-notation keys back to nested JSON |
| **JSON Ops: Remove Nulls / Empty Values** | Recursively strip `null`, `""`, `[]`, and `{}` |
| **JSON Ops: Stringify** | Escape JSON into a string literal |
| **JSON Ops: Minify + Stringify** | Minify then escape in one step |
| **JSON Ops: Parse (unescape string)** | Unescape a JSON string literal back to JSON |
| **JSON Ops: Validate** | Check if the JSON is valid — shows a ✓ or an error message |

### Opens result in a new document
These commands open their output in a new untitled document so your original file is unchanged.

| Command | Description |
|---------|-------------|
| **JSON Ops: CSV to JSON** | Convert CSV to a JSON array of objects |
| **JSON Ops: JSON to YAML** | Convert JSON to YAML |
| **JSON Ops: YAML to JSON** | Convert YAML to JSON |
| **JSON Ops: JSONPath Query** | Prompt for a JSONPath expression and show matching results |
| **JSON Ops: Generate TypeScript Interface** | Infer a TypeScript `interface` from JSON |
| **JSON Ops: Generate JSON Schema** | Generate a JSON Schema (draft-07) from JSON |

## Usage

### Command Palette
Open with `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux) and type `JSON Ops`.

### Context Menu
Right-click anywhere in a JSON, YAML, or CSV file (or on a selection) and choose **JSON Ops** from the menu.

### Selection-aware
All commands operate on the **selected text** if a selection exists, otherwise they act on the **entire document**.

## Examples

#### Flatten / Unflatten
```json
// Input
{
  "user": {
    "name": "Alice",
    "address": {
      "city": "SF"
    }
  }
}

// After: JSON Ops: Flatten
{
  "user.name": "Alice",
  "user.address.city": "SF"
}
```

#### Remove Nulls / Empty Values
```json
// Input
{ "name": "Alice", "age": null, "tags": [], "meta": {} }

// After: JSON Ops: Remove Nulls / Empty Values
{ "name": "Alice" }
```

#### JSONPath Query
Prompts for an expression — supports:
- `$.key` — property access
- `$.array[0]` — index access
- `$.array[*]` — all elements
- `$..key` — recursive descent

```
Expression: $.users[*].name
Result: ["Alice", "Bob"]
```

#### Generate TypeScript Interface
```json
// Input
{ "id": 1, "name": "Alice", "active": true }
```
```ts
// Output
interface Root {
  id: number;
  name: string;
  active: boolean;
}
```

#### Generate JSON Schema
```json
// Input
{ "id": 1, "name": "Alice" }

// Output
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Root",
  "type": "object",
  "properties": {
    "id": { "type": "number" },
    "name": { "type": "string" }
  },
  "required": ["id", "name"],
  "additionalProperties": false
}
```

## Requirements

VS Code 1.85.0 or later (also compatible with Cursor).

## License

Copyright 2026 Gaurav Mathur (mail.gauravmathur@gmail.com). All rights reserved.

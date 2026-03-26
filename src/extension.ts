// Copyright 2026 Gaurav Mathur (mail.gauravmathur@gmail.com). All rights reserved.
import * as vscode from "vscode";
import * as yaml from "js-yaml";
import {
  sortKeysDeep,
  flattenJson,
  unflattenJson,
  removeEmpty,
  csvToJson,
  jsonToYamlStr,
  yamlToJsonParsed,
  jsonPathQuery,
  generateTsInterface,
  generateSchema,
} from "./utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function getTarget(editor: vscode.TextEditor): {
  text: string;
  range: vscode.Range;
  isFullDoc: boolean;
} {
  const sel = editor.selection;
  if (!sel.isEmpty) {
    return {
      text: editor.document.getText(sel),
      range: new vscode.Range(sel.start, sel.end),
      isFullDoc: false,
    };
  }
  const fullRange = new vscode.Range(
    editor.document.positionAt(0),
    editor.document.positionAt(editor.document.getText().length)
  );
  return { text: editor.document.getText(), range: fullRange, isFullDoc: true };
}

function replace(
  editor: vscode.TextEditor,
  range: vscode.Range,
  text: string
): Thenable<boolean> {
  return editor.edit((eb) => eb.replace(range, text));
}

function getIndent(editor: vscode.TextEditor): number | string {
  return vscode.workspace
    .getConfiguration("editor", editor.document.uri)
    .get<number | string>("tabSize", 2);
}

async function showInNewDoc(content: string, language: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  await vscode.window.showTextDocument(doc, { preview: false });
}

// ── command implementations ──────────────────────────────────────────────────

function minify(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    replace(editor, range, JSON.stringify(JSON.parse(text)));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Minify: ${(e as Error).message}`);
  }
}

function format(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    replace(editor, range, JSON.stringify(JSON.parse(text), null, getIndent(editor)));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Format: ${(e as Error).message}`);
  }
}

function sortKeys(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    replace(editor, range, JSON.stringify(sortKeysDeep(JSON.parse(text)), null, getIndent(editor)));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Sort Keys: ${(e as Error).message}`);
  }
}

function stringify(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    JSON.parse(text);
    replace(editor, range, JSON.stringify(text));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Stringify: ${(e as Error).message}`);
  }
}

function minifyAndStringify(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    replace(editor, range, JSON.stringify(JSON.stringify(JSON.parse(text))));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Minify+Stringify: ${(e as Error).message}`);
  }
}

function parse(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    const unescaped: string = JSON.parse(text);
    if (typeof unescaped !== "string") {
      vscode.window.showErrorMessage(
        "JSON Ops – Parse: selection must be a JSON string (quoted)."
      );
      return;
    }
    try {
      replace(editor, range, JSON.stringify(JSON.parse(unescaped), null, getIndent(editor)));
    } catch {
      replace(editor, range, unescaped);
    }
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Parse: ${(e as Error).message}`);
  }
}

function validate(editor: vscode.TextEditor) {
  const { text } = getTarget(editor);
  try {
    JSON.parse(text);
    vscode.window.showInformationMessage("JSON Ops: Valid JSON ✓");
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Invalid JSON: ${(e as Error).message}`);
  }
}

function flatten(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    replace(editor, range, JSON.stringify(flattenJson(JSON.parse(text)), null, getIndent(editor)));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Flatten: ${(e as Error).message}`);
  }
}

function unflatten(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      vscode.window.showErrorMessage(
        "JSON Ops – Unflatten: input must be a flat object with dot-notation keys."
      );
      return;
    }
    replace(editor, range, JSON.stringify(unflattenJson(parsed as Record<string, unknown>), null, getIndent(editor)));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Unflatten: ${(e as Error).message}`);
  }
}

async function csvToJsonCmd(editor: vscode.TextEditor) {
  const { text } = getTarget(editor);
  try {
    await showInNewDoc(JSON.stringify(csvToJson(text), null, getIndent(editor)), "json");
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – CSV to JSON: ${(e as Error).message}`);
  }
}

async function removeNulls(editor: vscode.TextEditor) {
  const { text, range } = getTarget(editor);
  try {
    replace(editor, range, JSON.stringify(removeEmpty(JSON.parse(text)), null, getIndent(editor)));
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Remove Nulls: ${(e as Error).message}`);
  }
}

async function jsonToYamlCmd(editor: vscode.TextEditor) {
  const { text } = getTarget(editor);
  try {
    await showInNewDoc(jsonToYamlStr(JSON.parse(text)), "yaml");
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – JSON to YAML: ${(e as Error).message}`);
  }
}

async function yamlToJsonCmd(editor: vscode.TextEditor) {
  const { text } = getTarget(editor);
  try {
    await showInNewDoc(JSON.stringify(yamlToJsonParsed(text), null, getIndent(editor)), "json");
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – YAML to JSON: ${(e as Error).message}`);
  }
}

async function jsonPathQueryCmd(editor: vscode.TextEditor) {
  const { text } = getTarget(editor);
  try {
    const parsed = JSON.parse(text);
    const path = await vscode.window.showInputBox({
      prompt: "Enter JSONPath expression",
      placeHolder: "e.g. $.users[*].name or $..id",
      value: "$",
    });
    if (!path) return;
    await showInNewDoc(JSON.stringify(jsonPathQuery(parsed, path), null, getIndent(editor)), "json");
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – JSONPath: ${(e as Error).message}`);
  }
}

async function generateTsInterfaceCmd(editor: vscode.TextEditor) {
  const { text } = getTarget(editor);
  try {
    const indent = getIndent(editor);
    const indentStr = typeof indent === "number" ? " ".repeat(indent) : "\t";
    await showInNewDoc(generateTsInterface(JSON.parse(text), indentStr), "typescript");
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Generate TS Interface: ${(e as Error).message}`);
  }
}

async function generateJsonSchemaCmd(editor: vscode.TextEditor) {
  const { text } = getTarget(editor);
  try {
    const schema = generateSchema(JSON.parse(text), "Root");
    await showInNewDoc(
      JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", ...(schema as object) }, null, getIndent(editor)),
      "json"
    );
  } catch (e) {
    vscode.window.showErrorMessage(`JSON Ops – Generate JSON Schema: ${(e as Error).message}`);
  }
}

// ── activation ───────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  const reg = (cmd: string, fn: (e: vscode.TextEditor) => void) =>
    vscode.commands.registerTextEditorCommand(cmd, fn);

  context.subscriptions.push(
    reg("jsonOps.minify", minify),
    reg("jsonOps.format", format),
    reg("jsonOps.sortKeys", sortKeys),
    reg("jsonOps.stringify", stringify),
    reg("jsonOps.minifyAndStringify", minifyAndStringify),
    reg("jsonOps.parse", parse),
    reg("jsonOps.validate", validate),
    reg("jsonOps.flatten", flatten),
    reg("jsonOps.unflatten", unflatten),
    reg("jsonOps.csvToJson", csvToJsonCmd),
    reg("jsonOps.removeNulls", removeNulls),
    reg("jsonOps.jsonToYaml", jsonToYamlCmd),
    reg("jsonOps.yamlToJson", yamlToJsonCmd),
    reg("jsonOps.jsonPathQuery", jsonPathQueryCmd),
    reg("jsonOps.generateTsInterface", generateTsInterfaceCmd),
    reg("jsonOps.generateJsonSchema", generateJsonSchemaCmd)
  );
}

export function deactivate() {}

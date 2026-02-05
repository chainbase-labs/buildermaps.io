const { Project } = require("ts-morph");
const fs = require("fs");

if (!fs.existsSync("ast.json")) {
  console.log("No ast.json");
  process.exit(0);
}

const raw = fs.readFileSync("ast.json","utf8").trim();

if (!raw) {
  console.log("Empty AST edits");
  process.exit(0);
}

const edits = JSON.parse(raw);

const project = new Project();

for (const edit of edits) {

  const file = project.addSourceFileAtPathIfExists(edit.file);
  if (!file) continue;

  if (edit.action === "add_import") {
    file.addImportDeclaration({
      namedImports: [edit.import],
      moduleSpecifier: edit.from
    });
  }
}

project.saveSync();

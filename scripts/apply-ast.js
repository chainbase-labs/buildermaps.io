const { Project } = require("ts-morph");
const fs = require("fs");

const edits = JSON.parse(fs.readFileSync("ast.json", "utf8"));

const project = new Project();

for (const edit of edits) {

  const file = project.addSourceFileAtPath(edit.file);

  if (edit.action === "add_import") {
    file.addImportDeclaration({
      namedImports: [edit.import],
      moduleSpecifier: edit.from
    });
  }
}

project.saveSync();

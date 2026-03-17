#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { globSync } from "glob";

const filePattern = "src/**/*.+(ts|tsx)";
const importPattern = /import.*from '@chainbase-labs/;

const files = globSync(filePattern, { absolute: true });

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const newLines = [];

  for (const line of lines) {
    if (importPattern.test(line)) {
      newLines.push("// @ts-ignore");
    }
    newLines.push(line);
  }

  fs.writeFileSync(file, newLines.join("\n"), "utf8");
}

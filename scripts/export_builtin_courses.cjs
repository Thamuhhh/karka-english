const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '..', 'src', 'constants', 'curriculum.ts');
const outputPath = path.join(__dirname, '..', 'website', 'builtin-courses.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
});
const sandboxModule = { exports: {} };
vm.runInNewContext(compiled, { module: sandboxModule, exports: sandboxModule.exports });

const courses = sandboxModule.exports.SUPERNOVA_LEVELS;
if (!Array.isArray(courses) || courses.length !== 4) {
  throw new Error('Expected the four built-in curriculum units.');
}
fs.writeFileSync(outputPath, `window.ELVATE_BUILTIN_COURSES = ${JSON.stringify(courses)};\n`);
console.log(`Exported ${courses.length} built-in units to website/builtin-courses.js`);

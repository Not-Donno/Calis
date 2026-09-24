import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const required = [
  'src/data/program.ts',
  'src/data/foods.ts',
  'src/db/database.ts',
  'src/services/backup.ts',
  'assets/pose_landmarker_lite.task',
  'app.json',
  'plugins/withCalisPose.js',
];
const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error(`Missing offline assets: ${missing.join(', ')}`);
  process.exit(1);
}

const modelSize = statSync(join(root, 'assets/pose_landmarker_lite.task')).size;
if (modelSize < 1_000_000) {
  console.error('The bundled pose model is unexpectedly small.');
  process.exit(1);
}

const appConfig = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
if (appConfig.expo?.android?.allowBackup !== false) {
  console.error('Android cloud backup must be disabled for the local-only data policy.');
  process.exit(1);
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const sourceFiles = filesUnder(join(root, 'src')).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
const forbidden = [
  { label: 'runtime fetch', pattern: /\bfetch\s*\(/ },
  { label: 'Firebase', pattern: /firebase/i },
  { label: 'Supabase', pattern: /supabase/i },
  { label: 'cloud AI SDK', pattern: /openai|anthropic|google\.generativeai/i },
];
const findings = [];
for (const file of sourceFiles) {
  const source = readFileSync(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) findings.push(`${rule.label} in ${relative(root, file)}`);
  }
}
if (findings.length) {
  console.error(`Network/cloud dependency scan failed:\n${findings.join('\n')}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dependencyNames = Object.keys(packageJson.dependencies ?? {});
const cloudDependencies = dependencyNames.filter((name) => /firebase|supabase|openai|anthropic|axios/i.test(name));
if (cloudDependencies.length) {
  console.error(`Cloud dependencies found: ${cloudDependencies.join(', ')}`);
  process.exit(1);
}

console.log(`Offline verification passed: ${sourceFiles.length} source files, ${Math.round(modelSize / 1024 / 1024)} MB pose model.`);

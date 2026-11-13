import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.argv[2] ?? '.release');
const planFile = path.join(outDir, 'publish-plan.json');
const packedByBun = path.join(outDir, 'bun');

mkdirSync(packedByBun, { recursive: true });

const integrity = (file: string) =>
  `sha256-${createHash('sha256').update(readFileSync(file)).digest('base64')}`;

for (const dir of readdirSync('packages')) {
  execFileSync(
    'bun',
    ['pm', 'pack', '--quiet', '--destination', packedByBun],
    { cwd: path.join('packages', dir), stdio: 'ignore' }
  );
}

let plan = readFileSync(planFile, 'utf-8');

for (const file of readdirSync(packedByBun)) {
  const planned = path.join(outDir, 'packages', file);

  if (existsSync(planned)) {
    const packedByNpm = integrity(planned);

    renameSync(path.join(packedByBun, file), planned);
    plan = plan.replace(packedByNpm, integrity(planned));
  }
}

writeFileSync(planFile, plan);

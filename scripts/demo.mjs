// scripts/demo.mjs
// ─────────────────────────────────────────────────────────────
// Launches a headed, maximized, single-worker run you can watch.
//
//   npm run demo:slideshow
//   npm run demo:slideshow -- --slowmo 800
//   npm run demo:header -- --slowmo 300
//   node scripts/demo.mjs slideshow --slowmo 500 --project doll-desktop
//
// Exists because `PW_SLOWMO=500 npm run ...` is bash-only syntax and
// silently does nothing in PowerShell or cmd — this sets the
// environment in Node instead, so the same command works in every shell.
// ─────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);

// First bare word is the spec to demo; everything else is a flag.
const spec = argv.find((a) => !a.startsWith('-')) ?? 'slideshow';

function flag(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('-')) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.split('=').slice(1).join('=') : fallback;
}

// Explicit --project flags win; otherwise demo across the four presets.
const projects = argv.reduce((acc, arg, i) => {
  if (arg === '--project' && argv[i + 1]) acc.push(argv[i + 1]);
  if (arg.startsWith('--project=')) acc.push(arg.split('=')[1]);
  return acc;
}, []);

const DEFAULT_PROJECTS = ['khajal-desktop', 'doll-desktop', 'dense-desktop', 'moonlight-desktop'];
const chosen = projects.length ? projects : DEFAULT_PROJECTS;

// Demo runs are for watching, so slow down by default — fast enough to
// stay useful, slow enough to see each click land. Override with
// --slowmo 0 for full speed, or a bigger number to study a step.
const slowmo = flag('slowmo', '450');

const args = [
  'playwright', 'test',
  `${spec}.spec.ts`,
  '--headed',
  '--workers=1',
  '--retries=0',
  ...chosen.map((p) => `--project=${p}`),
];

console.log(`\n▶  Demo: ${spec}.spec.ts`);
console.log(`   projects : ${chosen.join(', ')}`);
console.log(`   slow-mo  : ${slowmo === '0' ? 'off' : `${slowmo}ms per action`}`);
console.log(`   window   : maximized, headed, 1 worker\n`);

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PW_SLOWMO: slowmo,
    PW_MAXIMIZE: '1',
    // Artifacts are pointless for a run you are watching live.
    PW_VIDEO: 'off',
    PW_TRACE: 'off',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));

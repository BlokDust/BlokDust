// bd v1 port-ui — copy BlokDust v1's UI classes (MIT) into web/src/v1ui/ported/, mechanically (CHG-0002 1.8–1.10).
// v1's chrome is ~5k lines of Canvas2D drawing on its own framework (etch DisplayObject, minerva Point/Size, a global
// App). Porting it verbatim and supplying that framework from one hand-written shim (web/src/v1ui/shim.ts) keeps every
// draw call, and so every pixel, identical. Generated files are never edited by hand: fix the shim or this tool.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { V1_DIR, V1_SHA } from './lib.ts';
import { REWRITES } from './port-ui-rewrites.ts';

const SRC = join(V1_DIR, 'app');
const OUT = 'web/src/v1ui/ported';
export const PORTED = [
  'Metrics.ts',
  'Device.ts',
  'Commands.ts',
  'StringValue.ts',
  'Core/Audio/Waveform.ts',
  'Blocks/BlockSprites.ts',
  'UI/Header.ts',
  'UI/MenuCategory.ts',
  'UI/MenuItem.ts',
  'UI/ToolTip.ts',
  'UI/ZoomButtons.ts',
  'UI/TrashCan.ts',
  'UI/CreateNew.ts',
  'UI/StageDragger.ts',
  'UI/OptionsPanel.ts',
  'UI/SettingsPanel.ts',
  'UI/SharePanel.ts',
  'UI/RecorderPanel.ts',
  'WaveVoice.ts',
  'Splash.ts',
  'UI/Tutorial.ts',
  'UI/TutorialHotspots.ts',
  'UI/AnimationsLayer.ts',
  'UI/MessagePanel.ts',
  'UI/SoundcloudPanel.ts',
  'Core/Audio/SoundCloud/SoundcloudTrack.ts',
  ...[
    'IOption',
    'Option',
    'OptionADSR',
    'OptionActionButton',
    'OptionButton',
    'OptionButtonArray',
    'OptionColorTheme',
    'OptionHandle',
    'OptionMeter',
    'OptionParametric',
    'OptionSample',
    'OptionSampleLocal',
    'OptionSlider',
    'OptionSubHandle',
    'OptionSwitch',
    'OptionSwitchArray',
    'OptionWave',
    'OptionWaveImage',
    'OptionWaveRegion',
    'OptionWaveSlider',
  ].map((f) => `UI/Options/${f}.ts`),
];
// v1 modules the UI imports but v2 replaces: bridged to the shim.
const BRIDGES: Record<string, string> = {
  'IApp.ts': 'export type IApp = any;\nexport const IApp: any = null;\n',
  'MainScene.ts': 'export type MainScene = any;\nexport const MainScene: any = null;\n',
  'Blocks/IBlock.ts': 'export type IBlock = any;\nexport const IBlock: any = null;\n',
  // RecorderPanel finds Recorder blocks with `instanceof Recorder`: v2's shim blocks answer by their v1 type.
  'Blocks/Sources/Recorder.ts':
    "export class Recorder { static [Symbol.hasInstance](b: any) { return b?.def?.v1Type === 'Recorder'; } }\n",
  // The tour (CHG-0035) finds the blocks it asks for with `instanceof`: v2's shim blocks answer by their v1 type.
  'Blocks/Block.ts':
    'export class Block { static [Symbol.hasInstance](b: any) { return !!b?.def; } }\n',
  ...Object.fromEntries(
    [
      ['Sources/ToneSource', 'ToneSource'],
      ['Interaction/ComputerKeyboard', 'ComputerKeyboard'],
      ['Effects/Post/Chopper', 'Chopper'],
      ['Power/Power', 'Power'],
      ['Power/ParticleEmitter', 'ParticleEmitter'],
    ].map(([path, type]) => [
      `Blocks/${path}.ts`,
      `export class ${type} { static [Symbol.hasInstance](b: any) { return b?.def?.v1Type === '${type}'; } }\n`,
    ]),
  ),
  // Settings › About's "Current Build": the release version (CHG-0005 task 12).
  '_Version.ts': "export { VERSION as Version } from '../../version.ts';\n",
  // Splash's audio unlock: v2 starts its AudioContext in the START click itself (web/src/app/main.ts), so the start
  // button shows everywhere (v1: iOS only) and pressing it goes straight on (CHG-0005, owner 2026-11-11).
  'Core/Audio/Utils/Utils.ts':
    'export const isIOS = () => true;\nexport const hasAudioContextStarted = (_c: unknown) => true;\nexport const unlockAudioContext = (_c: unknown, cb: () => void) => cb();\n',
};
// Global framework aliases v1 declares per file (`import X = ns.X;`) → named imports from the shim.
const ALIASES: Record<string, string> = {
  'etch.primitives.Point': 'Point',
  'minerva.Point': 'Point',
  'minerva.Size': 'Size',
  'etch.drawing.DisplayObject': 'DisplayObject',
  'etch.drawing.IDisplayContext': 'IDisplayContext',
  'Utils.Measurements.Dimensions': 'Dimensions',
};

export function portUi() {
  rmSync(OUT, { recursive: true, force: true });
  const written: string[] = [];
  for (const rel of PORTED) {
    let src = readFileSync(join(SRC, rel), 'utf8');
    for (const [from, to, why, all] of REWRITES[rel] ?? []) {
      if (!src.includes(from)) throw new Error(`${rel}: rewrite "${why}" no longer matches`);
      src = all ? src.split(from).join(to) : src.replace(from, to);
    }
    const names = new Set<string>(['App', 'Utils']);
    const body = src
      .split('\n')
      .filter((line) => {
        const alias = /^import\s+(\w+)\s*=\s*([\w.]+);?\s*(\/\/.*)?$/.exec(line);
        if (alias) {
          if (!ALIASES[alias[2]]) throw new Error(`${rel}: unknown alias ${alias[2]}`);
          names.add(ALIASES[alias[2]]);
          return false;
        }
        return !/^declare var App\b/.test(line);
      })
      .join('\n');
    // v1 imports interfaces as values (TS namespaces era): give each a runtime placeholder for the bundler.
    const ifaces = [...src.matchAll(/^export interface (\w+)/gm)]
      .map((match) => `export const ${match[1]}: any = null;`)
      .join('\n');
    const out = join(OUT, rel);
    const shim = relative(dirname(out), 'web/src/v1ui/shim.ts').replace(/^(?!\.)/, './');
    writeFileSync(
      ensureDir(out),
      `// @ts-nocheck\n// GENERATED by \`pnpm bd v1 port-ui\` from BlokDust v1 app/${rel} @ ${V1_SHA.slice(0, 7)} (MIT, see NOTICE.md).\n` +
        `// Do not edit: change web/src/v1ui/shim.ts or tools/v1/port-ui.ts.\nimport { ${[...names].sort().join(', ')} } from '${shim}';\n${body}${ifaces ? `\n${ifaces}\n` : ''}`,
    );
    written.push(out);
  }
  for (const [rel, text] of Object.entries(BRIDGES)) {
    const out = join(OUT, rel);
    writeFileSync(
      ensureDir(out),
      `// GENERATED by \`pnpm bd v1 port-ui\`: v2 bridge for a v1 module the UI imports.\n${text}`,
    );
    written.push(out);
  }
  // Options forms: each v1 block's UpdateOptionsForm() body, run by the shim block (this = { Params, ... }).
  const forms: string[] = [];
  for (const file of listTs(join(SRC, 'Blocks'))) {
    const src = readFileSync(file, 'utf8');
    const cls = /export class (\w+)/.exec(src)?.[1];
    const at = src.indexOf('UpdateOptionsForm() {');
    if (!cls || at < 0) continue;
    let depth = 0,
      i = src.indexOf('{', at),
      end = i;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}' && --depth === 0) break;
    }
    const body = src.slice(i + 1, end).replace(/^\s*super\.UpdateOptionsForm\(\);\s*$/m, '');
    forms.push(`  ${cls}: function (this: any) {${body}},`);
  }
  writeFileSync(
    ensureDir(join(OUT, 'BlockForms.ts')),
    `// @ts-nocheck\n// GENERATED by \`pnpm bd v1 port-ui\` from every BlokDust v1 block's UpdateOptionsForm() @ ${V1_SHA.slice(0, 7)} (MIT).\n` +
      `// Do not edit. Each runs with \`this\` = a shim block (web/src/v1ui/blocks.ts).\nimport { App } from '../shim.ts';\n\nexport const FORMS: Record<string, (this: any) => void> = {\n${forms.join('\n')}\n};\n`,
  );
  written.push(join(OUT, 'BlockForms.ts'));

  // SampleGen's generator (v1 SampleGen.Arp/Dice/DataToBuffer), run by the app with `this` = a small context
  // ({ Params, Sources: [{ noteToFrequency }], _LoadFromShare, _SeedLoad, PopulateBuffer(sampleRate) }).
  const gen = readFileSync(join(SRC, 'Blocks/Sources/SampleGen.ts'), 'utf8');
  const methods = ['Arp', 'Dice', 'DataToBuffer'].map((name) => {
    const at = gen.search(new RegExp(`^    ${name}\\(`, 'm'));
    if (at < 0) throw new Error(`SampleGen.${name} not found`);
    let depth = 0,
      i = gen.indexOf('{', at),
      end = i;
    for (; end < gen.length; end++) {
      if (gen[end] === '{') depth++;
      else if (gen[end] === '}' && --depth === 0) break;
    }
    return gen.slice(at, end + 1).replace(/^ {4}/, '  ') + ',';
  });
  writeFileSync(
    ensureDir(join(OUT, 'SampleGenData.ts')),
    `// @ts-nocheck\n// GENERATED by \`pnpm bd v1 port-ui\` from BlokDust v1 app/Blocks/Sources/SampleGen.ts @ ${V1_SHA.slice(0, 7)} (MIT).\n` +
      `// Do not edit. v1's SampleGen buffer generator, verbatim.\nimport { App } from '../shim.ts';\nimport { WaveVoice } from './WaveVoice';\n\nexport const SAMPLE_GEN = {\n${methods.join('\n')}\n};\n`,
  );
  written.push(join(OUT, 'SampleGenData.ts'));

  // Menu data: v1 BlockCreator.MenuJson order with l10n names/descriptions (category labels and items).
  const l10n = JSON.parse(readFileSync(join(SRC, 'l10n.json'), 'utf8'));
  const creator = readFileSync(join(SRC, 'BlockCreator.ts'), 'utf8');
  const menuSrc = creator.slice(creator.indexOf('public MenuJson'));
  const categories: any[] = [];
  for (const match of menuSrc.matchAll(
    /"name":\s*App\.L10n\.Blocks\.(\w+)\.(?:Label|Blocks\.(\w+)\.name),\s*(?:"id":\s*(\w+),\s*"description":\s*App\.L10n\.Blocks\.\w+\.Blocks\.\w+\.description)?/g,
  )) {
    const [, cat, item, id] = match;
    if (!item) categories.push({ name: l10n.Blocks[cat].Label, items: [] });
    else
      categories.at(-1).items.push({
        name: l10n.Blocks[cat].Blocks[item].name,
        id,
        description: l10n.Blocks[cat].Blocks[item].description ?? '',
      });
    if (menuSrc.indexOf(match[0]) > menuSrc.indexOf('};')) break;
  }
  writeFileSync(
    ensureDir(join(OUT, 'data/menu.json')),
    JSON.stringify({ categories }, null, 2) + '\n',
  );
  writeFileSync(join(OUT, 'data/l10n.json'), JSON.stringify(l10n, null, 2) + '\n');
  // v1 config.json (App.Config: ScrollSpeed, PlaybackRange, …), minus the SoundCloud keys v2 doesn't use (DATA-0005).
  const config = Object.fromEntries(
    Object.entries(JSON.parse(readFileSync(join(SRC, 'config.json'), 'utf8'))).filter(
      ([k]) => !k.startsWith('SoundCloud'),
    ),
  );
  writeFileSync(join(OUT, 'data/config.json'), JSON.stringify(config, null, 2) + '\n');
  console.log(
    JSON.stringify({
      out: OUT,
      files: written.length + 3,
      categories: categories.map((category) => `${category.name}:${category.items.length}`),
    }),
  );
}

function listTs(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? listTs(p) : p.endsWith('.ts') ? [p] : [];
    });
}

function ensureDir(p: string) {
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

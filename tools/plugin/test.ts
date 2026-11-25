// bd plugin test: build, validate, and load the built VST3 as a DAW does (golden hashes must match
// native) and check the WebView editor builds the stage from the patch.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FX_VST3, HOST, VST3 } from './paths.ts';
import { build } from './build.ts';
import { validate } from './validate.ts';
import {
  expected,
  hostRender,
  lastJsonLine,
  nativeRender,
  sampleState,
  type SelfTest,
} from './hostRender.ts';

/** A fixture the built plugin renders, and what else it must show. */
interface PluginTestCase {
  name: string;
  plugin: string;
  fixture: string;
  extra: string[];
  editorBlocks?: number;
  noRoundTripCheck?: boolean;
  /** An automation lane's index and the name it must have. */
  paramName?: [number, string];
  /** Compare with the native engine now, not the golden hashes. */
  native?: boolean;
}

/** A host self-test (`--selftest-…`): its answer, or none. */
function selfTest(flag: string) {
  const result = spawnSync(HOST, [flag], { encoding: 'utf8' });
  let answer: SelfTest = {};
  try {
    answer = lastJsonLine(result.stdout) as SelfTest;
  } catch {
    // reported by the caller
  }
  return { answer, stderr: result.stderr };
}

export function test() {
  build();
  const pluginval = validate();
  const diag = resolve('.cache/plugin-ui-diag.json');
  // Dust 1 = 0.75 on filter.gain (−35..35) is 17.5 dB: the dust-filter patch, by automation.
  const automationState = 'tests/golden/states/dust-filter.state.json';
  const cases: PluginTestCase[] = [
    {
      name: 'emitter-tone (state + editor)',
      plugin: VST3,
      fixture: 'tests/golden/emitter-tone.json',
      extra: ['--editor', diag],
      editorBlocks: 2,
    },
    {
      name: 'toggle-pulse (44.1 kHz)',
      plugin: VST3,
      fixture: 'tests/golden/toggle-pulse.json',
      extra: [],
    },
    // keys and laser fixtures need scripts: covered natively
    {
      name: 'Dust 1 automation',
      plugin: VST3,
      fixture: 'tests/golden/dust-filter.json',
      extra: ['--state', automationState, '--param', '0=0.75'],
      noRoundTripCheck: true,
      paramName: [0, 'Dust 1 \u00b7 Filter \u00b7 Gain'],
    }, // CHG-0004 3.9: lanes named after their target
    {
      name: 'FX: Audio In with input',
      plugin: FX_VST3,
      fixture: 'tests/golden/fx-audio-in.json',
      extra: [],
    },
    // CHG-0004 3.4: the instrument's side-chain bus feeds Audio Input as the FX's input does.
    {
      name: 'Instrument: side-chain → Audio Input',
      plugin: VST3,
      fixture: 'tests/golden/fx-audio-in.json',
      extra: ['--sidechain'],
    },
    // Host MIDI at the fixture script's samples (the engine ignores note-on velocity today).
    {
      name: 'host MIDI notes',
      plugin: VST3,
      fixture: 'tests/golden/midi-notes.json',
      extra: ['--midi', 'on:60@4800,off:60@48000,on:67/76@72000,off:67@120000'],
    }, // velocity 76/127, as in the fixture
    // In a DAW the computer keys are the host's (Logic Musical Typing, Live's Computer MIDI
    // Keyboard): they arrive as MIDI.
    {
      name: 'DAW keys → Computer Keyboard',
      plugin: VST3,
      fixture: 'tests/golden/keyboard-host-midi.json',
      extra: ['--midi', 'on:60@4800,on:64@24000,off:60@48000,off:64@60000'],
    },
    // CHG-0004 3.6: a project whose Sample uses the user's own file (absolute path): loaded
    // natively, nothing relinked, rendering as the native engine with the same WAV.
    {
      name: "state: Sample with the user's file",
      plugin: VST3,
      fixture: 'tests/golden/samples/sample-file.json',
      extra: ['--state', sampleState(), '--settle', '2000'],
      native: true,
      noRoundTripCheck: true,
    },
    {
      name: 'state: moved file relinked by name',
      plugin: VST3,
      fixture: 'tests/golden/samples/sample-file.json',
      extra: ['--state', sampleState(true), '--settle', '2000'],
      native: true,
      noRoundTripCheck: true,
    },
    // CHG-0038: a Sample inside a Stage (a website patch in a project): its file goes to the
    // Stage's inner world, rendering as the native engine with the WAV there.
    {
      name: 'Stage: a sampler inside plays its file',
      plugin: VST3,
      fixture: 'tests/golden/samples/stage-sample-file.json',
      extra: [
        '--state',
        sampleState(false, 'tests/golden/samples/stage-sample-file.json'),
        '--settle',
        '2000',
      ],
      native: true,
      noRoundTripCheck: true,
    },
    // CHG-0004 3.5: the host's transport (120 BPM) ≡ the patch tempo rendered natively.
    {
      name: 'host tempo + transport',
      plugin: VST3,
      fixture: 'tests/golden/tempo-host.json',
      extra: ['--tempo', '120'],
    },
    // PLUGIN-0004: a raw MPE stream through the plugin's parser ≡ the web parser's, natively.
    {
      name: 'host MPE MIDI',
      plugin: VST3,
      fixture: 'tests/golden/mpe-midi.json',
      extra: [
        '--midi-raw',
        (
          JSON.parse(readFileSync('tests/golden/mpe-midi.json', 'utf8')) as { midi: number[][] }
        ).midi
          .map((message) => `${message[0]}:${message[1]},${message[2]},${message[3]}`)
          .join(';'),
      ],
    },
  ];
  const renders = cases.map((cas) => {
    const got = hostRender(cas.plugin, cas.fixture, cas.extra, { BLOKDUST_DIAG_FILE: diag });
    const exp = cas.native ? nativeRender(cas.fixture) : expected(cas.fixture);
    const nameOk = !cas.paramName || got.params?.[cas.paramName[0]] === cas.paramName[1];
    const ok =
      nameOk &&
      got.audioHash === exp.audioHash &&
      (cas.noRoundTripCheck === true || got.stateRoundTrips === true) &&
      (cas.editorBlocks === undefined ||
        (got.editor?.blocks === cas.editorBlocks &&
          got.editor.supportSystem?.format === 'VST3' &&
          (got.editor.supportSystem.sampleRate ?? 0) > 0 &&
          (got.editor.supportSystem.bufferSize ?? 0) > 0 &&
          // The Wavetable's picture is drawn by the engine's wasm: the editor must serve it.
          got.editor.wasm === true));
    return {
      case: cas.name,
      ok,
      audioHash: got.audioHash ?? got.error,
      expected: exp.audioHash,
      ...(got.editor ? { editor: got.editor } : {}),
    };
  });
  // CHG-0004 3.10 (found by REAPER's save and reopen): Dust values are saved state.
  {
    const rendered = hostRender(VST3, 'tests/golden/dust-filter.json', [
      '--state',
      automationState,
      '--param',
      '0=0.6',
      '--param',
      '7=0.25',
      '--reload',
    ]);
    const values = rendered.reloadedValues ?? [];
    const ok =
      Math.abs((values.at(0) ?? -1) - 0.6) < 1e-4 && Math.abs((values.at(7) ?? -1) - 0.25) < 1e-4;
    renders.push({
      case: 'state keeps Dust 1-8 values (save, reopen)',
      ok,
      audioHash: JSON.stringify(values.slice(0, 8)),
      expected: '[0.6,…,0.25]',
    });
  }
  // A Dust lane moves its block param, and the patch the host saves says so (the editor shows the
  // same: ui-regressions dust-moves-sliders).
  {
    const dusted = hostRender(VST3, 'tests/golden/dust-filter.json', [
      '--state',
      automationState,
      '--param',
      '0=0.75',
    ]);
    const gain = dusted.stateAfter?.blocks?.find((block) => block.id === 'filter')?.params?.gain;
    renders.push({
      case: 'Dust moves the saved block param',
      ok: typeof gain === 'number' && Math.abs(gain - 17.5) < 1e-6,
      audioHash: String(gain),
      expected: '17.5',
    });
  }
  // CHG-0004 3.9: a MIDI CC learned for Dust 1 ("cc" in automation) drives it as the lane does.
  {
    const st = JSON.parse(readFileSync(automationState, 'utf8')) as {
      automation: { cc?: number }[];
    };
    st.automation[0].cc = 20;
    const ccState = resolve('.cache/plugin-cc-state.json');
    writeFileSync(ccState, JSON.stringify(st));
    const byCc = hostRender(VST3, 'tests/golden/dust-filter.json', [
      '--state',
      ccState,
      '--midi-raw',
      '0:176,20,127',
    ]);
    const byLane = hostRender(VST3, 'tests/golden/dust-filter.json', [
      '--state',
      ccState,
      '--param',
      '0=1.0',
    ]);
    const ok = !!byCc.audioHash && byCc.audioHash === byLane.audioHash;
    renders.push({
      case: 'MIDI CC 20 → Dust 1 (learned)',
      ok,
      audioHash: byCc.audioHash ?? byCc.error,
      expected: byLane.audioHash,
    });
  }
  // Owner (Logic): bypassed, the plugin is silent but its world keeps running, so the stage still
  // connects blocks; once back on it sounds exactly as if it had never been bypassed.
  {
    const from = String(48000 * 2);
    const bypassed = hostRender(VST3, 'tests/golden/emitter-tone.json', [
      '--bypass-until',
      from,
      '--tail-from',
      from,
    ]);
    const normal = hostRender(VST3, 'tests/golden/emitter-tone.json', ['--tail-from', from]);
    const ok =
      !!bypassed.tailHash && bypassed.tailHash === normal.tailHash && (normal.peak ?? 0) > 0.001;
    renders.push({
      case: 'bypassed: the world keeps running',
      ok,
      audioHash: bypassed.tailHash ?? bypassed.error,
      expected: normal.tailHash,
    });
  }
  // Pressing Play resyncs the world: takes from bar 1 match whatever came before (here the
  // transport stopped at different times, then played from bar 1 at the same sample).
  {
    const again = '144000';
    const a = hostRender(VST3, 'tests/golden/tempo-host.json', [
      '--tempo',
      '120',
      '--stopped',
      `60000:${again}`,
      '--tail-from',
      again,
    ]);
    const b = hostRender(VST3, 'tests/golden/tempo-host.json', [
      '--tempo',
      '120',
      '--stopped',
      `101000:${again}`,
      '--tail-from',
      again,
    ]);
    const ok = !!a.tailHash && a.tailHash === b.tailHash && (a.peak ?? 0) > 0.001;
    renders.push({
      case: 'Play resyncs: takes from bar 1 match',
      ok,
      audioHash: a.tailHash ?? a.error,
      expected: b.tailHash,
    });
  }
  // CHG-0025: power HOST (saved with the project) powers the world while the DAW plays, off while
  // it is stopped; plain ON keeps running when stopped.
  {
    const fx = JSON.parse(readFileSync('tests/golden/tempo-host.json', 'utf8')) as {
      patch: Record<string, unknown>;
    };
    const state = (mode: number) => {
      const statePath = resolve(`.cache/power-mode-${mode}.state.json`);
      writeFileSync(statePath, JSON.stringify({ ...fx.patch, plugin: { powerMode: mode } }));
      return statePath;
    };
    // Stopped at 1.25 s, played from bar 1 at 3 s: the stopped window starts 1 s after (release).
    const run = (mode: number, window: string) =>
      hostRender(VST3, 'tests/golden/tempo-host.json', [
        '--state',
        state(mode),
        '--tempo',
        '120',
        '--stopped',
        '60000:144000',
        '--peak',
        window,
      ]);
    const hostStopped = run(2, '108000:144000').windowPeak,
      hostPlaysAgain = run(2, '150000:240000').windowPeak,
      onStopped = run(1, '108000:144000').windowPeak;
    const reloaded = hostRender(VST3, 'tests/golden/tempo-host.json', [
      '--state',
      state(2),
      '--reload',
    ]).stateAfter?.plugin;
    const ok =
      (hostStopped ?? Infinity) < 1e-4 &&
      (hostPlaysAgain ?? 0) > 0.001 &&
      (onStopped ?? 0) > 0.001 &&
      reloaded?.powerMode === 2;
    renders.push({
      case: 'power HOST: off while the DAW is stopped, on when it plays',
      ok,
      audioHash: JSON.stringify({ hostStopped, hostPlaysAgain, onStopped, reloaded }),
      expected: 'stopped silent; plays; ON keeps running',
    });
  }
  // A disabled plugin gets no audio callbacks; with its editor open the stage must still update.
  {
    const idle = hostRender(VST3, 'tests/golden/emitter-tone.json', ['--idle', '--editor', diag], {
      BLOKDUST_DIAG_FILE: diag,
    });
    const seq = idle.editor?.snapshotSeq ?? 0;
    renders.push({
      case: 'no audio callbacks: the editor still ticks the world',
      ok: seq > 0,
      audioHash: String(seq),
      expected: '> 0 snapshots',
    });
  }
  // CHG-0038: Stages' inner worlds in the processor (made on first use; freed once the engine lets
  // a removed one go; macros keep the processor's sampler fields).
  {
    const { answer, stderr } = selfTest('--selftest-stages');
    renders.push({
      case: 'Stage worlds: edits inside reach their own world',
      ok: answer.ok === true,
      audioHash: JSON.stringify(answer.checks ?? stderr),
      expected: 'all checks true',
    });
  }
  // CHG-0005: patch files (save, list) and the Open / Insert merge the processor applies.
  {
    const { answer, stderr } = selfTest('--selftest-patches');
    renders.push({
      case: 'patch files: save, list, open/insert merge',
      ok: answer.ok === true,
      audioHash: JSON.stringify(answer.checks ?? stderr),
      expected: 'all checks true',
    });
  }
  for (const failed of renders.filter((render) => !render.ok))
    console.error(`FAIL ${JSON.stringify(failed)}`);
  const ok =
    pluginval.vst3 === 'pass' &&
    pluginval.fxVst3 === 'pass' &&
    renders.every((render) => render.ok);
  console.log(
    JSON.stringify({
      pluginval,
      renders: renders.map(({ case: name, ok, editor }) => ({
        case: name,
        ok,
        ...(editor ? { editor } : {}),
      })),
    }),
  );
  if (!ok) process.exit(1);
}

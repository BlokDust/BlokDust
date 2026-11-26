// bd v1 — reproducible access to BlokDust v1 as the visual/behavioural reference.
//   fetch                 clone v1 at the pinned commit into .cache/v1
//   serve [port]          serve v1's prebuilt dist/ (identical to femurdesign.com/blokdust)
//   capture [fixtures...] [--blocks] [--only a,b] [--themes 0,3|all] [--dpr 1|2] [--jobs 6] [--out dir]
//                         deterministic reference screenshots + stage metrics/palette per image
//   audio [--only a,b] [--jobs 6] [--out dir] [--eval js]   (--eval: diagnostics into a scratch --out only)
//                         deterministic audio references: v1 rendered on an OfflineAudioContext (tests/audio/fixtures/v1)
//   port-ui               copy v1's UI classes (MIT) into web/src/v1ui/ported/ against the shim (generated)
//   extract [--out blocks] draft block manifests + v1 palettes from the running v1 app
//   verify [--dpr 1|2]    re-render extracted manifests with Canvas2D and diff against references
import { fetchV1, serve } from './lib.ts';
import { capture } from './capture.ts';
import { extract } from './extract.ts';

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'fetch') fetchV1();
else if (cmd === 'serve') {
  const port = Number(rest[0] ?? 8731);
  await serve(port);
  console.log(`v1 at http://localhost:${port}/`);
} else if (cmd === 'capture') await capture(rest);
else if (cmd === 'audio') await (await import('./audio.ts')).audio(rest);
else if (cmd === 'port-ui') (await import('./port-ui.ts')).portUi();
else if (cmd === 'extract') await extract(rest);
else if (cmd === 'verify') await (await import('./verify.ts')).verify(rest);
else {
  console.error(
    'usage: bd v1 fetch | serve [port] | capture [fixtures.json...] [--blocks] [--only a,b] [--themes 0,3|all] [--dpr 1|2] [--out dir] | audio [--only a,b] | extract [--out blocks] | verify [--dpr 1|2]',
  );
  process.exit(2);
}

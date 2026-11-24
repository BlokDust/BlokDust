// Make the MP4 (SPEC-SHARING-VIDEO-EXPORT R5–R12, SHARING-0007): replay the session to the window's start, then draw a
// frame every 1/30 s and hand frames and audio to Mediabunny (H.264 + AAC in MP4). Mediabunny, and the WASM AAC
// encoder for browsers without one, load only here (dynamic imports), so the app's start-up bundle does not grow.
import type { Theme } from '../generated/palettes.gen.ts';
import type { Label } from '../stage/labels.ts';
import {
  END_SECONDS,
  FPS,
  SHAPES,
  cameraFor,
  drawEndCard,
  drawWorldFrame,
  drawnBlocks,
  jitterAt,
  type EndCard,
  type Shape,
} from './frame.ts';
import { QUANTUM, Replay, blockBounds, type ReplaySource } from './replay.ts';

type Mediabunny = typeof import('mediabunny');

export interface VideoJob {
  source: ReplaySource;
  /** The window, in engine frames (`from` a quantum boundary): the video shows [from, to), then the end card. */
  from: number;
  to: number;
  shape: Shape;
  theme: Theme;
  labels: Label[];
  card: EndCard;
}
export interface VideoProgress {
  phase: 'preparing' | 'rendering';
  done: number;
}
export class VideoError extends Error {
  constructor(
    readonly reason: 'no-h264' | 'no-webcodecs' | 'cancelled',
    message: string,
  ) {
    super(message);
  }
}

/** Let the page draw and take input between slices of work (R11). */
const breathe = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The H.264 + AAC encoders this browser has (AAC falls back to the WASM encoder). Throws VideoError if it can't. */
export async function prepareEncoders(
  width: number,
  height: number,
  sampleRate: number,
): Promise<Mediabunny> {
  if (typeof VideoEncoder === 'undefined')
    throw new VideoError('no-webcodecs', 'This browser cannot make videos.');
  const mb = await import('mediabunny');
  if (!(await mb.canEncodeVideo('avc', { width, height, frameRate: FPS })))
    throw new VideoError('no-h264', 'This browser cannot make MP4 video.');
  if (!(await mb.canEncodeAudio('aac', { numberOfChannels: 2, sampleRate }))) {
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
    registerAacEncoder();
  }
  return mb;
}

/** Engine audio to the encoder about a second at a time, planar stereo, cut at `total` frames. */
class AudioOut {
  private readonly left: Float32Array;
  private readonly right: Float32Array;
  private filled = 0;
  private sent = 0;
  constructor(
    private readonly mb: Mediabunny,
    private readonly source: InstanceType<Mediabunny['AudioSampleSource']>,
    private readonly sampleRate: number,
    private readonly total: number,
  ) {
    this.left = new Float32Array(sampleRate);
    this.right = new Float32Array(sampleRate);
  }
  /** Keep one quantum; resolves once any full chunk has gone to the encoder. */
  async push(samples: Float32Array, r: Float32Array): Promise<void> {
    const n = Math.min(this.left.length - this.filled, samples.length);
    this.left.set(samples.subarray(0, n), this.filled);
    this.right.set(r.subarray(0, n), this.filled);
    this.filled += n;
    if (this.filled < this.left.length) return;
    await this.flush();
    if (n < samples.length) {
      this.left.set(samples.subarray(n), 0);
      this.right.set(r.subarray(n), 0);
      this.filled = samples.length - n;
    }
  }
  async flush(): Promise<void> {
    const n = Math.min(this.filled, this.total - this.sent);
    this.filled = 0;
    if (n <= 0) return;
    const data = new Float32Array(n * 2);
    data.set(this.left.subarray(0, n), 0);
    data.set(this.right.subarray(0, n), n);
    const sample = new this.mb.AudioSample({
      data,
      format: 'f32-planar',
      numberOfChannels: 2,
      sampleRate: this.sampleRate,
      timestamp: this.sent / this.sampleRate,
    });
    await this.source.add(sample);
    sample.close();
    this.sent += n;
  }
}

export async function makeVideo(
  module: WebAssembly.Module,
  job: VideoJob,
  progress: (videoProgress: VideoProgress) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const { width, height } = SHAPES[job.shape],
    sr = job.source.sampleRate;
  const mb = await prepareEncoders(width, height, sr);
  const check = () => {
    if (signal?.aborted) throw new VideoError('cancelled', 'Cancelled.');
  };
  const replay = new Replay(module, job.source);
  try {
    // ---- up to the window: nothing drawn or kept, but the engine runs every quantum (R2) ----
    while (replay.frame < job.from) {
      replay.run(Math.min(job.from, replay.frame + QUANTUM * 4096));
      progress({ phase: 'preparing', done: replay.frame / job.from });
      check();
      await breathe();
    }
    return await encode(mb, replay, job, progress, check);
  } finally {
    replay.dispose();
  }
}

async function encode(
  mb: Mediabunny,
  replay: Replay,
  job: VideoJob,
  progress: (videoProgress: VideoProgress) => void,
  check: () => void,
): Promise<Blob> {
  const { width, height } = SHAPES[job.shape],
    sr = job.source.sampleRate;
  // A page canvas, not an OffscreenCanvas: labels use the page's fonts (Dosis).
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const ctx = canvas.getContext('2d')!;
  const camera = cameraFor(
    blockBounds(job.source.entries, job.from, job.to),
    width,
    height,
    job.labels,
  );
  const output = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new mb.BufferTarget(),
  });
  const video = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: mb.QUALITY_HIGH });
  const audioSource = new mb.AudioSampleSource({ codec: 'aac', bitrate: mb.QUALITY_HIGH });
  output.addVideoTrack(video, { frameRate: FPS });
  output.addAudioTrack(audioSource);
  await output.start();
  try {
    const shown = Math.round(((job.to - job.from) / sr) * FPS),
      total = shown + END_SECONDS * FPS;
    const audio = new AudioOut(mb, audioSource, sr, Math.round((total / FPS) * sr));
    const runTo = async (to: number) => {
      while (replay.frame < to) {
        let kept: [Float32Array, Float32Array] | null = null;
        replay.run(replay.frame + QUANTUM, (samples, r) => {
          kept = [samples.slice(), r.slice()];
        });
        if (kept) await audio.push(...(kept as [Float32Array, Float32Array]));
      }
    };
    for (let k = 0; k < total; k++) {
      await runTo(job.from + Math.round(((k / FPS) * sr) / QUANTUM) * QUANTUM); // the quantum boundary nearest frame k (R6)
      drawWorldFrame(
        ctx,
        camera,
        job.theme,
        drawnBlocks(replay.blocks),
        replay.snapshot(),
        job.labels,
        jitterAt(k),
      );
      if (k >= shown)
        drawEndCard(ctx, width, height, job.theme, job.card, (k - shown) / (FPS * 0.5));
      await video.add(k / FPS, 1 / FPS);
      if (k % 10 === 0) {
        progress({ phase: 'rendering', done: k / total });
        check();
        await breathe();
      }
    }
    await runTo(job.from + Math.round((total / FPS) * sr));
    await audio.flush();
    video.close();
    audioSource.close();
    await output.finalize();
    progress({ phase: 'rendering', done: 1 });
    return new Blob([output.target.buffer!], { type: 'video/mp4' });
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  }
}

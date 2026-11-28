// Samplers, Freesound, the Recorder and SampleGen, from v1's options panel.
import {
  fetchFreesound,
  isPortable,
  searchFreesound,
  type FreesoundRef,
} from '../../patch/samples.ts';
import { juce } from '../boot/page.ts';
import { atStage } from '../model/engineLink.ts';
import { model } from '../model/patchModel.ts';
import { downloadRecording, toggleRecording } from '../samples/recorder.ts';
import { generateSample, soundMade } from '../samples/sampleGen.ts';
import { useSample } from '../samples/useSample.ts';
import {
  markMissing,
  maxSecondsFor,
  pickSample,
  reverseSample,
  setParams,
  whileLoading,
} from '../samples/userSamples.ts';
import type { SceneHostPart } from './hostParts.ts';

type SoundHost = SceneHostPart<
  | 'loadSample'
  | 'searchSamples'
  | 'loadFreesound'
  | 'reverseSample'
  | 'setText'
  | 'hasLocalFiles'
  | 'toggleRecording'
  | 'downloadRecording'
  | 'generateSample'
  | 'setSound'
>;

const loadFreesound: SoundHost['loadFreesound'] = (id, sound, display) => {
  const ref: FreesoundRef = { provider: 'freesound', ...sound };
  // Plugin: the processor downloads and decodes it for its native engine (CHG-0004 3.6).
  if (juce) {
    juce.emitEvent('bd_loadUrl', {
      id,
      ref,
      display,
      maxSeconds: maxSecondsFor(id) ?? 0,
      ...atStage(),
    });
    return;
  }
  void whileLoading(id, async (isNewest) =>
    useSample(id, ref, await fetchFreesound(ref, maxSecondsFor(id)), true, isNewest, display),
  ).catch((error: unknown) => {
    console.warn('BlokDust: Freesound sound unavailable', error);
    markMissing(id);
  });
};

/** SampleGen's SOUND slider (CHG-0035): the number while it moves, the wave on release. */
const setSound: SoundHost['setSound'] = (id, soundNumber, make) => {
  if (model.get(id)?.params.sound !== soundNumber) setParams(id, { sound: soundNumber });
  if (make && soundMade.get(id) !== soundNumber) {
    soundMade.set(id, soundNumber);
    generateSample(id, false);
  }
};

export function soundHost(): SoundHost {
  return {
    loadSample: (id) => void pickSample(id),
    searchSamples: (query, maxSeconds) => searchFreesound(query, maxSeconds),
    loadFreesound,
    reverseSample: (id, on) => {
      reverseSample(id, on);
    },
    setText: (id, key, value) => {
      setParams(id, { [key]: value });
    },
    hasLocalFiles: () => [...model.values()].some((block) => !isPortable(block.params.track)),
    toggleRecording: (id) => void toggleRecording(id),
    downloadRecording: (id) => {
      downloadRecording(id);
    },
    generateSample: (id) => {
      generateSample(id, false);
    },
    setSound,
  };
}

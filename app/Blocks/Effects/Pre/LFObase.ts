import {Granular} from '../../Sources/Granular';
import {IApp} from '../../../IApp';
import {IAudioChain} from '../../../Core/Audio/Connections/IAudioChain';
import {PreEffect} from '../PreEffect';
import {SamplerBase} from '../../Sources/SamplerBase';

declare var App: IApp;

export abstract class LFObase extends PreEffect {

    public OscLFO: Tone.LFO;
    public SamplerLFO: Tone.LFO;

    Dispose() {
        this.OscLFO.stop();
        this.SamplerLFO.stop();
        this.OscLFO.dispose();
        this.SamplerLFO.dispose();
    }

    InitializeLFOs() {
        this.OscLFO = new Tone.LFO();
        this.SamplerLFO = new Tone.LFO();
        this.OscLFO.frequency.value = this.Params.rate;
        this.SamplerLFO.frequency.value = this.Params.rate;
        this.OscLFO.min = -this.Params.depth;
        this.SamplerLFO.min = LFObase.ConvertLFODepthToPlaybackDepth(-this.Params.depth);
        this.OscLFO.max = this.Params.depth;
        this.SamplerLFO.max = LFObase.ConvertLFODepthToPlaybackDepth(this.Params.depth);
        this.OscLFO.type = App.Audio.WaveformTypeIndex[this.Params.waveform];
        this.SamplerLFO.type = App.Audio.WaveformTypeIndex[this.Params.waveform];
        this.OscLFO.start();
        this.SamplerLFO.start();
    }

    SetParam(param: string,value: number) {
        var val = value;

        if (param=="rate") {
            this.OscLFO.frequency.value = val;
            this.SamplerLFO.frequency.value = val;
        } else if (param=="depth") {
            this.OscLFO.min = -val;
            this.SamplerLFO.min = LFObase.ConvertLFODepthToPlaybackDepth(-val);
            this.OscLFO.max = val;
            this.SamplerLFO.max = LFObase.ConvertLFODepthToPlaybackDepth(val);
        } else if (param=="waveform") {
            this.OscLFO.type = App.Audio.WaveformTypeIndex[val];
            this.SamplerLFO.type = App.Audio.WaveformTypeIndex[val];
        }
        this.Params[param] = val;
    }

    UpdateConnections(chain: IAudioChain) {
        super.UpdateConnections(chain);

        this.OscLFO.disconnect();
        this.SamplerLFO.disconnect();

        // Connect the right LFO type in the right place depending on the source
        for (let i = 0; i < chain.Sources.length; i++) {
            const source = chain.Sources[i];
            if (source instanceof Granular) {
                source.Grains.forEach((s: Tone.SimplePlayer) => {
                    if (s.playbackRate) {
                        this.SamplerLFO.connect(s.playbackRate);
                    }
                });
            } else {
                for (let j = 0; j < source.Sources.length; j++) {
                    const s = source.Sources[j];
                    if ((<Tone.Oscillator>s).detune) {
                        this.OscLFO.connect((<Tone.Oscillator>s).detune);
                    } else if ((<Tone.Simpler>s).player && (<Tone.Simpler>s).player.playbackRate) {
                        //this.SamplerLFO.connect((<Tone.Simpler>s).player.playbackRate);
                        this.SamplerLFO.connect(source.PlaybackSignal.Signal);
                    }  else if ((<Tone.Noise>s).playbackRate) {
                        this.SamplerLFO.connect((<Tone.Noise>s).playbackRate);
                    }
                }
            }
        }
    }

    static ConvertLFODepthToPlaybackDepth(val): number {
        return (val/400) + 1;
    }
}
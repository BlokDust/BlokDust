import IBlock = require("./IBlock");
import IEffect = require("./IEffect");
import ISource = require("./ISource");
import Block = require("./Block");
import Grid = require("../Grid");
import MainScene = require("../MainScene");
import Particle = require("../Particle");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import Soundcloud = require("./Sources/Soundcloud");
import PostEffect = require("./Effects/PostEffect");
import AudioChain = require("../Core/Audio/ConnectionMethods/AudioChain");
import Power = require("./Power/Power");
import PowerSource = require("./Power/PowerSource");
import Logic = require("./Power/Logic/Logic");
import Voice = require("./Interaction/VoiceObject");
import SoundcloudTrack = require("../UI/SoundcloudTrack");

class Source extends Block implements ISource {

    public Connections: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();

    public Sources: any[];
    public Envelopes: Tone.AmplitudeEnvelope[];
    public AudioInput: Tone.Signal;
    public Settings: ToneSettings = {
        envelope: {
            attack: 0.02,
            decay: 0.5,
            sustain: 0.5,
            release: 0.02
        },
        output: {
            volume: 0.5
        }
    };

    public ActiveVoices: Voice[];
    public FreeVoices: Voice[];
    public WaveIndex: string[];
    public PowerConnections: number;
    public ParticlePowered: boolean;
    public LaserPowered: boolean;
    public UpdateCollision: boolean;
    public Collisions: any[];
    public CheckRange: number;
    public SearchResults: SoundcloudTrack[];
    public Searching: boolean;
    public ResultsPage: number;
    public SearchString: string;

    Init(sketch?: any): void {
        super.Init(sketch);

        this.Sources = [];
        this.Envelopes = [];
        this.ActiveVoices = [];
        this.FreeVoices = [];
        if (!this.WaveIndex) {
            this.WaveIndex = ["sine","square","triangle","sawtooth"];
        }

        this.ParticlePowered = false;
        this.LaserPowered = false;

        if (!(this instanceof Power)) {

            this.AudioInput = new Tone.Signal();
            this.AudioInput.connect(App.Audio.Master);

        }

        this.UpdateOptionsForm();
    }

    /**
     * Add effect to this Source's list of effects and call Effect.Attach()
     * @param effect
     */
    AddEffect(effect: IEffect) {
        this.Connections.Add(effect);
        //effect.Attach(<ISource>this);
    }

    /**
     * Remove effect from this Source's list of effects and call Effect.Detach()
     * @param effect
     */
    RemoveEffect(effect: IEffect) {
        this.Connections.Remove(effect);
        //effect.Detach(<ISource>this);
    }

    /**
    * Validate that the block's effects still exist
    */
    public ValidateEffects() {
        for (let i = 0; i < this.Connections.Count; i++){
            let effect:IEffect = this.Connections.GetValueAt(i);

            if (!App.Effects.contains(effect)){
                this.RemoveEffect(effect);
            }
        }
    }

    UpdateConnections(chain: AudioChain) {
        super.UpdateConnections(chain);

        // Reset Envelopes back to original setting
        this._EnvelopeReset();

        // Release all the sources envelopes
        if (!this.IsPowered() || !this.IsPressed) {
            this.TriggerRelease('all', true);
        }

        // Reset pitch back to original setting
        this.ResetPitch();
    }

    private _EnvelopeReset() {
        if (this.Envelopes.length) {
            this.Envelopes.forEach((e: Tone.Envelope) => {
                e.attack = this.Settings.envelope.attack;
                e.decay = this.Settings.envelope.decay;
                e.sustain = this.Settings.envelope.sustain;
                e.release = this.Settings.envelope.release;
            });
        } else if (this.Sources[0] instanceof Tone.Simpler) {
            this.Sources.forEach((s: Tone.Simpler) => {
                const e = s.envelope;
                e.attack = this.Settings.envelope.attack;
                e.decay = this.Settings.envelope.decay;
                e.sustain = this.Settings.envelope.sustain;
                e.release = this.Settings.envelope.release;
            });
        }
    }

    CreateSource(){
        if (this.Sources[this.Sources.length-1]){
            return this.Sources[this.Sources.length-1];
        }
    }

    CreateEnvelope(){
        if (this.Envelopes[this.Envelopes.length-1]) {
            return this.Envelopes[this.Envelopes.length-1];
        }
    }

    Stop() {
        this.TriggerRelease();
    }

    /**
     * Trigger a sources attack
     * If no index is set trigger the first in the array
     * @param {number | string} index
     * Index is the position of the Envelope in Envelopes[].
     * If index is set to 'all', all envelopes will be triggered
     */
    TriggerAttack(index: number|string = 0) {

        //console.log('TriggerAttack: ',this);
        // Only if the source has envelopes
        if (this.Envelopes.length) {

            if (index === 'all'){
                // Trigger all the envelopes
                this.Envelopes.forEach((e: any)=> {
                    e.triggerAttack("+0.01");
                });
            } else {
                // Trigger the specific one
                this.Envelopes[index].triggerAttack("+0.01");
            }

        // Or Samplers have built in envelopes
        } else if (this.Sources[0] && this.Sources[0].envelope) {
            if (index === 'all'){
                // Trigger all the envelopes
                this.Sources.forEach((s: any)=> {
                    s.triggerAttack("+0.01");
                });
            } else {
                // Trigger the specific one
                this.Sources[index].triggerAttack("+0.01");
            }

        // Or this is a laser which needs to update it's collision check after being powered
        } else if (this.UpdateCollision!==undefined) {
            this.UpdateCollision = true;
        }
    }

    /**
     * Trigger a sources release
     * If no index is set release the first in the array
     * @param index {number|string} position of the Envelope in Envelopes[].
     * @param forceRelease {boolean} if set to true Envelopes will release regardless of power status
     * If index is set to 'all', all envelopes will be released
     */
    TriggerRelease(index: number|string = 0, forceRelease?: boolean) {
        forceRelease = (forceRelease === true) ? forceRelease : false;
        // Only if it's not powered or force is set to true
        //console.log('TriggerRelease: ',this);
        if (!this.IsPowered() || forceRelease) {

            // Only if the source has envelopes
            if (this.Envelopes.length) {

                if (index === 'all'){
                    // Trigger all the envelopes
                    this.Envelopes.forEach((e: any)=> {
                        e.triggerRelease();
                    });
                } else {
                    // Trigger the specific one
                    this.Envelopes[index].triggerRelease();
                }

            // Or Samplers have built in envelopes
            } else if (this.Sources[0] && this.Sources[0].envelope) {
                if (index === 'all'){
                    // Trigger all the envelopes
                    this.Sources.forEach((s: any)=> {
                        s.triggerRelease();
                    });
                } else {
                    // Trigger the specific one
                    this.Sources[index].triggerRelease();
                }

            // Or this is a laser which needs to update it's collision check after being unpowered
            } else if (this.UpdateCollision!==undefined) {
                this.UpdateCollision = true;
            }
        }
    }


    TriggerAttackRelease(duration: Tone.Time = App.Config.PulseLength, time: Tone.Time = '+0.01', velocity?: number) {

        // Oscillators & Noises & Players
        if (this.Envelopes.length){

            //TODO: add velocity to all trigger methods
            //TODO: add samplers and players
            this.Envelopes.forEach((e: any)=> {
                e.triggerAttackRelease(duration, time);
            });

        //    Samplers
        } else if (this.Sources[0] && this.Sources[0].envelope) {

            // Trigger all the envelopes
            this.Sources.forEach((s: any)=> {
                s.triggerAttackRelease(false, duration, time); // the false is "sample name" parameter
            });

        //    Power Source Blocks
        } else if (this.PowerConnections!==undefined) {

            this.PowerConnections += 1;
            if (this.UpdateCollision!==undefined) {
                this.UpdateCollision = true;
            }
            var block = this;
            var seconds = App.Audio.Tone.toSeconds(duration) * 1000;
            setTimeout( function() {
                block.PowerConnections -= 1;
                if (block.UpdateCollision!==undefined) {
                    block.UpdateCollision = true;
                }
            },seconds);

        }
    }


    /**
     * Checks whether the block is connected to a Power
     * @returns {boolean}
     */
    IsPowered(): boolean {
        let bool: boolean = false;
        if (this.IsPressed || this.PowerConnections>0) {
            bool = true;
        } else if (this.Chain && this.Chain.Connections) {
            this.Chain.Connections.forEach((block: IBlock) => {
                //If connected to power block OR connected to a logic block that is 'on'
                if (block instanceof Power || block instanceof Logic && block.Params.logic){
                    bool = true;
                }
            });
        }
        return bool;
    }

    /**
     * When a particle hits a source it triggers the attack and release
     * TODO: give this method a time parameter for duration of note
     * @param particle
     * @constructor
     */
    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);
        if (!this.IsPowered()) {
            this.TriggerAttackRelease();
        }
        particle.Dispose();
    }

    /**
     * Disposes the audio nodes
     * @constructor
     */
    Dispose() {
        super.Dispose();

        // Delete Signal nodes
        if (this.AudioInput) this.AudioInput.dispose();
        //if (this.EffectsChainOutput) this.EffectsChainOutput.dispose();


        if (this.ActiveVoices.length) {
            this.ActiveVoices.forEach((s: Voice)=> {
                s.ID = null
            });
            this.ActiveVoices = [];
        }

        if (this.FreeVoices.length) {
            this.FreeVoices.forEach((s: Voice)=> {
                s.ID = null;
            });
            this.FreeVoices = [];
        }

    }

    /**
     * Sets a sources pitch regardless of whether it's a oscillator or a audio player
     * @param pitch: number
     * @param sourceId: number - The index of the source in Sources[] (default: 0)
     * @param rampTime: Tone.Time (default: 0)
     *  TODO: when playback rate becomes a signal, change to something like this:
     *  this.Sources[id].player.playbackRate.rampTo(playbackRate, time);
     */
    SetPitch(pitch: number, sourceId?: number, rampTime?: Tone.Time) {
        // If no sourceId or rampTime is given default to 0
        const id: number = sourceId ? sourceId : 0;
        const time: Tone.Time = rampTime ? rampTime : 0;

        if (this.Sources[id].frequency) {
            // Oscillators
            this.Sources[id].frequency.exponentialRampToValueNow(pitch, time);

        } else if (this.Sources[id].player) {
            // Samplers
            this.Sources[id].player.playbackRate.exponentialRampToValueNow(pitch / App.Config.BaseNote, time);

        } else if (this.Sources[0].playbackRate instanceof Tone.Signal) {
            // Players
            this.Sources[id].playbackRate.exponentialRampToValueNow(pitch / App.Config.BaseNote, time);
        }
    }

    /**
     * Get the current pitch from a specific source in Sources[]
     * @param {number} id
     * @returns {number} pitch
     */
    GetPitch(id: number = 0) {
        if (this.Sources[id].frequency) {
            // Oscillators
            return this.Sources[id].frequency.value;

        } else if (this.Sources[id].player) {
            // Samplers
            return this.Sources[id].player.playbackRate.value * App.Config.BaseNote;

        } else if (this.Sources[0].playbackRate instanceof Tone.Signal) {
            // Players
            return this.Sources[id].playbackRate.value * App.Config.BaseNote;

        } else {
            return 0;
        }
    }

    /**
     * Reset a sources pitch back to its Params setting
     */
    ResetPitch() {
        if (App.Config.ResetPitchesOnInteractionDisconnect) {
            if (typeof this.Params.baseFrequency === 'number') {
                //Oscillators
                this.SetPitch(App.Config.BaseNote * App.Audio.Tone.intervalToFrequencyRatio(this.Params.baseFrequency));
            } else if (this.Sources[0].player) {
                // Samplers
                this.Sources[0].player.playbackRate.value = this.Params.playbackRate;
            } else if (this.Sources[0].playbackRate instanceof Tone.Signal) {
                // Noise
                this.Sources[0].playbackRate.value = this.Params.playbackRate;
            }
        }
    }


    /**
     * Shifts a notes pitch up or down a number of octaves
     * @example -2 would shift the note down by 2 octaves.
     * @param {number} octaves
     * @return this
     */
    OctaveShift(octaves: number) {
        if (octaves) {
            this.Sources.forEach((s: Tone.Source, i)=> {
                const oldPitch = this.GetPitch(i);
                const multiplier = Math.pow(2, Math.abs(octaves));

                if (octaves > 0) {
                    this.SetPitch(oldPitch * multiplier, i);
                } else {
                    this.SetPitch(oldPitch / multiplier, i);
                }
            });
        }
        return this;
    }



    GetWaveformFromBuffer(buffer,points,stepsPerPoint,normal) {

        console.log(buffer);
        console.log("minutes: "+ (buffer.duration/60));

        // defaults //
        stepsPerPoint = 10; // checks per division
        var leftOnly = false; // don't perform channel merge


        //TODO if too slow consider making asynchronous

        /*if (buffer.duration>240) { // 4 minutes
            stepsPerPoint = 6;
            //leftOnly = true;
            if (points > 180) {
                points = 180;
            }
            console.log("detail nerfed");
        }*/

        var newWaveform = [];
        var peak = 0.0;

        // MERGE LEFT & RIGHT CHANNELS //
        var left = buffer.getChannelData(0);
        if (buffer.numberOfChannels>1 && !leftOnly) {
            var right = buffer.getChannelData(1);
        }

        var slice = Math.ceil( left.length / points );
        var step = Math.ceil( slice / stepsPerPoint );

        // FOR EACH DETAIL POINT //
        for(var i=0; i<points; i++) {

            // AVERAGE PEAK BETWEEN POINTS //
            var max1 = 0.0;
            var max2 = 0.0;
            for (var j = 0; j < slice; j += step) {
                var datum = left[(i * slice) + j];
                if (datum < 0) { datum = -datum;}
                if (datum > max1) {max1 = datum;}
                if (right) {
                    var datum2 = right[(i * slice) + j];
                    if (datum2 < 0) { datum2 = -datum2;}
                    if (datum2 > max2) {max2 = datum2;}
                    if (max2 > max1) {max1 = max2;}
                }

            }
            if (max1 > peak) {peak = max1;} // set overall peak used for normalising
            newWaveform.push(max1);
        }

        // SOFT NORMALISE //
        var percent = normal/100; // normalisation strength
        var mult = (((1/peak) - 1)*percent) + 1;
        for (var i=0; i<newWaveform.length; i++) {
            newWaveform[i] = newWaveform[i] * mult;
        }

        return newWaveform;
    }


    MouseDown() {
        super.MouseDown();
        this.TriggerAttack();

    }

    MouseUp() {
        super.MouseUp();
        this.TriggerRelease('all');
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        switch (param){
            case "detune":
                this.Sources.forEach((s: any)=> {
                    s.detune.value = value;
                });
                break;
            case "waveform":
                this.Sources.forEach((s: any)=> {
                    s.type = this.WaveIndex[value];
                });
                break;
            case "volume":
                this.Sources.forEach((s: any)=> {
                    s.volume.value = value;
                });
                break;
        }
    }

    /*UpdateParams(params: any) {
        super.UpdateParams(params);
    }*/

    Draw(){
        super.Draw();
    }

}

export = Source;

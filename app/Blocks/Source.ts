import IEffect = require("./IEffect");
import ISource = require("./ISource");
import Block = require("./Block");
import Grid = require("../Grid");
import BlocksSketch = require("../BlocksSketch");
import Particle = require("../Particle");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import Soundcloud = require("./Sources/Soundcloud");
import Power = require("./Power/Power");
import PowerSource = require("./Power/PowerSource");
import Logic = require("./Power/Logic/Logic");
import Voice = require("./Interaction/VoiceObject");
import SoundcloudTrack = require("../UI/SoundcloudTrack");

class Source extends Block implements ISource {

    public Effects: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();
    public OldEffects: ObservableCollection<IEffect>;

    public Sources: any[];
    public Envelopes: Tone.AmplitudeEnvelope[];
    public EffectsChainInput: Tone.Signal;
    public EffectsChainOutput: Tone.Signal;
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
    public SearchResults: SoundcloudTrack[];
    public Searching: boolean;
    public ResultsPage: number;
    public SearchString: string;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
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

        this.Effects.CollectionChanged.on(this._OnEffectsChanged, this);

        if (!(this instanceof Power)) {

            this.EffectsChainInput = new Tone.Signal();
            this.EffectsChainOutput = new Tone.Signal();

            this.EffectsChainOutput.output.gain.value = this.Settings.output.volume;

            this.EffectsChainInput.connect(this.EffectsChainOutput);
            this.EffectsChainOutput.connect(App.Audio.Master);

        }

        this.UpdateOptionsForm();
    }


    /**
     * Add effect to this Source's list of effects
     * @param effect
     */
    AddEffect(effect: IEffect) {
        this.Effects.Add(effect);
    }

    /**
     * Remove effect from this Source's list of effects
     * @param effect
     */
    RemoveEffect(effect: IEffect) {
        this.Effects.Remove(effect);
    }

    /**
    * Validate that the block's effects still exist
    */
    public ValidateEffects() {
        for (let i = 0; i < this.Effects.Count; i++){
            let effect:IEffect = this.Effects.GetValueAt(i);

            if (!App.Effects.contains(effect)){
                this.RemoveEffect(effect);
            }
        }
    }

    private _OnEffectsChanged() {
        this.Refresh();
    }

    public Refresh() {
        super.Refresh();

        // Detach effects in old collection.
        if (this.OldEffects && this.OldEffects.Count){
            const oldEffects: IEffect[] = this.OldEffects.ToArray();

            for (let k = 0; k < oldEffects.length; k++) {
                this._DetachEffect(oldEffects[k]);
            }
        }

        // List of connected effect blocks
        const effects: IEffect[] = this.Effects.ToArray();

        // List of PostEffect blocks
        const postEffects: IEffect[] = [];

        // For each connected effect
        for (let i = 0; i < effects.length; i++) {

            // Run Attach method for all effect blocks that need it
            this._AttachEffect(effects[i]);

            // If this is a post effect add to postEffect list
            if (effects[i].Effect) {
                postEffects.push(effects[i]);
            }
        }

        // Reorder the post effects chain
        this.UpdateEffectsChain(postEffects);

        // Update list of Old Effects
        this.OldEffects = new ObservableCollection<IEffect>();
        this.OldEffects.AddRange(this.Effects.ToArray());
    }

    /**
     * Runs attach method for all effect blocks that need a bespoke way of connecting (usually pre-effect blocks)
     * @param effect
     * @private
     */
    private _AttachEffect(effect: IEffect ) {
        effect.Attach(<ISource>this);
    }

    /**
     * Runs detach method for all effect blocks that need a bespoke way of disconnecting (usually pre-effect blocks)
     * @param effect
     * @private
     */
    private _DetachEffect(effect: IEffect) {
        effect.Detach(<ISource>this);
    }

    /**
     * Connects all this Source's post-effect blocks in series
     * @param effects
     * @public
     */
    public UpdateEffectsChain(effects) {

        const start = this.EffectsChainInput;
        const end = this.EffectsChainOutput;

        if (effects.length) {

            start.disconnect();

            start.connect(effects[0].Effect);
            let currentUnit = effects[0].Effect;

            for (let i = 1; i < effects.length; i++) {
                const toUnit = effects[i].Effect;
                currentUnit.disconnect();
                currentUnit.connect(toUnit);
                currentUnit = toUnit;
            }
            effects[effects.length - 1].Effect.disconnect();
            effects[effects.length - 1].Effect.connect(end);
            end.toMaster();
        } else {
            start.disconnect();
            start.connect(end);
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
     * @param index number|string position of the Envelope in Envelopes[].
     * If index is set to 'all', all envelopes will be released
     */
    TriggerRelease(index: number|string = 0) {

        //console.log("ID: "+this.Id);


        // Only if it's not powered
        if (!this.IsPowered()) {

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
    IsPowered() {
        if (this.IsPressed || this.PowerConnections>0) {
            return true;

        } else if (this.Effects.Count) {
            for (let i = 0; i < this.Effects.Count; i++) {
                const effect: IEffect = this.Effects.GetValueAt(i);

                //If connected to power block OR connected to a logic block that is 'on'
                if (effect instanceof Power || effect instanceof Logic && effect.Params.logic){
                    return true;
                }
            }
        }
        else {
            return false;
        }
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
        if (this.EffectsChainInput) this.EffectsChainInput.dispose();
        if (this.EffectsChainOutput) this.EffectsChainOutput.dispose();


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
            this.Sources[id].player.playbackRate = pitch / App.Config.BaseNote;

        } else if (typeof this.Sources[id].playbackRate === 'number') {
            // Players
            this.Sources[id].playbackRate = pitch / App.Config.BaseNote;
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
            return this.Sources[id].player.playbackRate * App.Config.BaseNote;

        } else if (typeof this.Sources[id].playbackRate === 'number') {
            // Players
            return this.Sources[id].playbackRate * App.Config.BaseNote;

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
                this.Sources[0].player.playbackRate = this.Params.playbackRate;
            } else if (typeof this.Sources[0].playbackRate === 'number') {
                // Noise
                this.Sources[0].playbackRate = this.Params.playbackRate;
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
        this.TriggerRelease();
    }

    GetParam(param: string) {

        var val;
        switch (param){
            case "frequency":
                this.Sources.forEach((s: any)=> {
                    val = s.frequency.value;
                });
                break;
            case "detune":
                this.Sources.forEach((s: any)=> {
                    val = s.detune.value;
                });
                break;
            case "waveform":
                this.Sources.forEach((s: any)=> {
                    val = s.type;
                });
                break;
            case "volume":
                this.Sources.forEach((s: any)=> {
                    val = s.gain.value;
                });
                break;
            case "playbackRate":
                this.Sources.forEach((s: any)=> {
                    val = s.playbackRate;
                });
                break;
        }
        return val;

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

    UpdateParams(params: any) {
        super.UpdateParams(params);
    }

    Draw(){
        super.Draw();
    }

}

export = Source;

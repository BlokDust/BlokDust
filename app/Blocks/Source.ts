import IEffect = require("./IEffect");
import ISource = require("./ISource");
import Block = require("./Block");
import Grid = require("../Grid");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import Soundcloud = require("./Sources/Soundcloud");
import Power = require("./Power/Power");
import Voice = require("./Interaction/VoiceObject");

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


    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Sources = [];
        this.Envelopes = [];
        this.ActiveVoices = [];
        this.FreeVoices = [];

        this.Effects.CollectionChanged.on(this._OnEffectsChanged, this);

        if (!(this instanceof Power)) {

            this.EffectsChainInput = new Tone.Signal();
            this.EffectsChainOutput = new Tone.Signal();

            this.EffectsChainOutput.output.gain.value = this.Settings.output.volume;

            this.EffectsChainInput.connect(this.EffectsChainOutput);
            this.EffectsChainOutput.connect(App.AudioMixer.Master);

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
    public ValidateEffects(){
        for (var i = 0; i < this.Effects.Count; i++){
            var effect:IEffect = this.Effects.GetValueAt(i);

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
            var oldEffects: IEffect[] = this.OldEffects.ToArray();

            for (var k = 0; k < oldEffects.length; k++) {
                this._DetachEffect(oldEffects[k]);
            }
        }

        // List of connected effect blocks
        var effects: IEffect[] = this.Effects.ToArray();

        // List of PostEffect blocks
        var postEffects: IEffect[] = [];

        // For each connected effect
        for (var i = 0; i < effects.length; i++) {

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

        var start = this.EffectsChainInput;
        var end = this.EffectsChainOutput;

        if (effects.length) {

            start.disconnect();

            start.connect(effects[0].Effect);
            var currentUnit = effects[0].Effect;

            for (var i = 1; i < effects.length; i++) {
                var toUnit = effects[i].Effect;
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


    CreateSource(){}

    CreateEnvelope(){}

    Stop() {
        this.TriggerRelease();
    }

    /**
     * Trigger a sources attack
     * If no index is set trigger the first in the array
     * @param index number|string position of the Envelope in Envelopes[]. If index is set to 'all', all envelopes will be triggered
     * @constructor
     */
    TriggerAttack(index?: number|string){
        if (this.IsDisposed) return;

        // Only if the source has envelopes
        if (this.Envelopes.length) {

            // is the index set?
            var i: any = index? index: 0;

            if (i === 'all'){
                // Trigger all the envelopes
                this.Envelopes.forEach((e: any)=> {
                    e.triggerAttack();
                });
            } else {
                // Trigger the specific one
                this.Envelopes[i].triggerAttack();
            }
        }
    }

    /**
     * Trigger a sources release
     * If no index is set release the first in the array
     * @param index number|string position of the Envelope in Envelopes[]. If index is set to 'all', all envelopes will be released
     * @constructor
     */
    TriggerRelease(index?: number|string){
        //if (this.IsDisposed) return;

        // Only if the source has envelopes AND if it's not powered
        if (this.Envelopes.length && !this.IsPowered()) {

            // is the index set?
            var i: any = index? index: 0;

            if (i === 'all'){
                // Trigger all the envelopes
                this.Envelopes.forEach((e: any)=> {
                    e.triggerRelease();
                });
            } else {
                // Trigger the specific one
                this.Envelopes[i].triggerRelease();
            }
        }
    }

    TriggerAttackRelease(){
        if (this.IsDisposed) return;
        if (this.Envelopes.length){
            this.Envelopes.forEach((e: any, i:number)=> {
                e.triggerAttackRelease("4n", "+0");
            });
        }
    }

    /**
     * Checks whether the block is connected to a Power Block
     * @returns {boolean}
     * @constructor
     */
    IsPowered() {
        //FOR POWER
        if (this.Effects.Count) {
            for (var i = 0; i < this.Effects.Count; i++) {
                var effect = this.Effects.GetValueAt(i);
                if (effect.Name == 'Power'){
                    return true;
                }
            }
        }

        return false;
    }



    /**
     * Disposes the audio nodes
     * @constructor
     */
    Dispose() {
        super.Dispose();

        if (this.IsDisposed) return;

        // Delete Signal nodes
        if (this.EffectsChainInput) this.EffectsChainInput.dispose();
        if (this.EffectsChainOutput) this.EffectsChainOutput.dispose();

        this.ActiveVoices = [];
        this.FreeVoices = [];
    }

    /**
     * Sets a sources pitch regardless of whether it's a oscillator or a audio player
     * @param pitch: number
     * @param sourceId: number - The index of the source in Sources[] (default: 0)
     * @param rampTime: Tone.Time (default: 0)
     *  TODO: when playback rate becomes a signal, change to something like this: ...playbackRate.rampTo(playbackRate, time);
     */
    SetPitch(pitch: number, sourceId?: number, rampTime?: Tone.Time) {
        // If no sourceId or rampTime is given default to 0
        var id: number = sourceId ? sourceId : 0;
        var time: Tone.Time = rampTime ? rampTime : 0;

        if (this.Sources[id].frequency) {
            // Oscillators
            this.Sources[id].frequency.exponentialRampToValueNow(pitch, time);

        } else if (this.Sources[id].player) {
            // Samplers
            pitch /= 440;
            this.Sources[id].player.playbackRate = pitch;

        } else if (this.Sources[id].playbackRate) {
            // Players
            pitch /= 440;
            this.Sources[id].playbackRate = pitch;
        }
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
            case "frequency":
                this.Sources.forEach((s: any)=> {
                    s.frequency.exponentialRampToValueNow(value, 0);
                });
                break;
            case "detune":
                this.Sources.forEach((s: any)=> {
                    s.detune.value = value;
                });
                break;
            case "waveform":
                this.Sources.forEach((s: any)=> {
                    s.type = value;
                });
                break;
            case "volume":
                this.Sources.forEach((s: any)=> {
                    s.gain.value = value;
                });
                break;
            case "playbackRate":
                this.Sources.forEach((s: any)=> {
                    s.playbackRate = value;
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

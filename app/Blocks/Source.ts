import {Block} from './Block';
import {IApp} from '../IApp';
import {IAudioChain} from '../Core/Audio/Connections/IAudioChain';
import {IBlock} from './IBlock';
import {IEffect} from './IEffect';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from './ISource';
import {Logic} from './Power/Logic/Logic';
import {MainScene} from '../MainScene';
import ObservableCollection = etch.collections.ObservableCollection;
import {Particle} from '../Particle';
import Point = etch.primitives.Point;
import {PowerSource} from './Power/PowerSource';
import {Power} from './Power/Power';
import {SoundCloudTrack} from '../Core/Audio/SoundCloud/SoundcloudTrack';
import {Soundcloud} from './Sources/Soundcloud';
import {VoiceCreator as Voice} from './Interaction/VoiceObject';
import {Controller} from './Interaction/Controller';

declare var App: IApp;

export class Source extends Block implements ISource {

    //-------------------------------------------------------------------------------------------
    //  INIT
    //-------------------------------------------------------------------------------------------


    public Connections: ObservableCollection<IEffect> = new ObservableCollection<IEffect>();
    public Sources: any[];
    public Grains: any[];
    public Envelopes: Tone.AmplitudeEnvelope[];
    public AudioInput: Tone.Mono;
    public Settings: ToneSettings = {
        envelope: {
            attack: 0.01,
            decay: 0.5,
            sustain: 0.5,
            release: 0.01
        },
        output: {
            volume: 0.5
        }
    };

    public ActiveVoices: Voice[];
    public FreeVoices: Voice[];
    public MonoVoice: Voice;
    public ParticlePowered: boolean;
    public LaserPowered: boolean;
    public UpdateCollision: boolean;
    public Collisions: any[];
    public CheckRange: number;
    public SearchResults: SoundCloudTrack[];
    public Searching: boolean;
    public ResultsPage: number;
    public SearchString: string;
    public PowerAmount: number = 0;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this.Sources = [];
        this.Envelopes = [];
        this.ActiveVoices = [];
        this.FreeVoices = [];

        this.ParticlePowered = false;
        this.LaserPowered = false;

        if (!(this instanceof Power)) { //TODO: Power is an Effect, did we mean this? Looks like non-sound sources are creating AudioInputs. Try the IsASoundSource() check.
            this.AudioInput = new Tone.Mono();
            this.AudioInput.connect(App.Audio.Master);
        }

        this.UpdateOptionsForm();
    }


    //-------------------------------------------------------------------------------------------
    //  CONNECTIONS
    //-------------------------------------------------------------------------------------------


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

    UpdateConnections(chain: IAudioChain) {
        super.UpdateConnections(chain);

        // Reset Envelopes back to original setting
        this._EnvelopeReset();

        // Release any disconnected voices
        this.DeactivateDisconnectedVoices();
    }

    private _EnvelopeReset() {
        if (this.Envelopes.length) {
            this.Envelopes.forEach((e: Tone.AmplitudeEnvelope) => {
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


    //-------------------------------------------------------------------------------------------
    //  INSTANCE CHECK
    //-------------------------------------------------------------------------------------------

    // RETURNS TRUE IF ENVELOPES ARE FOUND //
    IsASoundSource() {
        return (this.Envelopes.length || this.Sources.length );
    }

    // RETURNS TRUE IF BLOKCKNAME MATCHES NAME //
    // where name is a reference to App.L10n
    IsMyName(name:string) {
        return (name === this.BlockName);
    }


    //-------------------------------------------------------------------------------------------
    //  TRIGGER ENVELOPES / SAMPLERS
    //-------------------------------------------------------------------------------------------

    Stop() {
        //this.TriggerRelease('all', true);
        this.DeactivateAllVoices();
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
                    e.triggerAttack();
                });
            } else {
                // Trigger the specific one
                this.Envelopes[index].triggerAttack();
            }

        // Or Samplers have built in envelopes
        } else if (this.Sources[0] && this.Sources[0].envelope) {
            if (index === 'all'){
                // Trigger all the envelopes
                this.Sources.forEach((s: any)=> {
                    s.triggerAttack();
                });
            } else {
                // Trigger the specific one
                this.Sources[index].triggerAttack();
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
    TriggerRelease(index: number|string = 0, forceRelease: boolean = false) {

        // SAMPLERS HAVE THEIR OWN TRIGGERRELEASE
        

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
        //}
    }

    
    TriggerAttackRelease(duration: number = App.Config.PulseLength, time: Tone.Time = '+0.01', velocity?: number) {

        // Oscillators & Noises & Players
        if (this.Envelopes.length){
            //TODO: add velocity to all trigger methods
            //TODO: add samplers and players
            this.Envelopes[0].triggerAttackRelease(duration);

        //    Samplers
        } else if (this.Sources[0] && this.Sources[0].envelope) {
            // Trigger all the envelopes
            this.Sources[0].triggerAttackRelease(false, duration, time); // the false is "sample name" parameter

        //    Power Source Blocks
        } else if (this.PowerAmount!==undefined) {
            //this.PowerConnections += 1;
            this.AddPower();
            if (this.UpdateCollision!==undefined) {
                this.UpdateCollision = true;
            }
            var block = this;
            var seconds = App.Audio.Tone.toSeconds(duration) * 1000;
            setTimeout( function() {
                //block.PowerConnections -= 1;
                block.RemovePower();
                if (block.UpdateCollision!==undefined) {
                    block.UpdateCollision = true;
                }
            },seconds);

        }
    }


    //-------------------------------------------------------------------------------------------
    //  MESSAGES
    //-------------------------------------------------------------------------------------------

    // ON //
    NoteOn(controller: string, note?:number, polyphonic?: boolean, glide?:number, velocity?:number) {
        note = note || App.Config.DefaultNote;
        polyphonic = polyphonic || false;
        glide = glide || 0;
        velocity = velocity || 0;

        // What voice are we using //
        var voiceData = this.GetVoice(note, controller, polyphonic);

        // Should it glide //
        if (voiceData.trigger || this.ActiveVoices.length > 1) {
            glide = 0;
        }

        // Set the voice pitch //
        this.SetPitch(note,voiceData.ID,glide);

        // Trigger the voice envelope //
        if (voiceData.trigger) {
            this.TriggerAttack(voiceData.ID);
        }

    }


    // OFF //
    NoteOff(controller: string, note?:number) {
        note = note || App.Config.DefaultNote;

        // What voice are we using //
        var voiceData = this.RemoveVoice(note, controller);

        // Release the voice envelope //
        if (voiceData.trigger) {
            this.TriggerRelease(voiceData.ID);
        }
    }


    // UPDATE //
    NoteUpdate() {
        this.ActiveVoices.forEach((voice) => {
            // Set the voice pitch //
            this.SetPitch(voice.Note,voice.ID);
        });
    }

    //-------------------------------------------------------------------------------------------
    //  VOICES
    //-------------------------------------------------------------------------------------------

    // GET A VOICE FOR NOTE ON //
    GetVoice(note: number, controller: string, polyphonic: boolean) {
        var voice: Voice;
        var trigger: boolean = true;
        var id: number = -1;

        // MONOPHONIC //
        if (!polyphonic) {

            // Grab a fresh mono voice //
            if (!this.MonoVoice) {
                if (this.FreeVoices.length > 0){
                    voice = this.FreeVoices.shift();
                }
                else {
                    voice = this.ActiveVoices.shift();
                    trigger = false;
                }
                this.MonoVoice = voice;
            }
            // We already have a mono voice in use, update that //
            else {
                voice = this.MonoVoice;
                trigger = false;
            }
        }

        // POLYPHONIC //
        else {
            if (this.FreeVoices.length > 0){
                voice = this.FreeVoices.shift();
            }
            else {
                voice = this.ActiveVoices.shift();
                trigger = false;
            }
        }

        // Set/update Voice data and add to ActiveVoices //
        if (voice) {
            voice.Note = note;
            voice.Controller = controller;
            id = voice.ID;
            if (this.ActiveVoices.indexOf(voice)==-1) {
                this.ActiveVoices.push( voice );
            }
        }

        // Give voice data to NoteOn() //
        return {
            ID: id,
            trigger: trigger
        };
    }


    // GET THE VOICE FOR NOTE OFF //
    RemoveVoice(note: number, controller: string) {
        var voice: Voice;
        var trigger: boolean = false;
        var id: number = -1;

        for (var i=0; i< this.ActiveVoices.length; i++) {
            var activeVoice = this.ActiveVoices[i];

            // if note is saved in the ActiveVoices & controlled by this controller, stop it //
            if (activeVoice.Note === note && activeVoice.Controller === controller) {
                voice = activeVoice;
                trigger = true;
                id = voice.ID;

                // if this was the mono voice, free it //
                if (voice === this.MonoVoice) {
                    if (this.IsPowered()) {
                        this.AssignMonoVoiceToPower();
                        trigger = false;
                        continue;
                    }
                    this.MonoVoice = null;
                }

                // Move from active to free //
                this.ActiveVoices.splice(i, 1);
                this.FreeVoices.push(activeVoice);
            }
        }

        // Give voice data to NoteOn() //
        return {
            ID: id,
            trigger: trigger
        };
    }


    // KILL ALL VOICES //  probably shouldn't use this, unless disposing block
    DeactivateAllVoices() {
        this.ActiveVoices.forEach((activeVoice: Voice, i: number) => {
            // Move from active to free //
            this.ActiveVoices.splice(i, 1);
            this.FreeVoices.push(activeVoice);
            this.TriggerRelease(i);
        });
    }


    // KILL DISCONNECTED VOICES //
    DeactivateDisconnectedVoices() {
        var controllers = ["power"];
        var voices = [];

        // Get connected controllers //
        let connections: IEffect[] = this.Connections.ToArray();
        connections.forEach((connection: IEffect) => {
            if (connection instanceof Controller) {
                controllers.push(""+connection.Id);
            }
        });

        // Get voices controlled by disconnected controllers, leave connected ones //
        this.ActiveVoices.forEach((activeVoice: Voice) => {
            var deactivate: boolean = true;
            for(var h=0; h<controllers.length; h++) {
                if (activeVoice.Controller === controllers[h]) {
                    deactivate = false;
                }
            }
            if (deactivate) {
                voices.push(activeVoice);
            }
        });

        // Deactivate these voices //
        for (var i=0; i<voices.length; i++) {

            if (voices[i] === this.MonoVoice) {
                // If this is the Mono voice and we're powered, transfer the voice to power and skip deactivation
                if (this.IsPowered()) {
                    this.AssignMonoVoiceToPower();
                    continue;
                }
                this.MonoVoice = null;
            }

            var n = this.ActiveVoices.indexOf(voices[i]);
            this.ActiveVoices.splice(n, 1);
            this.FreeVoices.push(voices[i]);
            this.TriggerRelease(voices[i].ID);
        }
    }

    AssignMonoVoiceToPower() {
        this.MonoVoice.Controller = "power";
        this.MonoVoice.Note = App.Config.DefaultNote;
        this.SetPitch(this.MonoVoice.Note,this.MonoVoice.ID);
    }


    // CREATE OUR FIRST VOICE FOR MONO / POWER //
    CreateFirstVoice() {
        if (!this.IsASoundSource()) return;
        if (this.FreeVoices.length < 1) {
            this.FreeVoices.push( new Voice(0) );
        }

        // this.CreateVoices();
    }


    // CREATE THE REST OF OUR VOICES FOR POLY //
    CreateVoices() { // MOVED HERE FROM INTERACTION //

        if (!this.IsASoundSource()) return;
        if (this.IsMyName(App.L10n.Blocks.Source.Blocks.Granular.name)) return;

        // Work out how many voices we actually need (we may already have some)
        let diff: number = App.Config.PolyphonicVoices - this.Sources.length;

        // If we haven't got enough sources, create however many we need.
        if (diff > 0){

            // Loop through and create the voices
            for (let i = 1; i <= App.Config.PolyphonicVoices; i++) {

                // Create a source
                let s: Tone.Source = this.CreateSource();

                let e: Tone.AmplitudeEnvelope;

                // Create an envelope and save it to `var e`
                e = this.CreateEnvelope();

                if (e) {
                    // Connect the source to the Envelope and start
                    s.connect(e);
                    s.start();

                    // Connect Envelope to the Effects Chain
                    e.connect(this.AudioInput);
                } else {
                    // No CreateEnvelope()
                    // Check if it's a Sampler Source (they have their own envelopes built in)
                    if (this.Sources[0] instanceof Tone.Simpler) {
                        e = this.Sources[i].envelope;
                        s.connect(this.AudioInput)
                    }
                }

                // Add the source and envelope to our FreeVoices list
                this.FreeVoices.push( new Voice(i) );
            }
        }
    }

    //-------------------------------------------------------------------------------------------
    //  PITCH
    //-------------------------------------------------------------------------------------------


    MidiToFrequency(note: number) {
        return App.Audio.Tone.midiToFrequency(note);
    }

    MidiToPlayback(note: number) {
        return App.Audio.Tone.intervalToFrequencyRatio(note - App.Config.DefaultNote);
    }

    // ADD UP SOURCE PITCH MODS //
    GetSourcePitchMods() {

        var sourceMods = 0;
        if (this.Params.transpose) {
            sourceMods += this.Params.transpose;
        }
        if (this.Params.fine) {
            sourceMods += this.Params.fine;
        }
        if (this.Params.playbackRate) {
            sourceMods += this.Params.playbackRate;
        }
        return sourceMods;
    }

    // ADD UP CONNECTED PITCH MODS //
    GetConnectedPitchMods() {
        var controllerMods = 0;
        let connections: IEffect[] = this.Connections.ToArray();
        connections.forEach((connection: IEffect) => {
            if (connection instanceof Controller) {
                controllerMods += connection.GetPitchMods();
            }
        });
        return controllerMods;
    }

    // SET A VOICE'S PITCH //
    SetPitch(note: number, voiceNo?: number, glide?: Tone.Time) {
        const voiceNumber: number = voiceNo ? voiceNo : 0;
        const time: Tone.Time = glide ? glide : 0;

        // CONVERT PITCH //
        var pitch = note + this.GetConnectedPitchMods() + this.GetSourcePitchMods();
        const frequency = this.MidiToFrequency(pitch);
        const playback = this.MidiToPlayback(pitch);

        // OSCILLATOR //
        if (this.Sources[voiceNumber].frequency) {
            this.Sources[voiceNumber].frequency.linearRampToValue(frequency, time);

        }

        // SAMPLER //
        else if (this.Sources[voiceNumber].player) {
            if ((<any>Tone).isSafari){
                this.Sources[voiceNumber].player.playbackRate = playback;
            } else {
                this.Sources[voiceNumber].player.playbackRate.linearRampToValue(playback, time);
            }
        }

        // PLAYER //
        else if (this.Sources[0].playbackRate instanceof Tone.Signal) {
            if ((<any>Tone).isSafari){
                this.Sources[voiceNumber].playbackRate = playback;
            } else {
                this.Sources[voiceNumber].playbackRate.linearRampToValue(playback, time);
            }
        }

        // GRANULAR //
        else if (this.Grains) {
            for (var i=0; i<this.Grains.length; i++) {
                if ((<any>Tone).isSafari) {
                    (<any>this.Grains[i]).playbackRate = playback;
                } else {
                    this.Grains[i].playbackRate.linearRampToValue(playback, time);
                }
            }
        }
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown() {
        super.MouseDown();
        this.AddPower();
    }

    MouseUp(point) {
        super.MouseUp(point);
        this.RemovePower();
    }


    //-------------------------------------------------------------------------------------------
    //  POWER
    //-------------------------------------------------------------------------------------------


    AddPower() {
        this.PowerAmount++;
        if (this.PowerAmount === 1) {
            if (!this.IsASoundSource()) return;
            this.NoteOn("power");
        }
    }

    RemovePower() {
        if (this.PowerAmount === 0) {
            return;
        }
        this.PowerAmount--;
        if (this.PowerAmount === 0) {
            if (!this.IsASoundSource()) return;
            this.NoteOff("power");
        }
    }

    /**
     * Checks whether the block is connected to a Power
     * @returns {boolean}
     */
    IsPowered(): boolean {
        if (this.PowerAmount>0) {
            return true;
        }
        return false;
    }

    /**
     * When a particle hits a source it triggers the attack and release
     * @param particle
     * @constructor
     */
    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);
        this.AddPower();
        var that = this;
        setTimeout(function(){
            that.RemovePower();
        }, App.Config.PulseLength);
        particle.Dispose();
    }


    //-------------------------------------------------------------------------------------------
    //  DISPOSE
    //-------------------------------------------------------------------------------------------


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
}
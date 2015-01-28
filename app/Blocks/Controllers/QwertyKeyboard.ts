import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import PitchComponent = require("../AudioEffectComponents/Pitch");
import QwertyKeyboard = require("../Controllers/QwertyKeyboard");
import App = require("../../App");
import PooledOscillator = require("../../PooledOscillator");

class Keyboard extends Effect implements IEffect {

    private _nodes = [];
    public BaseFrequency: number;
    public CurrentOctave: number;
    public KeysDown = {};
    public KeyMap: Object;

    public Settings = {
        isPolyphonic: false,
        glide: 0.05 // glide only works in monophonic mode
    };


    constructor() {
        super();

        this.KeyMap = App.InputManager.MasterKeyboardMap;

        this.KeyboardDown = this.KeyboardDown.bind(this);
        this.KeyboardUp = this.KeyboardUp.bind(this);

    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        if (this.Modifiable.Settings.oscillator){
            this.BaseFrequency = this.Modifiable.Settings.oscillator.frequency;
            this.CurrentOctave = this.GetStartOctave();
            this.CurrentOctave--;
        }

        this.KeysDown = {};
        this.AddListeners();
    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);
        this.RemoveListeners();

        if (this.Modifiable.Source.frequency) {
            this.Modifiable.Source.frequency.exponentialRampToValueNow(this.Modifiable.Settings.oscillator.frequency, 0.05);
        }
    }

    AddListeners(): void {
        App.InputManager.AddKeyboardListener(this.KeyboardDown, this.KeyboardUp, this);
    }

    RemoveListeners(): void {
        App.InputManager.RemoveKeyboardListener(this.KeyboardDown, this.KeyboardUp, this);
    }

    GetStartOctave(): number {
        var octave,
            note = this.Modifiable.Source.frequencyToNote(this.BaseFrequency);

        if (note.length === 3) {
            octave = parseInt(note.charAt(2));
        } else {
            octave = parseInt(note.charAt(1));
        }

        return octave;
    }

    KeyboardDown(key): void {

        //Check if this key pressed is in out key_map
        if (typeof this.KeyMap[key.keyCode] !== 'undefined') {

            //if it's already pressed (holding note)
            if (key.keyCode in this.KeysDown) {
                return;
            }
            //pressed first time, add to object
            this.KeysDown[key.keyCode] = true;

            if (this.KeyMap[key.keyCode] == 'OctaveUp' && this.CurrentOctave < 9) {
                this.CurrentOctave++;
                return;
            }

            if (this.KeyMap[key.keyCode] === 'OctaveDown' && this.CurrentOctave != 0) {
                this.CurrentOctave--;
                return;
            }

            var keyPressed = this.GetKeyNoteOctaveString(key.keyCode);
            var frequency = this.GetFrequencyOfNote(keyPressed);

            if (this.Settings.isPolyphonic){
                // POLYPHONIC

                //TODO: Allow Object Pooling to construct Oscillators and Envelopes

                var PooledOscillator: PooledOscillator = App.OscillatorsPool.GetObject();

                PooledOscillator.Oscillator.setFrequency(frequency);
                PooledOscillator.Oscillator.setType(this.Modifiable.Settings.oscillator.waveform);

                PooledOscillator.Envelope.set({
                    attack: this.Modifiable.Settings.envelope.attack,
                    decay: this.Modifiable.Settings.envelope.decay,
                    sustain: this.Modifiable.Settings.envelope.sustain,
                    release: this.Modifiable.Settings.envelope.release
                });

                PooledOscillator.Oscillator.connect(this.Modifiable.OutputGain);

                PooledOscillator.Oscillator.start();
                PooledOscillator.Envelope.triggerAttack();

                this._nodes.push(PooledOscillator);

                //TODO: make all modifiers work in polyphonic mode

            } else {
                // MONOPHONIC
                // If no other keys already pressed trigger attack
                if (Object.keys(this.KeysDown).length === 1) {
                    if (this.Modifiable.Source.frequency){
                        this.Modifiable.Source.frequency.exponentialRampToValueNow(frequency, 0); //TODO: Check this setValue not working as it should
                    }
                    this.Modifiable.Envelope.triggerAttack();

                    // Else ramp to new frequency over time (portamento)
                } else {
                    if (this.Modifiable.Source.frequency) {
                        this.Modifiable.Source.frequency.exponentialRampToValueNow(frequency, this.Settings.glide);
                    }
                }
            }
        }

    }

    KeyboardUp(key): void {

        //Check if this key released is in out key_map
        if (typeof this.KeyMap[key.keyCode] !== 'undefined') {
            // remove this key from the keysDown object
            delete this.KeysDown[key.keyCode];

            var keyPressed = this.GetKeyNoteOctaveString(key.keyCode);
            var frequency = this.GetFrequencyOfNote(keyPressed);

            if (this.Settings.isPolyphonic) {
                // POLYPHONIC
                var new_nodes = [];

                // Loop through oscillator voices
                for (var i = 0; i < this._nodes.length; i++) {
                    var o = this._nodes[i];
                    // Check if voice frequency matches the keyPressed frequency
                    if (Math.round(o.Oscillator.frequency.getValue()) === Math.round(frequency)) {

                        o.Envelope.triggerRelease();
                        o.Reset();
                        o.ReturnToPool();

                    } else {
                        new_nodes.push(o);
                    }
                }

                this._nodes = new_nodes;

            } else {
                // MONOPHONIC
                if (Object.keys(this.KeysDown).length === 0) {
                    this.Modifiable.Envelope.triggerRelease();
                }
            }
        }
    }

    GetKeyNoteOctaveString(keyCode): string {
        // Replaces keycode with keynote & octave string
        return (this.KeyMap[keyCode]
            .replace('a', this.CurrentOctave)
            .replace('b', this.CurrentOctave + 1)
            .replace('c', this.CurrentOctave + 2)
            .replace('d', this.CurrentOctave + 3)
                .toString());
    }

    GetFrequencyOfNote(note): number {
        return this.Modifiable.Source.noteToFrequency(note) * this.GetConnectedPitchModifiers();
    }

    GetConnectedPitchModifiers() {

        var totalPitchIncrement = 1;

        for (var i = 0; i < this.Modifiable.Modifiers.Count; i++) {
            var mod = this.Modifiable.Modifiers.GetValueAt(i);

            for (var j = 0; j < mod.Effects.Count; j++) {
                var effect = mod.Effects.GetValueAt(j);

                //TODO: Use reflection when available
                if ((<PitchComponent>effect).PitchIncrement) {
                    var thisPitchIncrement = (<PitchComponent>effect).PitchIncrement;
                    totalPitchIncrement *= thisPitchIncrement;
                }
            }
        }

        return totalPitchIncrement;
    }

    Delete(){

    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "glide") {
            this.Settings.glide = value;
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;

        if (param == "glide") {
            val = this.Settings.glide;
        }
        return val;
    }
}

export = Keyboard;
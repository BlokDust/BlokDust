import IEffect = require("../IEffect");
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import PitchComponent = require("../AudioEffectComponents/Pitch");
import QwertyKeyboard = require("../Controllers/QwertyKeyboard");
import App = require("../../App");

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

        this.KeyMap = App.InputManager.KeyboardMap;

        this.KeyboardDown = this.KeyboardDown.bind(this);
        this.KeyboardUp = this.KeyboardUp.bind(this);

    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        if (this.Modifiable.Settings.oscillator){
            this.BaseFrequency = this.Modifiable.Settings.oscillator.frequency;
            this.CurrentOctave = this.GetStartOctave();
        }

        this.AddListeners();
    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);
        this.RemoveListeners();

        if (this.Modifiable.Source.frequency) {
            this.Modifiable.Source.frequency.exponentialRampToValueNow(this.Modifiable.Settings.oscillator.frequency, 0.05);
        }
    }

    //TODO: move event listeners to a controls class
    AddListeners(): void {

        //if (this.Modifiable.ConnectedKeyboards == 0) {
            App.InputManager.AddEventListener('keydown', this.KeyboardDown, this);
            App.InputManager.AddEventListener('keyup', this.KeyboardUp, this);
        //} else {
        //    console.log('keyboard already attached to this block');
        //}

        this.Modifiable.ConnectedKeyboards++;

    }

    RemoveListeners(): void {

        //if (this.Modifiable.ConnectedKeyboards > 0) {
            App.InputManager.RemoveEventListener('keydown', this.KeyboardDown);
            App.InputManager.RemoveEventListener('keyup', this.KeyboardUp);
        //}

        this.Modifiable.ConnectedKeyboards--;

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

            // Octave UP (Plus button)
            if (key.keyCode === 187 && this.CurrentOctave != 8) {
                this.CurrentOctave++;
                return;
            }

            // Octave DOWN (Minus button)
            if (key.keyCode === 189 && this.CurrentOctave != 0) {
                this.CurrentOctave--;
                return;
            }

            var keyPressed = this.GetKeyNoteOctaveString(key.keyCode);
            var frequency = this.GetFrequencyOfNote(keyPressed);

            if (this.Settings.isPolyphonic){
                // POLYPHONIC

                //TODO: make LFO's and scuzzes work in polyphonic mode

                // Create throwaway audio nodes for each keydown
                var _oscillator = new Tone.Oscillator(frequency, this.Modifiable.Settings.oscillator.waveform);
                var _envelope = new Tone.Envelope(this.Modifiable.Settings.envelope.attack, this.Modifiable.Settings.envelope.decay, this.Modifiable.Settings.envelope.sustain, this.Modifiable.Settings.envelope.release);

                // Connect them
                _envelope.connect(_oscillator.output.gain);
                _oscillator.connect(this.Modifiable.OutputGain);

                // Play sound
                _oscillator.start();
                _envelope.triggerAttack();

                // Add to _nodes array
                this._nodes.push(_oscillator);


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
                    // Check if voice frequency matches the keyPressed frequency
                    if (Math.round(this._nodes[i].frequency.getValue()) === Math.round(frequency)) {
                        this._nodes[i].stop(0);
                        this._nodes[i].dispose();

                        //TODO: trigger release and then stop & disconnect afterwards

                    } else {
                        new_nodes.push(this._nodes[i]);
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
            .replace('l', this.CurrentOctave)
            .replace('u', this.CurrentOctave + 1)
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
}

export = Keyboard;
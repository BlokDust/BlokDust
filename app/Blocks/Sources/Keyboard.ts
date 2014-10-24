/// <reference path="../../refs.ts" />
import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");


class KeyboardInput extends Modifiable {

    public Osc: Tone.Oscillator;
    public Envelope: Tone.Envelope;
    public OutputGain: Tone.Signal;
    public Params: ToneSettings;
    private _nodes = [];


    keysDown = {};
    key_map = {
        65: 'Cl',
        87: 'C#l',
        83: 'Dl',
        69: 'D#l',
        68: 'El',
        70: 'Fl',
        84: 'F#l',
        71: 'Gl',
        89: 'G#l',
        90: 'G#l',
        72: 'Al',
        85: 'A#l',
        74: 'Bl',
        75: 'Cu',
        79: 'C#u',
        76: 'Du',
        80: 'D#u',
        59: 'Eu',
        186: 'Eu',
        222: 'Fu',
        221: 'F#u',
        220: 'Gu',
        187: 'OctaveUp',
        189: 'OctaveDown'
    };
    settings = {
        startOctave: null,
        startNote: 'C2'
    };



    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Params = {
            oscillator: {
                frequency: 440,
                waveform: 'square'
            },
            envelope: {
                attack: 0.02,
                decay: 0.5,
                sustain: 0.5,
                release: 0.02
            },
            output: {
                volume: 0.5
            },
            keyboard: {
                isPolyphonic: true,
                glide: 0.1
            }

        };

        // Define the audio nodes
        this.Osc = new Tone.Oscillator(this.Params.oscillator.frequency, this.Params.oscillator.waveform);
        this.Envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);
        this.OutputGain = new Tone.Signal;
        this.OutputGain.output.gain.value = this.Params.output.volume;

        // Connect them up
        this.Envelope.connect(this.Osc.output.gain);
        this.Osc.chain(this.Osc, this.OutputGain, App.AudioMixer.Master);

        // Start
        this.Osc.start();

        // Get the Start Octave from the start Note
        this.settings.startOctave = parseInt(this.settings.startNote.charAt(1), 10);

        this.AddListeners();

        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0),new Point(0, -2),new Point(2, 0),new Point(0, 2));
    }

    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);
    }

    //TODO: move event listeners to a controls class
    AddListeners(): void {

        window.addEventListener('keydown', (key) => {
            this.KeyboardDown(key);
        });
        window.addEventListener('keyup', (key) => {
            this.KeyboardUp(key);
        });
    }

    RemoveListeners(): void {

        window.removeEventListener('keydown', (key) => {
            this.KeyboardDown(key);
        });
        window.removeEventListener('keyup', (key) => {
            this.KeyboardUp(key);
        });

        //TODO: Fix remove listeners on disconnect
    }

    KeyboardDown(key): void {

        //if it's already pressed (holding note)
        if (key.keyCode in this.keysDown) {
            return;
        }
        //pressed first time, add to object
        this.keysDown[key.keyCode] = true; //TODO: push to array instead of object with true values

        // Octave UP (Plus button)
        if (key.keyCode === 187 && this.settings.startOctave != 8) {
            this.settings.startOctave++;
            return;
        }

        // Octave DOWN (Minus button)
        if (key.keyCode === 189 && this.settings.startOctave != 0) {
            this.settings.startOctave--;
            return;
        }

        //If this is key is in our key_map get the pressed key and pass to getFrequency
        if (typeof this.key_map[key.keyCode] !== 'undefined') {

            var keyPressed = this.GetKeyPressed(key.keyCode);
            var frequency = this.GetFrequencyOfNote(keyPressed);

            if (this.Params.keyboard.isPolyphonic){
                // POLYPHONIC

                //TODO: make LFO's and scuzzes work in polyphonic mode

                // Create throw away audio nodes for each keydown
                var _oscillator = new Tone.Oscillator(frequency, this.Params.oscillator.waveform);
                var _envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);

                // Connect them
                _envelope.connect(_oscillator.output.gain);
                _oscillator.connect(this.OutputGain);

                // Play sound
                _oscillator.start();
                _envelope.triggerAttack();

                // Add to _nodes array
                this._nodes.push(_oscillator);
                console.log(this._nodes);


            } else {
                // MONOPHONIC

                // If no other keys already pressed trigger attack
                if (Object.keys(this.keysDown).length === 1) {
//                this.Osc.frequency.setValue(frequency);
                    this.Osc.frequency.exponentialRampToValueNow(frequency, 0); //TODO: Check this setValue not working as it should
                    this.Envelope.triggerAttack();

                    // Else ramp to new frequency over time (using portamento)
                } else {
                    this.Osc.frequency.exponentialRampToValueNow(frequency, this.Params.keyboard.glide);
                }
            }
        }
    }

    KeyboardUp(key): void {
        // remove this key from the keysDown object
        delete this.keysDown[key.keyCode];
        var keyPressed = this.GetKeyPressed(key.keyCode);
        var frequency = this.GetFrequencyOfNote(keyPressed);

        if (this.Params.keyboard.isPolyphonic){
            // POLYPHONIC
            var new_nodes = [];

            // Loop through oscillator voices
            for (var i = 0; i < this._nodes.length; i++) {
                // Check if voice frequency matches the keyPressed frequency
                if (Math.round(this._nodes[i].frequency.getValue()) === Math.round(frequency)) {
                    this._nodes[i].stop(0);
                    this._nodes[i].disconnect();

                    //TODO: trigger release and then stop & disconnect afterwards

                } else {
                    new_nodes.push(this._nodes[i]);
                }
            }

            this._nodes = new_nodes;

        } else {
            // MONOPHONIC
            if (Object.keys(this.keysDown).length === 0) {
                this.Envelope.triggerRelease();
            }
        }
    }

    GetKeyPressed(keyCode): string {
        // Replaces keycode with keynote & octave string
        return (this.key_map[keyCode]
            .replace('l', parseInt(this.settings.startOctave, 10))
            .replace('u', (parseInt(this.settings.startOctave, 10) + 1)
                .toString()));
    }

    GetFrequencyOfNote(note): number {
        var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
            key_number,
            octave;

        if (note.length === 4) {
            octave = note.charAt(3) + 10;
        }

        if (note.length === 3) {
            //sharp note - octave is 3rd char
            octave = note.charAt(2);
        } else {
            //natural note - octave number is 2nd char
            octave = note.charAt(1);
        }

        this.GetConnectedPitchModifiers();

        // math to return frequency number from note & octave
        key_number = notes.indexOf(note.slice(0, -1));
        if (key_number < 3) {
            key_number = key_number + 12 + ((octave - 1) * 12) + 1;
        } else {
            key_number = key_number + ((octave - 1) * 12) + 1;
        }

        return 440 * Math.pow(2, (key_number - 49) / 12);
    }

    GetConnectedPitchModifiers() {
        //TODO: Get all pitch modifiers attached and..
        // return the modified frequency multiplier

        for (var i = 0; i < this.Modifiers.Count; i++) {
            var mod = this.Modifiers.GetValueAt(i);
            console.log(mod);

//            console.log(t)
//            if ((<any>mod).PitchIncrement) {
//                console.log((<any>mod).PitchIncrement); //TODO: This frequency * Pitch Increment
//            }

            // return pitchIncrement;
        }
    }

    // input blocks are red circles
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.fillStyle = "#1add8d";
        this.DrawMoveTo(-2,0);
        this.DrawLineTo(0,-2);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        ctx.closePath();
        ctx.fill();
    }

}

export = KeyboardInput;
/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");


class KeyboardInput extends Modifiable {

    public Osc: Tone.Oscillator;
    public Envelope: Tone.Envelope;
    public OutputGain: GainNode;
    public Params: ToneSettings;

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
        220: 'Gu'
    };
    settings = {
        startOctave: null,
        startNote: 'A5',
        keyPressOffset: null

        //TODO: Monophonic & polyphonic settings
    };


    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Params = {
            oscillator: {
                frequency: 340,
                waveform: 'sawtooth'
            },
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

        this.IsSticky = true;

        this.Osc = new Tone.Oscillator(this.Params.oscillator.frequency, this.Params.oscillator.waveform);
        this.Envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);
        this.OutputGain = this.Osc.context.createGain();
        this.OutputGain.gain.value = this.Params.output.volume;

        this.Envelope.connect(this.Osc.output.gain);
        this.Osc.chain(this.Osc, this.OutputGain, this.OutputGain.context.destination); //TODO: Should connect to a master audio gain output with compression (in BlockView?)
        this.Osc.start();

        //Get the Start Octave from the start Note
        this.settings.startOctave = parseInt(this.settings.startNote.charAt(1), 10);

        this.addListeners();
    }

    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);
    }



    KeyDown(frequency): void {
        console.log('Play '+frequency);
        this.Osc.frequency.setValue(frequency);
        //set keyboard-frequency + any frequency modifiers

        this.Envelope.triggerAttack();

        //TODO: if two keys pressed slide frequency
    }

    KeyUp(frequency): void {
        console.log('Stop '+frequency);

        this.Envelope.triggerRelease();
        //TODO: Fix release bug
    }

    addListeners(): void {

        window.addEventListener('keydown', (key) => {
            this.keyboardDown(key);
        });
        window.addEventListener('keyup', (key) => {
            this.keyboardUp(key);
        });
    }

    removeListeners(): void {

        window.removeEventListener('keydown', (key) => {
            this.keyboardDown(key);
        });
        window.removeEventListener('keyup', (key) => {
            this.keyboardUp(key);
        });

        //TODO: Fix remove listeners on disconnect
    }

    keyboardDown(key): void {
        console.log(key.keyCode);
        //if it's already pressed (holding note)
        if (key.keyCode in this.keysDown) {
            return;
        }
        //pressed first time, add to object
        this.keysDown[key.keyCode] = true;

        //If this is key is in our key_map get the pressed key and pass to getFrequency
        if (typeof this.key_map[key.keyCode] !== 'undefined') {
            var keyPressed = this.getKeyPressed(key.keyCode);
            var frequency = this.getFrequencyOfNote(keyPressed);
            this.KeyDown(frequency);
        }
    }

    keyboardUp(key): void {
        // remove this key from the keysDown object
        delete this.keysDown[key.keyCode];

        //If this is key is in our key_map get the pressed key and pass to getFrequency
        if (typeof this.key_map[key.keyCode] !== 'undefined') {
            var keyPressed = this.getKeyPressed(key.keyCode);
            var frequency = this.getFrequencyOfNote(keyPressed);
            this.KeyUp(frequency);
        }
    }

    getKeyPressed(keyCode): string {
        // Replaces keycode with keynote & octave string
        return (this.key_map[keyCode]
            .replace('l', parseInt(this.settings.startOctave, 10) + this.settings.keyPressOffset)
            .replace('u', (parseInt(this.settings.startOctave, 10) + this.settings.keyPressOffset + 1)
                .toString()));
    }

    getFrequencyOfNote(note): number {
        var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
            key_number,
            octave;

        if (note.length === 3) {
            //sharp note - octave is 3rd char
            octave = note.charAt(2);
        } else {
            //natural note - octave number is 2nd char
            octave = note.charAt(1);
        }

        // math to return frequency number from note & octave
        key_number = notes.indexOf(note.slice(0, -1));
        if (key_number < 3) {
            key_number = key_number + 12 + ((octave - 1) * 12) + 1;
        } else {
            key_number = key_number + ((octave - 1) * 12) + 1;
        }
        return 440 * Math.pow(2, (key_number - 49) / 12);
    }

    // input blocks are red circles
    Draw(ctx:CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.beginPath();
        ctx.arc(this.AbsPosition.X, this.AbsPosition.Y, this.Radius, 0, Math.TAU, false);
        ctx.fillStyle = this.IsPressed || this.IsSelected ? "#e1b1e1" : "#f1b0e0";
        ctx.fill();
    }

}

export = KeyboardInput;
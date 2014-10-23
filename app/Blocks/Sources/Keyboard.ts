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


    //TODO: Polyphonic option
    //TODO: Add Octave up & down button

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
        startNote: 'A2aa',
        keyPressOffset: null

        //TODO: Monophonic & polyphonic settings
    };

//        for (var i = 0; i < this.Modifiers.Count; i++){
//            var mod = this.Modifiers.GetValueAt(i);
//            if ((<any>mod).PitchIncrement){
//                console.log((<any>mod).PitchIncrement); //TODO: This frequency * Pitch Increment
//            }


    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);

        this.Params = {
            oscillator: {
                frequency: 340,
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
                isPolyphonic: false,
                glide: 0.1
            }

        };


        this.Osc = new Tone.Oscillator(this.Params.oscillator.frequency, this.Params.oscillator.waveform);
        this.Envelope = new Tone.Envelope(this.Params.envelope.attack, this.Params.envelope.decay, this.Params.envelope.sustain, this.Params.envelope.release);
        this.OutputGain = this.Osc.context.createGain();
        this.OutputGain.gain.value = this.Params.output.volume;

        this.Envelope.connect(this.Osc.output.gain);
        this.Osc.chain(this.Osc, this.OutputGain, this.OutputGain.context.destination); //TODO: Should connect to a master audio gain output with compression (in BlockView?)
        this.Osc.start();

        //Get the Start Octave from the start Note
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
        this.keysDown[key.keyCode] = true;

        //If this is key is in our key_map get the pressed key and pass to getFrequency
        if (typeof this.key_map[key.keyCode] !== 'undefined') {

            var keyPressed = this.GetKeyPressed(key.keyCode);
            var frequency = this.GetFrequencyOfNote(keyPressed);

            if (this.Params.keyboard.isPolyphonic){
                // POLYPHONIC
                    //TODO: polyphonic needs to create new oscillators for every keypressed

            } else {
                // MONOPHONIC

                // If no other keys already pressed trigger attack
                if (Object.keys(this.keysDown).length === 1) {
//                this.Osc.frequency.setValue(frequency);
                    this.Osc.frequency.exponentialRampToValueNow(frequency, 0); //TODO: Check this setValue not working as it should
                    this.Envelope.triggerAttack();

                    // Else ramp to new frequency over time (using portamento)
                } else {
                    this.Osc.frequency.exponentialRampToValueNow(frequency, this.Params.keyboard.glide); //GLIDE
                    //TODO: Glide the frequency
                }
            }
        }
    }

    KeyboardUp(key): void {
        // remove this key from the keysDown object
        delete this.keysDown[key.keyCode];

        if (this.Params.keyboard.isPolyphonic){
            // POLYPHONIC
            //TODO: polyphonic needs to stop corresponding oscillators for every keyup

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
            .replace('l', parseInt(this.settings.startOctave, 10) + this.settings.keyPressOffset)
            .replace('u', (parseInt(this.settings.startOctave, 10) + this.settings.keyPressOffset + 1)
                .toString()));
    }

    GetFrequencyOfNote(note): number {
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

    GetConnectedPitchModifiers() {
        //TODO: Get all pitch modifiers attached and..
        // return the modified frequency multiplier
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
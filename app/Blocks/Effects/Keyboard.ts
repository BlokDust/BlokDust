import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IModifiable = require("../IModifiable");
import Grid = require("../../Grid");
import App = require("../../App");
import PooledOscillator = require("../../PooledOscillator");
import KeyDownEventArgs = require("../../Core/Inputs/KeyDownEventArgs");
import PitchComponent = require("./Pitch");

class Keyboard extends Modifier {

    public Name: string = 'Keyboard';
    private _nodes = [];
    public BaseFrequency: number;
    public CurrentOctave: number;
    public KeysDown = {};
    public KeyMap: Object;

    public Settings = {
        isPolyphonic: false,
        glide: 0.05 // glide only works in monophonic mode
    };

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"keyboard");
    }

    Connect(modifiable:IModifiable): void{
        super.Connect(modifiable);

        if (this.Modifiable.Settings.oscillator){
            this.BaseFrequency = this.Modifiable.Settings.oscillator.frequency;
            this.CurrentOctave = this.GetStartOctave();
            this.CurrentOctave--;
        }

        this.KeysDown = {};

        App.KeyboardInput.KeyDownChange.on((e: Fayde.IEventBindingArgs<KeyDownEventArgs>) => {
            this.KeysDown = (<any>e).KeysDown;

            // for all modifiables
            for (var i = 0; i < this.Modifiable.Source.length; i++) {
                this.KeyboardDown((<any>e).KeyDown);
            }
            console.log(this);
        }, this);

        App.KeyboardInput.KeyUpChange.on((e: Fayde.IEventBindingArgs<KeyDownEventArgs>) => {
            this.KeysDown = (<any>e).KeysDown;

            this.KeyboardUp((<any>e).KeyUp);
        }, this);
        //this.AddListeners();
    }

    Disconnect(modifiable:IModifiable): void {
        super.Disconnect(modifiable);

        App.KeyboardInput.KeyDownChange.off((e: Fayde.IEventBindingArgs<KeyDownEventArgs>) => {
            //this.KeyboardDown((<any>e).KeyDown);
            //this.KeysDown = (<any>e).KeysDown;
        }, this);

        App.KeyboardInput.KeyUpChange.off((e: Fayde.IEventBindingArgs<KeyDownEventArgs>) => {
            //this.KeyboardUp((<any>e).KeyUp);
            //this.KeysDown = (<any>e).KeysDown;
        }, this);


        if (this.Modifiable.Source.frequency) {
            this.Modifiable.Source.frequency.setValue(this.Modifiable.Settings.oscillator.frequency);
        }
    }

    Delete(){
        // TODO: CALL DISCONNECT if not already disconnected
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "glide") {
            this.Settings.glide = value/100;
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;

        if (param == "glide") {
            val = this.Settings.glide*100;
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Keyboard",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Glide",
                    "setting" :"glide",
                    "props" : {
                        "value" : this.Component.GetValue("glide"),
                        "min" : 0.001,
                        "max" : 100,
                        "truemin" : 0,
                        "truemax" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                }
            ]
        };
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

        //console.log(App.KeyboardInput.KeysDown);

        //Check if this key pressed is in out key_map
        //if (typeof this.KeyMap[key.keyCode] !== 'undefined') {

        //if it's already pressed (holding note)
        //if (key.keyCode in this.KeysDown) {
        //    return;
        //}
        ////pressed first time, add to object
        //this.KeysDown[key.keyCode] = true;

        //if (this.KeyMap[key.keyCode] == 'OctaveUp' && this.CurrentOctave < 9) {
        //    this.CurrentOctave++;
        //    return;
        //}
        //
        //if (this.KeyMap[key.keyCode] === 'OctaveDown' && this.CurrentOctave != 0) {
        //    this.CurrentOctave--;
        //    return;
        //}

        //var keyPressed = this.GetKeyNoteOctaveString(key.keyCode);
        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed);

        //if (this.Settings.isPolyphonic){
        //    // POLYPHONIC
        //
        //    //TODO: Allow Object Pooling to construct Oscillators and Envelopes
        //
        //    var PooledOscillator: PooledOscillator = App.OscillatorsPool.GetObject();
        //
        //    PooledOscillator.Oscillator.setFrequency(frequency);
        //    PooledOscillator.Oscillator.setType(this.Modifiable.Settings.oscillator.waveform);
        //
        //    PooledOscillator.Envelope.set({
        //        attack: this.Modifiable.Settings.envelope.attack,
        //        decay: this.Modifiable.Settings.envelope.decay,
        //        sustain: this.Modifiable.Settings.envelope.sustain,
        //        release: this.Modifiable.Settings.envelope.release
        //    });
        //
        //    PooledOscillator.Oscillator.connect(this.Modifiable.OutputGain);
        //
        //    PooledOscillator.Oscillator.start();
        //    PooledOscillator.Envelope.triggerAttack();
        //
        //    this._nodes.push(PooledOscillator);
        //
        //    //TODO: make all modifiers work in polyphonic mode
        //
        //} else {
        // MONOPHONIC
        // If no other keys already pressed trigger attack
        if (Object.keys(this.KeysDown).length === 1) {
            if (this.Modifiable.Source.frequency){
                this.Modifiable.Source.frequency.exponentialRampToValueNow(frequency, 0);
            }
            this.Modifiable.Envelope.triggerAttack();

            // Else ramp to new frequency over time (portamento)
        } else {
            if (this.Modifiable.Source.frequency) {
                this.Modifiable.Source.frequency.exponentialRampToValueNow(frequency, this.Settings.glide);
            }
        }
        //}
        //}

    }

    KeyboardUp(key): void {

        ////Check if this key released is in out key_map
        //if (typeof this.KeyMap[key.keyCode] !== 'undefined') {
        //    // remove this key from the keysDown object
        //    delete this.KeysDown[key.keyCode];

        var keyPressed = this.GetKeyNoteOctaveString(key);
        var frequency = this.GetFrequencyOfNote(keyPressed);

        //if (this.Settings.isPolyphonic) {
        //    // POLYPHONIC
        //    var new_nodes = [];
        //
        //    // Loop through oscillator voices
        //    for (var i = 0; i < this._nodes.length; i++) {
        //        var o = this._nodes[i];
        //        // Check if voice frequency matches the keyPressed frequency
        //        if (Math.round(o.Oscillator.frequency.getValue()) === Math.round(frequency)) {
        //
        //            o.Envelope.triggerRelease();
        //            o.Reset();
        //            o.ReturnToPool();
        //
        //        } else {
        //            new_nodes.push(o);
        //        }
        //    }
        //
        //    this._nodes = new_nodes;
        //
        //} else {
        // MONOPHONIC
        if (Object.keys(this.KeysDown).length === 0) {
            this.Modifiable.Envelope.triggerRelease();
        }
        //}
        //}
    }

    GetKeyNoteOctaveString(keyCode): string {
        // Replaces keycode with keynote & octave string
        return (keyCode
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

            //TODO: Use reflection when available
            if ((<PitchComponent>mod).PitchIncrement) {
                var thisPitchIncrement = (<PitchComponent>mod).PitchIncrement;
                totalPitchIncrement *= thisPitchIncrement;
            }

        }

        return totalPitchIncrement;
    }

}

export = Keyboard;
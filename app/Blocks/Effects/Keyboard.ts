import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");
import PooledOscillator = require("../../PooledOscillator");
import KeyDownEventArgs = require("../../Core/Inputs/KeyDownEventArgs");
import PitchComponent = require("./Pitch");

class Keyboard extends Effect {

    public BaseFrequency: number;
    public CurrentOctave: number;
    public KeysDown: any;
    public KeyMap: any;
    public Settings: any;

    constructor(grid: Grid, position: Point){
        this.Settings = {
            isPolyphonic: false,
            glide: 0.05 // glide only works in monophonic mode
        };

        this.KeysDown = {};

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"keyboard");
    }

    Attach(source:ISource): void{
        super.Attach(source);

        this.KeysDown = {};

        App.KeyboardInput.KeyDownChange.on((e: Fayde.IEventBindingArgs<KeyDownEventArgs>) => {
            this.KeysDown = (<any>e).KeysDown;

            // FOR ALL SOURCES
            var sources: ISource[] = this.Sources.ToArray();
            for (var i = 0; i < sources.length; i++) {
                this._SetBaseFrequency(sources[i]);
                this.KeyboardDown((<any>e).KeyDown, sources[i]);
            }

        }, this);

        App.KeyboardInput.KeyUpChange.on((e: Fayde.IEventBindingArgs<KeyDownEventArgs>) => {
            this.KeysDown = (<any>e).KeysDown;

            // FOR ALL SOURCES
            var sources: ISource[] = this.Sources.ToArray();
            for (var i = 0; i < sources.length; i++) {
                this.KeyboardUp((<any>e).KeyDown, sources[i]);
            }

        }, this);
    }

    Detach(source:ISource): void {

        // FOR ALL SOURCES
        var sources: ISource[] = this.Sources.ToArray();
        for (var i = 0; i < sources.length; i++) {
            var source = sources[i];
            if (source.Source.frequency){
                source.Source.frequency.setValue(source.Frequency);
            }
        }

        super.Detach(source);

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
                        "value" : this.GetValue("glide"),
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

    KeyboardDown(key:string, source:ISource): void {

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
        var keyPressed = this._GetKeyNoteOctaveString(key);
        var frequency = this._GetFrequencyOfNote(keyPressed, source);

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
        //    //TODO: make all effects work in polyphonic mode
        //
        //} else {
        // MONOPHONIC
        // If no other keys already pressed trigger attack
        if (Object.keys(this.KeysDown).length === 1) {
            if (source.Source.frequency){
                source.Source.frequency.exponentialRampToValueNow(frequency, 0);
            }
            source.Envelope.triggerAttack();

            // Else ramp to new frequency over time (portamento)
        } else {
            if (source.Source.frequency) {
                source.Source.frequency.exponentialRampToValueNow(frequency, this.Settings.glide);
            }
        }
        //}
        //}

    }

    KeyboardUp(key:string, source:ISource): void {

        ////Check if this key released is in out key_map
        //if (typeof this.KeyMap[key.keyCode] !== 'undefined') {
        //    // remove this key from the keysDown object
        //    delete this.KeysDown[key.keyCode];

        var keyPressed = this._GetKeyNoteOctaveString(key);
        var frequency = this._GetFrequencyOfNote(keyPressed, source);

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
            source.Envelope.triggerRelease();
        }
        //}
        //}
    }


    private _SetBaseFrequency(source:ISource){
        if (source.Frequency){
            this.BaseFrequency = source.Frequency;
            this.CurrentOctave = this._GetStartOctave();
            this.CurrentOctave--;
        }
    }

    private _GetStartOctave(): number {
        var octave,
            note = this.Source.Source.frequencyToNote(this.BaseFrequency);

        if (note.length === 3) {
            octave = parseInt(note.charAt(2));
        } else {
            octave = parseInt(note.charAt(1));
        }

        return octave;
    }

    private _GetKeyNoteOctaveString(keyCode): string {
        // Replaces keycode with keynote & octave string
        return (keyCode
            .replace('a', this.CurrentOctave)
            .replace('b', this.CurrentOctave + 1)
            .replace('c', this.CurrentOctave + 2)
            .replace('d', this.CurrentOctave + 3)
            .toString());
    }

    private _GetFrequencyOfNote(note, source): number {
        return source.Source.noteToFrequency(note) * this._GetConnectedPitchPreEffects(source);
    }

    private _GetConnectedPitchPreEffects(source) {

        var totalPitchIncrement = 1;

        for (var i = 0; i < source.Effects.Count; i++) {
            var mod = source.Effects.GetValueAt(i);

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
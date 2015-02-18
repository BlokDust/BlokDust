import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");
import PooledOscillator = require("../../PooledOscillator");
import KeyDownEventArgs = require("../../Core/Inputs/KeyDownEventArgs");
import PitchComponent = require("./../Effects/Pitch");

/**
 * Base class for mono, poly and midi keyboards
 */
class Keyboard extends Effect {

    public BaseFrequency: number;
    public CurrentOctave: number;
    public KeysDown: any;
    public KeyMap: any;
    public Settings: any;

    constructor(grid: Grid, position: Point){

        this.KeysDown = {};

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();
        //this.Grid.BlockSprites.Draw(this.Position,true,"keyboard");
    }

    Attach(source:ISource): void{
        super.Attach(source);

        this.KeysDown = {};

        App.KeyboardInput.KeyDownChange.on((e: Fayde.IEventBindingArgs<KeyDownEventArgs>) => {
            this.KeysDown = (<any>e).KeysDown;

            // FOR ALL SOURCES
            var sources: ISource[] = this.Sources.ToArray();
            for (var i = 0; i < sources.length; i++) {
                this.SetBaseFrequency(sources[i]);
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

            if (this.IsPressed){
                source.Envelope.triggerRelease();
            }

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
    }

    GetValue(param: string) {
        super.GetValue(param);
    }

    OpenParams() {
        super.OpenParams();
    }

    KeyboardDown(key:string, source:ISource): void {

    }

    KeyboardUp(key:string, source:ISource): void {

    }

    public SetBaseFrequency(source:ISource){
        if (source.Frequency){
            this.BaseFrequency = source.Frequency;
            this.CurrentOctave = this.GetStartOctave(source);
            this.CurrentOctave--;
        }
    }

    public GetStartOctave(source): number {
        var octave,
            note = source.Source.frequencyToNote(this.BaseFrequency);

        if (note.length === 3) {
            octave = parseInt(note.charAt(2));
        } else {
            octave = parseInt(note.charAt(1));
        }

        return octave;
    }

    public GetKeyNoteOctaveString(keyCode): string {
        // Replaces keycode with keynote & octave string
        return (keyCode
            .replace('a', this.CurrentOctave)
            .replace('b', this.CurrentOctave + 1)
            .replace('c', this.CurrentOctave + 2)
            .replace('d', this.CurrentOctave + 3)
            .toString());
    }

    public GetFrequencyOfNote(note, source): number {
        return source.Source.noteToFrequency(note) * this.GetConnectedPitchPreEffects(source);
    }

    public GetConnectedPitchPreEffects(source) {

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
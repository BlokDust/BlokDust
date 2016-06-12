import {Granular} from '../Sources/Granular';
import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../ISource';
import {Keyboard} from './Keyboard';
import {KeyDownEventArgs} from '../../Core/Inputs/KeyDownEventArgs';
import {MainScene} from '../../MainScene';
import {Microphone} from '../Sources/Microphone';
import Point = etch.primitives.Point;
import {Power} from '../Power/Power';
import {VoiceCreator as Voice} from './VoiceObject';

declare var App: IApp;

export class ComputerKeyboard extends Keyboard {

    public KeyboardCommands: any = {
        OctaveUp: 'octave-up',
        OctaveDown: 'octave-down',
    };

    public Params: KeyboardParams;
    public Defaults: KeyboardParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Interaction.Blocks.ComputerKeyboard.name;

        this.Defaults = {
            transpose: 0,
            glide: 0.05,
            isPolyphonic: false
        };
        this.PopulateParams();

        super.init(drawTo);

        App.PianoKeyboardManager.KeyDownChange.on(this.KeyDownCallback, this);
        App.PianoKeyboardManager.KeyUpChange.on(this.KeyUpCallback, this);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }

    //-------------------------------------------------------------------------------------------
    //  MESSAGES
    //-------------------------------------------------------------------------------------------

    // KEY DOWN //
    KeyDownCallback(e: any){
        // IF A VALID MIDI NOTE //
        if (e.KeyDown && e.KeyDown > 0 && e.KeyDown < 1000){
            var note = e.KeyDown;
            this.KeysDown[""+note] = true;
            this.NoteOn(note);
        }
        // COMMANDS LIKE TRANSPOSE //
        else {
            this.ExecuteCodeCommand(e.KeyDown);
        }
    }

    // KEY UP //
    KeyUpCallback(e: any){
        if (e.KeyUp && e.KeyUp > 0 && e.KeyUp < 1000){
            var note = e.KeyUp;
            delete this.KeysDown[""+note];
            this.NoteOff(note);
        }
    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }


    //-------------------------------------------------------------------------------------------
    //  OPTIONS
    //-------------------------------------------------------------------------------------------

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Computer Keyboard",
            "parameters" : [

                {
                    "type" : "switches",
                    "name" : "",
                    "switches": [
                        {
                            "name" : "Mono/Poly",
                            "setting" :"polyphonic",
                            "value": this.Params.isPolyphonic,
                            "mode": "fewMany"
                        }
                    ]
                },
                {
                    "type" : "slider",
                    "name" : "Octave",
                    "setting" :"transpose",
                    "props" : {
                        "value" : this.Params.transpose,
                        "min" : -this.TranspositionRange,
                        "max" : this.TranspositionRange,
                        "quantised" : true,
                        "centered" : true
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Glide",
                    "setting" :"glide",
                    "props" : {
                        "value" : this.Params.glide*100,
                        "min" : 0.001,
                        "max" : 100,
                        "truemin" : 0,
                        "truemax" : 1,
                        "quantised" : false,
                        "centered" : false
                    }
                },
            ]
        };
    }

    //-------------------------------------------------------------------------------------------
    //  DISPOSE
    //-------------------------------------------------------------------------------------------


    Dispose(){
        super.Dispose();
        // This needs to disconnect first so that ResetScene can delete keyboard properly
        App.Audio.ConnectionManager.update();
        App.PianoKeyboardManager.KeyDownChange.off(this.KeyDownCallback, this);
        App.PianoKeyboardManager.KeyUpChange.off(this.KeyUpCallback, this);

        this.Params.transpose = null;
        this.KeyboardCommands = null;
    }

    Stop() {
        // maybe add source disconnect voices
        App.PianoKeyboardManager.KeyDownChange.off(this.KeyDownCallback, this);
        App.PianoKeyboardManager.KeyUpChange.off(this.KeyUpCallback, this);
    }

}

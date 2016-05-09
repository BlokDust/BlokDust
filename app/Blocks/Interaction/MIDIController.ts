import {Granular} from '../Sources/Granular';
import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../ISource';
import {Keyboard} from './Keyboard';
import {MainScene} from '../../MainScene';
import {Microphone} from '../Sources/Microphone';
import {MIDIManager} from '../../Core/Audio/MIDIManager';
import {MIDIMessageArgs} from '../../Core/Audio/MIDIMessageArgs';
import Point = etch.primitives.Point;
import {Power} from '../Power/Power';
import {VoiceCreator as Voice} from './VoiceObject';

declare var App: IApp;

export class MIDIController extends Keyboard {

    public Params: KeyboardParams;
    public Defaults: KeyboardParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Interaction.Blocks.MIDIController.name;

        this.Defaults = {
            transpose: 0,
            glide: 0.05,
            isPolyphonic: false, // Polyphonic mode: boolean, default: off
        };
        this.PopulateParams();

        super.Init(drawTo);

        App.Audio.MIDIManager.MIDIMessage.on(this._OnMIDIMessage, this);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    //-------------------------------------------------------------------------------------------
    //  MESSAGES
    //-------------------------------------------------------------------------------------------


    // ON MIDI MESSAGE //
    private _OnMIDIMessage(MIDIManager: MIDIManager, e: MIDIMessageArgs) {
        var cmd = e.MIDI.cmd,// this gives us our [command/channel, note, velocity] data.
            channel = e.MIDI.channel,
            type = e.MIDI.type, // channel agnostic message type. Thanks, Phil Burk.
            note = e.MIDI.note,
            velocity = e.MIDI.velocity;
        if (channel == 9) return;


        // NOTE UP //
        if (cmd == 8 || ((cmd == 9) && (velocity == 0))) {
            delete this.KeysDown[""+note];
            this.NoteOff(note);
        }

        // NOTE DOWN //
        else if (cmd === 9) {
            this.KeysDown[""+note] = true;
            this.NoteOn(note);
        }

        // PITCH BEND //
        else if (cmd == 14) {
            this.Bend = (((velocity * 128.0 + note) - 8192) / 8192.0) * (6*App.Config.PitchBendRange);
            this.UpdateMods();
        }
    }


    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------


    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }


    //-------------------------------------------------------------------------------------------
    //  OPTIONS
    //-------------------------------------------------------------------------------------------


    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "MIDI Keyboard",
            "parameters" : [

                {
                    "type" : "switches",
                    "name" : "",
                    "setting" :"",
                    "props" : {
                        "value" : 0,
                        "min" : 0,
                        "max" : 1,
                        "quantised" : true,
                    },
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
        App.Audio.MIDIManager.MIDIMessage.off(this._OnMIDIMessage, this);
        super.Dispose();
    }

    Stop() {
        // maybe add source disconnect voices
        App.Audio.MIDIManager.MIDIMessage.off(this._OnMIDIMessage, this);
    }
}

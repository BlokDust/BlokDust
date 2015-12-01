import {Granular} from '../Sources/Granular';
import {IApp} from '../../IApp';
import {ISource} from '../ISource';
import {Keyboard} from './Keyboard';
import {MainScene} from '../../MainScene';
import {Microphone} from '../Sources/Microphone';
import {MIDIManager} from '../../Core/Audio/MIDIManager';
import {MIDIMessageArgs} from '../../Core/Audio/MIDIMessageArgs';
import {Power} from '../Power/Power';
import {VoiceCreator as Voice} from './VoiceObject';

declare var App: IApp;

export class MIDIController extends Keyboard {

    public Params: KeyboardParams;
    public Defaults: KeyboardParams;

    Init(sketch?: any): void {

        this.BlockName = "MIDI Keyboard";

        this.Defaults = {
            glide: 0.05,
            isPolyphonic: false, // Polyphonic mode: boolean, default: off
            octave: 3
        };
        this.PopulateParams();

        super.Init(sketch);

        App.Audio.MIDIManager.MIDIMessage.on(this._OnMIDIMessage, this);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }

    /**
     * MIDI Message received callback
     * @param MIDIManager {MIDIManager}
     * @param e {WebMidi.MIDIMessageEvent}
     */
    private _OnMIDIMessage(MIDIManager: MIDIManager, e: MIDIMessageArgs) {
        var cmd = e.MIDI.cmd,// this gives us our [command/channel, note, velocity] data.
            channel = e.MIDI.channel,
            type = e.MIDI.type, // channel agnostic message type. Thanks, Phil Burk.
            note = e.MIDI.note,
            velocity = e.MIDI.velocity;

        if (channel == 9) return;

        if (cmd == 8 || ((cmd == 9) && (velocity == 0))) {
            // with MIDI, note on with velocity zero is the same as note off
            // Key up type

            //Check if this key released is in out key_map
            if (typeof note !== 'undefined' && note !== '') {
                // remove this key from the keysDown object
                delete this.KeysDown[note];
            }

            // ALL SOURCES TRIGGER KEYBOARD UP
            let connections: ISource[] = this.Connections.ToArray();
            connections.forEach((source: ISource) => {
                this.KeyboardUp(note, source);
            });
        }

        else if (cmd === 9) {
            // Key down command

            this.KeysDown[note] = true;

            // ALL SOURCES TRIGGER KEYBOARD DOWN
            let connections: ISource[] = this.Connections.ToArray();
            connections.forEach((source: ISource) => {
                this.KeyboardDown(note, source);
            });


        }
        // TODO: add controller, pitchwheel and polyaftertouch cases.
        // https://github.com/cwilso/midi-synth/blob/master/js/midi.js line 7
        //
        //else if (cmd == 11) {
        //    controller(note, velocity / 127.0);
        //}
        //else if (cmd == 14) {
        //    // pitch wheel
        //    pitchWheel(((velocity * 128.0 + note) - 8192) / 8192.0);
        //}
        //else if (cmd == 10) {  // poly aftertouch
        //    polyPressure(note, velocity / 127)
        //}
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"midi controller");
    }

    KeyboardDown(keyDown:string, source:ISource): void {

        var frequency = this.GetFrequencyOfNote(keyDown, source);

        if (this.Params.isPolyphonic && (!(source instanceof Granular))) {
            // POLYPHONIC MODE

            // Are there any free voices?
            if (source.FreeVoices.length > 0){

                // Yes, get one of them and remove it from FreeVoices list
                var voice = source.FreeVoices.shift();

                // Store the keydown
                voice.Key = keyDown;

                // Add it to the ActiveVoices list
                source.ActiveVoices.push( voice );

                // set it to the right frequency
                source.SetPitch(frequency, voice.ID);

                // trigger it's envelope
                source.TriggerAttack(voice.ID);

            } else {

                // No free voices available - steal the oldest one from active voices
                var voice: Voice = source.ActiveVoices.shift();

                // Store the keydown
                voice.Key = keyDown;

                // Set the new pitch
                source.SetPitch(frequency, voice.ID);

                // Add it back to the end of ActiveVoices
                source.ActiveVoices.push( voice );
            }

        } else {
            // MONOPHONIC MODE

            // If no other keys already pressed trigger attack
            if (Object.keys(this.KeysDown).length === 1) {
                source.SetPitch(frequency);
                source.TriggerAttack();

                // Else ramp to new frequency over time (glide)
            } else {
                source.SetPitch(frequency, 0, this.Params.glide);
            }
        }
    }

    KeyboardUp(keyUp:string, source:ISource): void {

        if (this.Params.isPolyphonic && (!(source instanceof Granular))) {
            // POLYPHONIC MODE

            // Loop through all the active voices
            source.ActiveVoices.forEach((voice: Voice, i: number) => {

                // if key pressed is a saved in the ActiveVoices stop it
                if (voice.Key === keyUp) {
                    // stop it
                    source.TriggerRelease(voice.ID);

                    // Remove voice from Active Voices
                    source.ActiveVoices.splice(i, 1);

                    // Add it to FreeVoices
                    source.FreeVoices.push(voice);
                }
            });

        } else {
            // MONOPHONIC MODE

            if (Object.keys(this.KeysDown).length === 0) {
                source.TriggerRelease();
            }
        }
    }

    Dispose(){
        super.Dispose();
        App.Audio.MIDIManager.MIDIMessage.off(this._OnMIDIMessage, this);
    }

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

}
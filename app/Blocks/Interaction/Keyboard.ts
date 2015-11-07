import {Granular} from '../Sources/Granular';
import {IApp} from '../../IApp';
import {Interaction} from './Interaction';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../ISource';
import {Recorder} from '../Sources/Recorder';
import {SamplerBase} from '../Sources/SamplerBase';

declare var App: IApp;

/**
 * Base class for mono, poly and midi keyboards
 */
export class Keyboard extends Interaction {

    public BaseFrequency: number;
    public KeysDown: any = {};

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);
    }

    Draw() {
        super.Draw();
    }

    //FIXME: we don't want to reset the frequency everytime this gets called
    UpdateConnections() {
        const connections = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            this.SetBaseFrequency(source);
            this.KeysDown = {};

            // Check to see if we have enough sources on this block
            if ((source.Sources.length === 1) && (this.Params.isPolyphonic)) {
                // Create extra polyphonic voices
                this.CreateVoices(source);
            }

            source.TriggerRelease('all'); //TODO: do we need this?
        });
    }

    Dispose(){
        this.KeysDown = null;
        this.BaseFrequency = null;
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param == "glide") {
            value = value/100;
        }
        else if (param == "octave") {
            for (let i = 0, source: ISource; i < this.Connections.Count; i++) {
                source = this.Connections.GetValueAt(i);
                let diff: number = value - this.Params.octave;
                source.OctaveShift(diff);
            }
        }
        else if (param === 'polyphonic') {
            this.Params.isPolyphonic = value;
            // ALL SOURCES
            let connections: ISource[] = this.Connections.ToArray();
            connections.forEach((source: ISource) => {
                source.TriggerRelease('all');
                // Create extra polyphonic voices
                this.CreateVoices(source);
            });
            App.Audio.ConnectionManager.Update();
        }

        this.Params[param] = value;
    }

    public SetBaseFrequency(source:ISource){
        if (source.Params && source.Params.frequency){
            this.BaseFrequency = source.Params.frequency;
        } else {
            this.BaseFrequency = App.Config.BaseNote;
        }
    }

    public GetStartOctave(source): number {
        let octave: number;
        let note: string = source.Source.frequencyToNote(this.BaseFrequency);

        if (note.length === 3) {
            octave = parseInt(note.charAt(2));
        } else {
            octave = parseInt(note.charAt(1));
        }

        return octave;
    }

    /**
     * Gets the note string from the computer keyboard event keynote & octave string
     * @param keyCode
     * @returns {string}
     * @constructor
     */
    public GetKeyNoteOctaveString(keyCode): string {
        return (keyCode
            .replace('note_', '')
            .replace('_a', this.Params.octave)
            .replace('_b', this.Params.octave + 1)
            .replace('_c', this.Params.octave + 2)
            .replace('_d', this.Params.octave + 3)
            .toString());
    }

    /**
     * Gets the frequency from a note string and multiplies by any pitch increments
     * @param note
     * @param source
     * @returns {number}
     * @constructor
     */
    public GetFrequencyOfNote(note, source:ISource): number {
        if (source.Params.baseFrequency || source.Params.fine) {
            return source.Sources[0].noteToFrequency(note) *
                App.Audio.Tone.intervalToFrequencyRatio(source.Params.baseFrequency + source.Params.fine); //TODO - keyboards and other controllers should be dumber than this, not needing to know about block specific frequency modifiers
        } else if (source instanceof SamplerBase) {
            return source.Sources[0].noteToFrequency(note) * source.Params.playbackRate;
        } else {
            return source.Sources[0].noteToFrequency(note);
        }
    }

    /**
     * Turns midi velocity information into a number 0 - 1 for gain
     * @param velocity
     * @returns {number}
     * @constructor
     */
    MidiVelocityToGain(velocity) {
        return velocity / 127;
    }
}

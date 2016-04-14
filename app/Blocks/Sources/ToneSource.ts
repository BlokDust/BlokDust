import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import {Source} from '../Source';

declare var App: IApp;

export class ToneSource extends Source {

    public Sources: Tone.Oscillator[];
    public Envelopes: Tone.AmplitudeEnvelope[];
    public Params: ToneSourceParams;
    public Defaults: ToneSourceParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Source.Blocks.Tone.name;

        this.Defaults = {
            //frequency: App.Config.BaseNote,
            waveform: 2,
            transpose: 0, //TODO: check saves, baseFreqeuency was changed to transpose
            fine: 0,
        };
        this.PopulateParams();

        // If it's an older save before we had baseFrequency
        /*if (this.Params.baseFrequency) {
            this.Params.frequency = App.Config.BaseNote * App.Audio.Tone.intervalToFrequencyRatio(this.Params.baseFrequency);
            console.log("IF");
        }*/

        super.Init(drawTo);

        this.CreateSource();
        this.CreateEnvelope();
        this.CreateFirstVoice();

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope)=> {
            e.connect(this.AudioInput);
        });

        this.Sources.forEach((s: Tone.Oscillator, i: number)=> {
            s.connect(this.Envelopes[i]);
            s.start();
        });


        // Define Outline for HitTest
        this.Outline.push(new Point(-2, 0), new Point(0, -2), new Point(2, 0), new Point(1, 1), new Point(-1, 1));
    }

    BackwardsCompatibilityPatch() {
        (<any>this).Params.frequency = this.GetFrequency();
        (<any>this).Params.baseFrequency = this.GetFrequency();
    }

    CreateSource(){
        // add it to the list of sources
        this.Sources.push( new Tone.Oscillator(this.GetFrequency(), App.Audio.WaveformTypeIndex[this.Params.waveform]));

        // return it
        return super.CreateSource();
    }

    CreateEnvelope(){
        this.Envelopes.push( new Tone.AmplitudeEnvelope(
            this.Settings.envelope.attack,
            this.Settings.envelope.decay,
            this.Settings.envelope.sustain,
            this.Settings.envelope.release
        ));

        return super.CreateEnvelope();
    }

    Dispose() {
        super.Dispose();

        this.Sources.forEach((s: any) => {
            s.dispose();
        });

        this.Envelopes.forEach((e: any) => {
            e.dispose();
        });

    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Tone",
            "parameters" : [
                {
                    "type" : "slider",
                    "name" : "Note",
                    "setting" :"transpose",
                    "props" : {
                        "value" : this.Params.transpose,
                        "min" : -48,
                        "max" : 48,
                        "quantised" : true,
                        "centered" : true,
                        "convertDisplay" : this.DisplayNote
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Fine",
                    "setting" :"fine",
                    "props" : {
                        "value" : this.Params.fine,
                        "min" : -1,
                        "max" : 1,
                        "quantised" : false,
                        "centered" : true
                    }
                },
                {
                    "type" : "buttons",
                    "name" : "Wave",
                    "setting" :"waveform",
                    "props" : {
                        "value" : this.Params.waveform,
                        "mode" : "wave"
                    },
                    "buttons": [
                        {
                            "name" : "Sine"
                        },
                        {
                            "name" : "Square"
                        },
                        {
                            "name" : "Triangle"
                        },
                        {
                            "name" : "Saw"
                        }
                    ]
                }

            ]
        };
    }

    SetParam(param: string,value: any) {

        switch(param) {
            case 'transpose':
                this.Params.transpose = value;
                this.NoteUpdate();
                //this.SetPitch(this.GetFrequency(this.Params.transpose, this.Params.fine), 0, 0);
                break;
            case 'fine':
                this.Params.fine = value;
                this.NoteUpdate();
                //this.SetPitch(this.GetFrequency(value, this.Params.transpose), 0, 0);
                break;
            case "waveform":
                this.Sources.forEach((s: any)=> {
                    s.type = App.Audio.WaveformTypeIndex[value];
                });
                break;
        }

        this.Params[param] = value;
    }

    DisplayNote(value: number): string {
        const octave = ToneSource.GetOctaveFromTransposeValue(value);
        const note = ToneSource.GetNoteFromTransposeValue(value);
        return "" + note + "" + octave;
    }

    static GetOctaveFromTransposeValue(value: number): number {
        return Math.floor(value / 12) + 4;
    }

    static GetNoteFromTransposeValue(value: number): string {
        value = value % 12;
        if (value < 0) value += 12;
        return App.Audio.NoteIndex[value];
    }

    GetFrequency(transpose?: number, fine?: number): number {
        transpose = (typeof transpose === 'number') ? transpose : this.Params.transpose ;
        fine = (typeof fine === 'number') ? fine : this.Params.fine;
        return App.Config.BaseNote * App.Audio.Tone.intervalToFrequencyRatio(transpose + fine);
    }
}

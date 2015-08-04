import PreEffect = require("../PreEffect");
import ISource = require("../../ISource");
import Grid = require("../../../Grid");
import BlocksSketch = require("../../../BlocksSketch");

class Envelope extends PreEffect {

    public Params: EnvelopeParams;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                attack: 1,
                decay: 5,
                sustain: 0.7,
                release: 4,
            };
        }

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"envelope");
    }

    Attach(source: ISource): void{
        super.Attach(source);

        if (source.Envelopes.length) {
            source.Envelopes.forEach((e: Tone.Envelope) => {
                e.attack = this.Params.attack;
                e.decay = this.Params.decay;
                e.sustain = this.Params.sustain;
                e.release = this.Params.release;
            });
        } else if (source.Sources[0] instanceof Tone.Simpler) {
            source.Sources.forEach((s: Tone.Simpler) => {
                let e = s.envelope;
                e.attack = this.Params.attack;
                e.decay = this.Params.decay;
                e.sustain = this.Params.sustain;
                e.release = this.Params.release;
            });
        }
    }

    Detach(source: ISource): void{
        super.Detach(source);

        if (source.Envelopes.length) {
            source.Envelopes.forEach((e: Tone.Envelope) => {
                e.attack = 0.02;
                e.decay = 0.5;
                e.sustain = 0.5;
                e.release = 0.02;
            });
        } else if (source.Sources[0] instanceof Tone.Simpler) {
            source.Sources.forEach((s: Tone.Simpler) => {
                let e = s.envelope;
                e.attack = 0.02;
                e.decay = 0.5;
                e.sustain = 0.5;
                e.release = 0.02;
            });
        }

    }

    SetParam(param: string, value: number) {
        super.SetParam(param, value);

        this.Params[param] = value;

        if (this.Sources.Count) {
            for (let i = 0; i < this.Sources.Count; i++) {
                const source = this.Sources.GetValueAt(i);

                source.Envelopes.forEach((e: Tone.Envelope) => {
                    e.attack = this.Params.attack;
                    e.decay = this.Params.decay;
                    e.sustain = this.Params.sustain;
                    e.release = this.Params.release;
                });
            }
        }
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "Envelope",
            "parameters": [

                {
                    "type" : "ADSR",
                    "name": "ADSR",
                    "setting": "adsr",
                    "nodes": [
                        {
                            "setting": "attack",
                            "value": this.Params.attack,
                            "min": 0.01,
                            "max": 10
                        },

                        {
                            "setting": "decay",
                            "value": this.Params.decay,
                            "min": 0.01,
                            "max": 15
                        },

                        {
                            "setting": "sustain",
                            "value": this.Params.sustain,
                            "min": 0,
                            "max": 1
                        },

                        {
                            "setting": "release",
                            "value": this.Params.release,
                            "min": 0.01,
                            "max": 15
                        }
                    ]
                }
            ]
        };
    }
}

export = Envelope;
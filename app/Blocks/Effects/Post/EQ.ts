import {MainScene} from '../../../MainScene';
import {PostEffect} from '../PostEffect';
import ISketchContext = Fayde.Drawing.ISketchContext;

export class EQ extends PostEffect {

    public Effect: Tone.EQMultiband;
    public Params: EQParams;

    Init(sketch: ISketchContext): void {

        if (!this.Params) {
            this.Params = {
                frequency_1: 50,
                Q_1: 1,
                gain_1: 0,
                frequency_2: 440,
                Q_2: 1,
                gain_2: 0,
                frequency_3: 2000,
                Q_3: 2.5,
                gain_3: 0,
                frequency_4: 10000,
                Q_4: 1,
                gain_4: 0,
            };
        }

        this.Effect = new Tone.EQMultiband([
            {
                "type" : "lowshelf",
                "frequency" : this.Params.frequency_1,
                "rolloff" : -12,
                "Q" : this.Params.Q_1,
                "gain" : this.Params.gain_1
            },
            {
                "type" : "peaking",
                "frequency" : this.Params.frequency_2,
                "rolloff" : -12,
                "Q" : this.Params.Q_2,
                "gain" : this.Params.gain_2
            },
            {
                "type" : "peaking",
                "frequency" : this.Params.frequency_3,
                "rolloff" : -12,
                "Q" : this.Params.Q_3,
                "gain" : this.Params.gain_3
            },
            {
                "type" : "highshelf",
                "frequency" : this.Params.frequency_4,
                "rolloff" : -12,
                "Q" : this.Params.Q_4,
                "gain" : this.Params.gain_4
            }
        ]);

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"eq");
    }

    Dispose(){
        this.Effect.dispose();
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);
        var val = value;

        var paramWithBand = param.split("_"),
            paramtype = paramWithBand[0],
            band = parseInt(paramWithBand[1]);

        //console.log("param "+param+"; band: "+band);


        switch (paramtype){
            case "frequency" : this.Effect.setFrequency(val, band);
                break;
            case "Q" : this.Effect.setQ(val, band);
                break;
            case "gain" : this.Effect.setGain(val, band);
                break;
        }

        this.Params[param] = val;
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name": "EQ",
            "parameters": [

                {
                    "type" : "parametric",
                    "name": "Filter",
                    "setting": "parametric",
                    "nodes": [
                        {
                            "x_setting": "frequency_1",
                            "x_value": this.Params.frequency_1,
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain_1",
                            "y_value": this.Params.gain_1,
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q_1",
                            "q_value": this.Params.Q_1,
                            "q_min": 20,
                            "q_max": 1
                        },

                        {
                            "x_setting": "frequency_2",
                            "x_value": this.Params.frequency_2,
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain_2",
                            "y_value": this.Params.gain_2,
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q_2",
                            "q_value": this.Params.Q_2,
                            "q_min": 14,
                            "q_max": 0.5
                        },

                        {
                            "x_setting": "frequency_3",
                            "x_value": this.Params.frequency_3,
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain_3",
                            "y_value": this.Params.gain_3,
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q_3",
                            "q_value": this.Params.Q_3,
                            "q_min": 14,
                            "q_max": 0.5
                        },

                        {
                            "x_setting": "frequency_4",
                            "x_value": this.Params.frequency_4,
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain_4",
                            "y_value": this.Params.gain_4,
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q_4",
                            "q_value": this.Params.Q_4,
                            "q_min": 20,
                            "q_max": 1
                        }
                    ]
                }
            ]
        };
    }
}

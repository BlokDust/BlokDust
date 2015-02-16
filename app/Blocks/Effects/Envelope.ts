import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import App = require("../../App");

class Envelope extends Effect {

    public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;

    constructor(grid: Grid, position: Point){

        this.attack = 1;
        this.decay = 5;
        this.sustain = 0.7;
        this.release = 4;

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"envelope");
    }


    Attach(source: ISource): void{
        super.Attach(source);

        this.Source.Envelope.setAttack(this.attack);
        this.Source.Envelope.setDecay(this.decay);
        this.Source.Envelope.setSustain(this.sustain);
        this.Source.Envelope.setRelease(this.release);
    }

    Detach(source: ISource): void{
        super.Detach(source);

        this.Source.Envelope.setAttack(this.Source.Settings.envelope.attack);
        this.Source.Envelope.setDecay(this.Source.Settings.envelope.decay);
        this.Source.Envelope.setSustain(this.Source.Settings.envelope.sustain);
        this.Source.Envelope.setRelease(this.Source.Settings.envelope.release);
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);

        if (param=="attack") {
            this.attack = value;

        } else if (param=="decay") {
            this.decay = value;
        } else if (param=="sustain") {
            this.sustain = value;
        } else if (param=="release") {
            this.release = value;
        }
        if (this.Source) {
            this.Source.Envelope.setAttack(this.attack);
            this.Source.Envelope.setDecay(this.decay);
            this.Source.Envelope.setSustain(this.sustain);
            this.Source.Envelope.setRelease(this.release);
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val = this[""+param];
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
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
                            "value": this.GetValue("attack"),
                            "min": 0.01,
                            "max": 10
                        },

                        {
                            "setting": "decay",
                            "value": this.GetValue("decay"),
                            "min": 0.01,
                            "max": 15
                        },

                        {
                            "setting": "sustain",
                            "value": this.GetValue("sustain"),
                            "min": 0,
                            "max": 1
                        },

                        {
                            "setting": "release",
                            "value": this.GetValue("release"),
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
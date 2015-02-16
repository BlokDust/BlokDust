import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import Grid = require("../../Grid");
import App = require("../../App");

class Envelope extends Effect {

    public attack: number;
    public decay: number;
    public sustain: number;
    public release: number;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.attack = 1;
        this.decay = 5;
        this.sustain = 0.7;
        this.release = 4;

        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"envelope");
    }


    Connect(modifiable: IModifiable): void{
        super.Attach(modifiable);

        this.Modifiable.Envelope.setAttack(this.attack);
        this.Modifiable.Envelope.setDecay(this.decay);
        this.Modifiable.Envelope.setSustain(this.sustain);
        this.Modifiable.Envelope.setRelease(this.release);
    }

    Disconnect(modifiable: IModifiable): void{
        super.Detach(modifiable);

        this.Modifiable.Envelope.setAttack(this.Modifiable.Settings.envelope.attack);
        this.Modifiable.Envelope.setDecay(this.Modifiable.Settings.envelope.decay);
        this.Modifiable.Envelope.setSustain(this.Modifiable.Settings.envelope.sustain);
        this.Modifiable.Envelope.setRelease(this.Modifiable.Settings.envelope.release);
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
        if (this.Modifiable) {
            this.Modifiable.Envelope.setAttack(this.attack);
            this.Modifiable.Envelope.setDecay(this.decay);
            this.Modifiable.Envelope.setSustain(this.sustain);
            this.Modifiable.Envelope.setRelease(this.release);
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
import Effect = require("../Effect");
import IModifiable = require("../IModifiable");
import Grid = require("../../Grid");

class PitchIncrease extends Effect {

    public PitchIncrement: number;
    public Pitch: number;
    //public isConnected: boolean = false;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.PitchIncrement = 1.5; // Pitch decreases by 4ths

        //TODO: Make pitch effect take parameter scaled to musical notation: (EXAMPLE 1=A4, 2=Bb4 3=B4, 4=C4...)

        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"pitch");
    }

    Delete(){

    }

    Connect(modifiable: IModifiable): void {
        super.Connect(modifiable);

        if (this.Modifiable.Source.frequency){
            this.Pitch = this.Modifiable.Source.frequency.getValue();
            this.Modifiable.Source.frequency.exponentialRampToValueNow(this.Pitch * this.PitchIncrement, 0);
        } else if (this.Modifiable.Source._playbackRate){
            this.Pitch = this.Modifiable.Source.getPlaybackRate();
            this.Modifiable.Source.setPlaybackRate(this.Pitch * this.PitchIncrement, 0);
        }
    }

    Disconnect(modifiable: IModifiable): void{
        super.Disconnect(modifiable);

        if (this.Modifiable.Source.frequency) {
            this.Pitch = this.Modifiable.Source.frequency.getValue();
            this.Modifiable.Source.frequency.exponentialRampToValueNow(this.Pitch / this.PitchIncrement, 0);
        } else if (this.Modifiable.Source._playbackRate){
            this.Pitch = this.Modifiable.Source.getPlaybackRate();
            this.Modifiable.Source.setPlaybackRate(this.Pitch / this.PitchIncrement, 0);
        }
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "pitchMultiplier") {
            this.PitchIncrement = value;
            if (this.Modifiable && this.Modifiable.Source.frequency) {
                this.Modifiable.Source.frequency.linearRampToValueAtTime(this.Pitch * this.PitchIncrement, 0 );
            } else if (this.Modifiable && this.Modifiable.Source._playbackRate) {
                this.Modifiable.Source.setPlaybackRate(this.Pitch * this.PitchIncrement, 0);
            }
        }
    }

    GetValue(param: string) {
        super.GetValue(param);
        var val;

        if (param == "pitchMultiplier") {
            val = this.PitchIncrement;
        }
        return val;
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Pitch",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Pitch",
                    "setting" :"pitchMultiplier",
                    "props" : {
                        "value" : this.GetValue('pitchMultiplier'),
                        "min" : 0.5,
                        "max" : 2,
                        "quantised" : false,
                        "centered" : true,
                        "logarithmic": true
                    }
                }
            ]
        };
    }
}

export = PitchIncrease;
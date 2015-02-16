import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");

class PitchIncrease extends Effect {

    public PitchIncrement: number;
    public Pitch: number;
    //public isConnected: boolean = false;

    constructor(grid: Grid, position: Point){

        this.PitchIncrement = 1.5; // Pitch decreases by 4ths

        //TODO: Make pitch effect take parameter scaled to musical notation: (EXAMPLE 1=A4, 2=Bb4 3=B4, 4=C4...)

        super(grid, position);
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, -1),new Point(0, 1));
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"pitch");
    }

    Delete(){

    }

    Attach(source: ISource): void {
        super.Attach(source);

        if (this.Source.Source.frequency){
            this.Pitch = this.Source.Source.frequency.getValue();
            this.Source.Source.frequency.exponentialRampToValueNow(this.Pitch * this.PitchIncrement, 0);
        } else if (this.Source.Source._playbackRate){
            this.Pitch = this.Source.Source.getPlaybackRate();
            this.Source.Source.setPlaybackRate(this.Pitch * this.PitchIncrement, 0);
        }
    }

    Detach(source: ISource): void{
        super.Detach(source);

        if (this.Source.Source.frequency) {
            this.Pitch = this.Source.Source.frequency.getValue();
            this.Source.Source.frequency.exponentialRampToValueNow(this.Pitch / this.PitchIncrement, 0);
        } else if (this.Source.Source._playbackRate){
            this.Pitch = this.Source.Source.getPlaybackRate();
            this.Source.Source.setPlaybackRate(this.Pitch / this.PitchIncrement, 0);
        }
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);
        var jsonVariable = {};
        jsonVariable[param] = value;

        if (param == "pitchMultiplier") {
            this.PitchIncrement = value;
            if (this.Source && this.Source.Source.frequency) {
                this.Source.Source.frequency.linearRampToValueAtTime(this.Pitch * this.PitchIncrement, 0 );
            } else if (this.Source && this.Source.Source._playbackRate) {
                this.Source.Source.setPlaybackRate(this.Pitch * this.PitchIncrement, 0);
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
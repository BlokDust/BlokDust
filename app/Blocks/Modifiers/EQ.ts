import EQComponent = require("../AudioEffectComponents/EQ");
import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class EQ extends Modifier {

    public Component: IEffect;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Component = new EQComponent({
            band1: {
                frequency: 50,
                Q: 1,
                gain: 0
            },
            band2: {
                frequency: 400,
                Q: 2.5,
                gain: 0
            },
            band3: {
                frequency: 2000,
                Q: 2.5,
                gain: 0
            },
            band4: {
                frequency: 10000,
                Q: 1,
                gain: 0
            }
        });

        this.Effects.Add(this.Component);
        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    Draw() {
        super.Draw();

        this.Grid.BlockSprites.Draw(this.Position,true,"eq");

    }

    Delete(){
        this.Component.Delete();
    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name": "EQ",
            "parameters": [

                {
                    "type" : "parametric",
                    "name": "Filter",
                    "setting": "parametric",
                    "nodes": [
                        {
                            "x_setting": "frequency-1",
                            "x_value": this.Component.GetValue("frequency-1"),
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain-1",
                            "y_value": this.Component.GetValue("gain-1"),
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q-1",
                            "q_value": this.Component.GetValue("Q-1"),
                            "q_min": 20,
                            "q_max": 1
                        },

                        {
                            "x_setting": "frequency-2",
                            "x_value": this.Component.GetValue("frequency-2"),
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain-2",
                            "y_value": this.Component.GetValue("gain-2"),
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q-2",
                            "q_value": this.Component.GetValue("Q-2"),
                            "q_min": 14,
                            "q_max": 0.5
                        },

                        {
                            "x_setting": "frequency-3",
                            "x_value": this.Component.GetValue("frequency-3"),
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain-3",
                            "y_value": this.Component.GetValue("gain-3"),
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q-3",
                            "q_value": this.Component.GetValue("Q-3"),
                            "q_min": 14,
                            "q_max": 0.5
                        },

                        {
                            "x_setting": "frequency-4",
                            "x_value": this.Component.GetValue("frequency-4"),
                            "x_min": 20,
                            "x_max": 20000,

                            "y_setting": "gain-4",
                            "y_value": this.Component.GetValue("gain-4"),
                            "y_min": -50,
                            "y_max": 50,

                            "q_setting": "Q-4",
                            "q_value": this.Component.GetValue("Q-4"),
                            "q_min": 20,
                            "q_max": 1
                        }
                    ]
                }
            ]
        };
    }

    SetValue(param: string,value: number) {
        super.SetValue(param,value);


        this.Component.SetValue(param,value);

    }

}

export = EQ;
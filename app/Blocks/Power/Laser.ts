/**
 * Created by luketwyman on 15/03/2015.
 */

import Source = require("../Source");
import Grid = require("../../Grid");
import App = require("../../App");
import Vector = Fayde.Utils.Vector;
import BlocksSketch = require("../../BlocksSketch");

class Laser extends Source {

    //public Params;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.Params = {
            angle: -90,
            range: 400,
            rotate: 0
        };

        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1,-1), new Point(1,-1), new Point(1,0), new Point(0,1), new Point(-1,0));
    }


    Update() {
        super.Update();

        // TEMP //
        // RANDOM //
        //this.Params.angle = Math.random()*360;

        // ROTATE //
        this.Params.angle += this.Params.rotate;
        if (this.Params.angle>90) {
            this.Params.angle -= 360;
        }
        if (this.Params.angle<-270) {
            this.Params.angle += 360;
        }
        if ( (this.Params.rotate>0 && this.Params.rotate<0.01) || (this.Params.rotate<0 && this.Params.rotate>-0.01) ) {
            this.Params.rotate = 0;
        }

    }

    Draw() {
        super.Draw();

        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"laser");

    }

    OpenParams() {
        super.OpenParams();

        this.ParamJson =
        {
            "name" : "Laser",
            "updateeveryframe": true,
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Angle",
                    "setting" :"angle",
                    "props" : {
                        "value" : this.Params.angle+90,
                        "min" : -180,
                        "max" : 180,
                        "quantised" : true,
                        "centered" : true
                    }
                },
                {
                    "type" : "slider",
                    "name" : "Rotate",
                    "setting" :"rotate",
                    "props" : {
                        "value" : this.Params.rotate,
                        "min" : -10,
                        "max" : 10,
                        "quantised" : false,
                        "centered" : true
                    }
                },

                {
                    "type" : "slider",
                    "name" : "Range",
                    "setting" :"range",
                    "props" : {
                        "value" : this.Params.range,
                        "min" : 50,
                        "max" : 1200,
                        "quantised" : true,
                        "centered" : false
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param=="angle") {
            this.Params[""+param] = (value-90);
        } else {
            this.Params[""+param] = value;
        }


    }
}

export = Laser;

import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../MainScene';
import Point = etch.primitives.Point;
import {PowerSource} from './PowerSource';

export class Laser extends PowerSource {

    public Params: LaserParams;
    public Defaults: LaserParams;

    Init(drawTo: IDisplayContext): void {

        this.BlockName = "Laser";

        this.Defaults = {
            angle: -90,
            range: 400,
            rotate: 0,
            selfPoweredMode: false
        };
        this.PopulateParams();

        this.UpdateCollision = true;
        this.Collisions = [];
        this.CheckRange = this.Params.range;

        super.Init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1,-1), new Point(1,-1), new Point(1,0), new Point(0,1), new Point(-1,0));
    }

    UpdateConnections() {
        this.UpdateCollision = true;
    }


    Update() {
        super.Update();

        // TEMP //
        // RANDOM //
        //this.Params.angle = Math.random()*360;

        // ROTATE //
        if (this.IsPowered() && Math.round(this.Params.rotate)!==0) {
            this.UpdateCollision = true;
            this.Params.angle += (this.Params.rotate/100);
            if (this.Params.angle>90) {
                this.Params.angle -= 360;
            }
            if (this.Params.angle<-270) {
                this.Params.angle += 360;
            }
        }


    }

    Draw() {
        super.Draw();
        this.DrawSprite("laser");
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
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
                        "min" : -500,
                        "max" : 500,
                        "quantised" : true,
                        "centered" : true,
                        "snap" : true
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
        var val = value;

        if (param=="angle") {

            val = (value-90);
        }
        if (param=="angle"||param=="range") {
            this.UpdateCollision = true;
        }


        this.Params[""+param] = val;
        this.CheckRange = this.Params.range;
    }
}

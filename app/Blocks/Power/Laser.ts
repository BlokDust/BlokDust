import IDisplayContext = etch.drawing.IDisplayContext;
import {MainScene} from '../../MainScene';
import Point = etch.primitives.Point;
import {PowerSource} from './PowerSource';
import {IApp} from "../../IApp";

declare var App: IApp;

export class Laser extends PowerSource {

    public Params: LaserParams;
    public Defaults: LaserParams;

    init(drawTo: IDisplayContext): void {

        this.BlockName = App.L10n.Blocks.Power.Blocks.Laser.name;

        this.Defaults = {
            angle: -90,
            range: 275,
            rotate: 0,
            selfPoweredMode: false
        };
        this.PopulateParams();

        this.UpdateCollision = true;
        this.Collisions = [];
        this.CheckRange = this.Params.range;

        super.init(drawTo);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1,-1), new Point(1,-1), new Point(1,0), new Point(0,1), new Point(-1,0));
    }

    UpdateConnections() {
        this.UpdateCollision = true;
    }

    update() {
        super.update();

        if (App.Config.DeltaEnabled){
            // ROTATE //
            if (this.IsPowered() && Math.round(this.Params.rotate) !== 0) {
                this.UpdateCollision = true;

                var ms: number = 1000; // 1 second

                // -500 to 500 = -1 to 1
                var normalisedRate: number = this.Params.rotate / 500;
                var rotationsPerMS: number = ms / normalisedRate;

                this.Params.angle += (360 / rotationsPerMS) * App.Stage.deltaTime;

                if (this.Params.angle > 90) {
                    this.Params.angle -= 360;
                }

                if (this.Params.angle < -270) {
                    this.Params.angle += 360;
                }
            }
        } else {
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
    }

    draw() {
        super.draw();
        this.DrawSprite(this.BlockName);
    }

    AddPower() {
        super.AddPower();
        this.UpdateCollision = true;
    }

    RemovePower() {
        super.RemovePower();
        this.UpdateCollision = true;
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

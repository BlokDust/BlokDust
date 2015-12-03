import {Effect} from '../../Effect';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../../ISource';
import {Logic} from './Logic';
import {MainScene} from '../../../MainScene';
import {ParticleEmitter} from './../ParticleEmitter';
import {Particle} from '../../../Particle';
import Point = etch.primitives.Point;

export class Momentary extends Logic {

    Init(drawTo: IDisplayContext): void {
		super.Init(drawTo);
        this.BlockName = "Momentary Power";
        this.Outline.push(new Point(0,-1), new Point(1,-1), new Point(1,1), new Point(0,2), new Point(-1,2), new Point(-1,0));
    }

    UpdateConnections() {
        //const newConnections: ISource[] = this.Connections.ToArray();
        //
        //this.OldConnections.forEach((source: ISource) => {
        //    //if momentary is on and is no longer connected to a source, remove power.
        //    if (this.Params.logic && (newConnections.indexOf(source) === -1)) {
        //        source.RemovePower();
        //    }
        //});
        //
        //newConnections.forEach((source: ISource) => {
        //    //if momentary is on and source isn't already connected, add power
        //    if (this.Params.logic && (this.OldConnections.indexOf(source) === -1)) {
        //        source.AddPower();
        //    }
        //});
        //
        //this.OldConnections = newConnections;
    }

    Draw() {
        super.Draw();
        this.DrawSprite("momentary power");
    }

    Dispose(){
        super.Dispose();
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Momentary Power",
            "parameters" : [
                {
                    "type" : "slider", //TODO Change to switch UI when available
                    "name" : "Off/On",
                    "setting" :"logic",
                    "props" : {
                        "value" : 0,
                        "min" : 0,
                        "max" : 0,
                        "quantised" : true
                    }
                }
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param=="logic") {
            this.PerformLogic();
        }

        //this.Params[""+param] = value;
    }


    PerformLogic() {
        // Momentarily Trigger Attack and then release
        this.Params.logic = true;
        let connections: ISource[] = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.AddPower();
            setTimeout(() => {
                source.RemovePower();
            }, 100); //TODO: use App.Config.PulseLength here instead
            if (source instanceof ParticleEmitter) {
                (<ParticleEmitter>source).EmitParticle();
            }
        });
        this.Params.logic = false;
    }
}

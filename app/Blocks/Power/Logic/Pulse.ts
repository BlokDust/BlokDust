import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../../ISource';
import {Logic} from './Logic';
import {ParticleEmitter} from './../ParticleEmitter';
import Point = etch.primitives.Point;
import {IApp} from "../../../IApp";

declare var App: IApp;

export class Pulse extends Logic {

    public Params: PulseParams;
    public Defaults: PulseParams;

    Init(drawTo: IDisplayContext): void {
		super.Init(drawTo);
        
        this.BlockName = App.L10n.Blocks.Power.Blocks.PulsePower.name;

        this.Defaults = {
            logic: false,
            pulseLength: App.Config.PulseLength/1000,
        };
        this.PopulateParams();

        this.Outline.push(new Point(0,-1), new Point(1,-1), new Point(1,1), new Point(0,2), new Point(-1,2), new Point(-1,0));
    }

    UpdateConnections() {
        //const newConnections: ISource[] = this.Connections.ToArray();
        //
        //this.OldConnections.forEach((source: ISource) => {
        //    //if pulse is on and is no longer connected to a source, remove power.
        //    if (this.Params.logic && (newConnections.indexOf(source) === -1)) {
        //        source.RemovePower();
        //    }
        //});
        //
        //newConnections.forEach((source: ISource) => {
        //    //if pulse is on and source isn't already connected, add power
        //    if (this.Params.logic && (this.OldConnections.indexOf(source) === -1)) {
        //        source.AddPower();
        //    }
        //});
        //
        //this.OldConnections = newConnections;
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    Dispose(){
        super.Dispose();
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Pulse Power",
            "parameters" : [
                {
                    "type" : "slider",
                    "name" : "Pulse length",
                    "setting" : "pulseLength",
                    "props" : {
                        "value" : this.Params.pulseLength,
                        "min" : 0.01,
                        "max" : 2,
                        "quantised" : false,
                        "centered" : false
                    }
                },
                {
                    "type" : "switches",
                    "name" : "Power",
                    "setting" :"",
                    "switches": [
                        {
                            "name": "Pulse On",
                            "setting": "logic",
                            "value": this.Params.logic,
                            "lit" : true,
                            "mode": "offOn"
                        }
                    ]
                }
            ]
        };
    }

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        switch (param) {
            case 'logic':
                this.PerformLogic();
                break;
            case 'pulseLength':
                this.Params.pulseLength = value;
                break;
        }
        
    }


    PerformLogic() {
        const pulseLength = this.Params.pulseLength*1000;
        // Momentarily Trigger Attack and then release
        this.Params.logic = true;
        let connections: ISource[] = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.AddPower();
            setTimeout(() => {
                source.RemovePower();
            }, pulseLength);
            if (source instanceof ParticleEmitter) {
                (<ParticleEmitter>source).EmitParticle();
            }
        });
        setTimeout(() => {
            this.RefreshOptionsPanel();
        }, pulseLength);

        this.Params.logic = false;
    }
}

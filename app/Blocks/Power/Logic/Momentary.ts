import {Effect} from '../../Effect';
import {ISource} from '../../ISource';
import {Logic} from './Logic';
import {MainScene} from '../../../MainScene';
import {Particle} from '../../../Particle';
import {ParticleEmitter} from './../ParticleEmitter';

export class Momentary extends Logic {

    Init(sketch?: any): void {

        super.Init(sketch);

        this.Outline.push(new Point(0,-1), new Point(1,-1), new Point(1,1), new Point(0,2), new Point(-1,2), new Point(-1,0));
    }

    UpdateConnections() {
        const connections = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.Chain.Sources.forEach((source: ISource) => {
                if (this.Params.logic) {
                    source.TriggerAttack();
                }
                if (!source.IsPressed) {
                    source.TriggerRelease('all');
                }
            });
        });
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"momentary switch");
    }

    Dispose(){
        super.Dispose();
    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "Momentary Switch",
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
            source.Chain.Sources.forEach((source: ISource) => {
                source.TriggerAttackRelease();
                if (source instanceof ParticleEmitter) {
                    (<ParticleEmitter>source).EmitParticle();
                }
            });
        });
        this.Params.logic = false;
    }
}
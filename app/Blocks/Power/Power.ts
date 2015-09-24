import {Effect} from '../Effect';
import {ISource} from '../ISource';
import {MainScene} from '../../MainScene';
import {PowerEffect} from './PowerEffect';

export class Power extends PowerEffect {

    Init(sketch?: any): void {
        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));

    }

    UpdateConnections() {
        const connections = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            if (!source.IsPressed){
                source.TriggerRelease('all');
            }
            source.TriggerAttack();
        });
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"power");
    }

    Dispose(){
        super.Dispose();
    }
}
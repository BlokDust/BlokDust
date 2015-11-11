import {Effect} from '../Effect';
import {IApp} from '../../IApp';
import {ISource} from '../ISource';
import {MainScene} from '../../MainScene';
import {PowerEffect} from './PowerEffect';

declare var App: IApp;

export class Power extends PowerEffect {

    Init(sketch?: any): void {

        this.BlockName = "Power";

        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));

    }

    UpdateConnections() {
        const connections = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.Chain.Sources.forEach((source: ISource) => {
                source.AddPower();
            });
        });
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"power");
    }

    Stop() {
        const connections = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.Chain.Sources.forEach((source: ISource) => {
                source.RemovePower();
            });
        });
    }
}
import {Effect} from '../Effect';
import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../ISource';
import {MainScene} from '../../MainScene';
import Point = etch.primitives.Point;
import {PowerEffect} from './PowerEffect';

declare var App: IApp;

export class Power extends PowerEffect {

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

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
        this.DrawSprite("power");
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

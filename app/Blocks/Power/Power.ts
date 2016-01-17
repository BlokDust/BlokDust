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

        this.BlockName = App.L10n.Blocks.Power.Blocks.Power.name;

        super.Init(drawTo);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));
    }

    UpdateConnections() {
        const newConnections: ISource[] = this.Connections.ToArray();

        this.OldConnections.forEach((source: ISource) => {
            //if power is no longer connected to a source, remove power.
            if (newConnections.indexOf(source) === -1) {
                source.RemovePower();
            }
        });

        newConnections.forEach((source: ISource) => {
            //if source isn't already connected
            if (this.OldConnections.indexOf(source) === -1) {
                source.AddPower();
            }
        });

        this.OldConnections = newConnections;
    }

    Draw() {
        super.Draw();
        this.DrawSprite(this.BlockName);
    }

    Stop() {
        const connections = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.RemovePower();
        });
    }
}

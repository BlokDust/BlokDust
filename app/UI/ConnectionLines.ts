import {DisplayObject} from '../Core/Drawing/DisplayObject';
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {IEffect} from '../Blocks/IEffect';
import {IDisplayContext} from '../Core/Drawing/IDisplayContext';
import {ISource} from '../Blocks/ISource';

declare var App: IApp;

export class ConnectionLines extends DisplayObject {

    Init(sketch: IDisplayContext): void {
        super.Init(sketch);
    }

    Draw() {

        this.Ctx.strokeStyle = App.Palette[15];// BLUE
        this.Ctx.lineWidth = 1;
        this.Ctx.beginPath();

        for (var j = 0; j < App.Sources.length; j++) {
            var block: IBlock = App.Sources[j];
            if ((<ISource>block).Connections.Count) {

                // draw connections to modifiers
                var modifiers = (<ISource>block).Connections.ToArray();

                var grd = App.ScaledGridSize; // this.Grid.Width / this.Grid.Divisor;

                for(var i = 0; i < modifiers.length; i++){
                    var target: IEffect = modifiers[i];

                    var myPos = App.Metrics.PointOnGrid(block.Position);
                    var targetPos = App.Metrics.PointOnGrid(target.Position);

                    var xDif = (targetPos.x - myPos.x) / grd;
                    var yDif = (targetPos.y - myPos.y) / grd;

                    this.Ctx.moveTo(myPos.x, myPos.y);

                    if (xDif > 0) { // RIGHT HALF

                        if (yDif < 0) { // UPPER

                            if (-yDif < xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x + ((xDif - (-yDif))*grd)), Math.round(myPos.y));
                            }

                            if (-yDif > xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y - (((-yDif) - xDif)*grd)));
                            }

                        }

                        if (yDif > 0) { // LOWER

                            if (yDif < xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x + ((xDif - yDif)*grd)), Math.round(myPos.y));
                            }

                            if (yDif > xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y + ((yDif - xDif)*grd)));
                            }
                        }
                    }

                    if (xDif < 0) { // LEFT HALF

                        if (yDif < 0) { // UPPER

                            if (yDif > xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x - ((yDif - xDif)*grd)), Math.round(myPos.y));
                            }

                            if (yDif < xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y - ((xDif - yDif)*grd)));
                            }

                        }

                        if (yDif > 0) { // LOWER

                            if (yDif < -xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x - (((-xDif) - yDif)*grd)), Math.round(myPos.y));
                            }

                            if (yDif > -xDif) {
                                this.Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y + ((yDif - (-xDif))*grd)));
                            }

                        }

                    }

                    this.Ctx.lineTo(targetPos.x, targetPos.y);
                }


            }
        } // end loop

        this.Ctx.stroke();
    }
}
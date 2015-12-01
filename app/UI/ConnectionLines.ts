import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {IEffect} from '../Blocks/IEffect';
import {ISource} from '../Blocks/ISource';
import {MainScene} from './../MainScene';
import {Line} from '../MathObjects/Line';
import {LineList} from '../MathObjects/LineList';

declare var App: IApp;

export class ConnectionLines {

    private _Ctx: CanvasRenderingContext2D;
    private _Sketch: MainScene;
    private _Unpowered: Line[];
    private _Powered: Line[];

    Init(sketch: MainScene): void {

        this._Ctx = sketch.Ctx;
        this._Sketch = sketch;

        this.UpdateList();
    }

    Draw() {

        var grd = App.ScaledGridSize; // this.Grid.Width / this.Grid.Divisor;

        this._Ctx.strokeStyle = App.Palette[15];// BLUE

        this._Ctx.lineWidth = 1;

        this._Ctx.beginPath();
        for (var j = 0; j < this._Unpowered.length; j++) {
            var myPos = App.Metrics.PointOnGrid(this._Unpowered[j].Points[0]);
            this._Ctx.moveTo(myPos.x, myPos.y);
            for(var i = 1; i < this._Unpowered[j].Points.length; i++){
                var myPos = App.Metrics.PointOnGrid(this._Unpowered[j].Points[i]);
                this._Ctx.lineTo(myPos.x, myPos.y);
            }
        }
        this._Ctx.stroke();

        this._Ctx.lineWidth = 2;

        this._Ctx.beginPath();
        for (var j = 0; j < this._Powered.length; j++) {
            var myPos = App.Metrics.PointOnGrid(this._Powered[j].Points[0]);
            this._Ctx.moveTo(myPos.x, myPos.y);
            for(var i = 1; i < this._Powered[j].Points.length; i++){
                var myPos = App.Metrics.PointOnGrid(this._Powered[j].Points[i]);
                this._Ctx.lineTo(myPos.x, myPos.y);
            }
        }
        this._Ctx.stroke();

    }

    /*OldDraw() {

        this._Ctx.strokeStyle = App.Palette[15];// BLUE
        this._Ctx.lineWidth = 1;
        this._Ctx.beginPath();

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


                    this._Ctx.moveTo(myPos.x, myPos.y);

                    if (xDif > 0) { // RIGHT HALF

                        if (yDif < 0) { // UPPER

                            if (-yDif < xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x + ((xDif - (-yDif))*grd)), Math.round(myPos.y));
                            }

                            if (-yDif > xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y - (((-yDif) - xDif)*grd)));
                            }

                        }

                        if (yDif > 0) { // LOWER

                            if (yDif < xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x + ((xDif - yDif)*grd)), Math.round(myPos.y));
                            }

                            if (yDif > xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y + ((yDif - xDif)*grd)));
                            }
                        }
                    }

                    if (xDif < 0) { // LEFT HALF

                        if (yDif < 0) { // UPPER

                            if (yDif > xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x - ((yDif - xDif)*grd)), Math.round(myPos.y));
                            }

                            if (yDif < xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y - ((xDif - yDif)*grd)));
                            }

                        }

                        if (yDif > 0) { // LOWER

                            if (yDif < -xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x - (((-xDif) - yDif)*grd)), Math.round(myPos.y));
                            }

                            if (yDif > -xDif) {
                                this._Ctx.lineTo(Math.round(myPos.x), Math.round(myPos.y + ((yDif - (-xDif))*grd)));
                            }

                        }

                    }

                    this._Ctx.lineTo(targetPos.x, targetPos.y);
                }


            }
        } // end loop

        this._Ctx.stroke();
    }*/

    UpdateList() {


        this._Powered = [];
        this._Unpowered = [];

        for (var j = 0; j < App.Sources.length; j++) {
            var block: ISource = App.Sources[j];
            if ((<ISource>block).Connections.Count) {

                // draw connections to modifiers
                var modifiers = (<ISource>block).Connections.ToArray();

                var grd = App.ScaledGridSize; // this.Grid.Width / this.Grid.Divisor;

                for(var i = 0; i < modifiers.length; i++){
                    var target: IEffect = modifiers[i];

                    var myPos = block.Position;
                    var targetPos = target.Position;
                    var myLine = new Line();

                    var xDif = (targetPos.x - myPos.x);
                    var yDif = (targetPos.y - myPos.y);


                    myLine.Points.push(new Point(myPos.x, myPos.y));

                    if (xDif > 0) { // RIGHT HALF

                        if (yDif < 0) { // UPPER

                            if (-yDif < xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x + ((xDif - (-yDif)))), Math.round(myPos.y)));
                            }

                            if (-yDif > xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x), Math.round(myPos.y - (((-yDif) - xDif)))));
                            }

                        }

                        if (yDif > 0) { // LOWER

                            if (yDif < xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x + ((xDif - yDif))), Math.round(myPos.y)));
                            }

                            if (yDif > xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x), Math.round(myPos.y + ((yDif - xDif)))));
                            }
                        }
                    }

                    if (xDif < 0) { // LEFT HALF

                        if (yDif < 0) { // UPPER

                            if (yDif > xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x - ((yDif - xDif))), Math.round(myPos.y)));
                            }

                            if (yDif < xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x), Math.round(myPos.y - ((xDif - yDif)))));
                            }

                        }

                        if (yDif > 0) { // LOWER

                            if (yDif < -xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x - (((-xDif) - yDif))), Math.round(myPos.y)));
                            }

                            if (yDif > -xDif) {
                                myLine.Points.push(new Point(Math.round(myPos.x), Math.round(myPos.y + ((yDif - (-xDif))))));
                            }

                        }

                    }

                    myLine.Points.push(new Point(targetPos.x, targetPos.y));

                    //console.log(block.IsPowered)
                    if (block.IsPowered()) {
                        this._Powered.push(myLine);
                    } else {
                        this._Unpowered.push(myLine);
                    }
                }


            }
        } // end loop

        //console.log(this._Powered);
        //console.log(this._Unpowered);

    }

}
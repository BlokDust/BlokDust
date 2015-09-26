import {DisplayObject} from '../DisplayObject';
import {Grid} from '../Grid';
import {IApp} from '../IApp';
import {IBlock} from './IBlock';
import {ISketchContext} from '../ISketchContext';
import {MainScene} from '../MainScene';

declare var App: IApp;

export class BlockSprites extends DisplayObject {

    public Grid: Grid;
    public Ctx: CanvasRenderingContext2D;
    private _Scaled: boolean;
    private _Position: Point;
    private _XOffset: number;
    private _YOffset: number;

    Init(sketch: ISketchContext) {
        super.Init(sketch);
        this.Grid = <Grid>sketch;
        this._Scaled = true;
        this._Position = new Point(0,0);
        this._XOffset = 0;
        this._YOffset = 0;
    }

    DrawSprite(pos: Point, scaled: boolean, block: string, pos2?: Point) {

        this._Scaled = scaled;
        this._Position = pos;
        this._XOffset = 0;
        this._YOffset = 0;
        var grd = App.GridSize;

        switch (block) {

            // All block cases must be lower case

            case "autowah":

                if (!this._Scaled) {
                    this._XOffset = (grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(-2,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "bit crusher":

                if (!this._Scaled) {
                    this._YOffset =  grd;
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "chomp":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "chopper":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "chorus":

                if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[10];// ORANGE
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[6];// YELLOW
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "convolution":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[6];// YELLOW
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "delay":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(-1,1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "distortion":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9];// PINK
                this.DrawLineTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;


            case "envelope":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[6];// YELLOW
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "eq":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(2,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "filter":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(-1,-2);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(-1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[6];// YELLOW
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "volume":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[5];// PURPLE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "lfo":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9];// PINK
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[6];// YELLOW
                this.DrawMoveTo(0,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "panner":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9];// PINK
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "phaser":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9];// PINK
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(-1,-2);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(-1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "pitch":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// WHITE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,-1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                /*this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,-1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();*/

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[5];// PURPLE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "reverb":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[6];// YELLOW
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "scuzz":

                if (!this._Scaled) {
                    this._YOffset = grd;
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[10];// ORANGE
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(2,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "tone":

                if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[5];// PURPLE
                this.DrawMoveTo(-2,0);
                this.DrawLineTo(0,-2);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-2,0);
                this.DrawLineTo(0,-2);
                this.DrawLineTo(0,0);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(0,-2);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "noise":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "microphone":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9];// PINK
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "soundcloud":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[10];// ORANGE
                this.DrawMoveTo(1,0);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "sampler":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[1];// RED
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9];// ORANGE
                this.DrawMoveTo(1,0);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "granular":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[5];// PURPLE
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "recorder":

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9];// PINK
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.Ctx.closePath();
                this.Ctx.fill();


                break;

            case "wavegen":

                /*if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }*/

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[5];// PINK
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[10];// WHITE
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();


                break;

            case "computer keyboard":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "midi controller":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4]; //GREEN
                this.DrawLineTo(0,-1);
                this.DrawLineTo(-1,1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[9]; //PINK
                this.DrawLineTo(-1,-1);
                this.DrawLineTo(-1,1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(0,-1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "particle emitter":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[5];// PURPLE
                this.DrawMoveTo(-2,0);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "power":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(2,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[8];// WHITE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "toggle switch":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3]; // BLUE
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7]; // RED
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();


                break;

            case "momentary switch":

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3]; // BLUE
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[5]; // PURPLE
                this.DrawMoveTo(0,1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "laser":

                if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[3];// BLUE
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[4];// GREEN
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                this.Ctx.fillStyle = App.Palette[7];// RED
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case "void":

                /*if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }*/
                this.Ctx.fillStyle = App.Palette[14];// DARK
                /*if (!this._Scaled) {
                    this.Ctx.fillStyle = App.Palette[14];// DARK
                }*/
                this.Ctx.beginPath();
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.fillStyle = App.Palette[8];// WHITE
                if (!this._Scaled) {
                    this.DrawPixel(-1,2,2);
                } else {
                    this.DrawPixel(pos2.x,pos2.y,2);
                }

                this.DrawPixel(-3,-8,1);
                this.DrawPixel(1,-4,1);
                this.DrawPixel(8,-3,1);
                this.DrawPixel(-8,1,1);
                this.DrawPixel(1,9,1);
                break;

        }



    }

    DrawPixel(x,y,size) {
        var s = size * 0.5;
        this.Ctx.beginPath();
        this.DrawFloatMoveTo(x,y);
        this.DrawFloatLineTo(x+s,y);
        this.DrawFloatLineTo(x+s,y+s);
        this.DrawFloatLineTo(x,y+s);
        this.Ctx.closePath();
        this.Ctx.fill();
    }


    DrawMoveTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        var grd = App.GridSize;
        if (this._Scaled) {
            p = App.Metrics.GetRelativePoint(pos, new Point(x, y));
            p = App.Metrics.PointOnGrid(p);
        } else {
            p = new Point(pos.x + (x*grd),pos.y + (y*grd));
        }
        this.Ctx.moveTo(p.x, p.y);
    }


    DrawLineTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        var grd = App.GridSize;
        if (this._Scaled) {
            p = App.Metrics.GetRelativePoint(pos, new Point(x, y));
            p = App.Metrics.PointOnGrid(p);
        } else {
            p = new Point(pos.x + (x*grd),pos.y + (y*grd));
        }
        this.Ctx.lineTo(p.x, p.y);
    }

    DrawFloatMoveTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        if (this._Scaled) {
            p =  App.Metrics.PointOnGrid(new Point(pos.x + ((x/App.GridSize)*App.Unit),pos.y + ((y/App.GridSize)*App.Unit)));
        } else {
            p = new Point(pos.x + (x*App.Unit),pos.y + (y*App.Unit));
        }
        this.Ctx.moveTo(p.x, p.y);
    }


    DrawFloatLineTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        if (this._Scaled) {
            p =  App.Metrics.PointOnGrid(new Point(pos.x + ((x/App.GridSize)*App.Unit),pos.y + ((y/App.GridSize)*App.Unit)));
        } else {
            p = new Point(pos.x + (x*App.Unit),pos.y + (y*App.Unit));
        }
        this.Ctx.lineTo(p.x, p.y);
    }
}
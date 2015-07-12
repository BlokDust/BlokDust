/**
 * Created by luketwyman on 29/01/2015.
 */

import IBlock = require("./IBlock");
import Grid = require("../Grid");
import Size = Fayde.Utils.Size;
import DisplayObject = require("../DisplayObject");
import BlocksSketch = require("../BlocksSketch");

class BlockSprites {

    public Grid: Grid;
    public Ctx: CanvasRenderingContext2D;
    private _Scaled: boolean;
    private _Position: Point;
    private _XOffset: number;
    private _YOffset: number;

    Init(sketch: Fayde.Drawing.SketchContext) {

        this.Ctx = sketch.Ctx;
        this.Grid = <Grid>sketch;
        this._Scaled = true;
        this._Position = new Point(0,0);
        this._XOffset = 0;
        this._YOffset = 0;
    }

    Draw(pos: Point,scaled: boolean, block: string) {

        this._Scaled = scaled;
        this._Position = pos;
        this._XOffset = 0;
        this._YOffset = 0;
        var grd = this.Grid.CellWidth.width;

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

            case "gain":

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


        }



    }


    DrawMoveTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        if (this._Scaled) {
            p = this.Grid.GetRelativePoint(pos, new Point(x, y));
            p = this.GetTransformedPoint(p);
        } else {
            var pos2 = this.Grid.ConvertGridUnitsToAbsolute(new Point(x, y));
            p = this.Grid.GetRelativePoint(pos, pos2);
        }
        this.Ctx.moveTo(p.x, p.y);
    }


    DrawLineTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        if (this._Scaled) {
            p = this.Grid.GetRelativePoint(pos, new Point(x, y));
            p = this.GetTransformedPoint(p);
        } else {
            var pos2 = this.Grid.ConvertGridUnitsToAbsolute(new Point(x, y));
            p = this.Grid.GetRelativePoint(pos, pos2);
        }
        this.Ctx.lineTo(p.x, p.y);
    }


    // converts a point in grid units to absolute units and transforms it
    GetTransformedPoint(point: Point): Point {
        var p: Point = this.Grid.ConvertGridUnitsToAbsolute(point);
        return this.Grid.ConvertBaseToTransformed(p);
    }


}

export = BlockSprites;
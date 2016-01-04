import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {IEffect} from '../Blocks/IEffect';
import {ISource} from '../Blocks/ISource';
import {MainScene} from './../MainScene';
import {Recorder} from '../Blocks/Sources/Recorder';

declare var App: IApp;

export class RecorderPanel extends DisplayObject {

    private _Blocks: Recorder[];
    private _Roll: boolean[];
    public Hover: boolean;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this._Blocks = [];
        this._Roll = [];
        this.Hover = false;

    }

    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------


    Update() {
        // POPULATE LIST OF ACTIVE RECORDER BLOCKS //
        // TODO: THIS IS SHIT - ideal: subscribe to 'blocks changed' event to 'lazy populate' this list
        var blocks = [];
        for (var i = 0; i < App.Blocks.length; i++) {
            var block:IBlock = App.Blocks[i];
            if (block instanceof Recorder) {
                blocks.push(block);
            }
        }
        this._Blocks = blocks;
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------


    Draw() {

        for (var i = 0; i < this._Blocks.length; i++) {
            var block = this._Blocks[i];
            var myPos = App.Metrics.PointOnGrid(block.Position);
            this.DrawPanel(myPos.x,myPos.y,block.IsRecording,this._Roll[i]);
        }
    }

    DrawPanel(x,y,rec,hover) {
        var units = App.Unit;
        var grd = App.GridSize;
        var ctx = this.Ctx;

        var w = grd*3;
        var h = grd*3;

        // DRAW PANEL //
        ctx.fillStyle = App.Palette[14].toString();// Shadow
        ctx.globalAlpha = 0.16;
        this.BGDraw(x, y + (5 * units), w, h, ctx);
        ctx.fillStyle = App.Palette[2].toString(); // Black
        ctx.globalAlpha = 0.9;
        this.BGDraw(x, y, w, h, ctx);
        ctx.globalAlpha = 1;


        // BUTTON //
        if (rec) {
            ctx.fillStyle = App.Palette[App.ThemeManager.Txt].toString(); // WHITE
        } else {
            ctx.fillStyle = App.Palette[13].toString(); // RED
        }
        ctx.beginPath();
        ctx.moveTo(x - grd, y - (w*0.5) - (h*0.5)); // l
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) - grd); // t
        ctx.lineTo(x + grd, y - (w*0.5) - (h*0.5));
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) + grd);
        ctx.closePath();
        ctx.fill();

        if (rec) {
            ctx.fillStyle = App.Palette[App.ThemeManager.Txt].toString(); // WHITE
        } else {
            ctx.fillStyle = App.Palette[12].toString(); // RED
        }
        ctx.beginPath();
        ctx.moveTo(x - grd, y - (w*0.5) - (h*0.5)); // l
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) - grd); // t
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) + grd);
        ctx.closePath();
        ctx.fill();

        if (hover) {
            ctx.fillStyle = App.Palette[App.ThemeManager.Txt].toString(); // WHITE
            ctx.fillRect(x - grd,y - (w*0.5) - (h*0.5) - grd,4*units,4*units);
        }

    }

    // PANEL BACKGROUND //
    BGDraw(x,y,w,h,ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y); // tl
        ctx.lineTo(x - (w*0.5), y - (w*0.5));
        ctx.lineTo(x - (w*0.5), y - (w*0.5) - (h));
        ctx.lineTo(x + (w*0.5), y - (w*0.5) - (h));
        ctx.lineTo(x + (w*0.5), y - (w*0.5));
        ctx.lineTo(x, y - (w*0.5));
        ctx.closePath();
        ctx.fill();
    }


    //-------------------------------------------------------------------------------------------
    //  INTERACTION
    //-------------------------------------------------------------------------------------------


    MouseDown(point) {
        this.RolloverCheck(point);

        for (var i = 0; i < this._Blocks.length; i++) {
            if (this._Roll[i]) {
                this._Blocks[i].ToggleRecording();
            }
        }
    }

    MouseMove(point) {
        this.RolloverCheck(point);
    }


    RolloverCheck(point) {
        this.Hover = false;
        var grd = App.GridSize;

        var w = grd*3;
        var h = grd*3;

        for (var i = 0; i < this._Blocks.length; i++) {
            var block = this._Blocks[i];
            var myPos = App.Metrics.PointOnGrid(block.Position);
            this._Roll[i] = Dimensions.HitRect(myPos.x  - (w*0.5), myPos.y - (w*0.5) - (h), w, h, point.x, point.y);
            if (this._Roll[i]==true) {
                console.log("ROLL " + i);
                this.Hover = true;
            }
        }

    }
}

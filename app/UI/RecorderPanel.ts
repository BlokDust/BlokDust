import Dimensions = Utils.Measurements.Dimensions;
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {Recorder} from '../Blocks/Sources/Recorder';

declare var App: IApp;

export class RecorderPanel extends DisplayObject {

    private _Blocks: Recorder[];
    private _Roll: boolean[];
    public Hover: boolean;

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);

        this._Blocks = [];
        this._Roll = [];
        this.Hover = false;

    }

    //-------------------------------------------------------------------------------------------
    //  UPDATE
    //-------------------------------------------------------------------------------------------


    update() {
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


    draw() {

        for (var i = 0; i < this._Blocks.length; i++) {
            var block = this._Blocks[i];
            var myPos = App.Metrics.PointOnGrid(block.Position);
            this.DrawPanel(myPos.x,myPos.y,block.IsRecording,this._Roll[i]);
        }
    }

    DrawPanel(x,y,rec,hover) {
        var units = App.Unit;
        var grd = App.GridSize;
        var ctx = this.ctx;

        var w = grd*3;
        var h = grd*3;

        // DRAW PANEL //
        App.FillColor(ctx,App.Palette[2]);
        ctx.globalAlpha = 0.16;
        this.BGDraw(x, y + (5 * units), w, h, ctx);
        //App.FillColor(ctx,App.Palette[2]);
        ctx.globalAlpha = 0.9;
        this.BGDraw(x, y, w, h, ctx);
        ctx.globalAlpha = 1;


        // BUTTON //
        var bw = grd;
        if (hover) {
            bw = (grd*1.1);
        }

        if (rec) {
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        } else {
            App.FillColor(ctx,App.Palette[13]);
        }
        ctx.beginPath();
        ctx.moveTo(x - bw, y - (w*0.5) - (h*0.5)); // l
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) - bw); // t
        ctx.lineTo(x + bw, y - (w*0.5) - (h*0.5));
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) + bw);
        ctx.closePath();
        ctx.fill();

        if (rec) {
            App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        } else {
            App.FillColor(ctx,App.Palette[12]);
        }
        ctx.beginPath();
        ctx.moveTo(x - bw, y - (w*0.5) - (h*0.5)); // l
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) - bw); // t
        ctx.lineTo(x, y - (w*0.5) - (h*0.5) + bw);
        ctx.closePath();
        ctx.fill();

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
            this._Roll[i] = Dimensions.hitRect(myPos.x  - (w*0.5), myPos.y - (w*0.5) - (h), w, h, point.x, point.y);
            if (this._Roll[i]==true) {
                this.Hover = true;
            }
        }

    }
}

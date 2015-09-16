/**
 * Created by luketwyman on 28/07/2015.
 */
import DisplayObject = require("../DisplayObject");
import Block = require("../Blocks/Block");

import IApp = require("../IApp");
declare var App: IApp;

class AnimationsLayer extends DisplayObject {


    private _Ctx: CanvasRenderingContext2D;
    public ActiveBlocks: Block[];
    private Loop: number;

    Init(sketch?: any): void {
        super.Init(sketch);
        this._Ctx = App.Canvas.getContext("2d");
        this.ActiveBlocks = [];
        this.Loop = 0;

    }

    Update() {

        if (this.ActiveBlocks.length>0) {
            this.Loop += 1;
        }

        if (this.Loop==60) {
            this.Loop = 0;
        }

    }

    Spin() {
        if (this.ActiveBlocks.length<1) {
            this.Loop += 1;
        }
        if (this.Loop==60) {
            this.Loop = 0;
        }
    }


    AddToList(block) {
        this.RemoveFromList(block);
        this.ActiveBlocks.push(block);
    }
    RemoveFromList(block) {
        var b = this.ActiveBlocks.indexOf(block);
        if(b != -1) {
            this.ActiveBlocks.splice(b,1);
        }
    }


    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------

    public Draw() {


        if (this.ActiveBlocks.length>0) {
            for (var i=0; i<this.ActiveBlocks.length; i++) {
                var block = this.ActiveBlocks[i];
                var blockPos = App.Metrics.PointOnGrid(block.Position);
                this.DrawBubble(blockPos.x,blockPos.y);
                this.DrawSprite("loading",blockPos.x,blockPos.y,6,false);
            }
        }


    }


    DrawBubble(x,y) {
        var ctx = this._Ctx;
        var grd = App.GridSize;

        ctx.strokeStyle = ctx.fillStyle = App.Palette[2];
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.moveTo(x - (grd),y - (2*grd));
        ctx.lineTo(x,y - (2*grd));
        ctx.lineTo(x,y);
        ctx.lineTo(x - (grd),y - (grd));
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    DrawSprite(index: string,x: number,y: number,w: number,c:boolean) {
        var units = App.Unit;
        var ctx = this._Ctx;
        var grd = App.GridSize;
        if (c) { // center on x & y
            grd = 0;
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = App.Palette[App.Color.Txt];
        switch (index) {

            case "loading":

                var angle = (this.Loop/60) * (2*Math.PI);
                ctx.save();
                ctx.translate(x - (0.5*grd),y - (1.5*grd));
                ctx.rotate(angle);
                ctx.fillRect(-((w*0.5)*units),-((w*0.5)*units),w*units,w*units);
                ctx.restore();

                break;

        }
    }

}

export = AnimationsLayer;
/**
 * Created by luketwyman on 28/07/2015.
 */

import Block = require("../Blocks/Block");

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

class AnimationsLayer {

    public Initialised: boolean = false;
    public Timer: Fayde.ClockTimer;
    public LastVisualTick: number = new Date(0).getTime();
    private _Ctx: CanvasRenderingContext2D;
    public ActiveBlocks: Block[];
    private Loop: number;

    constructor () {
        this._Ctx = App.Canvas.getContext("2d");
        this.ActiveBlocks = [];
        this.Loop = 0;

        this.StartAnimating();
        this.Initialised = true;
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

    StartAnimating(): void {
        this.Timer = new Fayde.ClockTimer();
        this.Timer.RegisterTimer(this);
    }

    OnTicked (lastTime: number, nowTime: number) {
        var now = new Date().getTime();
        if (now - this.LastVisualTick < MAX_MSPF) return;
        this.LastVisualTick = now;

        TWEEN.update(nowTime);
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
        var units = App.Unit;
        var ctx = this._Ctx;
        var dx = App.Width * 0.5;
        var dy = App.Height * 0.5;
        var italic = App.TxtItalic;
        var grd = App.GridSize;


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
        ctx.fillStyle = App.Palette[8];
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
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayContext = etch.drawing.IDisplayContext;
import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';

declare var App: IApp;

export class AnimationsLayer extends DisplayObject {

    public ActiveBlocks: IBlock[] = [];
    private Loop: number = 0;
    private Spinning: boolean = false;

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);
    }

    update() {
        super.update();
        if (this.Spinning) {
            this.Loop += 1;
        }

        if (this.Loop === 60) {
            this.Loop = 0;
        }
    }

    Spin() {
        if (this.ActiveBlocks.length<1) {
            this.Loop += 1;
        }
        if (this.Loop === 60) {
            this.Loop = 0;
        }
    }

    AddToList(block: IBlock) {
        this.RemoveFromList(block);
        this.ActiveBlocks.push(block);
    }

    RemoveFromList(block: IBlock) {
        var b = this.ActiveBlocks.indexOf(block);
        if(b != -1) {
            this.ActiveBlocks.splice(b,1);
        }
    }

    //-------------------------------------------------------------------------------------------
    //  DRAWING
    //-------------------------------------------------------------------------------------------

    public draw() {
        if (this.ActiveBlocks.length>0) {
            for (var i=0; i<this.ActiveBlocks.length; i++) {
                var block: IBlock = this.ActiveBlocks[i];
                var blockPos = App.Metrics.PointOnGrid(block.Position);
                this.DrawBubble(blockPos.x,blockPos.y);
                this.DrawSprite(this.ctx,"loading",blockPos.x,blockPos.y,6,false);
            }
            this.Spinning = true;
        }
    }

    DrawBubble(x,y) {
        var grd = App.GridSize;

        App.FillColor(this.ctx,App.Palette[2]);
        this.ctx.globalAlpha = 0.95;
        this.ctx.beginPath();
        this.ctx.moveTo(x - (grd),y - (2*grd));
        this.ctx.lineTo(x,y - (2*grd));
        this.ctx.lineTo(x,y);
        this.ctx.lineTo(x - (grd),y - (grd));
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }

    DrawSprite(ctx, index: string, x: number, y: number, w: number, c:boolean) {
        var units = App.Unit;
        var grd = App.GridSize;
        if (c) { // center on x & y
            grd = 0;
        }
        this.Spinning = true;
        ctx.globalAlpha = 1;
        App.FillColor(ctx,App.Palette[App.ThemeManager.Txt]);
        switch (index) {

            case "loading":

                var angle = (this.Loop/60) * (2*Math.PI);
                var v1 = App.Metrics.VectorFromAngle(angle + (Math.PI*0.25));
                var v2 = App.Metrics.VectorFromAngle(angle + (Math.PI*0.75));
                var vx = x - (0.5*grd);
                var vy = y - (1.5*grd);
                var r = (w*0.75)*units;

                ctx.beginPath();
                ctx.moveTo(vx + (v1.x * r),vy + (v1.y * r));
                ctx.lineTo(vx + (v2.x * r),vy + (v2.y * r));
                ctx.lineTo(vx - (v1.x * r),vy - (v1.y * r));
                ctx.lineTo(vx - (v2.x * r),vy - (v2.y * r));
                ctx.closePath();
                ctx.fill();


                /*ctx.save();
                ctx.translate(x - (0.5*grd),y - (1.5*grd));
                ctx.rotate(angle);
                ctx.fillRect(-((w*0.5)*units),-((w*0.5)*units),w*units,w*units);
                ctx.restore();*/

                break;

        }
    }
}

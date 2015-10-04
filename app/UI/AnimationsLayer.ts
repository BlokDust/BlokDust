import {Block} from '../Blocks/Block';
import {DisplayObject} from '../Core/Drawing/DisplayObject';
import {IApp} from '../IApp';
import {ISketchContext} from '../Core/Drawing/ISketchContext';

declare var App: IApp;

export class AnimationsLayer extends DisplayObject {

    public ActiveBlocks: Block[] = [];
    private Loop: number = 0;

    Init(sketch: ISketchContext): void {
        super.Init(sketch);
    }

    Update() {

        if (this.ActiveBlocks.length > 0) {
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
        var grd = App.GridSize;

        this.Ctx.strokeStyle = this.Ctx.fillStyle = App.Palette[2];
        this.Ctx.globalAlpha = 0.95;
        this.Ctx.beginPath();
        this.Ctx.moveTo(x - (grd),y - (2*grd));
        this.Ctx.lineTo(x,y - (2*grd));
        this.Ctx.lineTo(x,y);
        this.Ctx.lineTo(x - (grd),y - (grd));
        this.Ctx.fill();
        this.Ctx.globalAlpha = 1;
    }

    DrawSprite(index: string,x: number,y: number,w: number,c:boolean) {
        var units = App.Unit;
        var grd = App.GridSize;
        if (c) { // center on x & y
            grd = 0;
        }
        this.Ctx.globalAlpha = 1;
        this.Ctx.fillStyle = App.Palette[App.Color.Txt];
        switch (index) {

            case "loading":

                var angle = (this.Loop/60) * (2*Math.PI);
                this.Ctx.save();
                this.Ctx.translate(x - (0.5*grd),y - (1.5*grd));
                this.Ctx.rotate(angle);
                this.Ctx.fillRect(-((w*0.5)*units),-((w*0.5)*units),w*units,w*units);
                this.Ctx.restore();

                break;

        }
    }
}

import Size = minerva.Size;
import {IApp} from '../IApp';
import {MainScene} from './../MainScene';
import Point = etch.primitives.Point;

declare var App: IApp;

export class MenuItem {

    public Position: Point;
    public Size: Size;
    public Name: string;
    public ID;
    public Description: string;
    public Selected: number;
    public Hover: boolean;
    public InfoHover: boolean;
    public BackHover: boolean;
    public InfoOffset: number;
    private _MainScene: MainScene;
    public MouseIsDown: boolean;
    public MousePoint: Point;
    public ctx: CanvasRenderingContext2D;

    constructor (position: Point, size: Size, name: string, id, description: string, sketch: MainScene) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.ID = id;
        this.Description = description;
        this.Selected = 0;
        this.Hover = false;
        this.InfoHover = false;
        this.BackHover = false;
        this.InfoOffset = 0;
        this._MainScene = sketch;
        this.MouseIsDown = false;
    }

    Draw(displayContext: IDisplayContext, units, x: number, y: number) {
        this.ctx = displayContext.ctx;
        this.ctx.globalAlpha = 1;
        var y = this.Position.y - (y*units) - (this.InfoOffset*units);

        // NAME //
        App.FillColor(this.ctx,App.Palette[App.ThemeManager.Txt]);
        App.StrokeColor(this.ctx,App.Palette[App.ThemeManager.Txt]);
        var dataType = units*10;
        this.ctx.textAlign = "center";
        this.ctx.font = App.Metrics.TxtMid;
        this.ctx.fillText(this.Name,x,y + (40*units));

        // INFO BUTTON //
        this.ctx.lineWidth = 1;
        var ix = x - (40*units);
        var iy = y - (30*units);
        var diamond = 11;
        this.ctx.beginPath();
        this.ctx.moveTo(ix - (diamond*units), iy);
        this.ctx.lineTo(ix, iy - (diamond*units));
        this.ctx.lineTo(ix + (diamond*units), iy);
        this.ctx.lineTo(ix, iy + (diamond*units));
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fillText("?",ix,iy + (dataType*0.38));

        if (this.InfoOffset!==0) {
            // INFO ARROW //
            this.ctx.lineWidth = 2;
            var ay = y + (this.Size.height*1.5) - (30*units);
            this.ctx.beginPath();
            this.ctx.moveTo(x - (diamond*units), ay);
            this.ctx.lineTo(x, ay + (diamond*units));
            this.ctx.lineTo(x + (diamond*units), ay);
            this.ctx.stroke();

            // INFO TEXT //
            this.ctx.textAlign = "left";
            var bodyType = units*7.5;
            this.ctx.font = App.Metrics.TxtItalic;
            this.PrintAtWordWrap(this.ctx, this.Description, x -(this.Size.width*0.5) + (10*units), y + this.Size.height - (30*units), bodyType*1.5, (this.Size.width) - (20*units));

            // VERTICAL LINES //
            App.StrokeColor(this.ctx,App.Palette[1]);
            this.ctx.beginPath();
            this.ctx.moveTo(Math.round(x - (this.Size.width*0.5))+1,y + (this.Size.height*0.5) + (20*units));
            this.ctx.lineTo(Math.round(x - (this.Size.width*0.5))+1,y + (this.Size.height*1.5) - (20*units));
            this.ctx.moveTo(Math.round(x + (this.Size.width*0.5))-1,y + (this.Size.height*0.5) + (20*units));
            this.ctx.lineTo(Math.round(x + (this.Size.width*0.5))-1,y + (this.Size.height*1.5) - (20*units));
            this.ctx.stroke();
        }

        // ICON //
        App.BlockSprites.DrawSprite(displayContext, new Point(x,y-(7.5*units)), false, this.Name.toLowerCase());
    }

    PrintAtWordWrap( context , text, x, y, lineHeight, fitWidth) {
        fitWidth = fitWidth || 0;

        if (fitWidth <= 0)
        {
            context.fillText( text, x, y );
            return;
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length)
        {
            var str = words.slice(0,idx).join(' ');
            var w = context.measureText(str).width;
            if ( w > fitWidth )
            {
                if (idx==1)
                {
                    idx=2;
                }
                context.fillText( words.slice(0,idx-1).join(' '), x, y + (lineHeight*currentLine) );
                currentLine++;
                words = words.splice(idx-1);
                idx = 1;
            }
            else
            {idx++;}
        }
        if  (idx > 0)
            context.fillText( words.join(' '), x, y + (lineHeight*currentLine) );
    }

    MouseDown(point) {
        this.MouseIsDown = true;
        this.MousePoint = new Point(point.x,point.y);
    }

    MouseMove(point,header,cutoff) {

        if (this.MouseIsDown && this.InfoOffset==0) {
            this.MousePoint = new Point(point.x,point.y);

            // CREATE BLOCK //
            if (point.y > cutoff) {
                header.ClosePanel();
                this.MouseIsDown = false;
                this._MainScene.CreateBlockFromType(this.ID);
            }
        }
    }

    MouseUp() {
        this.MouseIsDown = false;
    }

}
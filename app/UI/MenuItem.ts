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
    public Ctx: CanvasRenderingContext2D;

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
        this.Ctx = displayContext.Ctx;
        this.Ctx.globalAlpha = 1;
        var y = this.Position.y - (y*units) - (this.InfoOffset*units);

        // NAME //
        App.FillColor(this.Ctx,App.Palette[App.ThemeManager.Txt]);
        App.StrokeColor(this.Ctx,App.Palette[App.ThemeManager.Txt]);
        var dataType = units*10;
        this.Ctx.textAlign = "center";
        this.Ctx.font = App.Metrics.TxtMid;
        this.Ctx.fillText(this.Name,x,y + (40*units));

        // INFO BUTTON //
        this.Ctx.lineWidth = 1;
        var ix = x - (40*units);
        var iy = y - (30*units);
        var diamond = 11;
        this.Ctx.beginPath();
        this.Ctx.moveTo(ix - (diamond*units), iy);
        this.Ctx.lineTo(ix, iy - (diamond*units));
        this.Ctx.lineTo(ix + (diamond*units), iy);
        this.Ctx.lineTo(ix, iy + (diamond*units));
        this.Ctx.closePath();
        this.Ctx.stroke();
        this.Ctx.fillText("?",ix,iy + (dataType*0.38));

        if (this.InfoOffset!==0) {
            // INFO ARROW //
            this.Ctx.lineWidth = 2;
            var ay = y + (this.Size.height*1.5) - (30*units);
            this.Ctx.beginPath();
            this.Ctx.moveTo(x - (diamond*units), ay);
            this.Ctx.lineTo(x, ay + (diamond*units));
            this.Ctx.lineTo(x + (diamond*units), ay);
            this.Ctx.stroke();

            // INFO TEXT //
            this.Ctx.textAlign = "left";
            var bodyType = units*7.5;
            this.Ctx.font = App.Metrics.TxtItalic;
            this.PrintAtWordWrap(this.Ctx, this.Description, x -(this.Size.width*0.5) + (10*units), y + this.Size.height - (30*units), bodyType*1.5, (this.Size.width) - (20*units));

            // VERTICAL LINES //
            App.StrokeColor(this.Ctx,App.Palette[1]);
            this.Ctx.beginPath();
            this.Ctx.moveTo(Math.round(x - (this.Size.width*0.5))+1,y + (this.Size.height*0.5) + (20*units));
            this.Ctx.lineTo(Math.round(x - (this.Size.width*0.5))+1,y + (this.Size.height*1.5) - (20*units));
            this.Ctx.moveTo(Math.round(x + (this.Size.width*0.5))-1,y + (this.Size.height*0.5) + (20*units));
            this.Ctx.lineTo(Math.round(x + (this.Size.width*0.5))-1,y + (this.Size.height*1.5) - (20*units));
            this.Ctx.stroke();
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
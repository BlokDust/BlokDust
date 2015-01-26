/**
 * Created by luketwyman on 25/01/2015.
 */
import App = require("./App");
import Size = Fayde.Utils.Size;
import Grid = require("./Grid");
import BlocksSketch = require("./BlocksSketch");

class Header {

    private _Ctx: CanvasRenderingContext2D;
    private _Units: number;
    private _Sketch: BlocksSketch;
    private _Height: number;
    public MenuItems: string[] = [];
    private _MenuWidths: number[];

    constructor(ctx: CanvasRenderingContext2D,sketch: BlocksSketch) {
        this._Ctx = ctx;
        this._Sketch = sketch;
        this._Units = 1.7;
        this._Height = 60;
        this.MenuItems = ["POWER", "SOURCE", "EFFECTS", "INTERACTION"];
        this._MenuWidths = [];



    }

    Draw() {
        var units = this._Sketch.ScaledUnit.width;
        var ctx = this._Ctx;
        var dataType = units*10;
        var headerType = Math.round(units*28);
        var gutter = 60;

        // BG //
        ctx.fillStyle = "#000";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(0,0,this._Sketch.Width,this._Height*units);

        // TT //
        ctx.globalAlpha = 1;
        ctx.fillStyle = App.Palette[8];// Grey
        ctx.textAlign = "left";
        ctx.font = "200 " + headerType + "px Dosis";
        ctx.fillText("BLOKDUST",20*units,((this._Height*units) * 0.5) + (headerType * 0.38));

        // MENU //
        ctx.textAlign = "left";

        ctx.fillStyle = App.Palette[8];// White
        ctx.strokeStyle = "#393d43";// Grey
        ctx.font = "400 " + dataType + "px Dosis";
        var menuWidths = [0];
        var menuWidth = 0;
        // total text width //
        for (var i=0;i<this.MenuItems.length;i++) {
            menuWidths[i+1] = this._Ctx.measureText(this.MenuItems[i]).width;
            menuWidth += menuWidths[i+1];
        }
        // total gutter width //
        menuWidth += ((this.MenuItems.length-1)*(gutter*units));
        var menuX = ((this._Sketch.Width*0.5) - (menuWidth*0.5));

        // draw menu items & dividers //
        for (var i=0;i<this.MenuItems.length;i++) {
            menuX += menuWidths[i];
            if (i>0) {
                menuX += (gutter*units);
                ctx.beginPath();
                ctx.moveTo(menuX-((gutter*0.5)*units),((this._Height*units)*0.5)-(16*units));
                ctx.lineTo(menuX-((gutter*0.5)*units),((this._Height*units)*0.5)+(16*units));
                ctx.stroke();
            }
            ctx.fillText(this.MenuItems[i], menuX ,((this._Height*units) * 0.5) + (dataType * 0.38));
        }


    }

}

export = Header;
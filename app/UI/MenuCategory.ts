/**
 * Created by luketwyman on 26/01/2015.
 */

import Size = Fayde.Utils.Size;
import Grid = require("./../Grid");
import Header = require("./Header");
import MenuItem = require("./MenuItem");

class MenuCategory {

    public Position: Point;
    public Size: Size;
    public Name: string;
    public Items: MenuItem[] = [];
    public Selected: number;
    public Hover: boolean;
    public XOffset: number;
    public YOffset: number;
    public Pages: number;
    public CurrentPage: number;

    constructor (position: Point, size: Size, name: string, offset: number) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Selected = 0;
        this.Hover = false;
        this.XOffset = 0;
        this.YOffset = offset;
        this.CurrentPage = 0;
    }

    Draw(ctx,units,header: any,offset) {
        ctx.globalAlpha = 1;
        var dataType = units*10;
        var thisHeight = Math.round(header.Height*units);
        var dropDown = Math.round(header.DropDown*units);
        var x = this.Position.x;
        var width = (this.Size.Width*0.5);




        ctx.beginPath();
        ctx.moveTo(x - width,offset);
        ctx.lineTo(x + width ,offset);
        ctx.lineTo(x + width,offset + (thisHeight*this.Selected));
        ctx.lineTo(x + (10*units),offset + (thisHeight*this.Selected));
        ctx.lineTo(x,offset + ((thisHeight + (10*units))*this.Selected));
        ctx.lineTo(x - (10*units),offset + (thisHeight*this.Selected));
        ctx.lineTo(x - width,offset + (thisHeight*this.Selected));
        ctx.closePath();
        ctx.fill();


        // TEXT //
        ctx.fillStyle = App.Palette[8];// White
        ctx.fillText(this.Name, x ,offset + (thisHeight * 0.5) + (dataType * 0.38));

        // HOVER //
        if (this.Hover && dropDown<1) {
            ctx.fillStyle = App.Palette[2];// Black
            ctx.globalAlpha = 0.9;

            ctx.beginPath();
            ctx.moveTo(x - (10*units),offset + thisHeight);
            ctx.lineTo(x,offset + thisHeight + (10*units));
            ctx.lineTo(x + (10*units),offset + thisHeight);
            ctx.closePath();
            ctx.fill();

        }
    }

}

export = MenuCategory;
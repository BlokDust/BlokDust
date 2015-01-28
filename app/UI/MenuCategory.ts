/**
 * Created by luketwyman on 26/01/2015.
 */

import App = require("./../App");
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

    constructor (position: Point, size: Size, name: string) {
        this.Position = position;
        this.Size = size;
        this.Name = name;
        this.Selected = 0;
        this.Hover = false;
    }

    Draw(ctx,units,header: Header) {
        ctx.globalAlpha = 1;
        var dataType = units*10;
        var headerType = Math.round(units*28);
        var thisHeight = Math.round(header.Height*units);
        var dropDown = Math.round(header.DropDownHeight*units);
        var x = this.Position.x;
        var width = (this.Size.Width*0.5);




        ctx.beginPath();
        ctx.moveTo(x - width,0);
        ctx.lineTo(x + width ,0);
        ctx.lineTo(x + width,thisHeight*this.Selected);
        ctx.lineTo(x + (10*units),thisHeight*this.Selected);
        ctx.lineTo(x,(thisHeight + (10*units))*this.Selected);
        ctx.lineTo(x - (10*units),thisHeight*this.Selected);
        ctx.lineTo(x - width,thisHeight*this.Selected);
        ctx.closePath();
        ctx.fill();


        // TEXT //
        ctx.fillStyle = App.Palette[8];// White
        ctx.fillText(this.Name, x ,(thisHeight * 0.5) + (dataType * 0.38));

        // HOVER //
        if (this.Hover && dropDown<1) {
            ctx.fillStyle = "#000";
            ctx.globalAlpha = 0.9;

            ctx.beginPath();
            ctx.moveTo(x - (10*units),thisHeight);
            ctx.lineTo(x,thisHeight + (10*units));
            ctx.lineTo(x + (10*units),thisHeight);
            ctx.closePath();
            ctx.fill();

        }
    }

}

export = MenuCategory;
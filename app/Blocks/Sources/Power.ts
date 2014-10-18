/// <reference path="../../refs.ts" />

import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifiable = require("../IModifiable");
import Modifiable = require("../Modifiable");

class Power extends Modifiable{

    constructor(ctx:CanvasRenderingContext2D, position:Point) {
        super(ctx, position);
    }

    Update(ctx:CanvasRenderingContext2D) {
        super.Update(ctx);
    }

    // power blocks are green circles
    Draw(ctx: CanvasRenderingContext2D) {
        super.Draw(ctx);

        ctx.globalAlpha = this.IsPressed ? 0.5 : 1;
        //color(col[0]);// BLUE
        ctx.fillStyle = "#40e6ff";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(1,-2);
        this.DrawLineTo(2,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        ctx.closePath();
        ctx.fill();

        //color(col[1]); // GREEN
        ctx.fillStyle = "#1add8d";
        this.DrawMoveTo(0,0);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        ctx.closePath();
        ctx.fill();

        //color(col[5]); // WHITE
        ctx.fillStyle = "#fff";
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(1,-2);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(0,0);
        ctx.closePath();
        ctx.fill();
    }
}

export = Power;
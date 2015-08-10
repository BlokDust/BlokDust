/**
 * Created by luketwyman on 05/08/2015.
 */


import Block = require("../Block");
import MainScene = require("../../MainScene");


class Void extends Block {

    public StarPos: Point;

    Init(sketch?: any): void {
        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(0,-1), new Point(1,0), new Point(0,1));

        this.StarPos = this.RandomStarPos();
    }

    RandomStarPos() {
        var x = Math.round(Math.random()*10);
        var y = Math.round(Math.random()*(10 - x));
        var dice = Math.floor(Math.random()*2);
        if (dice==0) {x = -x;}
        dice = Math.floor(Math.random()*2);
        if (dice==0) {y = -y;}
        return new Point(x,y);
    }


    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"void",this.StarPos);
    }

    Dispose(){
        super.Dispose();
    }
}

export = Void;
import Effect = require("../Effect");
import PowerEffect = require("./PowerEffect");
import ISource = require("../ISource");
import MainScene = require("../../MainScene");


class Power extends PowerEffect {

    Init(sketch?: any): void {
        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));

    }

    Attach(source:ISource): void {
        super.Attach(source);

        source.TriggerAttack();

    }

    Detach(source:ISource): void {

        if (!source.IsPressed){
            source.TriggerRelease('all');
        }

        super.Detach(source);
    }

    Draw() {
        super.Draw();
        (<MainScene>this.Sketch).BlockSprites.Draw(this.Position,true,"power");
    }

    Dispose(){
        super.Dispose();
    }
}

export = Power;
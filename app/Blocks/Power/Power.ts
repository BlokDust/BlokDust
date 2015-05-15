import Effect = require("../Effect");
import ISource = require("../ISource");
import BlocksSketch = require("../../BlocksSketch");


class Power extends Effect {

    Name: string;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Name = 'Power';

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(0, 1));
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
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"power");
    }

    Dispose(){
        super.Dispose();
    }
}

export = Power;
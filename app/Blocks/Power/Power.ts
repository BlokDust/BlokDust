import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");

class Power extends Effect {

    Name: string;

    constructor(grid: Grid, position: Point){

        super(grid, position);

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
            source.TriggerRelease();
        }

        super.Detach(source);
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"power");
    }

    Delete(){
        super.Delete();
    }
}

export = Power;
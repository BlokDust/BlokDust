import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import Type = require("./../BlockType");
import BlockType = Type.BlockType;
import Soundcloud = require("./../Sources/Soundcloud");

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

        if (source.BlockType == BlockType.Soundcloud){
            source.Source.start(source.Source.toSeconds((<Soundcloud>source).LoopStartPosition));
        }
        if (source.Envelope){
            source.Envelope.triggerAttack();
        }
    }

    Detach(source:ISource): void {
        super.Detach(source);

        if (source.Envelope){
            source.Envelope.triggerRelease();
        }
        if (source.BlockType == BlockType.Soundcloud){
            source.Source.stop(source.Source.toSeconds(source.Source.release));
        }
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
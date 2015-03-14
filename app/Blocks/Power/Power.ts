import Effect = require("../Effect");
import ISource = require("../ISource");
import Grid = require("../../Grid");
import Type = require("./../BlockType");
import BlocksSketch = require("../../BlocksSketch");
import BlockType = Type.BlockType;
import Soundcloud = require("./../Sources/Soundcloud");

class Power extends Effect {

    Name: string;
    IsAttached: boolean;

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        this.Name = 'Power';

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(0, 1));
    }

    Attach(source:ISource): void {
        super.Attach(source);

        //if (source.BlockType == BlockType.Soundcloud){
        //    source.Source.start(source.Source.toSeconds((<Soundcloud>source).LoopStartPosition));
        //}
        if (source.Envelope){
            source.Envelope.triggerAttack();
        }

    }

    Detach(source:ISource): void {

        if (source.Envelope){
            source.Envelope.triggerRelease();
        }
        //if (source.BlockType == BlockType.Soundcloud){
        //    source.Source.stop(source.Envelope.release);
        //}

        super.Detach(source);
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"power");
    }

    Delete(){
        super.Delete();
    }
}

export = Power;
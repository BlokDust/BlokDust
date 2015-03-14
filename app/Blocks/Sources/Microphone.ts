import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;

class Microphone extends Source {


    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.BlockType = BlockType.Microphone;
        this.Source = new Tone.Microphone();

        super.Init(sketch);

        this.Source.start();
        this.Source.connect(this.EffectsChainInput);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    MouseDown() {
        super.MouseDown();
    }

    MouseUp() {
        super.MouseUp();
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"microphone");
    }
}

export = Microphone;
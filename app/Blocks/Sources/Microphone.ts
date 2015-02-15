import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Source = require("./Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;
import Particle = require("../../Particle");

class Microphone extends Source {

    public DelayedRelease: number;

    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Microphone;
        this.DelayedRelease = 0;

        super(grid, position);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, 0),new Point(1, 1),new Point(0, 2),new Point(-1, 1));
    }

    MouseDown() {
        super.MouseDown();

        //TODO: Should we have arming/disarming microphone functionality

    }

    MouseUp() {
        super.MouseUp();

        //TODO: Should we have arming/disarming microphone functionality
    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);


        this.DelayedRelease = 5; //TODO, THIS IS SHIT

        particle.Dispose();
    }

    Update() {
        super.Update();

        if (this.DelayedRelease>0) { //TODO, THIS IS SHIT
            this.DelayedRelease -= 1;
            if (this.DelayedRelease==0) {
                this.Envelope.triggerRelease();
            }
        }
    }

    Draw() {
        super.Draw();
        this.Grid.BlockSprites.Draw(this.Position,true,"microphone");
    }
}

export = Microphone;
import Effect = require("../../Effect");
import ISource = require("../../ISource");
import Particle = require("../../../Particle");

class Logic extends Effect {

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        if (!this.Params) {
            this.Params = {
                logic: 0 //TODO: this line should be boolean when using boolean switch UI
            };
        }

        super.Init(sketch);

        this.Outline.push(new Point(-1,0), new Point(1,-2), new Point(2,-1), new Point(2,0), new Point(0,2), new Point(-1,1));
    }

    /**
     * Perform logic when particle hits
     * @param particle
     * @constructor
     */
    ParticleCollision(particle: Particle) {
        this.PerformLogic();
        particle.Dispose();
    }

    PerformLogic(){

    }

}

export = Logic;
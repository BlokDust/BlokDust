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
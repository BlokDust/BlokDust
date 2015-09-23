import Effect = require("../../Effect");
import PowerEffect = require("./../PowerEffect");
import ISource = require("../../ISource");
import Particle = require("../../../Particle");
import ISketchContext = Fayde.Drawing.ISketchContext;

class Logic extends PowerEffect {

    public Params: LogicParams;

    Init(sketch: ISketchContext): void {

        if (!this.Params) {
            this.Params = {
                logic: false,
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
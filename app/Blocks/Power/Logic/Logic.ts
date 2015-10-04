import {Effect} from '../../Effect';
import {IDisplayContext} from '../../../Core/Drawing/IDisplayContext';
import {ISource} from '../../ISource';
import {Particle} from '../../../Particle';
import {PowerEffect} from './../PowerEffect';

export class Logic extends PowerEffect {

    public Params: LogicParams;

    Init(sketch: IDisplayContext): void {

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

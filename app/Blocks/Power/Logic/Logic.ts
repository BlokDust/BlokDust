import {Effect} from '../../Effect';
import {ISource} from '../../ISource';
import {Particle} from '../../../Particle';
import {PowerEffect} from './../PowerEffect';

export class Logic extends PowerEffect {

    public Params: LogicParams;
    public Defaults: LogicParams;

    Init(sketch?: any): void {


        this.Defaults = {
            logic: false
        };
        this.PopulateParams();

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
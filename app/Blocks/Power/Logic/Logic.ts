import {Effect} from '../../Effect';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../../ISource';
import {Particle} from '../../../Particle';
import {PowerEffect} from './../PowerEffect';

export class Logic extends PowerEffect {

    public Params: LogicParams;
    public Defaults: LogicParams;

    Init(drawTo: IDisplayContext): void {


        this.Defaults = {
            logic: false
        };
        this.PopulateParams();

        super.Init(drawTo);

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

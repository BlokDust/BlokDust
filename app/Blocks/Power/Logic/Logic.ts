import {Effect} from '../../Effect';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../../ISource';
import {Particle} from '../../../Particle';
import {PowerEffect} from './../PowerEffect';

export class Logic extends PowerEffect {

    public Params: LogicParams;
    public Defaults: LogicParams;
    public ScheduledLogic: boolean = false;

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);
    }

    update() {
        super.update();

        if (this.ScheduledLogic) {
            this.ScheduledLogic = false;
            this.PerformLogic();
        }
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

    ScheduleLogic() {
        this.ScheduledLogic = true;
    }

}

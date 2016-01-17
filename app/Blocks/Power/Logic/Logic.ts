import {Effect} from '../../Effect';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../../ISource';
import {Particle} from '../../../Particle';
import {PowerEffect} from './../PowerEffect';

export class Logic extends PowerEffect {

    public Params: LogicParams;
    public Defaults: LogicParams;
    public ScheduledLogic: boolean = false;

    Init(drawTo: IDisplayContext): void {


        this.Defaults = {
            logic: false
        };
        this.PopulateParams();

        super.Init(drawTo);

    }

    Update() {
        super.Update();

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

module perfex {
    var timings: ITiming[] = [];
    export interface ITiming {
        tag: string;
        context: any;
        phase: IPhase;
        start: number;
        duration: number;
    }

    var markers: IMarker[] = [];
    interface IMarker {
        tag: string;
        context: any;
        start: number;
    }

    export class timer {
        static get all (): ITiming[] {
            return timings.slice(0);
        }

        static get (tag?: string, phase?: string) {
            return timer.all
                .filter(m => tag == null || m.tag === tag)
                .filter(m => phase == null || m.phase.tag === phase);
        }

        static count (tag?: string, phase?: string) {
            return timer.get(tag, phase).length;
        }

        static getSplit (tag?: string, phase?: string): ISplitTiming[] {
            //Implemented in split.ts
            return [];
        }

        static getUniqueTags (): string[] {
            return timer.all.map(t => t.tag)
                .reduce((agg, cur) => {
                    if (agg.indexOf(cur) > -1)
                        return agg;
                    return agg.concat([cur]);
                }, []);
        }

        static reset () {
            timings.length = 0;
        }

        static start (tag: string, context: any) {
            markers.push({
                tag: tag,
                context: context,
                start: performance.now()
            });
        }

        static stop () {
            var marker = markers.pop();
            timings.push({
                tag: marker.tag,
                context: marker.context,
                phase: phases.current,
                start: marker.start,
                duration: performance.now() - marker.start
            });
        }
    }
}
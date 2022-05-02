/// <reference path="timer" />

module perfex {
    export interface ISplit {
        start: number;
        end: number;
    }
    export interface ISplitTiming extends ITiming {
        exclusions: ISplit[];
    }
    perfex.timer.getSplit = function (tag?: string, phase?: string): ISplitTiming[] {
        var all = timer.get(null, null)
            .sort((a, b) => (a.start === b.start) ? 0 : (a.start < b.start ? -1 : 1));
        var filtered = timer.get(tag, phase)
            .sort((a, b) => (a.start === b.start) ? 0 : (a.start < b.start ? -1 : 1))
            .map(timing => ({
                tag: timing.tag,
                context: timing.context,
                phase: timing.phase,
                start: timing.start,
                duration: timing.duration,
                exclusions: []
            }));

        filtered.forEach(timing => splitTiming(timing, all));
        return filtered;
    };

    function splitTiming (timing: ISplitTiming, all: ITiming[]) {
        //Initializes timing.exclusions which is first-level child timings
        all.filter(inner => !isSameTiming(timing, inner))
            .filter(inner => isTimingInside(timing, inner))
            .forEach(inner => {
                //Assumes incoming timings are processed in order
                if (timing.exclusions.some(exclusion => (inner.start > exclusion.start && (inner.start + inner.duration) < exclusion.end)))
                    return;
                timing.exclusions.push({start: inner.start, end: inner.start + inner.duration});
            });
    }

    function isSameTiming (timing1: ITiming, timing2: ITiming) {
        return timing1.tag === timing2.tag
            && timing1.start === timing2.start
            && timing1.duration === timing2.duration;
    }

    function isTimingInside (timing: ITiming, test: ITiming): boolean {
        var end = timing.start + timing.duration;
        var tend = test.start + test.duration;
        return timing.start <= test.start
            && end >= tend;
    }
}

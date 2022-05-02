module perfex {
    export function total (tag: string, phase?: string): number {
        return timer.get(tag, phase)
            .sort((a, b) => (a.start === b.start) ? 0 : (a.start < b.start ? -1 : 1))
            .reduce((agg, cur) => {
                if (timingsContain(agg, cur))
                    return agg;
                return agg.concat([cur]);
            }, [])
            .reduce((agg, m) => agg + (m.duration || 0), 0);
    }

    function timingsContain (timings: ITiming[], test: ITiming): boolean {
        return timings.some(timing => timing.tag === test.tag && timingContains(timing, test));
    }

    function timingContains (timing: ITiming, test: ITiming): boolean {
        return (timing.start < test.start)
            && ((timing.start + timing.duration) > (test.start + test.duration));
    }

    export function xtotal (tag: string, phase?: string): number {
        return timer.getSplit(tag, phase)
            .map(st => {
                var totalexc = st.exclusions.reduce((agg, cur) => agg + ((cur.end - cur.start) || 0), 0);
                return st.duration - totalexc;
            })
            .reduce((agg, t) => t, 0);
    }
}
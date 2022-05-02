module perfex {
    export function xavg (tag: string, phase?: string): number {
        return xtotal(tag, phase) / timer.count(tag, phase);
    }
}

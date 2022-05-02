interface Console {
    table(data: any[]);
}

module perfex {
    export function table () {
        var tags = perfex.timer.getUniqueTags();
        var phases = perfex.phases.getUniqueTags();

        var records: TimingRecord[][] = tags
            .map(tag => {
                return phases
                    .map(phase => new TimingRecord(tag, phase))
                    .concat([new TimingRecord(tag, null)]);
            });

        //Totals Record
        var totals = phases
            .map(phase => new TimingRecord(null, phase))
            .concat([new TimingRecord(null, null)]);

        var data = records
            .concat([totals])
            .map(rec => {
                var mk = rec[0].timerTag;
                var obj = {"(marker)": mk || "Total"};
                rec.filter(tr => !isNaN(tr.percentage))
                    .forEach(tr => tr.mapOnto(obj));
                return obj;
            })
            .filter(datum => datum['[Total](ms)'] > 0);

        console.table(data);
    }

    class TimingRecord {
        total: number;
        percentage: number;

        constructor (public timerTag: string, public phaseTag: string) {
            this.total = total(this.timerTag, this.phaseTag);
            this.percentage = this.total / total(null, this.phaseTag) * 100;
        }

        mapOnto (obj: any) {
            var phaseName = this.phaseTag || "[Total]";
            obj[phaseName + '(ms)'] = round(this.total, 2);
            obj[phaseName + '(%)'] = round(this.percentage, 2);
        }
    }

    function round (num: number, digits: number): number {
        var factor = Math.pow(10, digits);
        return Math.round(num * factor) / factor;
    }
}
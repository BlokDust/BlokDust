var perfex;
(function (perfex) {
    perfex.version = '0.1.4';
})(perfex || (perfex = {}));
(function () {
    Date.now = Date.now || (function () { return new Date().getTime(); });
})();
/// <reference path="Date_now.ts" />
(function (context) {
    if (!("performance" in context))
        context.performance = {};
    if (!("now" in context.performance)) {
        var nowOffset = Date.now();
        if (performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart;
        }
        context.performance.now = function () { return Date.now() - nowOffset; };
    }
})(window);
var perfex;
(function (perfex) {
    var phaseTimings = [];
    var phases = (function () {
        function phases() {
        }
        Object.defineProperty(phases, "current", {
            get: function () {
                return phaseTimings[phaseTimings.length - 1];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(phases, "all", {
            get: function () {
                return phaseTimings.slice(0);
            },
            enumerable: true,
            configurable: true
        });
        phases.getUniqueTags = function () {
            return phases.all.map(function (t) { return t.tag; })
                .reduce(function (agg, cur) {
                if (agg.indexOf(cur) > -1)
                    return agg;
                return agg.concat([cur]);
            }, []);
        };
        phases.start = function (tag) {
            var cur = phases.current;
            if (cur) {
                cur.duration = performance.now() - cur.start;
            }
            phaseTimings.push({
                tag: tag,
                start: performance.now(),
                duration: NaN
            });
        };
        return phases;
    })();
    perfex.phases = phases;
})(perfex || (perfex = {}));
var perfex;
(function (perfex) {
    var timings = [];
    var markers = [];
    var timer = (function () {
        function timer() {
        }
        Object.defineProperty(timer, "all", {
            get: function () {
                return timings.slice(0);
            },
            enumerable: true,
            configurable: true
        });
        timer.get = function (tag, phase) {
            return timer.all
                .filter(function (m) { return tag == null || m.tag === tag; })
                .filter(function (m) { return phase == null || m.phase.tag === phase; });
        };
        timer.count = function (tag, phase) {
            return timer.get(tag, phase).length;
        };
        timer.getSplit = function (tag, phase) {
            //Implemented in split.ts
            return [];
        };
        timer.getUniqueTags = function () {
            return timer.all.map(function (t) { return t.tag; })
                .reduce(function (agg, cur) {
                if (agg.indexOf(cur) > -1)
                    return agg;
                return agg.concat([cur]);
            }, []);
        };
        timer.reset = function () {
            timings.length = 0;
        };
        timer.start = function (tag, context) {
            markers.push({
                tag: tag,
                context: context,
                start: performance.now()
            });
        };
        timer.stop = function () {
            var marker = markers.pop();
            timings.push({
                tag: marker.tag,
                context: marker.context,
                phase: perfex.phases.current,
                start: marker.start,
                duration: performance.now() - marker.start
            });
        };
        return timer;
    })();
    perfex.timer = timer;
})(perfex || (perfex = {}));
/// <reference path="timer" />
var perfex;
(function (perfex) {
    perfex.timer.getSplit = function (tag, phase) {
        var all = perfex.timer.get(null, null)
            .sort(function (a, b) { return (a.start === b.start) ? 0 : (a.start < b.start ? -1 : 1); });
        var filtered = perfex.timer.get(tag, phase)
            .sort(function (a, b) { return (a.start === b.start) ? 0 : (a.start < b.start ? -1 : 1); })
            .map(function (timing) { return ({
            tag: timing.tag,
            context: timing.context,
            phase: timing.phase,
            start: timing.start,
            duration: timing.duration,
            exclusions: []
        }); });
        filtered.forEach(function (timing) { return splitTiming(timing, all); });
        return filtered;
    };
    function splitTiming(timing, all) {
        //Initializes timing.exclusions which is first-level child timings
        all.filter(function (inner) { return !isSameTiming(timing, inner); })
            .filter(function (inner) { return isTimingInside(timing, inner); })
            .forEach(function (inner) {
            //Assumes incoming timings are processed in order
            if (timing.exclusions.some(function (exclusion) { return (inner.start > exclusion.start && (inner.start + inner.duration) < exclusion.end); }))
                return;
            timing.exclusions.push({ start: inner.start, end: inner.start + inner.duration });
        });
    }
    function isSameTiming(timing1, timing2) {
        return timing1.tag === timing2.tag
            && timing1.start === timing2.start
            && timing1.duration === timing2.duration;
    }
    function isTimingInside(timing, test) {
        var end = timing.start + timing.duration;
        var tend = test.start + test.duration;
        return timing.start <= test.start
            && end >= tend;
    }
})(perfex || (perfex = {}));
var perfex;
(function (perfex) {
    function xavg(tag, phase) {
        return perfex.xtotal(tag, phase) / perfex.timer.count(tag, phase);
    }
    perfex.xavg = xavg;
})(perfex || (perfex = {}));
var perfex;
(function (perfex) {
    function table() {
        var tags = perfex.timer.getUniqueTags();
        var phases = perfex.phases.getUniqueTags();
        var records = tags
            .map(function (tag) {
            return phases
                .map(function (phase) { return new TimingRecord(tag, phase); })
                .concat([new TimingRecord(tag, null)]);
        });
        //Totals Record
        var totals = phases
            .map(function (phase) { return new TimingRecord(null, phase); })
            .concat([new TimingRecord(null, null)]);
        var data = records
            .concat([totals])
            .map(function (rec) {
            var mk = rec[0].timerTag;
            var obj = { "(marker)": mk || "Total" };
            rec.filter(function (tr) { return !isNaN(tr.percentage); })
                .forEach(function (tr) { return tr.mapOnto(obj); });
            return obj;
        })
            .filter(function (datum) { return datum['[Total](ms)'] > 0; });
        console.table(data);
    }
    perfex.table = table;
    var TimingRecord = (function () {
        function TimingRecord(timerTag, phaseTag) {
            this.timerTag = timerTag;
            this.phaseTag = phaseTag;
            this.total = perfex.total(this.timerTag, this.phaseTag);
            this.percentage = this.total / perfex.total(null, this.phaseTag) * 100;
        }
        TimingRecord.prototype.mapOnto = function (obj) {
            var phaseName = this.phaseTag || "[Total]";
            obj[phaseName + '(ms)'] = round(this.total, 2);
            obj[phaseName + '(%)'] = round(this.percentage, 2);
        };
        return TimingRecord;
    })();
    function round(num, digits) {
        var factor = Math.pow(10, digits);
        return Math.round(num * factor) / factor;
    }
})(perfex || (perfex = {}));
var perfex;
(function (perfex) {
    function total(tag, phase) {
        return perfex.timer.get(tag, phase)
            .sort(function (a, b) { return (a.start === b.start) ? 0 : (a.start < b.start ? -1 : 1); })
            .reduce(function (agg, cur) {
            if (timingsContain(agg, cur))
                return agg;
            return agg.concat([cur]);
        }, [])
            .reduce(function (agg, m) { return agg + (m.duration || 0); }, 0);
    }
    perfex.total = total;
    function timingsContain(timings, test) {
        return timings.some(function (timing) { return timing.tag === test.tag && timingContains(timing, test); });
    }
    function timingContains(timing, test) {
        return (timing.start < test.start)
            && ((timing.start + timing.duration) > (test.start + test.duration));
    }
    function xtotal(tag, phase) {
        return perfex.timer.getSplit(tag, phase)
            .map(function (st) {
            var totalexc = st.exclusions.reduce(function (agg, cur) { return agg + ((cur.end - cur.start) || 0); }, 0);
            return st.duration - totalexc;
        })
            .reduce(function (agg, t) { return t; }, 0);
    }
    perfex.xtotal = xtotal;
})(perfex || (perfex = {}));
//# sourceMappingURL=perfex.js.map
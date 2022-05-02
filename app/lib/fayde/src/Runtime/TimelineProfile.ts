interface ITimelineEvent {
    Type: string;
    Name: string;
    Time: number;
}

interface ITimelineGroup {
    Type: string;
    Data: string;
    Start: number;
    Length: number;
}

class TimelineProfile {
    private static _Events: ITimelineEvent[] = [];
    static Groups: ITimelineGroup[] = [];
    static TimelineStart: number = 0;

    static IsNextLayoutPassProfiled: boolean = true;

    static Parse(isStart: boolean, name: string) {
        if (!isStart)
            return TimelineProfile._FinishEvent("Parse", name);
        TimelineProfile._Events.push({
            Type: "Parse",
            Name: name,
            Time: new Date().valueOf()
        });
    }
    static Navigate(isStart: boolean, name?: string) {
        if (!isStart)
            return TimelineProfile._FinishEvent("Navigate", name);
        TimelineProfile._Events.push({
            Type: "Navigate",
            Name: name,
            Time: new Date().valueOf(),
        });
    }
    static LayoutPass(isStart: boolean) {
        if (!TimelineProfile.IsNextLayoutPassProfiled)
            return;
        if (!isStart) {
            TimelineProfile.IsNextLayoutPassProfiled = false;
            return TimelineProfile._FinishEvent("LayoutPass");
        }
        TimelineProfile._Events.push({
            Type: "LayoutPass",
            Name: "",
            Time: new Date().valueOf(),
        });
    }

    private static _FinishEvent(type: string, name?: string) {
        var evts = TimelineProfile._Events;
        var len = evts.length;
        var evt: ITimelineEvent;
        for (var i = len - 1; i >= 0; i--) {
            evt = evts[i];
            if (evt.Type === type && (!name || evt.Name === name)) {
                evts.splice(i, 1);
                break;
            }
            evt = null;
        }
        if (!evt)
            return;
        TimelineProfile.Groups.push({
            Type: evt.Type,
            Data: evt.Name,
            Start: evt.Time - TimelineProfile.TimelineStart,
            Length: new Date().valueOf() - evt.Time
        });
    }
}
TimelineProfile.TimelineStart = new Date().valueOf();
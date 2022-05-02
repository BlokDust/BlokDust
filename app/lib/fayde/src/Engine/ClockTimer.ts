
module Fayde {
    export interface ITimerListener {
        OnTicked(lastTime: number, nowTime: number);
    }

    var requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            (<any>window).webkitRequestAnimationFrame ||
            (<any>window).mozRequestAnimationFrame ||
            (<any>window).oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 200);
            };
    })();

    export class ClockTimer {
        private _Listeners: Fayde.ITimerListener[] = [];
        private _LastTime: number = 0;

        RegisterTimer(listener: Fayde.ITimerListener) {
            var ls = this._Listeners;
            var index = ls.indexOf(listener);
            if (index > -1)
                return;
            ls.push(listener);
            if (ls.length === 1)
                this._RequestAnimationTick();
        }
        UnregisterTimer(listener: Fayde.ITimerListener) {
            var ls = this._Listeners;
            var index = ls.indexOf(listener);
            if (index > -1)
                ls.splice(index, 1);
        }
        private _DoTick() {
            var nowTime = new Date().getTime();
            var lastTime = this._LastTime;
            this._LastTime = nowTime;

            var ls = this._Listeners;
            var len = ls.length;
            if (len === 0)
                return;
            for (var i = 0; i < len; i++) {
                ls[i].OnTicked(lastTime, nowTime);
            }
            this._RequestAnimationTick();
        }
        private _RequestAnimationTick() {
            requestAnimFrame(() => this._DoTick());
        }
    }
}
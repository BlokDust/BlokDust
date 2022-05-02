/// <reference path="ActiveTouchBase.ts" />
/// <reference path="TouchInteropBase.ts" />

module Fayde.Input.TouchInternal {
    class NonPointerActiveTouch extends ActiveTouchBase {
        TouchObject: Touch;
        Init(t: Touch, offset: IOffset) {
            this.TouchObject = t;
            this.Identifier = t.identifier;
            this.Position = new Point(t.clientX + offset.left, t.clientY + offset.top);
        }
        CreateTouchPoint(p: Point): TouchPoint {
            var to = this.TouchObject;
            return new TouchPoint(p, to.force);
        }
    }
    
    export class NonPointerTouchInterop extends TouchInteropBase {
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement) {
            super.Register(input, canvas);

            canvas.addEventListener("touchstart", (e) => this._HandleTouchStart(window.event ? <any>window.event : e));
            canvas.addEventListener("touchend", (e) => this._HandleTouchEnd(window.event ? <any>window.event : e));
            canvas.addEventListener("touchmove", (e) => this._HandleTouchMove(window.event ? <any>window.event : e));
            canvas.addEventListener("touchenter", (e) => this._HandleTouchEnter(window.event ? <any>window.event : e));
            canvas.addEventListener("touchleave", (e) => this._HandleTouchLeave(window.event ? <any>window.event : e));
        }

        private _HandleTouchStart(e: TouchEvent) {
            e.preventDefault();
            Engine.Inspection.Kill();

            var newTouches = this.TouchArrayFromList(e.changedTouches);
            this.ActiveTouches = this.ActiveTouches.concat(newTouches);

            this.Input.SetIsUserInitiatedEvent(true);
            this.HandleTouches(TouchInputType.TouchDown, newTouches);
            this.Input.SetIsUserInitiatedEvent(false);
        }
        private _HandleTouchEnd(e: TouchEvent) {
            var oldTouches = this.TouchArrayFromList(e.changedTouches);
            
            this.Input.SetIsUserInitiatedEvent(true);
            this.HandleTouches(TouchInputType.TouchUp, oldTouches);
            this.Input.SetIsUserInitiatedEvent(false);

            removeFromArray(this.ActiveTouches, oldTouches);
        }
        private _HandleTouchMove(e: TouchEvent) {
            var touches = this.TouchArrayFromList(e.changedTouches);
            this.HandleTouches(TouchInputType.TouchMove, touches);
        }
        private _HandleTouchEnter(e: TouchEvent) {
            var touches = this.TouchArrayFromList(e.changedTouches);
            this.HandleTouches(TouchInputType.TouchEnter, touches);
        }
        private _HandleTouchLeave(e: TouchEvent) {
            var touches = this.TouchArrayFromList(e.changedTouches);
            this.HandleTouches(TouchInputType.TouchLeave, touches);
        }

        private TouchArrayFromList(list: TouchList): NonPointerActiveTouch[] {
            var len = list.length;
            var touches: NonPointerActiveTouch[] = [];
            var curto: Touch;
            var cur;
            for (var i = 0; i < len; i++) {
                var curto = list.item(i);
                cur = this.FindTouchInList(curto.identifier) || new NonPointerActiveTouch(this);
                cur.Init(curto, this.CoordinateOffset);
                touches.push(cur);
            }
            return touches;
        }
        private FindTouchInList(identifier: number): NonPointerActiveTouch {
            var at = this.ActiveTouches;
            var len = at.length;
            for (var i = 0; i < len; i++) {
                if (at[i].Identifier === identifier)
                    return <NonPointerActiveTouch>at[i];
            }
            return null;
        }
    }

    function removeFromArray<T>(arr: T[], toRemove: T[]) {
        var len = toRemove.length;
        for (var i = 0; i < len; i++) {
            var index = arr.indexOf(toRemove[i]);
            if (index > -1)
                arr.splice(index, 1);
        }
    }
}
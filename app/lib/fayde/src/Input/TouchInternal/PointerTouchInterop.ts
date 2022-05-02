/// <reference path="ActiveTouchBase.ts" />
/// <reference path="TouchInteropBase.ts" />

module Fayde.Input.TouchInternal {
    class PointerActiveTouch extends ActiveTouchBase {
        TouchObject: MSPointerEvent;
        Init(t: MSPointerEvent, offset: IOffset) {
            this.TouchObject = t;
            this.Identifier = t.pointerId;
            this.Position = new Point(t.clientX + offset.left, t.clientY + offset.top);
        }
        CreateTouchPoint(p: Point): TouchPoint {
            var to = this.TouchObject;
            return new TouchPoint(p, to.pressure);
        }
    }

    export class PointerTouchInterop extends TouchInteropBase {
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement) {
            super.Register(input, canvas);
            canvas.style.msTouchAction = "none";
            (<any>canvas.style).touchAction = "none";

            canvas.addEventListener("selectstart", (e) => { e.preventDefault(); });
            if (navigator.msPointerEnabled) {
                canvas.addEventListener("MSPointerDown", (e) => this._HandlePointerDown(window.event ? <any>window.event : e));
                canvas.addEventListener("MSPointerUp", (e) => this._HandlePointerUp(window.event ? <any>window.event : e));
                canvas.addEventListener("MSPointerMove", (e) => this._HandlePointerMove(window.event ? <any>window.event : e));
                canvas.addEventListener("MSPointerEnter", (e) => this._HandlePointerEnter(window.event ? <any>window.event : e));
                canvas.addEventListener("MSPointerLeave", (e) => this._HandlePointerLeave(window.event ? <any>window.event : e));
            } else {
                canvas.addEventListener("pointerdown", (e) => this._HandlePointerDown(window.event ? <any>window.event : e));
                canvas.addEventListener("pointerup", (e) => this._HandlePointerUp(window.event ? <any>window.event : e));
                canvas.addEventListener("pointermove", (e) => this._HandlePointerMove(window.event ? <any>window.event : e));
                canvas.addEventListener("pointerenter", (e) => this._HandlePointerEnter(window.event ? <any>window.event : e));
                canvas.addEventListener("pointerleave", (e) => this._HandlePointerLeave(window.event ? <any>window.event : e));
            }
        }

        private _HandlePointerDown(e: MSPointerEvent) {
            if (e.pointerType !== "touch")
                return;
            e.preventDefault();
            Engine.Inspection.Kill();

            var cur = this.GetActiveTouch(e);
            this.Input.SetIsUserInitiatedEvent(true);
            this.HandleTouches(Input.TouchInputType.TouchDown, [cur]);
            this.Input.SetIsUserInitiatedEvent(false);
        }
        private _HandlePointerUp(e: MSPointerEvent) {
            if (e.pointerType !== "touch")
                return;
            var cur = this.GetActiveTouch(e);
            this.Input.SetIsUserInitiatedEvent(true);
            this.HandleTouches(Input.TouchInputType.TouchUp, [cur]);
            this.Input.SetIsUserInitiatedEvent(false);
            var index = this.ActiveTouches.indexOf(cur);
            if (index > -1)
                this.ActiveTouches.splice(index, 1);
        }
        private _HandlePointerMove(e: MSPointerEvent) {
            if (e.pointerType !== "touch")
                return;
            var cur = this.GetActiveTouch(e);
            this.HandleTouches(Input.TouchInputType.TouchMove, [cur]);
        }
        private _HandlePointerEnter(e: MSPointerEvent) {
            if (e.pointerType !== "touch")
                return;
            var cur = this.GetActiveTouch(e);
            this.HandleTouches(Input.TouchInputType.TouchEnter, [cur]);
        }
        private _HandlePointerLeave(e: MSPointerEvent) {
            if (e.pointerType !== "touch")
                return;
            var cur = this.GetActiveTouch(e);
            this.HandleTouches(Input.TouchInputType.TouchLeave, [cur]);
        }

        private GetActiveTouch(e: MSPointerEvent): PointerActiveTouch {
            var existing = this.FindTouchInList(e.pointerId);
            var cur = existing || new PointerActiveTouch(this);
            if (!existing)
                this.ActiveTouches.push(cur);
            cur.Init(e, this.CoordinateOffset);
            return cur;
        }
        private FindTouchInList(identifier: number): PointerActiveTouch {
            var at = this.ActiveTouches;
            var len = at.length;
            for (var i = 0; i < len; i++) {
                if (at[i].Identifier === identifier)
                    return <PointerActiveTouch>at[i];
            }
            return null;
        }
    }
}
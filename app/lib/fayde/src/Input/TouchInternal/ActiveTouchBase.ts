module Fayde.Input.TouchInternal {
    export interface ITouchHandler {
        HandleTouches(type: Input.TouchInputType, touches: ActiveTouchBase[], emitLeave?: boolean, emitEnter?: boolean): boolean;
    }

    export class ActiveTouchBase {
        Identifier: number;
        Position: Point;
        Device: Input.ITouchDevice;
        InputList: UINode[] = [];
        private _IsEmitting: boolean = false;
        private _PendingCapture: UINode = null;
        private _PendingReleaseCapture = false;
        private _Captured: UINode = null;
        private _CapturedInputList: UINode[] = null;
        
        private _FinishReleaseCaptureFunc: () => void;

        constructor(touchHandler: ITouchHandler) {
            Object.defineProperty(this, "Device", { value: this.CreateTouchDevice(), writable: false });
            this._FinishReleaseCaptureFunc = () => touchHandler.HandleTouches(Input.TouchInputType.NoOp, [this], false, true);
        }

        Capture(uie: UIElement): boolean {
            var uin = uie.XamlNode;
            if (this._Captured === uin || this._PendingCapture === uin)
                return true;
            if (!this._IsEmitting)
                return false;
            this._PendingCapture = uin;
            return true;
        }
        ReleaseCapture(uie: UIElement) {
            var uin = uie.XamlNode;
            if (this._Captured !== uin && this._PendingCapture !== uin)
                return;
            if (this._IsEmitting)
                this._PendingReleaseCapture = true;
            else
                this._PerformReleaseCapture();
        }
        private _PerformCapture(uin: UINode) {
            this._Captured = uin;
            var newInputList: UINode[] = [];
            while (uin != null) {
                newInputList.push(uin);
                uin = uin.VisualParentNode;
            }
            this._CapturedInputList = newInputList;
            this._PendingCapture = null;
        }
        private _PerformReleaseCapture() {
            var oldCaptured = this._Captured;
            this._Captured = null;
            this._PendingReleaseCapture = false;
            oldCaptured._EmitLostTouchCapture(new Input.TouchEventArgs(this.Device));
            this._FinishReleaseCaptureFunc();
        }

        Emit(type: Input.TouchInputType, newInputList: UINode[], emitLeave?: boolean, emitEnter?: boolean): boolean {
            if (this._IsEmitting)
                return;
            this._IsEmitting = true;
            var handled = false;

            var indices = { Index1: -1, Index2: -1 };
            findFirstCommonElement(this.InputList, newInputList, indices);
            if (emitLeave !== false)
                this._EmitList(Input.TouchInputType.TouchLeave, this.InputList, indices.Index1);
            if (emitEnter !== false)
                this._EmitList(Input.TouchInputType.TouchEnter, newInputList, indices.Index2);

            var handled = false;
            if (type !== Input.TouchInputType.NoOp)
                handled = this._EmitList(type, this._Captured ? this._CapturedInputList : newInputList);
            this.InputList = newInputList;

            if (this._PendingCapture)
                this._PerformCapture(this._PendingCapture);
            if (this._PendingReleaseCapture)
                this._PerformReleaseCapture();

            this._IsEmitting = false;
            return handled;
        }
        private _EmitList(type: Input.TouchInputType, list: UINode[], endIndex?: number): boolean {
            var handled = false;
            if (endIndex === 0)
                return handled;
            if (!endIndex || endIndex === -1)
                endIndex = list.length;
            var args = new Input.TouchEventArgs(this.Device);
            var node = list[0];
            if (node && args instanceof Fayde.RoutedEventArgs)
                args.Source = node.XObject;
            for (var i = 0; i < endIndex; i++) {
                node = list[i];
                if (type === Input.TouchInputType.TouchLeave)
                    args.Source = node.XObject;
                if (node._EmitTouchEvent(type, args))
                    handled = true;
                if (type === Input.TouchInputType.TouchLeave) //TouchLeave gets new event args on each emit
                    args = new Input.TouchEventArgs(this.Device);
            }
            return handled;
        }
        
        GetTouchPoint(relativeTo: UIElement): TouchPoint {
            if (!relativeTo)
                return this.CreateTouchPoint(this.Position.Clone());
            if (!(relativeTo instanceof UIElement))
                throw new ArgumentException("Specified relative object must be a UIElement.");
            //TODO: If attached, should we run ProcessDirtyElements
            var p = this.Position.Clone();
            minerva.core.Updater.transformPoint(relativeTo.XamlNode.LayoutUpdater, p);
            return this.CreateTouchPoint(p);
        }
        CreateTouchPoint(p: Point): TouchPoint {
            return new TouchPoint(p, 0);
        }
        
        private CreateTouchDevice(): ITouchDevice {
            var d: ITouchDevice = {
                Identifier: null,
                Captured: null,
                Capture: (uie: UIElement) => this.Capture(uie),
                ReleaseCapture: (uie: UIElement) => this.ReleaseCapture(uie),
                GetTouchPoint: (relativeTo: UIElement) => this.GetTouchPoint(relativeTo)
            };
            Object.defineProperty(d, "Identifier", { get: () => this.Identifier });
            Object.defineProperty(d, "Captured", { get: () => this._Captured ? this._Captured.XObject : null });
            return d;
        }
    }

    
    interface ICommonElementIndices {
        Index1: number;
        Index2: number;
    }
    function findFirstCommonElement(list1: UINode[], list2: UINode[], outObj: ICommonElementIndices) {
        var i = list1.length - 1;
        var j = list2.length - 1;
        outObj.Index1 = -1;
        outObj.Index2 = -1;
        while (i >= 0 && j >= 0) {
            if (list1[i] !== list2[j])
                return;
            outObj.Index1 = i--;
            outObj.Index2 = j--;
        }
    }
}

module Fayde.Engine {
    interface IFocusData {
        Node: UINode;
    }

    export interface IInputState {
        IsUserInitiated: boolean;
        IsFirstUserInitiated: boolean;
    }

    export class InputManager {
        private _Surface: Surface;
        private _KeyInterop: Fayde.Input.IKeyInterop;
        private _MouseInterop: Fayde.Input.IMouseInterop;
        private _TouchInterop: Fayde.Input.ITouchInterop;
        private _Focus: FocusManager;
        private _State: IInputState;
        private _Cursor: CursorType = Fayde.CursorType.Default;
        SetCursor: (cursor: CursorType) => void = (cursor) => { };

        private _CurrentPos: Point = null;
        private _EmittingMouseEvent: boolean = false;
        private _InputList: Fayde.UINode[] = [];
        private _Captured: Fayde.UINode = null;
        private _PendingCapture: Fayde.UINode = null;
        private _PendingReleaseCapture: boolean = false;
        private _CapturedInputList: Fayde.UINode[] = [];

        get FocusedNode(): UINode { return this._Focus.Node; }
        Focus(node: Controls.ControlNode, recurse?: boolean) { return this._Focus.Focus(node, recurse); }

        constructor(surface: Surface) {
            this._Surface = surface;
            this._KeyInterop = Fayde.Input.CreateKeyInterop();
            this._MouseInterop = Fayde.Input.CreateMouseInterop();
            this._TouchInterop = Fayde.Input.CreateTouchInterop();

            this._Focus = new FocusManager(this._State = {
                IsUserInitiated: false,
                IsFirstUserInitiated: false
            });
        }

        Register(canvas: HTMLCanvasElement) {
            this.SetCursor = (cursor) => canvas.style.cursor = CursorTypeMappings[CursorType[this._Cursor = cursor]];

            this._KeyInterop.RegisterEvents(this);
            this._MouseInterop.RegisterEvents(this, canvas);
            this._TouchInterop.Register(this, canvas);
        }

        OnNodeDetached(node: UINode) {
            var il = this._InputList;
            if (il[il.length - 1] === node)
                this._InputList = [];
            this._Focus.OnNodeDetached(node);
        }

        SetIsUserInitiatedEvent(value: boolean) {
            this._Focus.EmitChanges()
            this._State.IsFirstUserInitiated = this._State.IsFirstUserInitiated || value;
            this._State.IsUserInitiated = value;
        }

        HandleKeyDown(args: Input.KeyEventArgs) {
            this.SetIsUserInitiatedEvent(true);
            Input.Keyboard.RefreshModifiers(args.Modifiers);
            var focusToRoot = this._Focus.GetFocusToRoot();
            if (focusToRoot)
                this._EmitKeyDown(focusToRoot, args);
            if (!args.Handled && args.Key === Input.Key.Tab) {
                if (!this._Focus.TabFocus(args.Modifiers.Shift))
                    this._Focus.FocusAnyLayer(this._Surface.walkLayers(true));
                args.Handled = true;
            }
            this.SetIsUserInitiatedEvent(false);
        }
        private _EmitKeyDown(list: UINode[], args: Input.KeyEventArgs, endIndex?: number) {
            if (endIndex === 0)
                return;
            if (!endIndex || endIndex === -1)
                endIndex = list.length;

            var i = 0;
            var cur = list.shift();
            while (cur && i < endIndex) {
                cur._EmitKeyDown(args);
                cur = list.shift();
                i++;
            }
        }

        HandleMousePress(button: number, pos: Point): boolean {
            this.SetIsUserInitiatedEvent(true);
            var handled = this.HandleMouseEvent(Input.MouseInputType.MouseDown, button, pos);
            this.UpdateCursorFromInputList();
            this.SetIsUserInitiatedEvent(false);
            return handled;
        }
        HandleMouseRelease(button: number, pos: Point) {
            this.SetIsUserInitiatedEvent(true);
            this.HandleMouseEvent(Input.MouseInputType.MouseUp, button, pos);
            this.UpdateCursorFromInputList();
            this.SetIsUserInitiatedEvent(false);
            if (this._Captured)
                this._PerformReleaseCapture();
        }
        HandleMouseEvent(type: Input.MouseInputType, button: number, pos: Point, delta?: number, emitLeave?: boolean, emitEnter?: boolean): boolean {
            this._CurrentPos = pos;
            if (this._EmittingMouseEvent)
                return false;

            var newInputList = this.HitTestPoint(pos);
            if (!newInputList)
                return false;

            this._EmittingMouseEvent = true;

            var indices = { Index1: -1, Index2: -1 };
            findFirstCommonElement(this._InputList, newInputList, indices);
            if (emitLeave === undefined || emitLeave === true)
                this._EmitMouseList(Input.MouseInputType.MouseLeave, button, pos, delta, this._InputList, indices.Index1);
            if (emitEnter === undefined || emitEnter === true)
                this._EmitMouseList(Input.MouseInputType.MouseEnter, button, pos, delta, newInputList, indices.Index2);

            var handled = false;
            if (type !== Input.MouseInputType.NoOp)
                handled = this._EmitMouseList(type, button, pos, delta, this._Captured ? this._CapturedInputList : newInputList);
            this._InputList = newInputList;

            if (this._Surface.HitTestCallback)
                this._Surface.HitTestCallback(newInputList);

            if (this._PendingCapture)
                this._PerformCapture(this._PendingCapture);
            if (this._PendingReleaseCapture || (this._Captured && !this._Captured.CanCaptureMouse()))
                this._PerformReleaseCapture();
            this._EmittingMouseEvent = false;
            return handled;
        }
        private _EmitMouseList(type: Input.MouseInputType, button: number, pos: Point, delta: number, list: Fayde.UINode[], endIndex?: number): boolean {
            var handled = false;
            if (endIndex === 0)
                return handled;
            if (!endIndex || endIndex === -1)
                endIndex = list.length;
            var args = this._MouseInterop.CreateEventArgs(type, pos, delta);
            var node = list[0];
            if (node && args instanceof Fayde.RoutedEventArgs)
                args.Source = node.XObject;
            var isL = this._MouseInterop.IsLeftButton(button);
            var isR = this._MouseInterop.IsRightButton(button);
            if (Fayde.Engine.Inspection.TryHandle(type, isL, isR, args, list))
                return true;
            for (var i = 0; i < endIndex; i++) {
                node = list[i];
                if (type === Input.MouseInputType.MouseLeave)
                    args.Source = node.XObject;
                if (node._EmitMouseEvent(type, isL, isR, args))
                    handled = true;
                if (type === Input.MouseInputType.MouseLeave) //MouseLeave gets new event args on each emit
                    args = this._MouseInterop.CreateEventArgs(type, pos, delta);
            }
            return handled;
        }

        HitTestPoint(pos: Point): UINode[] {
            return this._Surface.hitTest(pos).map(upd => upd.getAttachedValue("$node"));
        }

        UpdateCursorFromInputList() {
            var newCursor = Fayde.CursorType.Default;
            var list = this._Captured ? this._CapturedInputList : this._InputList;
            var len = list.length;
            for (var i = 0; i < len; i++) {
                newCursor = list[i].XObject.Cursor;
                if (newCursor !== Fayde.CursorType.Default)
                    break;
            }
            this.SetCursor(newCursor);
        }
        SetMouseCapture(uin: Fayde.UINode): boolean {
            if (this._Captured || this._PendingCapture)
                return uin === this._Captured || uin === this._PendingCapture;
            if (!this._EmittingMouseEvent)
                return false;
            this._PendingCapture = uin;
            return true;
        }
        ReleaseMouseCapture(uin: Fayde.UINode) {
            if (uin !== this._Captured && uin !== this._PendingCapture)
                return;
            if (this._EmittingMouseEvent)
                this._PendingReleaseCapture = true;
            else
                this._PerformReleaseCapture();
        }
        private _PerformCapture(uin: Fayde.UINode) {
            this._Captured = uin;
            var newInputList = [];
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
            oldCaptured._EmitLostMouseCapture(this._CurrentPos);
            //force "MouseEnter" on any new elements
            this.HandleMouseEvent(Input.MouseInputType.NoOp, null, this._CurrentPos, undefined, false, true);
        }
    }

    interface ICommonElementIndices {
        Index1: number;
        Index2: number;
    }
    function findFirstCommonElement(list1: Fayde.UINode[], list2: Fayde.UINode[], outObj: ICommonElementIndices) {
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
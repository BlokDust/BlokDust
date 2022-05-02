module Fayde.Input {
    export enum MouseInputType {
        NoOp = 0,
        MouseUp = 1,
        MouseDown = 2,
        MouseLeave = 3,
        MouseEnter = 4,
        MouseMove = 5,
        MouseWheel = 6,
    }
    export interface IMouseInterop {
        RegisterEvents(input: Engine.InputManager, canvas: HTMLCanvasElement);
        CreateEventArgs(type: MouseInputType, pos: Point, delta: number): Fayde.Input.MouseEventArgs;
        IsLeftButton(button: number): boolean;
        IsRightButton(button: number): boolean;
    }
    export function CreateMouseInterop (): IMouseInterop {
        if (navigator.appName === "Microsoft Internet Explorer")
            return new IEMouseInterop();
        if (navigator.appName === "Netscape") {
            if (!!navigator.userAgent.match(/Trident\//)) //IE11 masquerading as Netscape
                return new IEMouseInterop();
            return new NetscapeMouseInterop();
        }
        return new MouseInterop();
    }

    interface IOffset {
        left: number;
        top: number;
    }

    class MouseInterop implements IMouseInterop {
        private _Input: Engine.InputManager;
        private _CanvasOffset: IOffset = null;
        private _IsContextMenuDisabled: boolean = false;

        RegisterEvents (input: Engine.InputManager, canvas: HTMLCanvasElement) {
            this._Input = input;
            this._CanvasOffset = this._CalcOffset(canvas);

            canvas.addEventListener("contextmenu", (e) => this._HandleContextMenu(window.event ? <any>window.event : e));
            canvas.addEventListener("mousedown", (e) => this._HandleButtonPress(window.event ? <any>window.event : e));
            canvas.addEventListener("mouseup", (e) => this._HandleButtonRelease(window.event ? <any>window.event : e));
            canvas.addEventListener("mouseout", (e) => this._HandleOut(window.event ? <any>window.event : e));
            canvas.addEventListener("mousemove", (e) => this._HandleMove(window.event ? <any>window.event : e));

            //IE9, Chrome, Safari, Opera
            canvas.addEventListener("mousewheel", (e) => this._HandleWheel(window.event ? <any>window.event : e));
            //Firefox
            canvas.addEventListener("DOMMouseScroll", (e) => this._HandleWheel(window.event ? <any>window.event : e));
        }

        private _CalcOffset (canvas: HTMLCanvasElement): IOffset {
            var left = 0;
            var top = 0;
            var cur: HTMLElement = canvas;
            if (cur.offsetParent) {
                do {
                    left += cur.offsetLeft;
                    top += cur.offsetTop;
                } while (cur = <HTMLElement>cur.offsetParent);
            }
            return {left: left, top: top};
        }

        private _GetMousePosition (evt): Point {
            return new Point(
                evt.clientX + window.pageXOffset + this._CanvasOffset.left,
                evt.clientY + window.pageYOffset + this._CanvasOffset.top);
        }

        IsLeftButton (button: number): boolean {
            return button === 1;
        }

        IsRightButton (button: number): boolean {
            return button === 2;
        }

        private _HandleContextMenu (evt) {
            if (!this._IsContextMenuDisabled)
                return;
            this._IsContextMenuDisabled = false;
            evt.stopPropagation && evt.stopPropagation();
            evt.preventDefault && evt.preventDefault();
            evt.cancelBubble = true;
            return false;
        }

        private _HandleButtonPress (evt) {
            Engine.Inspection.Kill();
            Input.Keyboard.RefreshModifiers(createModifiers(evt));
            var button = evt.which ? evt.which : evt.button;
            var pos = this._GetMousePosition(evt);
            if (this._Input.HandleMousePress(button, pos))
                this.DisableNextContextMenu();
        }

        private _HandleButtonRelease (evt) {
            Input.Keyboard.RefreshModifiers(createModifiers(evt));
            var button = evt.which ? evt.which : evt.button;
            var pos = this._GetMousePosition(evt);
            this._Input.HandleMouseRelease(button, pos);
        }

        private _HandleOut (evt) {
            Input.Keyboard.RefreshModifiers(createModifiers(evt));
            var pos = this._GetMousePosition(evt);
            this._Input.HandleMouseEvent(MouseInputType.MouseLeave, null, pos);
        }

        private _HandleMove (evt) {
            Input.Keyboard.RefreshModifiers(createModifiers(evt));
            var pos = this._GetMousePosition(evt);
            this._Input.HandleMouseEvent(MouseInputType.MouseMove, null, pos);
            this._Input.UpdateCursorFromInputList();
        }

        private _HandleWheel (evt) {
            Input.Keyboard.RefreshModifiers(createModifiers(evt));
            var delta = 0;
            if (evt.wheelDelta)
                delta = evt.wheelDelta / 120;
            else if (evt.detail)
                delta = -evt.detail / 3;
            if (evt.preventDefault)
                evt.preventDefault();
            evt.returnValue = false;
            this._Input.HandleMouseEvent(MouseInputType.MouseWheel, null, this._GetMousePosition(evt), delta);
            this._Input.UpdateCursorFromInputList();
        }

        CreateEventArgs (type: MouseInputType, pos: Point, delta: number): Fayde.Input.MouseEventArgs {
            switch (type) {
                case MouseInputType.MouseUp:
                    return new Fayde.Input.MouseButtonEventArgs(pos);
                case MouseInputType.MouseDown:
                    return new Fayde.Input.MouseButtonEventArgs(pos);
                case MouseInputType.MouseLeave:
                    return new Fayde.Input.MouseEventArgs(pos);
                case MouseInputType.MouseEnter:
                    return new Fayde.Input.MouseEventArgs(pos);
                case MouseInputType.MouseMove:
                    return new Fayde.Input.MouseEventArgs(pos);
                case MouseInputType.MouseWheel:
                    return new Fayde.Input.MouseWheelEventArgs(pos, delta);
            }
        }

        DisableNextContextMenu () {
            this._IsContextMenuDisabled = true;
        }
    }

    class IEMouseInterop extends MouseInterop {
        StopIEContextMenu: boolean = false;

        DisableNextContextMenu () {
            super.DisableNextContextMenu();
            this.StopIEContextMenu = true;
        }

        RegisterEvents (input: Engine.InputManager, canvas: HTMLCanvasElement) {
            super.RegisterEvents(input, canvas);
            canvas.oncontextmenu = (e) => this._HandleIEContextMenu(e);
        }

        private _HandleIEContextMenu (evt) {
            if (this.StopIEContextMenu) {
                this.StopIEContextMenu = false;
                return false;
            }
            return true;
        }
    }
    class NetscapeMouseInterop extends MouseInterop {
        IsRightButton (button: number): boolean {
            return button === 3;
        }
    }
    function createModifiers (e): IModifiersOn {
        return {
            Shift: e.shiftKey,
            Ctrl: e.ctrlKey,
            Alt: e.altKey
        };
    }
}
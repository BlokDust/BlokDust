module Fayde.Input.TouchInternal {
    export interface IOffset {
        left: number;
        top: number;
    }
    export class TouchInteropBase implements Fayde.Input.ITouchInterop, ITouchHandler {
        Input: Engine.InputManager;
        CanvasOffset: IOffset = null;
        ActiveTouches: ActiveTouchBase[] = [];

        get CoordinateOffset(): IOffset {
            return {
                left: window.pageXOffset + this.CanvasOffset.left,
                top: window.pageYOffset + this.CanvasOffset.top
            };
        }

        Register(input: Engine.InputManager, canvas: HTMLCanvasElement) {
            this.Input = input;
            this.CanvasOffset = this._CalcOffset(canvas);
        }
        private _CalcOffset(canvas: HTMLCanvasElement): IOffset {
            var left = 0;
            var top = 0;
            var cur: HTMLElement = canvas;
            if (cur.offsetParent) {
                do {
                    left += cur.offsetLeft;
                    top += cur.offsetTop;
                } while (cur = <HTMLElement>cur.offsetParent);
            }
            return { left: left, top: top };
        }
        
        HandleTouches(type: Input.TouchInputType, touches: ActiveTouchBase[], emitLeave?: boolean, emitEnter?: boolean): boolean {
            var touch: ActiveTouchBase;
            var handled = false;
            while (touch = touches.shift()) {
                var inputList = this.Input.HitTestPoint(touch.Position);
                if (inputList)
                    handled = handled || touch.Emit(type, inputList, emitLeave, emitEnter);
            }
            return handled;
        }
    }
}
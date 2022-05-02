module Fayde.Input {
    export interface ITouchDevice {
        Identifier: number;
        Captured: UIElement;
        Capture(uie: UIElement): boolean;
        ReleaseCapture(uie: UIElement);
        GetTouchPoint(relativeTo: UIElement): TouchPoint;
    }
    export enum TouchInputType {
        NoOp = 0,
        TouchDown = 1,
        TouchUp = 2,
        TouchMove = 3,
        TouchEnter = 4,
        TouchLeave = 5
    }
    export interface ITouchInterop {
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement);
    }
    export function CreateTouchInterop(): ITouchInterop {
        if (navigator.msPointerEnabled || (<any>navigator).pointerEnabled)
            return new TouchInternal.PointerTouchInterop();
        if ("ontouchstart" in window)
            return new TouchInternal.NonPointerTouchInterop();
        return new DummyTouchInterop();
    }

    class DummyTouchInterop implements ITouchInterop {
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement) { }
    }
}
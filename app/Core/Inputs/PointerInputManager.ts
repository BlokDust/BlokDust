import {IApp} from '../IApp';

declare var App: IApp;

export class PointerInputManager {

    MouseDown = new nullstone.Event<MouseEvent>();
    MouseUp = new nullstone.Event<MouseEvent>();
    MouseMove = new nullstone.Event<MouseEvent>();
    MouseWheel = new nullstone.Event<MouseEvent>();

    TouchStart = new nullstone.Event<TouchEvent>();
    TouchEnd = new nullstone.Event<TouchEvent>();
    TouchMove = new nullstone.Event<TouchEvent>();

    constructor() {

        // https://typescript.codeplex.com/discussions/403082

        this.OnMouseDown = this.OnMouseDown.bind(this);
        document.addEventListener('mousedown', this.OnMouseDown);

        this.OnMouseUp = this.OnMouseUp.bind(this);
        document.addEventListener('mouseup', this.OnMouseUp);

        this.OnMouseMove = this.OnMouseMove.bind(this);
        document.addEventListener('mousemove', this.OnMouseMove);

        this.OnMouseWheel = this.OnMouseWheel.bind(this);
        document.addEventListener('mousewheel', this.OnMouseWheel);
        document.addEventListener('DOMMouseScroll', this.OnMouseWheel);

        this.OnTouchStart = this.OnTouchStart.bind(this);
        document.addEventListener('touchstart', this.OnTouchStart);

        this.OnTouchEnd = this.OnTouchEnd.bind(this);
        document.addEventListener('touchend', this.OnTouchEnd);

        this.OnTouchMove = this.OnTouchMove.bind(this);
        document.addEventListener('touchmove', this.OnTouchMove);
    }

    OnMouseDown(e: MouseEvent){
        //var position: Point = new Point(e.clientX, e.clientY);
        //console.log(new Date().getTime(), "mousedown", position);
        this.MouseDown.raise(this, e);
    }

    OnMouseUp(e: MouseEvent){
        //var position: Point = new Point(e.clientX, e.clientY);
        //console.log(new Date().getTime(), "mouseup", position);
        this.MouseUp.raise(this, e);
    }

    OnMouseMove(e: MouseEvent){
        //var position: Point = new Point(e.clientX, e.clientY);
        //console.log(new Date().getTime(), "mousemove", position);
        this.MouseMove.raise(this, e);
    }

    OnTouchStart(e: TouchEvent){
        if (App.FocusManager.IsTouchTarget(e)) {
            e.preventDefault();
        }
        if (App.FocusManager.ActiveIsNotBody() && !App.FocusManager.IsActive()) {
            App.FocusManager.BlurActive()
        }
        this.TouchStart.raise(this, e);
    }

    OnTouchEnd(e: TouchEvent){
        if (App.FocusManager.IsTouchTarget(e)) {
            e.preventDefault();
        }
        this.TouchEnd.raise(this, e);
    }

    OnTouchMove(e: TouchEvent){
        if (App.FocusManager.IsTouchTarget(e)) {
            e.preventDefault();
        }
        this.TouchMove.raise(this, e);
    }

    OnMouseWheel(e: MouseWheelEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.MouseWheel.raise(this, e);
    }
}
declare module Fayde.Drawing {
    var Version: string;
}
declare module Fayde.Drawing {
    interface ISketchContext {
        Ctx: CanvasRenderingContext2D;
    }
}
declare module Fayde.Drawing {
    class Sketch extends FrameworkElement {
        CreateLayoutUpdater(): sketch.SketchUpdater;
        static IsAnimatedProperty: DependencyProperty;
        IsAnimated: boolean;
        private _Timer;
        private _LastVisualTick;
        Milliseconds: number;
        Draw: nullstone.Event<SketchDrawEventArgs>;
        Click: RoutedEvent<RoutedEventArgs>;
        MousePosition: Point;
        constructor();
        RaiseDraw(canvas: HTMLCanvasElement, width: number, height: number): void;
        OnTicked(lastTime: number, nowTime: number): void;
        private OnIsAnimatedChanged(args);
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnTouchDown(e: Input.TouchEventArgs): void;
    }
}
declare module Fayde.Drawing {
    class SketchContext {
        private _IsPaused;
        private _IsSetup;
        private _SketchSession;
        FrameCount: number;
        SketchSession: SketchSession;
        Ctx: CanvasRenderingContext2D;
        Width: number;
        Height: number;
        Size: Size;
        Milliseconds: number;
        Play(): void;
        Pause(): void;
        IsPaused: boolean;
        constructor();
        Setup(): void;
        Update(): void;
        Draw(): void;
    }
}
declare module Fayde.Drawing {
    class SketchDrawEventArgs implements nullstone.IEventArgs {
        SketchSession: SketchSession;
        constructor(session: SketchSession);
    }
}
declare module Fayde.Drawing {
    class SketchSession implements ISketchContext {
        private _Canvas;
        Ctx: CanvasRenderingContext2D;
        Width: number;
        Height: number;
        Milliseconds: number;
        constructor(canvas: HTMLCanvasElement, width: number, height: number, milliseconds: number);
    }
}
declare module Fayde.Drawing.sketch {
    interface ISketcher {
        (canvas: HTMLCanvasElement, width: number, height: number): any;
    }
}
declare module Fayde.Drawing.sketch {
    interface ISketchUpdaterAssets extends minerva.core.IUpdaterAssets, render.IInput {
    }
    class SketchUpdater extends minerva.core.Updater {
        assets: ISketchUpdaterAssets;
        init(): void;
        onSizeChanged(oldSize: minerva.Size, newSize: minerva.Size): void;
    }
}
declare module Fayde.Drawing.sketch.hittest {
    class SketchHitTestPipeDef extends minerva.core.hittest.HitTestPipeDef {
        constructor();
    }
}
declare module Fayde.Drawing.sketch.render {
    interface IInput extends minerva.core.render.IInput {
        actualWidth: number;
        actualHeight: number;
        canvas: HTMLCanvasElement;
        sketcher: ISketcher;
    }
    interface IState extends minerva.core.render.IState {
    }
    interface IOutput extends minerva.core.render.IOutput {
    }
    class SketchRenderPipeDef extends minerva.core.render.RenderPipeDef {
        constructor();
    }
}

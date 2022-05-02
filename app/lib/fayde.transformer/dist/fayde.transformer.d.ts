declare module Fayde.Transformer {
    var Version: string;
}
import ScaleTransform = Fayde.Media.ScaleTransform;
import TranslateTransform = Fayde.Media.TranslateTransform;
import Vector = Fayde.Utils.Vector;
declare module Fayde.Transformer {
    class Transformer {
        private _TweenEasing;
        private _Timer;
        private _LastVisualTick;
        private _IsPointerDown;
        private _IsDragging;
        private _LastPointerPosition;
        private _LastDragAccelerationPointerPosition;
        private _PointerPosition;
        private _PointerDelta;
        private _DragVelocity;
        private _DragAcceleration;
        private _VelocityAccumulationTolerance;
        private _DragMinSpeed;
        private _DragMaxSpeed;
        private _DragFriction;
        private _TranslateTransform;
        private _ScaleTransform;
        ViewportSize: Size;
        AnimationSpeed: number;
        ZoomFactor: number;
        ZoomLevels: number;
        ZoomLevel: number;
        ConstrainToViewport: boolean;
        DragAccelerationEnabled: boolean;
        UpdateTransform: nullstone.Event<TransformerEventArgs>;
        ScaleTransform: ScaleTransform;
        TranslateTransform: TranslateTransform;
        constructor();
        OnTicked(lastTime: number, nowTime: number): void;
        SizeChanged(viewportSize: Size): void;
        private _ValidateZoomLevel(level);
        Zoom(amount: number): void;
        ZoomTo(level: number): void;
        private _GetTargetScaleTransform(level);
        Scroll(position: Point): void;
        ScrollTo(newTransform: TranslateTransform): void;
        private _GetTargetTranslateTransform(targetScaleTransform);
        private _GetZoomOrigin(scaleTransform);
        private _Constrain();
        private _AddVelocity();
        private _RemoveVelocity();
        PointerDown(position: Point): void;
        PointerUp(): void;
        PointerMove(position: Point): void;
    }
}
import TransformGroup = Fayde.Media.TransformGroup;
declare module Fayde.Transformer {
    class TransformerControl extends Controls.ContentControl {
        static ZoomFactorProperty: DependencyProperty;
        static ZoomLevelsProperty: DependencyProperty;
        static ZoomLevelProperty: DependencyProperty;
        static ConstrainToViewportProperty: DependencyProperty;
        static AnimationSpeedProperty: DependencyProperty;
        static DragAccelerationEnabledProperty: DependencyProperty;
        static XPositionProperty: DependencyProperty;
        static YPositionProperty: DependencyProperty;
        private OnZoomFactorChanged(args);
        private OnZoomLevelsChanged(args);
        private OnZoomLevelChanged(args);
        private OnConstrainToViewportChanged(args);
        private OnAnimationSpeedChanged(args);
        private OnDragAccelerationEnabledChanged(args);
        private OnXPositionChanged(args);
        private OnYPositionChanged(args);
        AnimationSpeed: number;
        ZoomFactor: number;
        ZoomLevels: number;
        ZoomLevel: number;
        ConstrainToViewport: boolean;
        DragAccelerationEnabled: boolean;
        private _Transformer;
        TransformUpdated: nullstone.Event<TransformerEventArgs>;
        ViewportSize: Size;
        constructor();
        private UpdateTransform(sender, e);
        private Transformer_SizeChanged(sender, e);
        private Transformer_MouseLeftButtonDown(sender, e);
        private Transformer_MouseLeftButtonUp(sender, e);
        private Transformer_MouseMove(sender, e);
        private Transformer_TouchDown(sender, e);
        private Transformer_TouchUp(sender, e);
        private Transformer_TouchMove(sender, e);
    }
}
declare module Fayde.Transformer {
    class TransformerEventArgs implements nullstone.IEventArgs {
        Transforms: TransformGroup;
        constructor(transforms: TransformGroup);
    }
}

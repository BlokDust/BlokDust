module Fayde.Media.Animation {
    export enum EasingMode {
        EaseOut = 0,
        EaseIn = 1,
        EaseInOut = 2,
    }
    Fayde.CoreLibrary.addEnum(EasingMode, "EasingMode");

    export enum FillBehavior {
        HoldEnd = 0,
        Stop = 1,
    }
    Fayde.CoreLibrary.addEnum(FillBehavior, "FillBehavior");
}
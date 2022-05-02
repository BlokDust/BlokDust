/// <reference path="Effect.ts" />

module Fayde.Media.Effects {
    export class BlurEffect extends Effect {
        static RadiusProperty = DependencyProperty.Register("Radius", () => Number, BlurEffect, undefined, Incite);
        Radius: number;
    }
    Fayde.CoreLibrary.add(BlurEffect);
}
/// <reference path="../../Core/DependencyObject.ts" />

module Fayde.Media.VSM {
    export class VisualTransition extends DependencyObject {
        From: string = null;
        To: string = null;

        static StoryboardProperty = DependencyProperty.Register("Storyboard", () => Animation.Storyboard, VisualTransition);
        Storyboard: Animation.Storyboard;

        private _GeneratedDuration: Duration = null;
        get GeneratedDuration(): Duration { return this._GeneratedDuration; }
        set GeneratedDuration(value: Duration) { this._GeneratedDuration = nullstone.convertAnyToType(value, Duration); }

        DynamicStoryboardCompleted: boolean = true;
        ExplicitStoryboardCompleted: boolean = true;
        GeneratedEasingFunction: Animation.EasingFunctionBase;
        get IsDefault(): boolean { return this.From == null && this.To == null; }
    }
    Markup.Content(VisualTransition, VisualTransition.StoryboardProperty);
    Fayde.CoreLibrary.add(VisualTransition);
}
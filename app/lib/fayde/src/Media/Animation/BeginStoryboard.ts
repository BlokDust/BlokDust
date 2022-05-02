/// <reference path="../../Core/Triggers.ts" />

module Fayde.Media.Animation {
    export class BeginStoryboard extends TriggerAction {
        static StoryboardProperty = DependencyProperty.RegisterCore("Storyboard", () => Animation.Storyboard, BeginStoryboard);
        Storyboard: Animation.Storyboard;

        Fire() {
            var sb = this.Storyboard;
            if (sb) sb.Begin();
        }
    }
    Fayde.CoreLibrary.add(BeginStoryboard);
    Markup.Content(BeginStoryboard, BeginStoryboard.StoryboardProperty);
}
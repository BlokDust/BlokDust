/// <reference path="../../Core/DependencyObject.ts" />
/// <reference path="../../Core/XamlObjectCollection.ts" />

module Fayde.Media.VSM {
    export class VisualState extends DependencyObject {
        static StoryboardProperty = DependencyProperty.Register("Storyboard", () => Animation.Storyboard, VisualState);
        Storyboard: Animation.Storyboard;
    }
    Fayde.CoreLibrary.add(VisualState);
    Markup.Content(VisualState, VisualState.StoryboardProperty);

    export class VisualStateCollection extends XamlObjectCollection<VisualState> {
    }
    Fayde.CoreLibrary.add(VisualStateCollection);
}
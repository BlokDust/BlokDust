/// <reference path="Primitives/RangeBase.ts" />

module Fayde.Controls {
    export class ProgressBar extends Primitives.RangeBase {
        private _Track: FrameworkElement;
        private _Indicator: FrameworkElement;

        static IsIndeterminateProperty = DependencyProperty.Register("IsIndeterminate", () => Boolean, ProgressBar, false, (d, args) => (<ProgressBar>d).OnIsIndeterminateChanged(args));
        IsIndeterminate: boolean;
        private OnIsIndeterminateChanged(args: IDependencyPropertyChangedEventArgs) {
            this._UpdateIndicator();
            this.UpdateVisualState();
        }

        OnMinimumChanged(oldMinimum: number, newMinimum: number) {
            super.OnMinimumChanged(oldMinimum, newMinimum);
            this._UpdateIndicator();
        }
        OnMaximumChanged(oldMaximum: number, newMaximum: number) {
            super.OnMaximumChanged(oldMaximum, newMaximum);
            this._UpdateIndicator();
        }
        OnValueChanged(oldValue: number, newValue: number) {
            super.OnValueChanged(oldValue, newValue);
            this._UpdateIndicator();
        }

        constructor() {
            super();
            this.DefaultStyleKey = ProgressBar;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();

            var track = this._Track;
            if (track)
                track.SizeChanged.off(this._OnTrackSizeChanged, this);

            track = this._Track = <FrameworkElement>this.GetTemplateChild("ProgressBarTrack", FrameworkElement);
            this._Indicator = <FrameworkElement>this.GetTemplateChild("ProgressBarIndicator", FrameworkElement);

            if (track)
                track.SizeChanged.on(this._OnTrackSizeChanged, this);

            this.UpdateVisualState(false);
        }

        GoToStates(gotoFunc: (state: string) => boolean) {
            if (this.IsIndeterminate)
                gotoFunc("Indeterminate");
            else
                gotoFunc("Determinate");
        }

        private _OnTrackSizeChanged(sender, e) {
            this._UpdateIndicator();
        }
        private _UpdateIndicator() {
            var min = this.Minimum;
            var max = this.Maximum;
            var val = this.Value;

            var indicator = this._Indicator;
            if (!indicator)
                return;

            var parent = <FrameworkElement>VisualTreeHelper.GetParent(indicator);
            if (!parent)
                return;

            var margin = indicator.Margin;
            var outerWidth = (margin) ? margin.left + margin.right : 0.0;
            var padding: Thickness = null;
            if (parent instanceof Border)
                padding = (<Border>parent).Padding;
            else if (parent instanceof Control)
                padding = (<Control>parent).Padding;

            if (padding) {
                outerWidth += padding.left;
                outerWidth += padding.right;
            }

            var progress = 1.0;
            if (!this.IsIndeterminate && max !== min)
                progress = (val - min) / (max - min);
            var fullWidth = Math.max(0, parent.ActualWidth - outerWidth);
            indicator.Width = fullWidth * progress;
        }
    }
    Fayde.CoreLibrary.add(ProgressBar);
    TemplateVisualStates(ProgressBar,
        { GroupName: "CommonStates", Name: "Indeterminate" },
        { GroupName: "CommonStates", Name: "Determinate" });
    TemplateParts(ProgressBar,
        { Name: "ProgressBarIndicator", Type: FrameworkElement },
        { Name: "ProgressBarTrack", Type: FrameworkElement });
}
/// <reference path="RangeBase.ts" />
/// <reference path="RepeatButton.ts" />
/// <reference path="Thumb.ts" />

module Fayde.Controls.Primitives {
    export class ScrollBar extends RangeBase {
        private _DragValue: number = 0;

        Scroll = new RoutedEvent<ScrollEventArgs>();

        static OrientationProperty = DependencyProperty.Register("Orientation", () => new Enum(Orientation), ScrollBar, Orientation.Horizontal, (d, args) => (<ScrollBar>d)._OnOrientationChanged());
        static ViewportSizeProperty = DependencyProperty.Register("ViewportSize", () => Number, ScrollBar, 0, (d, args) => (<ScrollBar>d)._UpdateTrackLayout());
        Orientation: Orientation;
        ViewportSize: number;

        get IsDragging(): boolean {
            if (this.$HorizontalThumb)
                return this.$HorizontalThumb.IsDragging;
            if (this.$VerticalThumb)
                return this.$VerticalThumb.IsDragging;
            return false;
        }

        constructor() {
            super();
            this.DefaultStyleKey = ScrollBar;
            this.SizeChanged.on(this._HandleSizeChanged, this);
        }

        private $HorizontalTemplate: FrameworkElement;
        private $HorizontalSmallIncrease: RepeatButton;
        private $HorizontalSmallDecrease: RepeatButton;
        private $HorizontalLargeIncrease: RepeatButton;
        private $HorizontalLargeDecrease: RepeatButton;
        private $HorizontalThumb: Thumb;

        private $VerticalTemplate: FrameworkElement;
        private $VerticalSmallIncrease: RepeatButton;
        private $VerticalSmallDecrease: RepeatButton;
        private $VerticalLargeIncrease: RepeatButton;
        private $VerticalLargeDecrease: RepeatButton;
        private $VerticalThumb: Thumb;
        
        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.$HorizontalTemplate = <FrameworkElement>this.GetTemplateChild("HorizontalRoot", FrameworkElement);
            this.$HorizontalLargeIncrease = <RepeatButton>this.GetTemplateChild("HorizontalLargeIncrease", RepeatButton);
            this.$HorizontalLargeDecrease = <RepeatButton>this.GetTemplateChild("HorizontalLargeDecrease", RepeatButton);
            this.$HorizontalSmallIncrease = <RepeatButton>this.GetTemplateChild("HorizontalSmallIncrease", RepeatButton);
            this.$HorizontalSmallDecrease = <RepeatButton>this.GetTemplateChild("HorizontalSmallDecrease", RepeatButton);
            this.$HorizontalThumb = <Thumb>this.GetTemplateChild("HorizontalThumb", Thumb);
            this.$VerticalTemplate = <FrameworkElement>this.GetTemplateChild("VerticalRoot", FrameworkElement);
            this.$VerticalLargeIncrease = <RepeatButton>this.GetTemplateChild("VerticalLargeIncrease", RepeatButton);
            this.$VerticalLargeDecrease = <RepeatButton>this.GetTemplateChild("VerticalLargeDecrease", RepeatButton);
            this.$VerticalSmallIncrease = <RepeatButton>this.GetTemplateChild("VerticalSmallIncrease", RepeatButton);
            this.$VerticalSmallDecrease = <RepeatButton>this.GetTemplateChild("VerticalSmallDecrease", RepeatButton);
            this.$VerticalThumb = <Thumb>this.GetTemplateChild("VerticalThumb", Thumb);

            if (this.$HorizontalThumb) {
                this.$HorizontalThumb.DragStarted.on(this._OnThumbDragStarted, this);
                this.$HorizontalThumb.DragDelta.on(this._OnThumbDragDelta, this);
                this.$HorizontalThumb.DragCompleted.on(this._OnThumbDragCompleted, this);
            }
            if (this.$HorizontalLargeIncrease) {
                this.$HorizontalLargeIncrease.Click.on(this._LargeIncrement, this);
            }
            if (this.$HorizontalLargeDecrease) {
                this.$HorizontalLargeDecrease.Click.on(this._LargeDecrement, this);
            }
            if (this.$HorizontalSmallIncrease) {
                this.$HorizontalSmallIncrease.Click.on(this._SmallIncrement, this);
            }
            if (this.$HorizontalSmallDecrease) {
                this.$HorizontalSmallDecrease.Click.on(this._SmallDecrement, this);
            }
            if (this.$VerticalThumb) {
                this.$VerticalThumb.DragStarted.on(this._OnThumbDragStarted, this);
                this.$VerticalThumb.DragDelta.on(this._OnThumbDragDelta, this);
                this.$VerticalThumb.DragCompleted.on(this._OnThumbDragCompleted, this);
            }
            if (this.$VerticalLargeIncrease) {
                this.$VerticalLargeIncrease.Click.on(this._LargeIncrement, this);
            }
            if (this.$VerticalLargeDecrease) {
                this.$VerticalLargeDecrease.Click.on(this._LargeDecrement, this);
            }
            if (this.$VerticalSmallIncrease) {
                this.$VerticalSmallIncrease.Click.on(this._SmallIncrement, this);
            }
            if (this.$VerticalSmallDecrease) {
                this.$VerticalSmallDecrease.Click.on(this._SmallDecrement, this);
            }

            this._OnOrientationChanged();
            this.UpdateVisualState(false);
        }

        OnMaximumChanged(oldMax: number, newMax: number) {
            super.OnMaximumChanged(oldMax, newMax);
            this._UpdateTrackLayout();
        }
        OnMinimumChanged(oldMin: number, newMin: number) {
            super.OnMinimumChanged(oldMin, newMin);
            this._UpdateTrackLayout();
        }
        OnValueChanged(oldValue: number, newValue: number) {
            super.OnValueChanged(oldValue, newValue);
            this._UpdateTrackLayout();
        }

        private _OnThumbDragStarted(sender, e: DragStartedEventArgs) {
            this._DragValue = this.Value;
        }
        private _OnThumbDragDelta(sender, e: DragDeltaEventArgs) {
            var change = 0;
            var zoomFactor = 1; //TODO: FullScreen?
            var num = zoomFactor;
            var max = this.Maximum;
            var min = this.Minimum;
            var diff = max - min;
            var trackLength = this._GetTrackLength();
            var isHorizontal = this.Orientation === Orientation.Horizontal;
            if (this.$VerticalThumb && !isHorizontal) {
                change = num * e.VerticalChange / (trackLength - this.$VerticalThumb.ActualHeight) * diff;
            }
            if (this.$HorizontalThumb && isHorizontal) {
                change = num * e.HorizontalChange / (trackLength - this.$HorizontalThumb.ActualWidth) * diff;
            }
            if (!isNaN(change) && isFinite(change)) {
                this._DragValue += change;
                var num1 = Math.min(max, Math.max(min, this._DragValue));
                if (num1 !== this.Value) {
                    this.Value = num1;
                    this._RaiseScroll(ScrollEventType.ThumbTrack);
                }
            }
        }
        private _OnThumbDragCompleted(sender, e: DragCompletedEventArgs) {
            this._RaiseScroll(ScrollEventType.EndScroll);
        }

        private _SmallDecrement(sender, e: RoutedEventArgs) {
            var curValue = this.Value;
            var num = Math.max(curValue - this.SmallChange, this.Minimum);
            if (curValue !== num) {
                this.SetCurrentValue(RangeBase.ValueProperty, num);
                this._RaiseScroll(ScrollEventType.SmallDecrement);
            }
        }
        private _SmallIncrement(sender, e: RoutedEventArgs) {
            var curValue = this.Value;
            var num = Math.min(curValue + this.SmallChange, this.Maximum);
            if (curValue !== num) {
                this.SetCurrentValue(RangeBase.ValueProperty, num);
                this._RaiseScroll(ScrollEventType.SmallIncrement);
            }
        }
        private _LargeDecrement(sender, e: RoutedEventArgs) {
            var curValue = this.Value;
            var num = Math.max(curValue - this.LargeChange, this.Minimum);
            if (curValue !== num) {
                this.SetCurrentValue(RangeBase.ValueProperty, num);
                this._RaiseScroll(ScrollEventType.LargeDecrement);
            }
        }
        private _LargeIncrement(sender, e: RoutedEventArgs) {
            var curValue = this.Value;
            var num = Math.min(curValue + this.LargeChange, this.Maximum);
            if (curValue !== num) {
                this.SetCurrentValue(RangeBase.ValueProperty, num);
                this._RaiseScroll(ScrollEventType.LargeIncrement);
            }
        }

        private _HandleSizeChanged(sender, e: nullstone.IEventArgs) {
            this._UpdateTrackLayout();
        }
        private _OnOrientationChanged() {
            var isHorizontal = this.Orientation === Orientation.Horizontal;
            if (this.$HorizontalTemplate) {
                this.$HorizontalTemplate.Visibility = isHorizontal ? Visibility.Visible : Visibility.Collapsed;
            }
            if (this.$VerticalTemplate) {
                this.$VerticalTemplate.Visibility = isHorizontal ? Visibility.Collapsed : Visibility.Visible;
            }
            this._UpdateTrackLayout();
        }
        private _UpdateTrackLayout() {
            var trackLength = this._GetTrackLength();
            var max = this.Maximum;
            var min = this.Minimum;
            var val = this.Value;
            var multiplier = (val - min) / (max - min);
            var thumbSize = this._UpdateThumbSize(trackLength);

            var isHorizontal = this.Orientation === Orientation.Horizontal;
            if (isHorizontal && this.$HorizontalLargeDecrease && this.$HorizontalThumb) {
                this.$HorizontalLargeDecrease.Width = Math.max(0, multiplier * (trackLength - thumbSize));
            } else if (!isHorizontal && this.$VerticalLargeDecrease && this.$VerticalThumb) {
                this.$VerticalLargeDecrease.Height = Math.max(0, multiplier * (trackLength - thumbSize));
            }
        }
        private _UpdateThumbSize(trackLength: number): number {
            var result = Number.NaN;
            var hideThumb = trackLength <= 0;
            if (trackLength > 0) {
                var isHorizontal = this.Orientation === Orientation.Horizontal;
                var max = this.Maximum;
                var min = this.Minimum;
                if (isHorizontal && this.$HorizontalThumb) {
                    if (max - min !== 0)
                        result = Math.max(this.$HorizontalThumb.MinWidth, this._ConvertViewportSizeToDisplayUnits(trackLength));
                    if (max - min === 0 || result > this.ActualWidth || trackLength <= this.$HorizontalThumb.MinWidth) {
                        hideThumb = true;
                    } else {
                        this.$HorizontalThumb.Visibility = Visibility.Visible;
                        this.$HorizontalThumb.Width = result;
                    }
                } else if (!isHorizontal && this.$VerticalThumb) {
                    if (max - min !== 0)
                        result = Math.max(this.$VerticalThumb.MinHeight, this._ConvertViewportSizeToDisplayUnits(trackLength));
                    if (max - min === 0 || result > this.ActualHeight || trackLength <= this.$VerticalThumb.MinHeight) {
                        hideThumb = true;
                    } else {
                        this.$VerticalThumb.Visibility = Visibility.Visible;
                        this.$VerticalThumb.Height = result;
                    }
                }
            }
            if (hideThumb) {
                if (this.$HorizontalThumb) {
                    this.$HorizontalThumb.Visibility = Visibility.Collapsed;
                }
                if (this.$VerticalThumb) {
                    this.$VerticalThumb.Visibility = Visibility.Collapsed;
                }
            }
            return result;
        }
        private _GetTrackLength(): number {
            var actual = NaN;
            if (this.Orientation === Orientation.Horizontal) {
                actual = this.ActualWidth;
                if (this.$HorizontalSmallDecrease) {
                    var thickness = this.$HorizontalSmallDecrease.Margin;
                    actual = actual - (this.$HorizontalSmallDecrease.ActualWidth + thickness.left + thickness.right);
                }
                if (this.$HorizontalSmallIncrease) {
                    var thickness = this.$HorizontalSmallIncrease.Margin;
                    actual = actual - (this.$HorizontalSmallIncrease.ActualWidth + thickness.left + thickness.right);
                }
            } else {
                actual = this.ActualHeight;
                if (this.$VerticalSmallDecrease) {
                    var thickness = this.$VerticalSmallDecrease.Margin;
                    actual = actual - (this.$VerticalSmallDecrease.ActualHeight + thickness.top + thickness.bottom);
                }
                if (this.$VerticalSmallIncrease) {
                    var thickness = this.$VerticalSmallIncrease.Margin;
                    actual = actual - (this.$VerticalSmallIncrease.ActualHeight + thickness.top + thickness.bottom);
                }
            }
            return actual;
        }
        private _ConvertViewportSizeToDisplayUnits(trackLength: number): number {
            var viewportSize = this.ViewportSize;
            return trackLength * viewportSize / (viewportSize + this.Maximum - this.Minimum);
        }
        private _RaiseScroll(type: Primitives.ScrollEventType) {
            var args = new ScrollEventArgs(type, this.Value);
            args.OriginalSource = this;
            this.Scroll.raise(this, args);
        }
    }
    Fayde.CoreLibrary.add(ScrollBar);
    TemplateVisualStates(ScrollBar, 
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Disabled" });
    TemplateParts(ScrollBar,
        { Name: "VerticalRoot", Type: FrameworkElement },
        { Name: "VerticalLargeIncrease", Type: RepeatButton },
        { Name: "VerticalLargeDecrease", Type: RepeatButton },
        { Name: "VerticalSmallIncrease", Type: RepeatButton },
        { Name: "VerticalSmallDecrease", Type: RepeatButton },
        { Name: "VerticalThumb", Type: Thumb },
        { Name: "HorizontalRoot", Type: FrameworkElement },
        { Name: "HorizontalLargeIncrease", Type: RepeatButton },
        { Name: "HorizontalLargeDecrease", Type: RepeatButton },
        { Name: "HorizontalSmallIncrease", Type: RepeatButton },
        { Name: "HorizontalSmallDecrease", Type: RepeatButton },
        { Name: "HorizontalThumb", Type: Thumb });
}
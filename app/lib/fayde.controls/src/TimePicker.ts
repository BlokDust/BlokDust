module Fayde.Controls {
    export class TimePicker extends Control {
        static SelectedHourProperty = DependencyProperty.Register("SelectedHour", () => Number, TimePicker, 0, (d, args) => (<TimePicker>d).OnSelectedHourChanged(args));
        static SelectedMinuteProperty = DependencyProperty.Register("SelectedMinute", () => Number, TimePicker, 0, (d, args) => (<TimePicker>d).OnSelectedMinuteChanged(args));
        static SelectedSecondProperty = DependencyProperty.Register("SelectedSecond", () => Number, TimePicker, 0, (d, args) => (<TimePicker>d).OnSelectedSecondChanged(args));
        static SelectedTimeProperty = DependencyProperty.Register("SelectedTime", () => TimeSpan, TimePicker, undefined, (d, args) => (<TimePicker>d).OnSelectedTimeChanged(args));
        static IsSecondsShownProperty = DependencyProperty.Register("IsSecondsShown", () => Boolean, TimePicker, true, (d, args) => (<TimePicker>d)._UpdateText());
        static DisplayModeProperty = DependencyProperty.Register("DisplayMode", () => new Enum(TimeDisplayMode), TimePicker, TimeDisplayMode.Regular, (d, args) => (<TimePicker>d).OnDisplayModeChanged(args));
        SelectedHour: number;
        SelectedMinute: number;
        SelectedSecond: number;
        SelectedTime: TimeSpan;
        IsSecondsShown: boolean;
        DisplayMode: TimeDisplayMode;

        private OnSelectedHourChanged(args: IDependencyPropertyChangedEventArgs) {
            this.CoerceHour(args.NewValue);
            this.CoerceTime();
        }
        private OnSelectedMinuteChanged(args: IDependencyPropertyChangedEventArgs) {
            this.CoerceMinute(args.NewValue);
            this.CoerceTime();
        }
        private OnSelectedSecondChanged(args: IDependencyPropertyChangedEventArgs) {
            this.CoerceSecond(args.NewValue);
            this.CoerceTime();
        }
        private OnSelectedTimeChanged(args: IDependencyPropertyChangedEventArgs) {
            var ts = <TimeSpan>args.NewValue;
            if (ts instanceof TimeSpan) {
                this.CoerceHour(ts.Hours);
                this.CoerceMinute(ts.Minutes);
                this.CoerceSecond(ts.Seconds);
            } else {
                this.CoerceHour(NaN);
                this.CoerceMinute(NaN);
                this.CoerceSecond(NaN);
            }
        }
        private OnDisplayModeChanged(args: IDependencyPropertyChangedEventArgs) {
            this._UpdateText();
        }

        private _HourTextBox: TextBox = null;
        private _MinuteTextBox: TextBox = null;
        private _SecondTextBox: TextBox = null;
        private _SecondSeparator: FrameworkElement = null;
        private _SuffixTextBlock: TextBlock = null;

        private _HourGesture = new Internal.EventGesture<TextBox>();
        private _MinuteGesture = new Internal.EventGesture<TextBox>();
        private _SecondGesture = new Internal.EventGesture<TextBox>();
        private _SuffixGesture = new Internal.EventGesture<TextBox>();

        private _SelectionHandler: Internal.SelectionHandler = null;

        constructor() {
            super();
            this.DefaultStyleKey = TimePicker;
            this.CoerceTime();
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();

            this._HourGesture.Detach();
            this._HourTextBox = <TextBox>this.GetTemplateChild("HourTextBox", TextBox);
            if (this._HourTextBox)
                this._HourGesture.Attach(this._HourTextBox.LostFocus, (tb) => this.CoerceHour(this._GetHourInput()));
            
            this._MinuteGesture.Detach();
            this._MinuteTextBox = <TextBox>this.GetTemplateChild("MinuteTextBox", TextBox);
            if (this._MinuteTextBox)
                this._MinuteGesture.Attach(this._MinuteTextBox.LostFocus, (tb) => this.CoerceMinute(tb.Text));
            
            this._SecondGesture.Detach();
            this._SecondTextBox = <TextBox>this.GetTemplateChild("SecondTextBox", TextBox);
            if (this._SecondTextBox)
                this._SecondGesture.Attach(this._SecondTextBox.LostFocus, (tb) => this.CoerceSecond(tb.Text));

            this._SecondSeparator = <FrameworkElement>this.GetTemplateChild("SecondSeparator", FrameworkElement);

            this._SuffixGesture.Detach();
            this._SuffixTextBlock = <TextBlock>this.GetTemplateChild("SuffixTextBlock", TextBlock);
            if (this._SuffixTextBlock)
                this._SuffixGesture.Attach(this._SuffixTextBlock.MouseLeftButtonUp, (tb) => this.ToggleAmPm());

            if (this._SelectionHandler)
                this._SelectionHandler.Dispose();
            this._SelectionHandler = new Internal.SelectionHandler([this._HourTextBox, this._MinuteTextBox, this._SecondTextBox]);

            this._UpdateText();
        }

        private _GetHourInput(): string {
            var text = this._HourTextBox.Text;
            if (this.DisplayMode === TimeDisplayMode.Military)
                return text;
            var h = parseFloat(text);
            var isa = !!this._SuffixTextBlock && this._SuffixTextBlock.Text === "AM";
            if (isa && h === 12)
                return "00";
            if (!isa && h < 12)
                return (h + 12).toString();
            return text;
        }

        private CoerceHour(hour: any) {
            hour = Math.max(0, Math.min(23, hour));
            hour = hour || 0;
            this.SetCurrentValue(TimePicker.SelectedHourProperty, hour);
            this._UpdateText();
        }
        private CoerceMinute(minute: any) {
            minute = Math.max(0, Math.min(59, minute));
            minute = minute || 0;
            this.SetCurrentValue(TimePicker.SelectedMinuteProperty, minute);
            this._UpdateText();
        }
        private CoerceSecond(second: any) {
            second = Math.max(0, Math.min(59, second));
            second = second || 0;
            this.SetCurrentValue(TimePicker.SelectedSecondProperty, second);
            this._UpdateText();
        }
        private CoerceTime() {
            var ts = new TimeSpan(this.SelectedHour, this.SelectedMinute, this.SelectedSecond);
            var old = this.SelectedTime;
            if (!!old && ts.CompareTo(old) === 0)
                return;
            this.SetCurrentValue(TimePicker.SelectedTimeProperty, ts);
        }
        private ToggleAmPm() {
            var hour = this.SelectedHour;
            if (hour >= 12)
                hour -= 12;
            else
                hour += 12;
            this.CoerceHour(hour);
        }

        private _UpdateText() {
            var isMilitary = this.DisplayMode === TimeDisplayMode.Military;
            var h = this.SelectedHour;
            var m = this.SelectedMinute;
            var s = this.SelectedSecond;
            var isSecondShown = this.IsSecondsShown;

            var hd = h;
            if (!isMilitary) {
                hd = hd >= 12 ? (hd - 12) : hd;
                hd = hd === 0 ? 12 : hd;
            }

            if (this._HourTextBox)
                this._HourTextBox.Text = formatNumber(hd, 2, "00");
            if (this._MinuteTextBox)
                this._MinuteTextBox.Text = formatNumber(m, 2, "00");
            if (this._SecondTextBox) {
                this._SecondTextBox.Text = formatNumber(s, 2, "00");
                this._SecondTextBox.Visibility = isSecondShown ? Visibility.Visible : Visibility.Collapsed;
            }

            if (this._SecondSeparator)
                this._SecondSeparator.Visibility = isSecondShown ? Visibility.Visible : Visibility.Collapsed;

            if (this._SuffixTextBlock) {
                this._SuffixTextBlock.Visibility = isMilitary ? Visibility.Collapsed : Visibility.Visible;
                this._SuffixTextBlock.Text = h >= 12 ? "PM" : "AM";
            }
        }
    }
    TemplateParts(TimePicker,
        { Name: "HourTextBox", Type: TextBox },
        { Name: "MinuteTextBox", Type: TextBox },
        { Name: "SecondTextBox", Type: TextBox },
        { Name: "SecondSeparator", Type: FrameworkElement },
        { Name: "SuffixTextBlock", Type: TextBlock });
    TemplateVisualStates(TimePicker,
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "ValidationStates", Name: "Valid" },
        { GroupName: "ValidationStates", Name: "InvalidFocused" },
        { GroupName: "ValidationStates", Name: "InvalidUnfocused" });
    
    function formatNumber(n: number, digits: number, fallback: string) {
        if (isNaN(n))
            return fallback;
        return Localization.Format("{0:d" + digits + "}", n);
    }
}
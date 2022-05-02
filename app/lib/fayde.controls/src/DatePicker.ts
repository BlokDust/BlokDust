module Fayde.Controls {
    export class DatePicker extends Control {
        static SelectedMonthProperty = DependencyProperty.Register("SelectedMonth", () => Number, DatePicker, NaN, (d, args) => (<DatePicker>d).OnSelectedMonthChanged(args));
        static SelectedDayProperty = DependencyProperty.Register("SelectedDay", () => Number, DatePicker, NaN, (d, args) => (<DatePicker>d).OnSelectedDayChanged(args));
        static SelectedYearProperty = DependencyProperty.Register("SelectedYear", () => Number, DatePicker, NaN, (d, args) => (<DatePicker>d).OnSelectedYearChanged(args));
        static SelectedDateProperty = DependencyProperty.Register("SelectedDate", () => DateTime, DatePicker, undefined, (d, args) => (<DatePicker>d).OnSelectedDateChanged(args));
        SelectedMonth: number;
        SelectedDay: number;
        SelectedYear: number;
        SelectedDate: DateTime;

        private OnSelectedMonthChanged(args: IDependencyPropertyChangedEventArgs) {
            this.CoerceMonth(args.NewValue);
            this.CoerceDate();
        }
        private OnSelectedDayChanged(args: IDependencyPropertyChangedEventArgs) {
            this.CoerceDay(args.NewValue);
            this.CoerceDate();
        }
        private OnSelectedYearChanged(args: IDependencyPropertyChangedEventArgs) {
            this.CoerceYear(args.NewValue);
            this.CoerceDate();
        }
        private OnSelectedDateChanged(args: IDependencyPropertyChangedEventArgs) {
            var dt = <DateTime>args.NewValue;
            if (dt instanceof DateTime) {
                this.CoerceMonth(dt.Month);
                this.CoerceDay(dt.Day);
                this.CoerceYear(dt.Year);
            } else {
                this.CoerceMonth(NaN);
                this.CoerceDay(NaN);
                this.CoerceYear(NaN);
            }
        }

        private _MonthTextBox: TextBox = null;
        private _DayTextBox: TextBox = null;
        private _YearTextBox: TextBox = null;

        private _MonthGesture = new Internal.EventGesture<TextBox>();
        private _DayGesture = new Internal.EventGesture<TextBox>();
        private _YearGesture = new Internal.EventGesture<TextBox>();

        private _SelectionHandler: Internal.SelectionHandler = null;

        constructor() {
            super();
            this.DefaultStyleKey = DatePicker;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();

            this._MonthGesture.Detach();
            this._MonthTextBox = <TextBox>this.GetTemplateChild("MonthTextBox", TextBox);
            if (this._MonthTextBox)
                this._MonthGesture.Attach(this._MonthTextBox.LostFocus, (tb) => this.CoerceMonth(tb.Text));

            this._DayGesture.Detach();
            this._DayTextBox = <TextBox>this.GetTemplateChild("DayTextBox", TextBox);
            if (this._DayTextBox)
                this._DayGesture.Attach(this._DayTextBox.LostFocus, (tb) => this.CoerceDay(tb.Text));

            this._YearGesture.Detach();
            this._YearTextBox = <TextBox>this.GetTemplateChild("YearTextBox", TextBox);
            if (this._YearTextBox)
                this._YearGesture.Attach(this._YearTextBox.LostFocus, (tb) => this.CoerceDay(tb.Text));

            if (this._SelectionHandler)
                this._SelectionHandler.Dispose();
            this._SelectionHandler = new Internal.SelectionHandler([this._MonthTextBox, this._DayTextBox, this._YearTextBox]);

            this._UpdateText();
        }

        private CoerceMonth(month: any) {
            month = Math.max(1, Math.min(12, month));
            if (!isNaN(month) || !isNaN(this.SelectedMonth))
                this.SetCurrentValue(DatePicker.SelectedMonthProperty, month);
            this._UpdateText();
        }
        private CoerceDay(day: any) {
            day = Math.max(1, Math.min(31, parseFloat(day)));
            if (!isNaN(day) || !isNaN(this.SelectedDay))
                this.SetCurrentValue(DatePicker.SelectedDayProperty, day);
            this._UpdateText();
        }
        private CoerceYear(year: any) {
            var maxYear = DateTime.MaxValue.Year - 1;
            year = Math.min(maxYear, Math.max(0, year));
            if (!isNaN(year) || !isNaN(this.SelectedYear))
                this.SetCurrentValue(DatePicker.SelectedYearProperty, year);
            this._UpdateText();
        }
        private CoerceDate() {
            var m = this.SelectedMonth;
            var d = this.SelectedDay;
            var y = this.SelectedYear;
            if (isNaN(m) || isNaN(d) || isNaN(y))
                return;
            var dte = new DateTime(y, m, d);
            if (DateTime.Compare(dte, this.SelectedDate) === 0)
                return;
            this.SetCurrentValue(DatePicker.SelectedDateProperty, dte);
        }

        private _UpdateText() {
            if (this._MonthTextBox)
                this._MonthTextBox.Text = formatNumber(this.SelectedMonth, 2, "MM");
            if (this._DayTextBox)
                this._DayTextBox.Text = formatNumber(this.SelectedDay, 2, "DD");
            if (this._YearTextBox)
                this._YearTextBox.Text = formatNumber(this.SelectedYear, 4, "YYYY");
        }
    }
    TemplateParts(DatePicker,
        { Name: "MonthTextBox", Type: TextBox },
        { Name: "DayTextBox", Type: TextBox },
        { Name: "YearTextBox", Type: TextBox });
    TemplateVisualStates(DatePicker,
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "ValidationStates", Name: "Valid" },
        { GroupName: "ValidationStates", Name: "InvalidFocused" },
        { GroupName: "ValidationStates", Name: "InvalidUnfocused" });
    //[StyleTypedProperty(Property = "CalendarStyle", StyleTargetType = typeof (Calendar))]

    function formatNumber(n: number, digits: number, fallback: string) {
        if (isNaN(n))
            return fallback;
        return Localization.Format("{0:d" + digits + "}", n);
    }
}
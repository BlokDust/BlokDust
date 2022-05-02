var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        Controls.version = '0.17.5';
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        Controls.Library = Fayde.TypeManager.resolveLibrary("lib://fayde.controls");
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Primitives;
        (function (Primitives) {
            var MenuBase = (function (_super) {
                __extends(MenuBase, _super);
                function MenuBase() {
                    _super.apply(this, arguments);
                }
                MenuBase.prototype.IsItemItsOwnContainer = function (item) { return item instanceof Controls.MenuItem || item instanceof Controls.Separator; };
                MenuBase.prototype.GetContainerForItem = function () { return new Controls.MenuItem(); };
                MenuBase.prototype.PrepareContainerForItem = function (element, item) {
                    _super.prototype.PrepareContainerForItem.call(this, element, item);
                    var menuItem = element;
                    if (!(menuItem instanceof Controls.MenuItem))
                        return;
                    menuItem.ParentMenuBase = this;
                    if (menuItem != item) {
                        var itemTemplate = this.ItemTemplate;
                        var itemContainerStyle = this.ItemContainerStyle;
                        if (itemTemplate != null)
                            menuItem.SetValue(Fayde.Controls.ItemsControl.ItemTemplateProperty, itemTemplate);
                        if (itemContainerStyle != null && MenuBase.HasDefaultValue(menuItem, Controls.HeaderedItemsControl.ItemContainerStyleProperty))
                            menuItem.SetValue(Controls.HeaderedItemsControl.ItemContainerStyleProperty, itemContainerStyle);
                        if (MenuBase.HasDefaultValue(menuItem, Controls.HeaderedItemsControl.HeaderProperty))
                            menuItem.Header = item;
                        if (itemTemplate != null)
                            menuItem.SetValue(Controls.HeaderedItemsControl.HeaderTemplateProperty, itemTemplate);
                        if (itemContainerStyle != null)
                            menuItem.SetValue(Fayde.FrameworkElement.StyleProperty, itemContainerStyle);
                    }
                };
                MenuBase.HasDefaultValue = function (control, propd) {
                    return control.ReadLocalValue(propd) === DependencyProperty.UnsetValue;
                };
                MenuBase.ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", function () { return Fayde.Style; }, MenuBase);
                return MenuBase;
            })(Fayde.Controls.ItemsControl);
            Primitives.MenuBase = MenuBase;
        })(Primitives = Controls.Primitives || (Controls.Primitives = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
/// <reference path="Primitives/MenuBase.ts" />
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ContextMenu = (function (_super) {
            __extends(ContextMenu, _super);
            function ContextMenu() {
                _super.call(this);
                this.Opened = new Fayde.RoutedEvent();
                this.Closed = new Fayde.RoutedEvent();
                this._Owner = null;
                this._PopupAlignmentPoint = new Point();
                this._SettingIsOpen = false;
                this._Popup = null;
                this._Overlay = null;
                this.DefaultStyleKey = ContextMenu;
                this.$RootVisualTracker = new Controls.contextmenu.RootVisualTracker(this);
            }
            ContextMenu.prototype.OnHorizontalOffsetChanged = function (args) {
                this.UpdateContextMenuPlacement();
            };
            ContextMenu.prototype.OnVerticalOffsetChanged = function (args) {
                this.UpdateContextMenuPlacement();
            };
            ContextMenu.prototype.OnIsOpenChanged = function (args) {
                if (this._SettingIsOpen)
                    return;
                if (args.NewValue === true)
                    this.OpenPopup(this.$RootVisualTracker.mousePosition);
                else
                    this.ClosePopup();
            };
            ContextMenu.prototype.OnKeyDown = function (e) {
                switch (e.Key) {
                    case Fayde.Input.Key.Escape:
                        this.ClosePopup();
                        e.Handled = true;
                        break;
                    case Fayde.Input.Key.Up:
                        this.FocusNextItem(false);
                        e.Handled = true;
                        break;
                    case Fayde.Input.Key.Down:
                        this.FocusNextItem(true);
                        e.Handled = true;
                        break;
                }
                _super.prototype.OnKeyDown.call(this, e);
            };
            ContextMenu.prototype.OnMouseLeftButtonDown = function (e) {
                e.Handled = true;
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
            };
            ContextMenu.prototype.OnMouseRightButtonDown = function (e) {
                e.Handled = true;
                _super.prototype.OnMouseRightButtonDown.call(this, e);
            };
            Object.defineProperty(ContextMenu.prototype, "Owner", {
                get: function () {
                    return this._Owner;
                },
                set: function (value) {
                    if (this._Owner) {
                        var fe = this._Owner instanceof Fayde.FrameworkElement ? this._Owner : null;
                        if (fe)
                            fe.MouseRightButtonDown.off(this._HandleOwnerMouseRightButtonDown, this);
                    }
                    this._Owner = value;
                    if (!this._Owner)
                        return;
                    fe = this._Owner instanceof Fayde.FrameworkElement ? this._Owner : null;
                    if (fe)
                        fe.MouseRightButtonDown.on(this._HandleOwnerMouseRightButtonDown, this);
                },
                enumerable: true,
                configurable: true
            });
            ContextMenu.prototype._HandleOwnerMouseRightButtonDown = function (sender, e) {
                this.OpenPopup(e.GetPosition(null));
                e.Handled = true;
            };
            ContextMenu.prototype._HandleOverlayMouseButtonDown = function (sender, e) {
                this.ClosePopup();
                e.Handled = true;
            };
            ContextMenu.prototype._HandleContextMenuSizeChanged = function (sender, e) {
                this.UpdateContextMenuPlacement();
            };
            ContextMenu.prototype.ChildMenuItemClicked = function () {
                this.ClosePopup();
            };
            ContextMenu.prototype.UpdateContextMenuPlacement = function () {
                var pap = this._PopupAlignmentPoint;
                var full = this.$RootVisualTracker.getAvailableSize();
                var x = Math.max(0, Math.min(pap.x + this.HorizontalOffset, full.width - this.ActualWidth));
                var y = Math.max(0, Math.min(pap.y + this.VerticalOffset, full.height - this.ActualHeight));
                Controls.Canvas.SetLeft(this, x);
                Controls.Canvas.SetTop(this, y);
                var overlay = this._Overlay;
                if (!overlay)
                    return;
                overlay.Width = full.width;
                overlay.Height = full.height;
            };
            ContextMenu.prototype.OpenPopup = function (position) {
                var _this = this;
                this._PopupAlignmentPoint = position;
                var canvas1 = new Controls.Canvas();
                canvas1.Background = new Fayde.Media.SolidColorBrush(Color.KnownColors.Transparent);
                this._Overlay = canvas1;
                this._Overlay.MouseLeftButtonDown.on(this._HandleOverlayMouseButtonDown, this);
                this._Overlay.MouseRightButtonDown.on(this._HandleOverlayMouseButtonDown, this);
                this._Overlay.Children.Add(this);
                var popup = this._Popup = new Controls.Primitives.Popup();
                var initiator = this._Owner;
                while (initiator && !(initiator instanceof Fayde.UIElement))
                    initiator = initiator.Parent;
                if (initiator) {
                    popup.XamlNode.RegisterInitiator(initiator);
                    this.$RootVisualTracker.tryInit(initiator);
                }
                popup.Child = this._Overlay;
                this.SizeChanged.on(this._HandleContextMenuSizeChanged, this);
                this.$RootVisualTracker.setOnSizeChanged(function (newSize) { return _this.UpdateContextMenuPlacement(); });
                this.UpdateContextMenuPlacement();
                if (this.ReadLocalValue(Fayde.DependencyObject.DataContextProperty) === DependencyProperty.UnsetValue) {
                    var binding1 = new Fayde.Data.Binding("DataContext");
                    binding1.Source = this.Owner || this.$RootVisualTracker.rootVisual;
                    this.SetBinding(Fayde.DependencyObject.DataContextProperty, binding1);
                }
                popup.IsOpen = true;
                this.Focus();
                this._SettingIsOpen = true;
                this.IsOpen = true;
                this._SettingIsOpen = false;
                this.OnOpened(new Fayde.RoutedEventArgs());
            };
            ContextMenu.prototype.OnOpened = function (e) {
                this.Opened.raise(this, e);
            };
            ContextMenu.prototype.ClosePopup = function () {
                if (this._Popup) {
                    this._Popup.IsOpen = false;
                    this._Popup.Child = null;
                    this._Popup = null;
                }
                if (this._Overlay) {
                    this._Overlay.Children.Clear();
                    this._Overlay = null;
                }
                this.SizeChanged.off(this._HandleContextMenuSizeChanged, this);
                this.$RootVisualTracker.setOnSizeChanged();
                this._SettingIsOpen = true;
                this.IsOpen = false;
                this._SettingIsOpen = false;
                this.OnClosed(new Fayde.RoutedEventArgs());
            };
            ContextMenu.prototype.OnClosed = function (e) {
                this.Closed.raise(this, e);
            };
            ContextMenu.prototype.FocusNextItem = function (down) {
                var count = this.Items.Count;
                var num = down ? -1 : count;
                var menuItem1 = Fayde.Surface.GetFocusedElement(this);
                if (menuItem1 instanceof Controls.MenuItem && this === menuItem1.ParentMenuBase)
                    num = this.ItemContainersManager.IndexFromContainer(menuItem1);
                var index = num;
                var menuItem2;
                do {
                    index = (index + count + (down ? 1 : -1)) % count;
                    menuItem2 = this.ItemContainersManager.ContainerFromIndex(index);
                    if (!(menuItem2 instanceof Controls.MenuItem))
                        menuItem2 = null;
                } while ((!menuItem2 || (!menuItem2.IsEnabled || !menuItem2.Focus())) && index !== num);
            };
            ContextMenu.HorizontalOffsetProperty = DependencyProperty.Register("HorizontalOffset", function () { return Number; }, ContextMenu, 0.0);
            ContextMenu.VerticalOffsetProperty = DependencyProperty.Register("VerticalOffset", function () { return Number; }, ContextMenu, 0.0);
            ContextMenu.IsOpenProperty = DependencyProperty.Register("IsOpen", function () { return Boolean; }, ContextMenu, false);
            return ContextMenu;
        })(Controls.Primitives.MenuBase);
        Controls.ContextMenu = ContextMenu;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ContextMenuService = (function () {
            function ContextMenuService() {
            }
            ContextMenuService.GetContextMenu = function (d) { return d.GetValue(ContextMenuService.ContextMenuProperty); };
            ContextMenuService.SetContextMenu = function (d, value) { d.SetValue(ContextMenuService.ContextMenuProperty, value); };
            ContextMenuService.OnContextMenuPropertyChanged = function (d, args) {
                var fe = d;
                if (!(fe instanceof Fayde.FrameworkElement))
                    return;
                var oldMenu = args.OldValue;
                if (oldMenu instanceof Controls.ContextMenu)
                    oldMenu.Owner = null;
                var newMenu = args.NewValue;
                if (newMenu instanceof Controls.ContextMenu)
                    newMenu.Owner = fe;
            };
            ContextMenuService.ContextMenuProperty = DependencyProperty.RegisterAttached("ContextMenu", function () { return Controls.ContextMenu; }, ContextMenuService, undefined, ContextMenuService.OnContextMenuPropertyChanged);
            return ContextMenuService;
        })();
        Controls.ContextMenuService = ContextMenuService;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var DatePicker = (function (_super) {
            __extends(DatePicker, _super);
            function DatePicker() {
                _super.call(this);
                this._MonthTextBox = null;
                this._DayTextBox = null;
                this._YearTextBox = null;
                this._MonthGesture = new Controls.Internal.EventGesture();
                this._DayGesture = new Controls.Internal.EventGesture();
                this._YearGesture = new Controls.Internal.EventGesture();
                this._SelectionHandler = null;
                this.DefaultStyleKey = DatePicker;
            }
            DatePicker.prototype.OnSelectedMonthChanged = function (args) {
                this.CoerceMonth(args.NewValue);
                this.CoerceDate();
            };
            DatePicker.prototype.OnSelectedDayChanged = function (args) {
                this.CoerceDay(args.NewValue);
                this.CoerceDate();
            };
            DatePicker.prototype.OnSelectedYearChanged = function (args) {
                this.CoerceYear(args.NewValue);
                this.CoerceDate();
            };
            DatePicker.prototype.OnSelectedDateChanged = function (args) {
                var dt = args.NewValue;
                if (dt instanceof DateTime) {
                    this.CoerceMonth(dt.Month);
                    this.CoerceDay(dt.Day);
                    this.CoerceYear(dt.Year);
                }
                else {
                    this.CoerceMonth(NaN);
                    this.CoerceDay(NaN);
                    this.CoerceYear(NaN);
                }
            };
            DatePicker.prototype.OnApplyTemplate = function () {
                var _this = this;
                _super.prototype.OnApplyTemplate.call(this);
                this._MonthGesture.Detach();
                this._MonthTextBox = this.GetTemplateChild("MonthTextBox", Controls.TextBox);
                if (this._MonthTextBox)
                    this._MonthGesture.Attach(this._MonthTextBox.LostFocus, function (tb) { return _this.CoerceMonth(tb.Text); });
                this._DayGesture.Detach();
                this._DayTextBox = this.GetTemplateChild("DayTextBox", Controls.TextBox);
                if (this._DayTextBox)
                    this._DayGesture.Attach(this._DayTextBox.LostFocus, function (tb) { return _this.CoerceDay(tb.Text); });
                this._YearGesture.Detach();
                this._YearTextBox = this.GetTemplateChild("YearTextBox", Controls.TextBox);
                if (this._YearTextBox)
                    this._YearGesture.Attach(this._YearTextBox.LostFocus, function (tb) { return _this.CoerceDay(tb.Text); });
                if (this._SelectionHandler)
                    this._SelectionHandler.Dispose();
                this._SelectionHandler = new Controls.Internal.SelectionHandler([this._MonthTextBox, this._DayTextBox, this._YearTextBox]);
                this._UpdateText();
            };
            DatePicker.prototype.CoerceMonth = function (month) {
                month = Math.max(1, Math.min(12, month));
                if (!isNaN(month) || !isNaN(this.SelectedMonth))
                    this.SetCurrentValue(DatePicker.SelectedMonthProperty, month);
                this._UpdateText();
            };
            DatePicker.prototype.CoerceDay = function (day) {
                day = Math.max(1, Math.min(31, parseFloat(day)));
                if (!isNaN(day) || !isNaN(this.SelectedDay))
                    this.SetCurrentValue(DatePicker.SelectedDayProperty, day);
                this._UpdateText();
            };
            DatePicker.prototype.CoerceYear = function (year) {
                var maxYear = DateTime.MaxValue.Year - 1;
                year = Math.min(maxYear, Math.max(0, year));
                if (!isNaN(year) || !isNaN(this.SelectedYear))
                    this.SetCurrentValue(DatePicker.SelectedYearProperty, year);
                this._UpdateText();
            };
            DatePicker.prototype.CoerceDate = function () {
                var m = this.SelectedMonth;
                var d = this.SelectedDay;
                var y = this.SelectedYear;
                if (isNaN(m) || isNaN(d) || isNaN(y))
                    return;
                var dte = new DateTime(y, m, d);
                if (DateTime.Compare(dte, this.SelectedDate) === 0)
                    return;
                this.SetCurrentValue(DatePicker.SelectedDateProperty, dte);
            };
            DatePicker.prototype._UpdateText = function () {
                if (this._MonthTextBox)
                    this._MonthTextBox.Text = formatNumber(this.SelectedMonth, 2, "MM");
                if (this._DayTextBox)
                    this._DayTextBox.Text = formatNumber(this.SelectedDay, 2, "DD");
                if (this._YearTextBox)
                    this._YearTextBox.Text = formatNumber(this.SelectedYear, 4, "YYYY");
            };
            DatePicker.SelectedMonthProperty = DependencyProperty.Register("SelectedMonth", function () { return Number; }, DatePicker, NaN, function (d, args) { return d.OnSelectedMonthChanged(args); });
            DatePicker.SelectedDayProperty = DependencyProperty.Register("SelectedDay", function () { return Number; }, DatePicker, NaN, function (d, args) { return d.OnSelectedDayChanged(args); });
            DatePicker.SelectedYearProperty = DependencyProperty.Register("SelectedYear", function () { return Number; }, DatePicker, NaN, function (d, args) { return d.OnSelectedYearChanged(args); });
            DatePicker.SelectedDateProperty = DependencyProperty.Register("SelectedDate", function () { return DateTime; }, DatePicker, undefined, function (d, args) { return d.OnSelectedDateChanged(args); });
            return DatePicker;
        })(Controls.Control);
        Controls.DatePicker = DatePicker;
        Controls.TemplateParts(DatePicker, { Name: "MonthTextBox", Type: Controls.TextBox }, { Name: "DayTextBox", Type: Controls.TextBox }, { Name: "YearTextBox", Type: Controls.TextBox });
        Controls.TemplateVisualStates(DatePicker, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "ValidationStates", Name: "Valid" }, { GroupName: "ValidationStates", Name: "InvalidFocused" }, { GroupName: "ValidationStates", Name: "InvalidUnfocused" });
        //[StyleTypedProperty(Property = "CalendarStyle", StyleTargetType = typeof (Calendar))]
        function formatNumber(n, digits, fallback) {
            if (isNaN(n))
                return fallback;
            return Fayde.Localization.Format("{0:d" + digits + "}", n);
        }
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        (function (ValidSpinDirections) {
            ValidSpinDirections[ValidSpinDirections["None"] = 0] = "None";
            ValidSpinDirections[ValidSpinDirections["Increase"] = 1] = "Increase";
            ValidSpinDirections[ValidSpinDirections["Decrease"] = 2] = "Decrease";
        })(Controls.ValidSpinDirections || (Controls.ValidSpinDirections = {}));
        var ValidSpinDirections = Controls.ValidSpinDirections;
        Controls.Library.addEnum(ValidSpinDirections, "ValidSpinDirections");
        (function (SpinDirection) {
            SpinDirection[SpinDirection["Increase"] = 0] = "Increase";
            SpinDirection[SpinDirection["Decrease"] = 1] = "Decrease";
        })(Controls.SpinDirection || (Controls.SpinDirection = {}));
        var SpinDirection = Controls.SpinDirection;
        Controls.Library.addEnum(SpinDirection, "SpinDirection");
        (function (InvalidInputAction) {
            InvalidInputAction[InvalidInputAction["UseFallbackItem"] = 0] = "UseFallbackItem";
            InvalidInputAction[InvalidInputAction["TextBoxCannotLoseFocus"] = 1] = "TextBoxCannotLoseFocus";
        })(Controls.InvalidInputAction || (Controls.InvalidInputAction = {}));
        var InvalidInputAction = Controls.InvalidInputAction;
        Controls.Library.addEnum(InvalidInputAction, "InvalidInputAction");
        (function (Dock) {
            Dock[Dock["Left"] = 0] = "Left";
            Dock[Dock["Top"] = 1] = "Top";
            Dock[Dock["Right"] = 2] = "Right";
            Dock[Dock["Bottom"] = 3] = "Bottom";
        })(Controls.Dock || (Controls.Dock = {}));
        var Dock = Controls.Dock;
        Controls.Library.addEnum(Dock, "Dock");
        (function (DatePickerFormat) {
            DatePickerFormat[DatePickerFormat["Long"] = 0] = "Long";
            DatePickerFormat[DatePickerFormat["Short"] = 1] = "Short";
        })(Controls.DatePickerFormat || (Controls.DatePickerFormat = {}));
        var DatePickerFormat = Controls.DatePickerFormat;
        Controls.Library.addEnum(DatePickerFormat, "DatePickerFormat");
        (function (TimeDisplayMode) {
            TimeDisplayMode[TimeDisplayMode["Regular"] = 0] = "Regular";
            TimeDisplayMode[TimeDisplayMode["Military"] = 1] = "Military";
        })(Controls.TimeDisplayMode || (Controls.TimeDisplayMode = {}));
        var TimeDisplayMode = Controls.TimeDisplayMode;
        Controls.Library.addEnum(TimeDisplayMode, "TimeDisplayMode");
        (function (ValidationSummaryFilters) {
            ValidationSummaryFilters[ValidationSummaryFilters["None"] = 0] = "None";
            ValidationSummaryFilters[ValidationSummaryFilters["ObjectErrors"] = 1] = "ObjectErrors";
            ValidationSummaryFilters[ValidationSummaryFilters["PropertyErrors"] = 2] = "PropertyErrors";
            ValidationSummaryFilters[ValidationSummaryFilters["All"] = 3] = "All";
        })(Controls.ValidationSummaryFilters || (Controls.ValidationSummaryFilters = {}));
        var ValidationSummaryFilters = Controls.ValidationSummaryFilters;
        Controls.Library.addEnum(ValidationSummaryFilters, "ValidationSummaryFilters");
        (function (ValidationSummaryItemType) {
            ValidationSummaryItemType[ValidationSummaryItemType["ObjectError"] = 1] = "ObjectError";
            ValidationSummaryItemType[ValidationSummaryItemType["PropertyError"] = 2] = "PropertyError";
        })(Controls.ValidationSummaryItemType || (Controls.ValidationSummaryItemType = {}));
        var ValidationSummaryItemType = Controls.ValidationSummaryItemType;
        Controls.Library.addEnum(ValidationSummaryItemType, "ValidationSummaryItemType");
        (function (StretchDirection) {
            StretchDirection[StretchDirection["UpOnly"] = 0] = "UpOnly";
            StretchDirection[StretchDirection["DownOnly"] = 1] = "DownOnly";
            StretchDirection[StretchDirection["Both"] = 2] = "Both";
        })(Controls.StretchDirection || (Controls.StretchDirection = {}));
        var StretchDirection = Controls.StretchDirection;
        Controls.Library.addEnum(StretchDirection, "StretchDirection");
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
/// <reference path="Enums.ts" />
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ButtonBase = Controls.Primitives.ButtonBase;
        var Spinner = (function (_super) {
            __extends(Spinner, _super);
            function Spinner() {
                _super.call(this);
                this.Spin = new Fayde.RoutedEvent();
                this._IncreaseButton = null;
                this._DecreaseButton = null;
                this.DefaultStyleKey = Spinner;
            }
            Spinner.prototype.OnContentChanged = function (oldContent, newContent) {
            };
            Spinner.prototype.OnValidSpinDirectionChanged = function (args) {
                this.UpdateVisualState(true);
                this.EnableButtons();
            };
            Spinner.prototype.OnSpin = function (e) {
                var valid = e.Direction === Controls.SpinDirection.Increase ? Controls.ValidSpinDirections.Increase : Controls.ValidSpinDirections.Decrease;
                if ((this.ValidSpinDirection & valid) !== valid)
                    throw new InvalidOperationException("Invalid Spin Direction");
                this.Spin.raise(this, e);
            };
            Spinner.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                if (this._IncreaseButton)
                    this._IncreaseButton.Click.off(this.OnIncreaseClick, this);
                this._IncreaseButton = this.GetTemplateChild("IncreaseButton", ButtonBase);
                if (this._IncreaseButton)
                    this._IncreaseButton.Click.on(this.OnIncreaseClick, this);
                if (this._DecreaseButton)
                    this._DecreaseButton.Click.off(this.OnDecreaseClick, this);
                this._DecreaseButton = this.GetTemplateChild("DecreaseButton", ButtonBase);
                if (this._DecreaseButton)
                    this._DecreaseButton.Click.on(this.OnDecreaseClick, this);
                this.UpdateVisualState(false);
                this.EnableButtons();
            };
            Spinner.prototype.OnIncreaseClick = function (sender, e) {
                this.OnSpin(new Controls.SpinEventArgs(Controls.SpinDirection.Increase));
            };
            Spinner.prototype.OnDecreaseClick = function (sender, e) {
                this.OnSpin(new Controls.SpinEventArgs(Controls.SpinDirection.Decrease));
            };
            Spinner.prototype.EnableButtons = function () {
                if (this._IncreaseButton)
                    this._IncreaseButton.IsEnabled = (this.ValidSpinDirection & Controls.ValidSpinDirections.Increase) === Controls.ValidSpinDirections.Increase;
                if (this._DecreaseButton)
                    this._DecreaseButton.IsEnabled = (this.ValidSpinDirection & Controls.ValidSpinDirections.Decrease) === Controls.ValidSpinDirections.Decrease;
            };
            Spinner.prototype.GoToStates = function (gotoFunc) {
                _super.prototype.GoToStates.call(this, gotoFunc);
                this.GoToStateIncrease(gotoFunc);
                this.GoToStateDecrease(gotoFunc);
            };
            Spinner.prototype.GoToStateCommon = function (gotoFunc) {
                if (!this.IsEnabled)
                    return gotoFunc("Disabled");
                if (this.IsMouseOver)
                    return gotoFunc("MouseOver");
                return gotoFunc("Normal");
            };
            Spinner.prototype.GoToStateIncrease = function (gotoFunc) {
                return gotoFunc(((this.ValidSpinDirection & Controls.ValidSpinDirections.Increase) === Controls.ValidSpinDirections.Increase) ? "IncreaseEnabled" : "IncreaseDisabled");
            };
            Spinner.prototype.GoToStateDecrease = function (gotoFunc) {
                return gotoFunc(((this.ValidSpinDirection & Controls.ValidSpinDirections.Decrease) === Controls.ValidSpinDirections.Decrease) ? "DecreaseEnabled" : "DecreaseDisabled");
            };
            Spinner.prototype.OnMouseEnter = function (e) {
                _super.prototype.OnMouseEnter.call(this, e);
                this.UpdateVisualState();
            };
            Spinner.prototype.OnMouseLeave = function (e) {
                _super.prototype.OnMouseLeave.call(this, e);
                this.UpdateVisualState();
            };
            Spinner.prototype.OnMouseLeftButtonDown = function (e) {
                this.UpdateVisualState();
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
            };
            Spinner.prototype.OnMouseLeftButtonUp = function (e) {
                _super.prototype.OnMouseLeftButtonUp.call(this, e);
                this.UpdateVisualState();
            };
            Spinner.prototype.OnGotFocus = function (e) {
                _super.prototype.OnGotFocus.call(this, e);
                this.UpdateVisualState();
            };
            Spinner.prototype.OnLostFocus = function (e) {
                _super.prototype.OnLostFocus.call(this, e);
                this.UpdateVisualState();
            };
            Spinner.ContentProperty = DependencyProperty.Register("Content", function () { return Object; }, Spinner, undefined, function (d, args) { return d.OnContentChanged(args.OldValue, args.NewValue); });
            Spinner.ValidSpinDirectionProperty = DependencyProperty.Register("ValidSpinDirection", function () { return new Fayde.Enum(Controls.ValidSpinDirections); }, Spinner, Controls.ValidSpinDirections.Increase, function (d, args) { return d.OnValidSpinDirectionChanged(args); });
            return Spinner;
        })(Controls.Control);
        Controls.Spinner = Spinner;
        Fayde.Markup.Content(Spinner, Spinner.ContentProperty);
        Controls.TemplateVisualStates(Spinner, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "MouseOver" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" }, { GroupName: "IncreaseStates", Name: "IncreaseEnabled" }, { GroupName: "IncreaseStates", Name: "IncreaseDisabled" }, { GroupName: "DecreaseStates", Name: "DecreaseEnabled" }, { GroupName: "DecreaseStates", Name: "DecreaseDisabled" });
        Controls.TemplateParts(Spinner, { Name: "IncreaseButton", Type: Controls.Primitives.ButtonBase }, { Name: "DecreaseButton", Type: Controls.Primitives.ButtonBase });
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
/// <reference path="Spinner.ts" />
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var UpDownBase = (function (_super) {
            __extends(UpDownBase, _super);
            function UpDownBase() {
                _super.apply(this, arguments);
                this._IgnoreValueChange = false;
                this._TextBox = null;
                this._Spinner = null;
                this._Text = "";
                this.ValueChanging = new Fayde.RoutedPropertyChangingEvent();
                this.ValueChanged = new Fayde.RoutedPropertyChangedEvent();
                this.Parsing = new Fayde.RoutedEvent();
                this.ParseError = new Fayde.RoutedEvent();
            }
            UpDownBase.prototype.OnSpinnerStyleChanged = function (oldStyle, newStyle) { };
            UpDownBase.prototype._OnValueChanged = function (args) {
                if (this._IgnoreValueChange)
                    return;
                var oldValue = args.OldValue;
                var newValue = args.NewValue;
                var e1 = new Fayde.RoutedPropertyChangingEventArgs(args.Property, oldValue, newValue, true);
                this.OnValueChanging(e1);
                if (e1.InCoercion)
                    return;
                if (!e1.Cancel) {
                    var newValue2 = e1.NewValue;
                    var e2 = new Fayde.RoutedPropertyChangedEventArgs(oldValue, newValue2);
                    this.OnValueChanged(e2);
                }
                else {
                    this._IgnoreValueChange = true;
                    this.Value = oldValue;
                    this._IgnoreValueChange = false;
                }
            };
            UpDownBase.prototype.OnValueChanging = function (e) {
                this.ValueChanging.raise(this, e);
            };
            UpDownBase.prototype.OnValueChanged = function (e) {
                this.ValueChanged.raise(this, e); //WTF: compiler choking without cast for some odd reason
                this.SetTextBoxText();
            };
            UpDownBase.prototype.OnIsEditableChanged = function (args) {
                if (!this._TextBox)
                    this._TextBox.IsReadOnly = !this.IsEditable;
            };
            UpDownBase.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                this.SetTextBox(this.GetTemplateChild("Text"));
                this.SetSpinner(this.GetTemplateChild("Spinner"));
                this.SetTextBoxText();
                if (this._TextBox != null)
                    this._TextBox.IsReadOnly = !this.IsEditable;
                this.UpdateVisualState(false);
            };
            UpDownBase.prototype.SetTextBox = function (d) {
                if (this._TextBox) {
                    this._TextBox.GotFocus.off(this.TextBox_GotFocus, this);
                    this._TextBox.LostFocus.off(this.TextBox_LostFocus, this);
                }
                if (d instanceof Controls.TextBox)
                    this._TextBox = d;
                else
                    this._TextBox = null;
                this._TextBox.GotFocus.on(this.TextBox_GotFocus, this);
                this._TextBox.LostFocus.on(this.TextBox_LostFocus, this);
                this._Text = this._TextBox.Text;
            };
            UpDownBase.prototype.SetSpinner = function (d) {
                if (this._Spinner)
                    this._Spinner.Spin.off(this.Spinner_Spin, this);
                if (d instanceof Controls.Spinner)
                    this._Spinner = d;
                else
                    this._Spinner = null;
                if (this._Spinner)
                    this._Spinner.Spin.on(this.Spinner_Spin, this);
            };
            UpDownBase.prototype.OnKeyDown = function (e) {
                _super.prototype.OnKeyDown.call(this, e);
                if (e.Handled)
                    return;
                switch (e.Key) {
                    case Fayde.Input.Key.Enter:
                        this.ProcessUserInput();
                        e.Handled = true;
                        break;
                    case Fayde.Input.Key.Up:
                        this.DoIncrement();
                        e.Handled = true;
                        break;
                    case Fayde.Input.Key.Down:
                        this.DoDecrement();
                        e.Handled = true;
                        break;
                }
            };
            UpDownBase.prototype.OnMouseWheel = function (e) {
                _super.prototype.OnMouseWheel.call(this, e);
                if (e.Handled)
                    return;
                if (e.Delta < 0)
                    this.DoDecrement();
                else if (0 < e.Delta)
                    this.DoIncrement();
                e.Handled = true;
            };
            UpDownBase.prototype.ApplyValue = function (text) {
                var e1 = new Controls.UpDownParsingEventArgs(text);
                var obj1;
                var error = null;
                try {
                    obj1 = this.ParseValue(text);
                    e1.Value = obj1;
                }
                catch (err) {
                    error = err;
                }
                try {
                    this.OnParsing(e1);
                }
                catch (err) {
                }
                if (error == null) {
                    var obj2 = e1.Handled ? e1.Value : obj1;
                    var value = this.Value;
                    if (this.Value === obj2)
                        this.SetTextBoxText();
                    this.Value = obj2;
                }
                else if (e1.Handled) {
                    if (this.Value === e1.Value)
                        this.SetTextBoxText();
                    this.Value = e1.Value;
                }
                else {
                    var e2 = new Controls.UpDownParseErrorEventArgs(text, error);
                    this.OnParseError(e2);
                    if (!e2.Handled)
                        this.SetTextBoxText();
                }
            };
            UpDownBase.prototype.OnParseError = function (e) {
                this.ParseError.raise(this, e);
            };
            UpDownBase.prototype.OnParsing = function (e) {
                this.Parsing.raise(this, e);
            };
            UpDownBase.prototype.ParseValue = function (text) { return; };
            UpDownBase.prototype.FormatValue = function () { return ""; };
            UpDownBase.prototype.SelectAllText = function () {
                if (this._TextBox)
                    this._TextBox.SelectAll();
            };
            UpDownBase.prototype.SetTextBoxText = function () {
                if (!this._TextBox)
                    return;
                this._Text = this.FormatValue() || "";
                this._TextBox.Text = this._Text;
                this._TextBox.SelectionStart = this._Text.length;
            };
            UpDownBase.prototype.TextBox_LostFocus = function (sender, e) {
                this.ProcessUserInput();
            };
            UpDownBase.prototype.TextBox_GotFocus = function (sender, e) {
                this.SelectAllText();
            };
            UpDownBase.prototype.Spinner_Spin = function (sender, e) {
                if (this._TextBox)
                    this.ProcessUserInput();
                this.OnSpin(e);
            };
            UpDownBase.prototype.OnSpin = function (e) {
                if (e.Direction === Controls.SpinDirection.Increase)
                    this.DoIncrement();
                else
                    this.DoDecrement();
            };
            UpDownBase.prototype.ProcessUserInput = function () {
                if (!this._TextBox || this._Text === this._TextBox.Text)
                    return;
                var selectionStart = this._TextBox.SelectionStart;
                this._Text = this._TextBox.Text;
                this.ApplyValue(this._Text);
                if (selectionStart < this._TextBox.Text.length)
                    this._TextBox.SelectionStart = selectionStart;
            };
            UpDownBase.prototype.DoDecrement = function () {
                if (this._Spinner && (this._Spinner.ValidSpinDirection & Controls.ValidSpinDirections.Decrease) !== Controls.ValidSpinDirections.Decrease)
                    return;
                this.OnDecrement();
            };
            UpDownBase.prototype.OnDecrement = function () { };
            UpDownBase.prototype.DoIncrement = function () {
                if (this._Spinner && (this._Spinner.ValidSpinDirection & Controls.ValidSpinDirections.Increase) !== Controls.ValidSpinDirections.Increase)
                    return;
                this.OnIncrement();
            };
            UpDownBase.prototype.OnIncrement = function () { };
            UpDownBase.SpinnerStyleProperty = DependencyProperty.Register("SpinnerStyle", function () { return Fayde.Style; }, UpDownBase, undefined, function (d, args) { return d.OnSpinnerStyleChanged(args.OldValue, args.NewValue); });
            UpDownBase.IsEditableProperty = DependencyProperty.Register("IsEditable", function () { return Boolean; }, UpDownBase, true, function (d, args) { return d.OnIsEditableChanged(args); });
            return UpDownBase;
        })(Controls.Control);
        Controls.UpDownBase = UpDownBase;
        Controls.TemplateVisualStates(UpDownBase, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "MouseOver" }, { GroupName: "CommonStates", Name: "Pressed" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" });
        Controls.TemplateParts(UpDownBase, { Name: "Text", Type: Controls.TextBox }, { Name: "Spinner", Type: Controls.Spinner });
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
/// <reference path="UpDownBase.ts" />
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var DomainUpDown = (function (_super) {
            __extends(DomainUpDown, _super);
            function DomainUpDown() {
                var _this = this;
                _super.call(this);
                this.ValueChanging = new Fayde.RoutedPropertyChangingEvent();
                this.ParseError = new Fayde.RoutedEvent();
                this._ValueBindingEvaluator = null;
                this._CanEditByFocus = false;
                this.DefaultStyleKey = DomainUpDown;
                Object.defineProperty(this, "Items", { value: new Controls.Internal.ObservableObjectCollection(), writable: false });
                this.Items.CollectionChanged.on(this._OnItemsChanged, this);
                this._Coercer = new Controls.Internal.DomainCoercer(this, function (val) { return _this.SetCurrentValue(DomainUpDown.ValueProperty, val); }, function (val) { return _this.SetCurrentValue(DomainUpDown.CurrentIndexProperty, val); });
            }
            DomainUpDown.prototype.OnValueChanged = function (oldItem, newItem) {
            };
            DomainUpDown.prototype.OnCurrentIndexChanged = function (oldIndex, newIndex) {
                this.UpdateValidSpinDirection();
            };
            DomainUpDown.prototype._OnIsCyclicChanged = function (args) {
                this.UpdateValidSpinDirection();
            };
            DomainUpDown.prototype._OnItemsSourceChanged = function (oldItemsSource, newItemsSource) {
                var cc = Fayde.Collections.INotifyCollectionChanged_.as(oldItemsSource);
                if (cc)
                    cc.CollectionChanged.off(this._ItemsSourceModified, this);
                this.Items.IsReadOnly = false;
                this.Items.Clear();
                if (!newItemsSource)
                    return;
                var en = nullstone.IEnumerable_.as(newItemsSource);
                var arr;
                if (en) {
                    var enu = en.getEnumerator();
                    arr = [];
                    while (enu.moveNext()) {
                        arr.push(enu.current);
                    }
                }
                else if (newItemsSource instanceof Array) {
                    arr = newItemsSource;
                }
                if (arr) {
                    this.Items.AddRange(arr);
                    this.Items.IsReadOnly = true;
                }
                cc = Fayde.Collections.INotifyCollectionChanged_.as(newItemsSource);
                if (cc)
                    cc.CollectionChanged.on(this._ItemsSourceModified, this);
            };
            DomainUpDown.prototype._ItemsSourceModified = function (sender, e) {
                var coll = sender;
                var index;
                this.Items.IsReadOnly = false;
                switch (e.Action) {
                    case Fayde.Collections.CollectionChangedAction.Add:
                        index = e.NewStartingIndex;
                        for (var en = nullstone.IEnumerator_.fromArray(e.NewItems); en.moveNext();) {
                            this.Items.Insert(index, en.current);
                            index++;
                        }
                        break;
                    case Fayde.Collections.CollectionChangedAction.Remove:
                        for (var en = nullstone.IEnumerator_.fromArray(e.OldItems); en.moveNext();) {
                            this.Items.RemoveAt(e.OldStartingIndex);
                        }
                        break;
                    case Fayde.Collections.CollectionChangedAction.Replace:
                        index = e.NewStartingIndex;
                        for (var en = nullstone.IEnumerator_.fromArray(e.NewItems); en.moveNext();) {
                            this.Items.SetValueAt(index, en.current);
                            index++;
                        }
                        break;
                    case Fayde.Collections.CollectionChangedAction.Reset:
                        this.Items.Clear();
                        this.Items.AddRange(coll.ToArray());
                        break;
                }
                this.Items.IsReadOnly = true;
            };
            DomainUpDown.prototype._OnItemsChanged = function (sender, e) {
                this._Coercer.UpdateTextBoxText();
            };
            Object.defineProperty(DomainUpDown.prototype, "ValueMemberPath", {
                get: function () {
                    var vb = this.ValueMemberBinding;
                    return vb ? vb.Path.Path : null;
                },
                set: function (value) {
                    var vb = this.ValueMemberBinding;
                    if (!value) {
                        if (!vb)
                            return;
                        var binding1 = new Fayde.Data.Binding();
                        binding1.Converter = vb.Converter;
                        binding1.ConverterCulture = vb.ConverterCulture;
                        binding1.ConverterParameter = vb.ConverterParameter;
                        this.ValueMemberBinding = binding1;
                    }
                    else if (vb != null) {
                        var binding1 = new Fayde.Data.Binding(value);
                        binding1.Converter = vb.Converter;
                        binding1.ConverterCulture = vb.ConverterCulture;
                        binding1.ConverterParameter = vb.ConverterParameter;
                        this.ValueMemberBinding = binding1;
                    }
                    else
                        this.ValueMemberBinding = new Fayde.Data.Binding(value);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DomainUpDown.prototype, "ValueMemberBinding", {
                get: function () {
                    var vbe = this._ValueBindingEvaluator;
                    return vbe ? vbe.ValueBinding : null;
                },
                set: function (value) {
                    this._ValueBindingEvaluator = new Controls.Internal.BindingSourceEvaluator(value);
                },
                enumerable: true,
                configurable: true
            });
            DomainUpDown.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                if (this._SpinFlow)
                    this._SpinFlow.Dispose();
                this._SpinFlow = new Controls.Internal.SpinFlow(this, this.GetTemplateChild("Spinner", Controls.Spinner));
                this._Coercer.Detach();
                this._Coercer.Attach(this.GetTemplateChild("Text", Controls.TextBox));
                this.UpdateValidSpinDirection();
                this.UpdateVisualState();
            };
            DomainUpDown.prototype.OnGotFocus = function (e) {
                _super.prototype.OnGotFocus.call(this, e);
                this.UpdateVisualState();
                if (this.IsEnabled)
                    this.TryEnterEditMode();
            };
            DomainUpDown.prototype.OnLostFocus = function (e) {
                _super.prototype.OnLostFocus.call(this, e);
                this.UpdateVisualState();
                if (this.IsEnabled)
                    this._Coercer.EscapeFocus();
            };
            DomainUpDown.prototype.OnMouseEnter = function (e) {
                _super.prototype.OnMouseEnter.call(this, e);
                this.UpdateVisualState();
            };
            DomainUpDown.prototype.OnMouseLeave = function (e) {
                _super.prototype.OnMouseLeave.call(this, e);
                this.UpdateVisualState();
            };
            DomainUpDown.prototype.OnMouseLeftButtonDown = function (e) {
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
                this.UpdateVisualState();
            };
            DomainUpDown.prototype.OnMouseLeftButtonUp = function (e) {
                _super.prototype.OnMouseLeftButtonUp.call(this, e);
                this.UpdateVisualState();
                if (this.IsEnabled && !this._Coercer.IsEditing) {
                    this.Focus();
                    this.TryEnterEditMode();
                }
            };
            DomainUpDown.prototype.GoToStates = function (gotoFunc) {
                _super.prototype.GoToStates.call(this, gotoFunc);
                this.GoToStateEditing(gotoFunc);
                this.GoToStateValid(gotoFunc);
            };
            DomainUpDown.prototype.GoToStateEditing = function (gotoFunc) {
                return gotoFunc(this._Coercer.IsEditing ? "Edit" : "Display");
            };
            DomainUpDown.prototype.GoToStateValid = function (gotoFunc) {
                return gotoFunc(this._Coercer.IsInvalidInput ? "InvalidDomain" : "ValidDomain");
            };
            DomainUpDown.prototype.UpdateValidSpinDirection = function () {
                if (!this._SpinFlow)
                    return;
                var isCyclic = this.IsCyclic;
                var curIndex = this.CurrentIndex;
                this._SpinFlow.UpdateValid(isCyclic || curIndex > 0, isCyclic || curIndex < this.Items.Count - 1);
            };
            DomainUpDown.prototype.TryEnterEditMode = function () {
                if (this._Coercer.IsEditing)
                    return;
                if (!this._CanEditByFocus && this.IsEditable)
                    this._Coercer.IsEditing = true;
            };
            DomainUpDown.prototype.OnIsEditingChanged = function (isEditing) {
                this.UpdateVisualState();
            };
            DomainUpDown.prototype.OnIsInvalidInputChanged = function (isInvalid) {
                this.UpdateVisualState();
            };
            DomainUpDown.prototype.OnSpin = function () {
                this._Coercer.ProcessUserInput();
            };
            DomainUpDown.prototype.OnIncrement = function () {
                var _this = this;
                if (this.CurrentIndex < this.Items.Count - 1)
                    this.CurrentIndex++;
                else if (this.IsCyclic)
                    this.CurrentIndex = 0;
                this._Coercer.IsInvalidInput = false;
                this._CanEditByFocus = true;
                this.Focus();
                window.setTimeout(function () { return _this._CanEditByFocus = false; }, 1);
            };
            DomainUpDown.prototype.OnDecrement = function () {
                var _this = this;
                if (this.CurrentIndex > 0)
                    this.CurrentIndex--;
                else if (this.IsCyclic)
                    this.CurrentIndex = this.Items.Count - 1;
                this._Coercer.IsInvalidInput = false;
                this._CanEditByFocus = true;
                this.Focus();
                window.setTimeout(function () { return _this._CanEditByFocus = false; }, 1);
            };
            DomainUpDown.prototype.TryParseValue = function (text, ov) {
                if (!text) {
                    ov.Value = this.Value;
                    return true;
                }
                var vb = this._ValueBindingEvaluator;
                var enu = this.Items.getEnumerator();
                while (enu.moveNext() && ov.Value == null) {
                    ov.Value = matchItem(vb, enu.current, text);
                }
                if (ov.Value != null)
                    return true;
                ov.Value = this.Value;
                if (this.InvalidInputAction === Controls.InvalidInputAction.TextBoxCannotLoseFocus)
                    return false;
                if (this.InvalidInputAction === Controls.InvalidInputAction.UseFallbackItem) {
                    ov.Value = this.FallbackItem;
                    if (ov.Value == null || !this.Items.Contains(ov.Value))
                        throw new ArgumentException("Cannot parse value.");
                }
                return true;
            };
            DomainUpDown.prototype.FormatValue = function () {
                var val = this.Value;
                if (!val)
                    return "";
                if (!this.Items.Contains(val))
                    return "";
                try {
                    var vb = this._ValueBindingEvaluator;
                    if (vb)
                        val = vb.GetDynamicValue(val);
                }
                catch (err) {
                }
                if (typeof val === "string")
                    return val;
                return "";
            };
            DomainUpDown.ValueProperty = DependencyProperty.Register("Value", function () { return Object; }, DomainUpDown, null, function (d, args) { return d._Coercer.OnValueChanged(args.OldValue, args.NewValue); });
            DomainUpDown.IsEditableProperty = DependencyProperty.Register("IsEditable", function () { return Boolean; }, DomainUpDown, false, function (d, args) { return d._Coercer.UpdateIsEditable(); });
            DomainUpDown.SpinnerStyleProperty = DependencyProperty.Register("SpinnerStyle", function () { return Fayde.Style; }, DomainUpDown);
            DomainUpDown.CurrentIndexProperty = DependencyProperty.Register("CurrentIndex", function () { return Number; }, DomainUpDown, -1, function (d, args) { return d._Coercer.OnCurrentIndexChanged(args.OldValue, args.NewValue); });
            DomainUpDown.IsCyclicProperty = DependencyProperty.Register("IsCyclic", function () { return Boolean; }, DomainUpDown, false, function (d, args) { return d._OnIsCyclicChanged(args); });
            DomainUpDown.InvalidInputActionProperty = DependencyProperty.RegisterFull("InvalidInputAction", function () { return new Fayde.Enum(Controls.InvalidInputAction); }, DomainUpDown, Controls.InvalidInputAction.UseFallbackItem, undefined, undefined, false, inputActionValidator, true);
            DomainUpDown.FallbackItemProperty = DependencyProperty.Register("FallbackItem", function () { return Object; }, DomainUpDown, null);
            DomainUpDown.ItemsSourceProperty = DependencyProperty.Register("ItemsSource", function () { return nullstone.IEnumerable_; }, DomainUpDown, undefined, function (d, args) { return d._OnItemsSourceChanged(args.OldValue, args.NewValue); });
            DomainUpDown.ItemTemplateProperty = DependencyProperty.Register("ItemTemplate", function () { return Fayde.DataTemplate; }, DomainUpDown);
            return DomainUpDown;
        })(Controls.Control);
        Controls.DomainUpDown = DomainUpDown;
        Controls.TemplateVisualStates(DomainUpDown, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "MouseOver" }, { GroupName: "CommonStates", Name: "Pressed" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" }, { GroupName: "ValidationStates", Name: "Valid" }, { GroupName: "ValidationStates", Name: "InvalidUnfocused" }, { GroupName: "ValidationStates", Name: "InvalidFocused" }, { GroupName: "DomainStates", Name: "ValidDomain" }, { GroupName: "DomainStates", Name: "InvalidDomain" });
        function inputActionValidator(d, propd, value) {
            switch (value) {
                case Controls.InvalidInputAction.UseFallbackItem:
                case Controls.InvalidInputAction.TextBoxCannotLoseFocus:
                    return true;
                default:
                    return false;
            }
        }
        function matchItem(evaluator, item, text) {
            if (!evaluator)
                return text === item.toString();
            return text === (evaluator.GetDynamicValue(item) || "");
        }
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var dragIncrement = 1;
        var keyIncrement = 10;
        var GridSplitter = (function (_super) {
            __extends(GridSplitter, _super);
            function GridSplitter() {
                _super.call(this);
                this._HorizontalTemplate = null;
                this._VerticalTemplate = null;
                this._DragStart = null;
                this._IsDragging = false;
                this.DefaultStyleKey = GridSplitter;
                this._Helper = new Controls.Internal.GridSplitterResizer(this);
                this.LayoutUpdated.on(this._OnLayoutUpdated, this);
            }
            GridSplitter.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                this._HorizontalTemplate = this.GetTemplateChild("HorizontalTemplate", Fayde.FrameworkElement);
                this._VerticalTemplate = this.GetTemplateChild("VerticalTemplate", Fayde.FrameworkElement);
                this._Helper.UpdateResizeDirection(this);
                this._OnResizeDirectionChanged();
                this.UpdateVisualState();
            };
            GridSplitter.prototype._OnLayoutUpdated = function (sender, e) {
                if (this._Helper && this._Helper.UpdateResizeDirection(this))
                    this._OnResizeDirectionChanged();
            };
            GridSplitter.prototype._OnResizeDirectionChanged = function () {
                var isColumns = this._Helper.Direction === Controls.Internal.GridResizeDirection.Columns;
                this.Cursor = isColumns ? Fayde.CursorType.SizeWE : Fayde.CursorType.SizeNS;
                var ht = this._HorizontalTemplate;
                if (ht)
                    ht.Visibility = !isColumns ? Fayde.Visibility.Visible : Fayde.Visibility.Collapsed;
                var vt = this._VerticalTemplate;
                if (vt)
                    vt.Visibility = isColumns ? Fayde.Visibility.Visible : Fayde.Visibility.Collapsed;
            };
            GridSplitter.prototype.OnGotFocus = function (e) {
                _super.prototype.OnGotFocus.call(this, e);
                this.UpdateVisualState();
            };
            GridSplitter.prototype.OnLostFocus = function (e) {
                _super.prototype.OnLostFocus.call(this, e);
                this.UpdateVisualState();
            };
            GridSplitter.prototype.OnKeyDown = function (e) {
                _super.prototype.OnKeyDown.call(this, e);
                if (e.Key === Fayde.Input.Key.Escape) {
                    if (!this._Helper)
                        return;
                    this._Helper = null;
                    e.Handled = true;
                    return;
                }
                if (!this.IsFocused || !this.IsEnabled)
                    return;
                var horiz = 0;
                var vert = 0;
                switch (e.Key) {
                    case Fayde.Input.Key.Left:
                        horiz = -keyIncrement;
                        break;
                    case Fayde.Input.Key.Up:
                        vert = -keyIncrement;
                        break;
                    case Fayde.Input.Key.Right:
                        horiz = keyIncrement;
                        break;
                    case Fayde.Input.Key.Down:
                        vert = keyIncrement;
                        break;
                }
                if (this.FlowDirection === Fayde.FlowDirection.RightToLeft)
                    e.Handled = this._HandleMove(-horiz, vert, true);
                else
                    e.Handled = this._HandleMove(horiz, vert, true);
            };
            GridSplitter.prototype.OnMouseLeftButtonDown = function (e) {
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
                if (!this.IsEnabled)
                    return;
                this._IsDragging = this.CaptureMouse();
                if (!this._IsDragging)
                    return;
                this._DragStart = this._GetTransformedPos(e);
                this.Focus();
                this.InitHelper();
            };
            GridSplitter.prototype.OnMouseLeftButtonUp = function (e) {
                _super.prototype.OnMouseLeftButtonUp.call(this, e);
                this.ReleaseMouseCapture();
                this._IsDragging = false;
                this._Helper = null;
                this.UpdateVisualState();
            };
            GridSplitter.prototype.OnMouseMove = function (e) {
                _super.prototype.OnMouseMove.call(this, e);
                if (!this._IsDragging)
                    return;
                var pos = this._GetTransformedPos(e);
                if (pos)
                    this._HandleMove(pos.x - this._DragStart.x, pos.y - this._DragStart.y, false);
            };
            GridSplitter.prototype.InitHelper = function () {
                var parent = this.VisualParent;
                if (!(parent instanceof Controls.Grid))
                    return;
                this._Helper = new Controls.Internal.GridSplitterResizer(this);
                if (this._Helper.Setup(this, parent))
                    return;
                this._Helper = null;
            };
            GridSplitter.prototype._HandleMove = function (horiz, vert, isKeyboard) {
                if (isKeyboard) {
                    if (this._Helper)
                        return false;
                    this.InitHelper();
                }
                if (!this._Helper)
                    return false;
                if (!this._Helper.Move(this.VisualParent, horiz, vert) || isKeyboard)
                    this._Helper = null;
                return true;
            };
            GridSplitter.prototype._GetTransformedPos = function (e) {
                if (this.RenderTransform)
                    return this.RenderTransform.Transform(e.GetPosition(this));
                return e.GetPosition(this);
            };
            return GridSplitter;
        })(Controls.Control);
        Controls.GridSplitter = GridSplitter;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var HeaderedItemsControl = (function (_super) {
            __extends(HeaderedItemsControl, _super);
            function HeaderedItemsControl() {
                _super.call(this);
                this._HeaderIsItem = false;
                this.DefaultStyleKey = HeaderedItemsControl;
                this._ItemsControlHelper = new Controls.Internal.ItemsControlHelper(this);
            }
            HeaderedItemsControl.prototype.OnHeaderChanged = function (oldHeader, newHeader) {
            };
            HeaderedItemsControl.prototype.OnHeaderTemplateChanged = function (oldHeaderTemplate, newHeaderTemplate) {
            };
            HeaderedItemsControl.prototype.OnItemContainerStyleChanged = function (args) {
                this._ItemsControlHelper.UpdateItemContainerStyle(args.NewValue);
            };
            HeaderedItemsControl.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                this._ItemsControlHelper.OnApplyTemplate();
            };
            HeaderedItemsControl.prototype.PrepareContainerForItem = function (element, item) {
                var control = element;
                if (!(control instanceof Controls.Control))
                    control = null;
                var ics = this.ItemContainerStyle;
                if (ics != null && control != null && control.Style == null)
                    control.SetValue(Fayde.FrameworkElement.StyleProperty, ics);
                var hic = element;
                if (hic instanceof HeaderedItemsControl)
                    HeaderedItemsControl.PrepareHeaderedItemsControlContainer(hic, item, this, ics);
                _super.prototype.PrepareContainerForItem.call(this, element, item);
            };
            HeaderedItemsControl.PrepareHeaderedItemsControlContainer = function (control, item, parentItemsControl, parentItemContainerStyle) {
                if (control === item)
                    return;
                var itemTemplate = parentItemsControl.ItemTemplate;
                if (itemTemplate != null)
                    control.SetValue(Controls.ItemsControl.ItemTemplateProperty, itemTemplate);
                if (parentItemContainerStyle != null && hasDefaultValue(control, HeaderedItemsControl.ItemContainerStyleProperty))
                    control.SetValue(HeaderedItemsControl.ItemContainerStyleProperty, parentItemContainerStyle);
                if (control._HeaderIsItem || hasDefaultValue(control, HeaderedItemsControl.HeaderProperty)) {
                    control.Header = item;
                    control._HeaderIsItem = true;
                }
                if (itemTemplate != null)
                    control.SetValue(HeaderedItemsControl.HeaderTemplateProperty, itemTemplate);
                if (parentItemContainerStyle != null && control.Style == null)
                    control.SetValue(Fayde.FrameworkElement.StyleProperty, parentItemContainerStyle);
                var hdt = itemTemplate;
                if (!(hdt instanceof Fayde.HierarchicalDataTemplate))
                    return;
                var isexpr = hdt.GetBindingExpression(Fayde.HierarchicalDataTemplate.ItemsSourceProperty);
                if (isexpr) {
                    var binding = new Fayde.Data.Binding(isexpr.ParentBinding);
                    binding.Source = control.Header;
                    control.SetBinding(Controls.ItemsControl.ItemsSourceProperty, binding);
                }
                if (hdt.ItemTemplate !== undefined && control.ItemTemplate === itemTemplate) {
                    control.ClearValue(Controls.ItemsControl.ItemTemplateProperty);
                    if (hdt.ItemTemplate != null)
                        control.ItemTemplate = hdt.ItemTemplate;
                }
                if (hdt.ItemContainerStyle !== undefined && control.ItemContainerStyle === parentItemContainerStyle) {
                    control.ClearValue(HeaderedItemsControl.ItemContainerStyleProperty);
                    if (hdt.ItemContainerStyle != null)
                        control.ItemContainerStyle = hdt.ItemContainerStyle;
                }
            };
            HeaderedItemsControl.HeaderProperty = DependencyProperty.Register("Header", function () { return Object; }, HeaderedItemsControl, undefined, function (d, args) { return d.OnHeaderChanged(args.OldValue, args.NewValue); });
            HeaderedItemsControl.HeaderTemplateProperty = DependencyProperty.Register("HeaderTemplate", function () { return Fayde.DataTemplate; }, HeaderedItemsControl, undefined, function (d, args) { return d.OnHeaderTemplateChanged(args.OldValue, args.NewValue); });
            HeaderedItemsControl.ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", function () { return Fayde.Style; }, HeaderedItemsControl, undefined, function (d, args) { return d.OnItemContainerStyleChanged(args); });
            return HeaderedItemsControl;
        })(Controls.ItemsControl);
        Controls.HeaderedItemsControl = HeaderedItemsControl;
        function hasDefaultValue(control, propd) {
            return control.ReadLocalValue(propd) === DependencyProperty.UnsetValue;
        }
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
/// <reference path="Primitives/MenuBase.ts" />
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var MenuItem = (function (_super) {
            __extends(MenuItem, _super);
            function MenuItem() {
                _super.call(this);
                this.Click = new Fayde.RoutedEvent();
                this.DefaultStyleKey = MenuItem;
                this.UpdateIsEnabled();
            }
            MenuItem.prototype.OnCommandChanged = function (args) {
                var oldcmd = Fayde.Input.ICommand_.as(args.OldValue);
                if (oldcmd)
                    oldcmd.CanExecuteChanged.off(this._CanExecuteChanged, this);
                var newcmd = Fayde.Input.ICommand_.as(args.NewValue);
                if (newcmd)
                    newcmd.CanExecuteChanged.on(this._CanExecuteChanged, this);
                this.UpdateIsEnabled();
            };
            MenuItem.prototype._CanExecuteChanged = function (sender, e) {
                this.UpdateIsEnabled();
            };
            MenuItem.prototype.OnCommandParameterChanged = function (args) {
                this.UpdateIsEnabled();
            };
            MenuItem.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                this.UpdateVisualState(false);
            };
            MenuItem.prototype.UpdateIsEnabled = function () {
                this.IsEnabled = this.Command == null || this.Command.CanExecute(this.CommandParameter);
                this.UpdateVisualState(true);
            };
            MenuItem.prototype.OnGotFocus = function (e) {
                _super.prototype.OnGotFocus.call(this, e);
                this.UpdateVisualState(true);
            };
            MenuItem.prototype.OnLostFocus = function (e) {
                _super.prototype.OnLostFocus.call(this, e);
                this.UpdateVisualState(true);
            };
            MenuItem.prototype.OnMouseEnter = function (e) {
                _super.prototype.OnMouseEnter.call(this, e);
                this.Focus();
                this.UpdateVisualState(true);
            };
            MenuItem.prototype.OnMouseLeave = function (e) {
                _super.prototype.OnMouseLeave.call(this, e);
                if (this.ParentMenuBase != null)
                    this.ParentMenuBase.Focus();
                this.UpdateVisualState(true);
            };
            MenuItem.prototype.OnMouseLeftButtonDown = function (e) {
                if (!e.Handled) {
                    this.OnClick();
                    e.Handled = true;
                }
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
            };
            MenuItem.prototype.OnMouseRightButtonDown = function (e) {
                if (!e.Handled) {
                    this.OnClick();
                    e.Handled = true;
                }
                _super.prototype.OnMouseRightButtonDown.call(this, e);
            };
            MenuItem.prototype.OnKeyDown = function (e) {
                if (!e.Handled && Fayde.Input.Key.Enter === e.Key) {
                    this.OnClick();
                    e.Handled = true;
                }
                _super.prototype.OnKeyDown.call(this, e);
            };
            MenuItem.prototype.OnClick = function () {
                var contextMenu = this.ParentMenuBase;
                if (contextMenu instanceof Controls.ContextMenu)
                    contextMenu.ChildMenuItemClicked();
                this.Click.raise(this, new Fayde.RoutedEventArgs());
                if (this.Command == null || !this.Command.CanExecute(this.CommandParameter))
                    return;
                this.Command.Execute(this.CommandParameter);
            };
            MenuItem.prototype.GoToStateCommon = function (gotoFunc) {
                if (!this.IsEnabled)
                    return gotoFunc("Disabled");
                return gotoFunc("Normal");
            };
            MenuItem.CommandProperty = DependencyProperty.Register("Command", function () { return Fayde.Input.ICommand_; }, MenuItem, undefined, function (d, args) { return d.OnCommandChanged(args); });
            MenuItem.CommandParameterProperty = DependencyProperty.Register("CommandParameter", function () { return Object; }, MenuItem, undefined, function (d, args) { return d.OnCommandParameterChanged(args); });
            MenuItem.IconProperty = DependencyProperty.Register("Icon", function () { return Object; }, MenuItem);
            return MenuItem;
        })(Fayde.Controls.HeaderedItemsControl);
        Controls.MenuItem = MenuItem;
        Controls.TemplateVisualStates(MenuItem, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" });
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
/// <reference path="UpDownBase.ts" />
/// <reference path="Spinner.ts" />
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var NumericUpDown = (function (_super) {
            __extends(NumericUpDown, _super);
            function NumericUpDown() {
                var _this = this;
                _super.call(this);
                this.Parsing = new Fayde.RoutedEvent();
                this.ParseError = new Fayde.RoutedEvent();
                this.DefaultStyleKey = NumericUpDown;
                this._Coercer = new Controls.Internal.FormattedRangeCoercer(this, function (val) { return _this.SetCurrentValue(NumericUpDown.MaximumProperty, val); }, function (val) { return _this.SetCurrentValue(NumericUpDown.ValueProperty, val); }, function () {
                    if (_this._Formatter)
                        _this._Formatter.UpdateTextBoxText();
                });
            }
            NumericUpDown.prototype.OnMinimumChanged = function (oldMinimum, newMinimum) {
                this.UpdateValidSpinDirection();
            };
            NumericUpDown.prototype.OnMaximumChanged = function (oldMaximum, newMaximum) {
                this.UpdateValidSpinDirection();
            };
            NumericUpDown.prototype.OnValueChanged = function (oldValue, newValue) {
                this.UpdateValidSpinDirection();
                if (this._Formatter)
                    this._Formatter.UpdateTextBoxText();
            };
            NumericUpDown.prototype.OnIncrementChanged = function (oldIncrement, newIncrement) {
            };
            NumericUpDown.prototype.OnDecimalPlacesChanged = function (oldDecimalPlaces, newDecimalPlaces) {
            };
            NumericUpDown.prototype.OnApplyTemplate = function () {
                var _this = this;
                _super.prototype.OnApplyTemplate.call(this);
                if (this._SpinFlow)
                    this._SpinFlow.Dispose();
                this._SpinFlow = new Controls.Internal.SpinFlow(this, this.GetTemplateChild("Spinner", Controls.Spinner));
                if (this._Formatter)
                    this._Formatter.Dispose();
                this._Formatter = new Controls.Internal.TextBoxFormatter(this, this.GetTemplateChild("Text", Controls.TextBox), function (val) { return _this.SetCurrentValue(NumericUpDown.ValueProperty, val); });
                this.UpdateValidSpinDirection();
                this.UpdateVisualState(false);
            };
            NumericUpDown.prototype.UpdateValidSpinDirection = function () {
                if (!this._SpinFlow)
                    return;
                var val = this.Value;
                this._SpinFlow.UpdateValid(val < this.Maximum, val > this.Minimum);
            };
            NumericUpDown.prototype.ParseValue = function (text) {
                return parseFloat(text);
            };
            NumericUpDown.prototype.FormatValue = function (val) {
                return val.toFixed(this.DecimalPlaces);
            };
            NumericUpDown.prototype.OnSpin = function () {
                this._Formatter.ProcessUserInput();
            };
            NumericUpDown.prototype.OnIncrement = function () {
                this._Coercer.AddToValue(this.Increment);
            };
            NumericUpDown.prototype.OnDecrement = function () {
                this._Coercer.AddToValue(-this.Increment);
            };
            NumericUpDown.MinimumProperty = DependencyProperty.Register("Minimum", function () { return Number; }, NumericUpDown, 0.0, function (d, args) { return d._Coercer.OnMinimumChanged(args.OldValue, args.NewValue); });
            NumericUpDown.MaximumProperty = DependencyProperty.Register("Maximum", function () { return Number; }, NumericUpDown, 100.0, function (d, args) { return d._Coercer.OnMaximumChanged(args.OldValue, args.NewValue); });
            NumericUpDown.ValueProperty = DependencyProperty.Register("Value", function () { return Number; }, NumericUpDown, 0.0, function (d, args) { return d._Coercer.OnValueChanged(args.OldValue, args.NewValue); });
            NumericUpDown.IncrementProperty = DependencyProperty.Register("Increment", function () { return Number; }, NumericUpDown, 1.0, function (d, args) { return d.OnIncrementChanged(args.OldValue, args.NewValue); });
            NumericUpDown.DecimalPlacesProperty = DependencyProperty.Register("DecimalPlaces", function () { return Number; }, NumericUpDown, 0, function (d, args) { return d._Coercer.OnDecimalPlacesChanged(args.OldValue, args.NewValue); });
            NumericUpDown.SpinnerStyleProperty = DependencyProperty.Register("SpinnerStyle", function () { return Fayde.Style; }, NumericUpDown);
            NumericUpDown.IsEditableProperty = DependencyProperty.Register("IsEditable", function () { return Boolean; }, NumericUpDown, true, function (d, args) { return d._Formatter.UpdateIsEditable(); });
            return NumericUpDown;
        })(Controls.Control);
        Controls.NumericUpDown = NumericUpDown;
        Controls.TemplateVisualStates(NumericUpDown, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "MouseOver" }, { GroupName: "CommonStates", Name: "Pressed" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" }, { GroupName: "ValidationStates", Name: "Valid" }, { GroupName: "ValidationStates", Name: "InvalidUnfocused" }, { GroupName: "ValidationStates", Name: "InvalidFocused" });
        Controls.TemplateParts(NumericUpDown, { Name: "Text", Type: Controls.TextBox }, { Name: "Spinner", Type: Controls.Spinner });
        function numberValidator(d, propd, value) {
            if (typeof value !== "number")
                return false;
            if (isNaN(value))
                return false;
            if (!isFinite(value))
                return false;
            return true;
        }
        function decimalPlacesValidator(d, propd, value) {
            if (!numberValidator(d, propd, value))
                return false;
            return value >= 0 && value <= 15;
        }
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Separator = (function (_super) {
            __extends(Separator, _super);
            function Separator() {
                _super.call(this);
                this.DefaultStyleKey = Separator;
            }
            return Separator;
        })(Controls.Control);
        Controls.Separator = Separator;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var SpinEventArgs = (function (_super) {
            __extends(SpinEventArgs, _super);
            function SpinEventArgs(direction) {
                _super.call(this);
                Object.defineProperty(this, "Direction", { value: direction, writable: false });
            }
            return SpinEventArgs;
        })(Fayde.RoutedEventArgs);
        Controls.SpinEventArgs = SpinEventArgs;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ElementTemplateTopName = "TemplateTop";
        var ElementTemplateBottomName = "TemplateBottom";
        var ElementTemplateLeftName = "TemplateLeft";
        var ElementTemplateRightName = "TemplateRight";
        var ElementTabPanelTopName = "TabPanelTop";
        var ElementTabPanelBottomName = "TabPanelBottom";
        var ElementTabPanelLeftName = "TabPanelLeft";
        var ElementTabPanelRightName = "TabPanelRight";
        var ElementContentTopName = "ContentTop";
        var ElementContentBottomName = "ContentBottom";
        var ElementContentLeftName = "ContentLeft";
        var ElementContentRightName = "ContentRight";
        var TabControl = (function (_super) {
            __extends(TabControl, _super);
            function TabControl() {
                _super.call(this);
                this.SelectionChanged = new Fayde.RoutedEvent();
                this._UpdateIndex = true;
                this._DesiredIndex = 0;
                this.DefaultStyleKey = TabControl;
            }
            TabControl.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                if (this._ElementTabPanelTop != null)
                    this._ElementTabPanelTop.Children.Clear();
                if (this._ElementTabPanelBottom != null)
                    this._ElementTabPanelBottom.Children.Clear();
                if (this._ElementTabPanelLeft != null)
                    this._ElementTabPanelLeft.Children.Clear();
                if (this._ElementTabPanelRight != null)
                    this._ElementTabPanelRight.Children.Clear();
                var contentHost = this._GetContentHost(this.TabStripPlacement);
                if (contentHost != null)
                    contentHost.Content = null;
                this._ElementTemplateTop = this.GetTemplateChild("TemplateTop", Fayde.FrameworkElement);
                this._ElementTemplateBottom = this.GetTemplateChild("TemplateBottom", Fayde.FrameworkElement);
                this._ElementTemplateLeft = this.GetTemplateChild("TemplateLeft", Fayde.FrameworkElement);
                this._ElementTemplateRight = this.GetTemplateChild("TemplateRight", Fayde.FrameworkElement);
                this._ElementTabPanelTop = this.GetTemplateChild("TabPanelTop", Controls.TabPanel);
                this._ElementTabPanelBottom = this.GetTemplateChild("TabPanelBottom", Controls.TabPanel);
                this._ElementTabPanelLeft = this.GetTemplateChild("TabPanelLeft", Controls.TabPanel);
                this._ElementTabPanelRight = this.GetTemplateChild("TabPanelRight", Controls.TabPanel);
                Controls.TabPanel.setTabAlignment(this._ElementTabPanelTop, Controls.Dock.Top);
                Controls.TabPanel.setTabAlignment(this._ElementTabPanelBottom, Controls.Dock.Bottom);
                Controls.TabPanel.setTabAlignment(this._ElementTabPanelLeft, Controls.Dock.Left);
                Controls.TabPanel.setTabAlignment(this._ElementTabPanelRight, Controls.Dock.Right);
                this._ElementContentTop = this.GetTemplateChild("ContentTop", Controls.ContentPresenter);
                this._ElementContentBottom = this.GetTemplateChild("ContentBottom", Controls.ContentPresenter);
                this._ElementContentLeft = this.GetTemplateChild("ContentLeft", Controls.ContentPresenter);
                this._ElementContentRight = this.GetTemplateChild("ContentRight", Controls.ContentPresenter);
                var enumerator = this.Items.getEnumerator();
                while (enumerator.moveNext()) {
                    var tabItem = enumerator.current;
                    if (!(tabItem instanceof Controls.TabItem))
                        this._ThrowInvalidTabItem(tabItem);
                    this._AddToTabPanel(tabItem);
                }
                if (this.SelectedIndex >= 0)
                    this.UpdateSelectedContent(this.SelectedContent);
                this.UpdateTabPanelLayout(this.TabStripPlacement, this.TabStripPlacement);
                this.UpdateVisualState(false);
            };
            TabControl.prototype.OnSelectedItemChanged = function (args) {
                var oldItem = args.OldValue;
                var newItem = args.NewValue;
                var num = newItem == null ? -1 : this.Items.IndexOf(newItem);
                if (newItem != null && num === -1) {
                    this.SelectedItem = oldItem;
                }
                else {
                    this.SelectedIndex = num;
                    this.SelectItem(oldItem, newItem);
                }
            };
            TabControl.prototype.OnSelectedIndexChanged = function (args) {
                var index = args.NewValue;
                var num = args.OldValue;
                if (index < -1)
                    throw new ArgumentException("'" + index.toString() + "' is not a valid value for property 'SelectedIndex'");
                if (this._UpdateIndex)
                    this._DesiredIndex = index;
                else if (!this._UpdateIndex)
                    this._UpdateIndex = true;
                if (index >= this.Items.Count) {
                    this._UpdateIndex = false;
                    this.SelectedIndex = num;
                }
                else {
                    var item;
                    if (index >= 0 && index < this.Items.Count)
                        item = this.Items.GetValueAt(index);
                    if (this.SelectedItem === item)
                        return;
                    this.SelectedItem = item;
                }
            };
            TabControl.prototype.OnSelectedContentChanged = function (args) {
                this.UpdateSelectedContent(args.NewValue);
            };
            TabControl.prototype.OnTabStripPlacementPropertyChanged = function (args) {
                this.UpdateTabPanelLayout(args.OldValue, args.NewValue);
                var enumerator = this.Items.getEnumerator();
                var ti;
                while (enumerator.moveNext()) {
                    ti = enumerator.current;
                    if (ti != null)
                        ti.UpdateVisualState();
                }
            };
            TabControl.prototype.OnItemsChanged = function (e) {
                _super.prototype.OnItemsChanged.call(this, e);
                switch (e.Action) {
                    case Fayde.Collections.CollectionChangedAction.Add:
                        var index1 = -1;
                        var len = e.NewItems.length;
                        for (var i = 0; i < len; i++) {
                            var obj = e.NewItems[i];
                            var tabItem = obj;
                            if (!(tabItem instanceof Controls.TabItem))
                                this._ThrowInvalidTabItem(tabItem);
                            var index2 = this.Items.IndexOf(tabItem);
                            this._InsertIntoTabPanel(index2, tabItem);
                            if (tabItem.IsSelected)
                                index1 = index2;
                            else if (this.SelectedItem !== this._GetItemAtIndex(this.SelectedIndex))
                                index1 = this.Items.IndexOf(this.SelectedItem);
                            else if (this._DesiredIndex < this.Items.Count && this._DesiredIndex >= 0)
                                index1 = this._DesiredIndex;
                            tabItem.UpdateVisualState();
                        }
                        if (index1 === -1) {
                            var enumerator = this.Items.getEnumerator();
                            while (enumerator.moveNext()) {
                                var tabItem = enumerator.current;
                                if (!(tabItem instanceof Controls.TabItem))
                                    this._ThrowInvalidTabItem(tabItem);
                                if (tabItem.IsSelected)
                                    return;
                            }
                            if (this.Items.Count <= 1) {
                                var item0 = this.Items.GetValueAt(0);
                                var iss = item0.ReadLocalValue(Controls.TabItem.IsSelectedProperty);
                                if (iss !== false)
                                    index1 = 0;
                            }
                            else {
                                index1 = 0;
                            }
                        }
                        this.SelectedItem = this._GetItemAtIndex(index1);
                        this.SelectedIndex = index1;
                        break;
                    case Fayde.Collections.CollectionChangedAction.Remove:
                        var len = e.OldItems.length;
                        var tabItem;
                        for (var i = 0; i < len; i++) {
                            tabItem = e.OldItems[i];
                            this._RemoveFromTabPanel(tabItem);
                            if (this.Items.Count === 0)
                                this.SelectedIndex = -1;
                            else if (this.Items.Count <= this.SelectedIndex)
                                this.SelectedIndex = this.Items.Count - 1;
                            else
                                this.SelectedItem = this._GetItemAtIndex(this.SelectedIndex);
                        }
                        break;
                    case Fayde.Collections.CollectionChangedAction.Reset:
                        this._ClearTabPanel();
                        this.SelectedIndex = -1;
                        var tabItem;
                        var enumerator = this.Items.getEnumerator();
                        while (enumerator.moveNext()) {
                            tabItem = enumerator.current;
                            if (!(tabItem instanceof Controls.TabItem))
                                this._ThrowInvalidTabItem(tabItem);
                            this._AddToTabPanel(tabItem);
                            if (tabItem.IsSelected)
                                this.SelectedItem = tabItem;
                        }
                        if (this.SelectedIndex !== -1 || this.Items.Count <= 0)
                            break;
                        this.SelectedIndex = 0;
                        break;
                }
            };
            TabControl.prototype.OnKeyDown = function (e) {
                _super.prototype.OnKeyDown.call(this, e);
                if (e.Handled)
                    return;
                var nextTabItem;
                switch (e.Key) {
                    case Fayde.Input.Key.End:
                        nextTabItem = this._FindEndTabItem();
                        break;
                    case Fayde.Input.Key.Home:
                        nextTabItem = this._FindHomeTabItem();
                        break;
                    default:
                        return;
                }
                if (nextTabItem == null || nextTabItem === this.SelectedItem)
                    return;
                e.Handled = true;
                this.SelectedItem = nextTabItem;
                nextTabItem.Focus();
            };
            TabControl.prototype._FindEndTabItem = function () {
                var items = this.Items;
                var len = items.Count;
                var tabItem = null;
                for (var i = len - 1; i >= 0; i--) {
                    tabItem = items.GetValueAt(i);
                    if (tabItem.IsEnabled && tabItem.Visibility === Fayde.Visibility.Visible)
                        return tabItem;
                }
                return null;
            };
            TabControl.prototype._FindHomeTabItem = function () {
                var items = this.Items;
                var len = items.Count;
                var tabItem = null;
                for (var i = 0; i < len; i++) {
                    tabItem = items.GetValueAt(i);
                    if (tabItem.IsEnabled && tabItem.Visibility === Fayde.Visibility.Visible)
                        return tabItem;
                }
                return null;
            };
            TabControl.prototype.SelectItem = function (oldItem, newItem) {
                if (newItem == null) {
                    var contentHost = this._GetContentHost(this.TabStripPlacement);
                    if (contentHost != null)
                        contentHost.Content = null;
                    this.SetValue(TabControl.SelectedContentProperty, null);
                }
                var tabItem;
                var enumerator = this.Items.getEnumerator();
                while (enumerator.moveNext()) {
                    var tabItem = enumerator.current;
                    if (!(tabItem instanceof Controls.TabItem))
                        this._ThrowInvalidTabItem(tabItem);
                    if (tabItem !== newItem && tabItem.IsSelected) {
                        tabItem.IsSelected = false;
                    }
                    else if (tabItem === newItem) {
                        tabItem.IsSelected = true;
                        this.SetValue(TabControl.SelectedContentProperty, tabItem.Content);
                    }
                }
                var oldItems = [];
                if (oldItem != null)
                    oldItems.push(oldItem);
                var newItems = [];
                if (newItem != null)
                    newItems.push(newItem);
                var e = new Controls.Primitives.SelectionChangedEventArgs(oldItems, newItems);
                this.OnSelectionChanged(e);
                this.SelectionChanged.raise(this, e);
            };
            TabControl.prototype.OnSelectionChanged = function (e) {
            };
            TabControl.prototype.UpdateTabPanelLayout = function (oldValue, newValue) {
                var template1 = this._GetTemplate(oldValue);
                var template2 = this._GetTemplate(newValue);
                var tabPanel1 = this._GetTabPanel(oldValue);
                var tabPanel2 = this._GetTabPanel(newValue);
                var contentHost1 = this._GetContentHost(oldValue);
                var contentHost2 = this._GetContentHost(newValue);
                if (oldValue !== newValue) {
                    if (template1 != null)
                        template1.Visibility = Fayde.Visibility.Collapsed;
                    if (tabPanel1 != null)
                        tabPanel1.Children.Clear();
                    if (tabPanel2 != null) {
                        var enumerator = this.Items.getEnumerator();
                        var ti;
                        while (enumerator.moveNext()) {
                            ti = enumerator.current;
                            if (!(ti instanceof Controls.TabItem))
                                this._ThrowInvalidTabItem(ti);
                            this._AddToTabPanel(ti);
                        }
                    }
                    if (contentHost1 != null)
                        contentHost1.Content = null;
                    if (contentHost2 != null)
                        contentHost2.Content = this.SelectedContent;
                }
                if (template2 == null)
                    return;
                template2.Visibility = Fayde.Visibility.Visible;
            };
            TabControl.prototype.UpdateSelectedContent = function (content) {
                var tabItem = this.SelectedItem;
                if (!(tabItem instanceof Controls.TabItem))
                    return;
                var contentHost = this._GetContentHost(this.TabStripPlacement);
                if (contentHost == null)
                    return;
                contentHost.HorizontalAlignment = tabItem.HorizontalContentAlignment;
                contentHost.VerticalAlignment = tabItem.VerticalContentAlignment;
                contentHost.ContentTemplate = tabItem.ContentTemplate;
                contentHost.Content = content;
            };
            TabControl.prototype.EnsureLanguageBinding = function (tabItem) {
                if (tabItem == null)
                    return;
                var frameworkElement = tabItem.Content;
                if (!(frameworkElement instanceof Fayde.FrameworkElement) || frameworkElement.ReadLocalValue(Fayde.FrameworkElement.LanguageProperty) !== DependencyProperty.UnsetValue)
                    return;
                var binding = new Fayde.Data.Binding("Language");
                binding.Source = this;
                frameworkElement.SetBinding(Fayde.FrameworkElement.LanguageProperty, binding);
            };
            TabControl.prototype.ClearLanguageBinding = function (tabItem) {
                if (tabItem == null)
                    return;
                var frameworkElement = tabItem.Content;
                if (!(frameworkElement instanceof Fayde.FrameworkElement) || frameworkElement.ReadLocalValue(Fayde.FrameworkElement.LanguageProperty) !== DependencyProperty.UnsetValue)
                    return;
                frameworkElement.ClearValue(Fayde.FrameworkElement.LanguageProperty);
            };
            TabControl.prototype._AddToTabPanel = function (ti) {
                var tabPanel = this._GetTabPanel(this.TabStripPlacement);
                if (!tabPanel || tabPanel.Children.Contains(ti))
                    return;
                tabPanel.Children.Add(ti);
                this.EnsureLanguageBinding(ti);
            };
            TabControl.prototype._InsertIntoTabPanel = function (index, ti) {
                var tabPanel = this._GetTabPanel(this.TabStripPlacement);
                if (!tabPanel || tabPanel.Children.Contains(ti))
                    return;
                tabPanel.Children.Insert(index, ti);
            };
            TabControl.prototype._RemoveFromTabPanel = function (ti) {
                var tabPanel = this._GetTabPanel(this.TabStripPlacement);
                if (!tabPanel || !tabPanel.Children.Contains(ti))
                    return;
                tabPanel.Children.Remove(ti);
            };
            TabControl.prototype._ClearTabPanel = function () {
                var tabPanel = this._GetTabPanel(this.TabStripPlacement);
                if (!tabPanel)
                    return;
                var enumerator = tabPanel.Children.getEnumerator();
                while (enumerator.moveNext()) {
                    var tabItem = enumerator.current;
                    if (tabItem != null)
                        this.ClearLanguageBinding(tabItem);
                }
                tabPanel.Children.Clear();
            };
            TabControl.prototype._GetTabPanel = function (tabPlacement) {
                switch (tabPlacement) {
                    case Controls.Dock.Left:
                        return this._ElementTabPanelLeft;
                    case Controls.Dock.Top:
                        return this._ElementTabPanelTop;
                    case Controls.Dock.Right:
                        return this._ElementTabPanelRight;
                    case Controls.Dock.Bottom:
                        return this._ElementTabPanelBottom;
                    default:
                        return null;
                }
            };
            TabControl.prototype._GetTemplate = function (tabPlacement) {
                switch (tabPlacement) {
                    case Controls.Dock.Left:
                        return this._ElementTemplateLeft;
                    case Controls.Dock.Top:
                        return this._ElementTemplateTop;
                    case Controls.Dock.Right:
                        return this._ElementTemplateRight;
                    case Controls.Dock.Bottom:
                        return this._ElementTemplateBottom;
                    default:
                        return null;
                }
            };
            TabControl.prototype._GetContentHost = function (tabPlacement) {
                switch (tabPlacement) {
                    case Controls.Dock.Left:
                        return this._ElementContentLeft;
                    case Controls.Dock.Top:
                        return this._ElementContentTop;
                    case Controls.Dock.Right:
                        return this._ElementContentRight;
                    case Controls.Dock.Bottom:
                        return this._ElementContentBottom;
                    default:
                        return null;
                }
            };
            TabControl.prototype._GetItemAtIndex = function (index) {
                if (index < 0 || index >= this.Items.Count)
                    return null;
                var item = this.Items.GetValueAt(index);
                if (item instanceof Controls.TabItem)
                    return item;
            };
            TabControl.prototype._ThrowInvalidTabItem = function (obj) {
                var type = "object";
                try {
                    type = obj.constructor._TypeName;
                }
                catch (err) {
                }
                throw new ArgumentException("Unable to cast object of type '" + type + "' to type 'System.Windows.Controls.TabItem'.");
            };
            TabControl.SelectedItemProperty = DependencyProperty.Register("SelectedItem", function () { return Object; }, TabControl, null, function (d, args) { return d.OnSelectedItemChanged(args); });
            TabControl.SelectedIndexProperty = DependencyProperty.Register("SelectedIndex", function () { return Number; }, TabControl, -1, function (d, args) { return d.OnSelectedIndexChanged(args); });
            TabControl.SelectedContentProperty = DependencyProperty.Register("SelectedContent", function () { return Object; }, TabControl, null, function (d, args) { return d.OnSelectedContentChanged(args); });
            TabControl.TabStripPlacementProperty = DependencyProperty.Register("TabStripPlacement", function () { return new Fayde.Enum(Controls.Dock); }, TabControl, Controls.Dock.Top, function (d, args) { return d.OnTabStripPlacementPropertyChanged(args); });
            return TabControl;
        })(Controls.ItemsControl);
        Controls.TabControl = TabControl;
        Controls.TemplateVisualStates(TabControl, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "Disabled" });
        Controls.TemplateParts(TabControl, { Name: "TemplateLeft", Type: Fayde.FrameworkElement }, { Name: "ContentLeft", Type: Controls.ContentPresenter }, { Name: "TabPanelLeft", Type: Controls.TabPanel }, { Name: "TemplateTop", Type: Fayde.FrameworkElement }, { Name: "ContentTop", Type: Controls.ContentPresenter }, { Name: "TabPanelTop", Type: Controls.TabPanel }, { Name: "TemplateRight", Type: Fayde.FrameworkElement }, { Name: "ContentRight", Type: Controls.ContentPresenter }, { Name: "TabPanelRight", Type: Controls.TabPanel }, { Name: "TemplateBottom", Type: Fayde.FrameworkElement }, { Name: "ContentBottom", Type: Controls.ContentPresenter }, { Name: "TabPanelBottom", Type: Controls.TabPanel });
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var TabItem = (function (_super) {
            __extends(TabItem, _super);
            function TabItem() {
                _super.call(this);
                this._SelectedElements = new Elements();
                this._UnselectedElements = new Elements();
                this._PreviousTemplate = null;
                this._PreviousHeader = null;
                this.DefaultStyleKey = TabItem;
            }
            Object.defineProperty(TabItem.prototype, "TabStripPlacement", {
                get: function () {
                    var tabControlParent = this.TabControlParent;
                    if (tabControlParent != null)
                        return tabControlParent.TabStripPlacement;
                    return Controls.Dock.Top;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TabItem.prototype, "TabControlParent", {
                get: function () {
                    return Fayde.VisualTreeHelper.GetParentOfType(this, Controls.TabControl);
                },
                enumerable: true,
                configurable: true
            });
            TabItem.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                var contentControl = this._GetContentControl(this.IsSelected, this.TabStripPlacement);
                if (contentControl != null)
                    contentControl.Content = null;
                this._SelectedElements.OnApplyTemplate(this, true);
                this._UnselectedElements.OnApplyTemplate(this, false);
                this._UpdateHeaderVisuals();
                this.UpdateVisualState(false);
            };
            TabItem.prototype._OnHeaderChanged = function (args) {
                this.HasHeader = args.NewValue != null;
                this.OnHeaderChanged(args.OldValue, args.NewValue);
            };
            TabItem.prototype.OnHeaderChanged = function (oldValue, newValue) {
                this._UpdateHeaderVisuals();
            };
            TabItem.prototype.OnHeaderTemplateChanged = function (oldHeaderTemplate, newHeaderTemplate) {
                this._UpdateHeaderVisuals();
            };
            TabItem.prototype._OnIsSelectedChanged = function (args) {
                var isSelected = args.NewValue;
                var e1 = new Fayde.RoutedEventArgs();
                if (isSelected)
                    this.OnSelected(e1);
                else
                    this.OnUnselected(e1);
                this.IsTabStop = isSelected;
                this.UpdateVisualState();
            };
            TabItem.prototype.OnSelected = function (e) {
                var parent = this.TabControlParent;
                if (!parent)
                    return;
                parent.SelectedItem = this;
            };
            TabItem.prototype.OnUnselected = function (e) {
                var parent = this.TabControlParent;
                if (!parent || parent.SelectedItem != this)
                    return;
                parent.SelectedIndex = -1;
            };
            TabItem.prototype.UpdateVisualState = function (useTransitions) {
                var template = this.GetTemplate(this.IsSelected, this.TabStripPlacement);
                if (this._PreviousTemplate != null && this._PreviousTemplate !== template)
                    this._PreviousTemplate.Visibility = Fayde.Visibility.Collapsed;
                this._PreviousTemplate = template;
                if (template != null)
                    template.Visibility = Fayde.Visibility.Visible;
                var contentControl = this._GetContentControl(this.IsSelected, this.TabStripPlacement);
                if (this._PreviousHeader && this._PreviousHeader !== contentControl)
                    this._PreviousHeader.Content = null;
                this._PreviousHeader = contentControl;
                this._UpdateHeaderVisuals();
                _super.prototype.UpdateVisualState.call(this, useTransitions);
            };
            TabItem.prototype._UpdateHeaderVisuals = function () {
                var contentControl = this._GetContentControl(this.IsSelected, this.TabStripPlacement);
                if (!contentControl)
                    return;
                contentControl.Content = this.Header;
                contentControl.ContentTemplate = this.HeaderTemplate;
            };
            TabItem.prototype.OnMouseLeave = function (e) {
                this.UpdateVisualState();
            };
            TabItem.prototype.OnMouseEnter = function (e) {
                this.UpdateVisualState();
            };
            TabItem.prototype.OnMouseLeftButtonDown = function (e) {
                if (!this.IsEnabled || !this.TabControlParent || (this.IsSelected || e.Handled))
                    return;
                this.IsTabStop = true;
                e.Handled = this.Focus();
                this.TabControlParent.SelectedIndex = this.TabControlParent.Items.IndexOf(this);
            };
            TabItem.prototype.OnGotFocus = function (e) {
                _super.prototype.OnGotFocus.call(this, e);
                this.SetValueInternal(TabItem.IsFocusedProperty, true);
                this.UpdateVisualState();
            };
            TabItem.prototype.OnLostFocus = function (e) {
                _super.prototype.OnLostFocus.call(this, e);
                this.SetValueInternal(TabItem.IsFocusedProperty, false);
                this.UpdateVisualState();
            };
            TabItem.prototype.OnContentChanged = function (oldContent, newContent) {
                _super.prototype.OnContentChanged.call(this, oldContent, newContent);
                var parent = this.TabControlParent;
                if (!parent || !this.IsSelected)
                    return;
                parent.SelectedContent = newContent;
            };
            TabItem.prototype.OnKeyDown = function (e) {
                _super.prototype.OnKeyDown.call(this, e);
                if (e.Handled)
                    return;
                var parent = this.TabControlParent;
                var logicalKey = Fayde.Input.InteractionHelper.GetLogicalKey(this.FlowDirection, e.Key);
                var startIndex = parent.Items.IndexOf(this);
                var nextTabItem = null;
                switch (logicalKey) {
                    case Fayde.Input.Key.Left:
                    case Fayde.Input.Key.Up:
                        nextTabItem = this._FindPreviousTabItem(startIndex);
                        break;
                    case Fayde.Input.Key.Right:
                    case Fayde.Input.Key.Down:
                        nextTabItem = this._FindNextTabItem(startIndex);
                        break;
                    default:
                        return;
                }
                if (!nextTabItem || nextTabItem === parent.SelectedItem)
                    return;
                e.Handled = true;
                parent.SelectedItem = nextTabItem;
                nextTabItem.Focus();
            };
            TabItem.prototype.GetTemplate = function (isSelected, tabPlacement) {
                var e = isSelected ? this._SelectedElements : this._UnselectedElements;
                return e[Controls.Dock[tabPlacement]].Template;
            };
            TabItem.prototype._GetContentControl = function (isSelected, tabPlacement) {
                var e = isSelected ? this._SelectedElements : this._UnselectedElements;
                return e[Controls.Dock[tabPlacement]].Header;
            };
            TabItem.prototype._FindPreviousTabItem = function (startIndex) {
                for (var i = startIndex, items = this.TabControlParent.Items; i >= 0; i--) {
                    var tabItem = items.GetValueAt(i);
                    if (tabItem.IsEnabled && tabItem.Visibility === Fayde.Visibility.Visible)
                        return tabItem;
                }
                return null;
            };
            TabItem.prototype._FindNextTabItem = function (startIndex) {
                for (var i = startIndex, items = this.TabControlParent.Items, len = items.Count; i < len; i++) {
                    var tabItem = items.GetValueAt(i);
                    if (tabItem.IsEnabled && tabItem.Visibility === Fayde.Visibility.Visible)
                        return tabItem;
                }
                return null;
            };
            TabItem.HasHeaderProperty = DependencyProperty.Register("HasHeader", function () { return Boolean; }, TabItem, false);
            TabItem.HeaderProperty = DependencyProperty.Register("Header", function () { return Object; }, TabItem, null, function (d, args) { return d._OnHeaderChanged(args); });
            TabItem.HeaderTemplateProperty = DependencyProperty.Register("HeaderTemplate", function () { return Fayde.DataTemplate; }, TabItem, undefined, function (d, args) { return d.OnHeaderTemplateChanged(args.OldValue, args.NewValue); });
            TabItem.IsFocusedProperty = DependencyProperty.Register("IsFocused", function () { return Boolean; }, TabItem, false);
            TabItem.IsSelectedProperty = DependencyProperty.Register("IsSelected", function () { return Boolean; }, TabItem, false, function (d, args) { return d._OnIsSelectedChanged(args); });
            return TabItem;
        })(Controls.ContentControl);
        Controls.TabItem = TabItem;
        Controls.TemplateVisualStates(TabItem, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "MouseOver" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" }, { GroupName: "SelectionStates", Name: "Unselected" }, { GroupName: "SelectionStates", Name: "Selected" });
        Controls.TemplateParts(TabItem, { Name: "HeaderLeftSelected", Type: Fayde.FrameworkElement }, { Name: "HeaderTopSelected", Type: Fayde.FrameworkElement }, { Name: "HeaderRightSelected", Type: Fayde.FrameworkElement }, { Name: "HeaderBottomSelected", Type: Fayde.FrameworkElement }, { Name: "TemplateLeftSelected", Type: Fayde.FrameworkElement }, { Name: "TemplateTopSelected", Type: Fayde.FrameworkElement }, { Name: "TemplateRightSelected", Type: Fayde.FrameworkElement }, { Name: "TemplateBottomSelected", Type: Fayde.FrameworkElement }, { Name: "HeaderLeftUnselected", Type: Fayde.FrameworkElement }, { Name: "HeaderTopUnselected", Type: Fayde.FrameworkElement }, { Name: "HeaderRightUnselected", Type: Fayde.FrameworkElement }, { Name: "HeaderBottomUnselected", Type: Fayde.FrameworkElement }, { Name: "TemplateLeftUnselected", Type: Fayde.FrameworkElement }, { Name: "TemplateTopUnselected", Type: Fayde.FrameworkElement }, { Name: "TemplateRightUnselected", Type: Fayde.FrameworkElement }, { Name: "TemplateBottomUnselected", Type: Fayde.FrameworkElement });
        var Elements = (function () {
            function Elements() {
                this.Top = new Element();
                this.Bottom = new Element();
                this.Left = new Element();
                this.Right = new Element();
            }
            Elements.prototype.OnApplyTemplate = function (control, isSelected) {
                this.Top.OnApplyTemplate(control, isSelected, "Top");
                this.Bottom.OnApplyTemplate(control, isSelected, "Bottom");
                this.Left.OnApplyTemplate(control, isSelected, "Left");
                this.Right.OnApplyTemplate(control, isSelected, "Right");
            };
            return Elements;
        })();
        var Element = (function () {
            function Element() {
                this.Header = null;
                this.Template = null;
            }
            Element.prototype.OnApplyTemplate = function (control, isSelected, dock) {
                var post = dock + (isSelected ? "Selected" : "Unselected");
                this.Header = control.GetTemplateChild("Header" + post, Controls.ContentControl);
                this.Template = control.GetTemplateChild("Template" + post, Fayde.FrameworkElement);
            };
            return Element;
        })();
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var TimePicker = (function (_super) {
            __extends(TimePicker, _super);
            function TimePicker() {
                _super.call(this);
                this._HourTextBox = null;
                this._MinuteTextBox = null;
                this._SecondTextBox = null;
                this._SecondSeparator = null;
                this._SuffixTextBlock = null;
                this._HourGesture = new Controls.Internal.EventGesture();
                this._MinuteGesture = new Controls.Internal.EventGesture();
                this._SecondGesture = new Controls.Internal.EventGesture();
                this._SuffixGesture = new Controls.Internal.EventGesture();
                this._SelectionHandler = null;
                this.DefaultStyleKey = TimePicker;
                this.CoerceTime();
            }
            TimePicker.prototype.OnSelectedHourChanged = function (args) {
                this.CoerceHour(args.NewValue);
                this.CoerceTime();
            };
            TimePicker.prototype.OnSelectedMinuteChanged = function (args) {
                this.CoerceMinute(args.NewValue);
                this.CoerceTime();
            };
            TimePicker.prototype.OnSelectedSecondChanged = function (args) {
                this.CoerceSecond(args.NewValue);
                this.CoerceTime();
            };
            TimePicker.prototype.OnSelectedTimeChanged = function (args) {
                var ts = args.NewValue;
                if (ts instanceof TimeSpan) {
                    this.CoerceHour(ts.Hours);
                    this.CoerceMinute(ts.Minutes);
                    this.CoerceSecond(ts.Seconds);
                }
                else {
                    this.CoerceHour(NaN);
                    this.CoerceMinute(NaN);
                    this.CoerceSecond(NaN);
                }
            };
            TimePicker.prototype.OnDisplayModeChanged = function (args) {
                this._UpdateText();
            };
            TimePicker.prototype.OnApplyTemplate = function () {
                var _this = this;
                _super.prototype.OnApplyTemplate.call(this);
                this._HourGesture.Detach();
                this._HourTextBox = this.GetTemplateChild("HourTextBox", Controls.TextBox);
                if (this._HourTextBox)
                    this._HourGesture.Attach(this._HourTextBox.LostFocus, function (tb) { return _this.CoerceHour(_this._GetHourInput()); });
                this._MinuteGesture.Detach();
                this._MinuteTextBox = this.GetTemplateChild("MinuteTextBox", Controls.TextBox);
                if (this._MinuteTextBox)
                    this._MinuteGesture.Attach(this._MinuteTextBox.LostFocus, function (tb) { return _this.CoerceMinute(tb.Text); });
                this._SecondGesture.Detach();
                this._SecondTextBox = this.GetTemplateChild("SecondTextBox", Controls.TextBox);
                if (this._SecondTextBox)
                    this._SecondGesture.Attach(this._SecondTextBox.LostFocus, function (tb) { return _this.CoerceSecond(tb.Text); });
                this._SecondSeparator = this.GetTemplateChild("SecondSeparator", Fayde.FrameworkElement);
                this._SuffixGesture.Detach();
                this._SuffixTextBlock = this.GetTemplateChild("SuffixTextBlock", Controls.TextBlock);
                if (this._SuffixTextBlock)
                    this._SuffixGesture.Attach(this._SuffixTextBlock.MouseLeftButtonUp, function (tb) { return _this.ToggleAmPm(); });
                if (this._SelectionHandler)
                    this._SelectionHandler.Dispose();
                this._SelectionHandler = new Controls.Internal.SelectionHandler([this._HourTextBox, this._MinuteTextBox, this._SecondTextBox]);
                this._UpdateText();
            };
            TimePicker.prototype._GetHourInput = function () {
                var text = this._HourTextBox.Text;
                if (this.DisplayMode === Controls.TimeDisplayMode.Military)
                    return text;
                var h = parseFloat(text);
                var isa = !!this._SuffixTextBlock && this._SuffixTextBlock.Text === "AM";
                if (isa && h === 12)
                    return "00";
                if (!isa && h < 12)
                    return (h + 12).toString();
                return text;
            };
            TimePicker.prototype.CoerceHour = function (hour) {
                hour = Math.max(0, Math.min(23, hour));
                hour = hour || 0;
                this.SetCurrentValue(TimePicker.SelectedHourProperty, hour);
                this._UpdateText();
            };
            TimePicker.prototype.CoerceMinute = function (minute) {
                minute = Math.max(0, Math.min(59, minute));
                minute = minute || 0;
                this.SetCurrentValue(TimePicker.SelectedMinuteProperty, minute);
                this._UpdateText();
            };
            TimePicker.prototype.CoerceSecond = function (second) {
                second = Math.max(0, Math.min(59, second));
                second = second || 0;
                this.SetCurrentValue(TimePicker.SelectedSecondProperty, second);
                this._UpdateText();
            };
            TimePicker.prototype.CoerceTime = function () {
                var ts = new TimeSpan(this.SelectedHour, this.SelectedMinute, this.SelectedSecond);
                var old = this.SelectedTime;
                if (!!old && ts.CompareTo(old) === 0)
                    return;
                this.SetCurrentValue(TimePicker.SelectedTimeProperty, ts);
            };
            TimePicker.prototype.ToggleAmPm = function () {
                var hour = this.SelectedHour;
                if (hour >= 12)
                    hour -= 12;
                else
                    hour += 12;
                this.CoerceHour(hour);
            };
            TimePicker.prototype._UpdateText = function () {
                var isMilitary = this.DisplayMode === Controls.TimeDisplayMode.Military;
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
                    this._SecondTextBox.Visibility = isSecondShown ? Fayde.Visibility.Visible : Fayde.Visibility.Collapsed;
                }
                if (this._SecondSeparator)
                    this._SecondSeparator.Visibility = isSecondShown ? Fayde.Visibility.Visible : Fayde.Visibility.Collapsed;
                if (this._SuffixTextBlock) {
                    this._SuffixTextBlock.Visibility = isMilitary ? Fayde.Visibility.Collapsed : Fayde.Visibility.Visible;
                    this._SuffixTextBlock.Text = h >= 12 ? "PM" : "AM";
                }
            };
            TimePicker.SelectedHourProperty = DependencyProperty.Register("SelectedHour", function () { return Number; }, TimePicker, 0, function (d, args) { return d.OnSelectedHourChanged(args); });
            TimePicker.SelectedMinuteProperty = DependencyProperty.Register("SelectedMinute", function () { return Number; }, TimePicker, 0, function (d, args) { return d.OnSelectedMinuteChanged(args); });
            TimePicker.SelectedSecondProperty = DependencyProperty.Register("SelectedSecond", function () { return Number; }, TimePicker, 0, function (d, args) { return d.OnSelectedSecondChanged(args); });
            TimePicker.SelectedTimeProperty = DependencyProperty.Register("SelectedTime", function () { return TimeSpan; }, TimePicker, undefined, function (d, args) { return d.OnSelectedTimeChanged(args); });
            TimePicker.IsSecondsShownProperty = DependencyProperty.Register("IsSecondsShown", function () { return Boolean; }, TimePicker, true, function (d, args) { return d._UpdateText(); });
            TimePicker.DisplayModeProperty = DependencyProperty.Register("DisplayMode", function () { return new Fayde.Enum(Controls.TimeDisplayMode); }, TimePicker, Controls.TimeDisplayMode.Regular, function (d, args) { return d.OnDisplayModeChanged(args); });
            return TimePicker;
        })(Controls.Control);
        Controls.TimePicker = TimePicker;
        Controls.TemplateParts(TimePicker, { Name: "HourTextBox", Type: Controls.TextBox }, { Name: "MinuteTextBox", Type: Controls.TextBox }, { Name: "SecondTextBox", Type: Controls.TextBox }, { Name: "SecondSeparator", Type: Fayde.FrameworkElement }, { Name: "SuffixTextBlock", Type: Controls.TextBlock });
        Controls.TemplateVisualStates(TimePicker, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "ValidationStates", Name: "Valid" }, { GroupName: "ValidationStates", Name: "InvalidFocused" }, { GroupName: "ValidationStates", Name: "InvalidUnfocused" });
        function formatNumber(n, digits, fallback) {
            if (isNaN(n))
                return fallback;
            return Fayde.Localization.Format("{0:d" + digits + "}", n);
        }
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ScrollEx = Controls.Internal.ScrollEx;
        var TreeView = (function (_super) {
            __extends(TreeView, _super);
            function TreeView() {
                _super.call(this);
                this.SelectedItemChanged = new Fayde.RoutedPropertyChangedEvent();
                this.DefaultStyleKey = TreeView;
                this.ItemsControlHelper = new Controls.Internal.ItemsControlHelper(this);
            }
            TreeView.prototype.OnSelectedItemChanged = function (e) {
                if (this._IgnorePropertyChange)
                    this._IgnorePropertyChange = false;
                else if (!this._AllowWrite) {
                    this._IgnorePropertyChange = true;
                    this.SetValue(TreeView.SelectedItemProperty, e.OldValue);
                    throw new InvalidOperationException("Cannot set read-only property SelectedItem.");
                }
                else
                    this.UpdateSelectedValue(e.NewValue);
            };
            TreeView.prototype.OnSelectedValueChanged = function (e) {
                if (this._IgnorePropertyChange) {
                    this._IgnorePropertyChange = false;
                }
                else {
                    if (this._AllowWrite)
                        return;
                    this._IgnorePropertyChange = true;
                    this.SetValue(TreeView.SelectedValueProperty, e.OldValue);
                    throw new InvalidOperationException("Cannot set read-only property SelectedValue.");
                }
            };
            TreeView.prototype.OnSelectedValuePathChanged = function (e) {
                this.UpdateSelectedValue(this.SelectedItem);
            };
            TreeView.prototype.OnItemContainerStyleChanged = function (e) {
                this.ItemsControlHelper.UpdateItemContainerStyle(e.NewValue);
            };
            TreeView.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                this.ItemsControlHelper.OnApplyTemplate();
                this.UpdateVisualState(false);
            };
            TreeView.prototype.GetContainerForItem = function () {
                return new Controls.TreeViewItem();
            };
            TreeView.prototype.IsItemItsOwnContainer = function (item) {
                return item instanceof Controls.TreeViewItem;
            };
            TreeView.prototype.PrepareContainerForItem = function (element, item) {
                var treeViewItem = element;
                if (treeViewItem instanceof Controls.TreeViewItem)
                    treeViewItem.ParentItemsControl = this;
                Controls.Internal.ItemsControlHelper.PrepareContainerForItemOverride(element, this.ItemContainerStyle);
                Controls.HeaderedItemsControl.PrepareHeaderedItemsControlContainer(treeViewItem, item, this, this.ItemContainerStyle);
                _super.prototype.PrepareContainerForItem.call(this, element, item);
            };
            TreeView.prototype.ClearContainerForItem = function (element, item) {
                var treeViewItem = element;
                if (treeViewItem instanceof Controls.TreeViewItem)
                    treeViewItem.ParentItemsControl = null;
                _super.prototype.ClearContainerForItem.call(this, element, item);
            };
            TreeView.prototype.OnItemsChanged = function (e) {
                if (!e)
                    throw new ArgumentException("e");
                _super.prototype.OnItemsChanged.call(this, e);
                if (e.NewItems != null) {
                    for (var i = 0, items = e.NewItems, len = items.length; i < len; i++) {
                        items[i].ParentItemsControl = this;
                    }
                }
                switch (e.Action) {
                    case Fayde.Collections.CollectionChangedAction.Remove:
                    case Fayde.Collections.CollectionChangedAction.Reset:
                        if (this.SelectedItem != null && !this.IsSelectedContainerHookedUp)
                            this.SelectFirstItem();
                        break;
                    case Fayde.Collections.CollectionChangedAction.Replace:
                        var selectedItem = this.SelectedItem;
                        if (selectedItem != null && (e.OldItems == null || nullstone.equals(selectedItem, e.OldItems[0])))
                            this.ChangeSelection(selectedItem, this.SelectedContainer, false);
                        break;
                }
                if (!e.OldItems)
                    return;
                for (var i = 0, items = e.OldItems, len = items.length; i < len; i++) {
                    items[i].ParentItemsControl = null;
                }
            };
            TreeView.prototype.CheckForSelectedDescendents = function (item) {
                var stack = [];
                stack.push(item);
                while (stack.length > 0) {
                    var container = stack.pop();
                    if (container.IsSelected) {
                        container.IgnorePropertyChange = true;
                        container.IsSelected = false;
                        this.ChangeSelection(container, container, true);
                        if (this.SelectedContainer.ParentItemsControl == null)
                            this.SelectedContainer.RequiresContainsSelectionUpdate = true;
                    }
                    var enumerator = container.Items.getEnumerator();
                    while (enumerator.moveNext())
                        stack.push(enumerator.current);
                }
            };
            TreeView.prototype.PropagateKeyDown = function (e) {
                this.OnKeyDown(e);
            };
            TreeView.prototype.OnKeyDown = function (e) {
                _super.prototype.OnKeyDown.call(this, e);
                if (e.Handled || !this.IsEnabled)
                    return;
                if (Fayde.Input.Keyboard.HasControl()) {
                    switch (e.Key) {
                        case Fayde.Input.Key.PageUp:
                        case Fayde.Input.Key.PageDown:
                        case Fayde.Input.Key.End:
                        case Fayde.Input.Key.Home:
                        case Fayde.Input.Key.Left:
                        case Fayde.Input.Key.Up:
                        case Fayde.Input.Key.Right:
                        case Fayde.Input.Key.Down:
                            if (ScrollEx.HandleKey(this.ItemsControlHelper.ScrollHost, e.Key, this.FlowDirection))
                                e.Handled = true;
                            break;
                    }
                }
                else {
                    switch (e.Key) {
                        case Fayde.Input.Key.PageUp:
                        case Fayde.Input.Key.PageDown:
                            if (this.SelectedContainer != null) {
                                if (!this.HandleScrollByPage(e.Key === Fayde.Input.Key.PageUp))
                                    break;
                                e.Handled = true;
                                break;
                            }
                            else {
                                if (!this.FocusFirstItem())
                                    break;
                                e.Handled = true;
                                break;
                            }
                        case Fayde.Input.Key.End:
                            if (!this.FocusLastItem())
                                break;
                            e.Handled = true;
                            break;
                        case Fayde.Input.Key.Home:
                            if (!this.FocusFirstItem())
                                break;
                            e.Handled = true;
                            break;
                        case Fayde.Input.Key.Up:
                        case Fayde.Input.Key.Down:
                            if (this.SelectedContainer != null || !this.FocusFirstItem())
                                break;
                            e.Handled = true;
                            break;
                    }
                }
            };
            TreeView.prototype.HandleScrollByPage = function (up) {
                var scrollHost = this.ItemsControlHelper.ScrollHost;
                if (scrollHost != null) {
                    var viewportHeight = scrollHost.ViewportHeight;
                    var top = { Value: 0 };
                    var bottom = { Value: 0 };
                    ScrollEx.GetTopAndBottom(this.SelectedContainer.HeaderElement || this.SelectedContainer, scrollHost, top, bottom);
                    var tvi1 = null;
                    var tvi2 = this.SelectedContainer;
                    var itemsControl = this.SelectedContainer.ParentItemsControl;
                    if (itemsControl != null) {
                        if (up) {
                            for (var parentItemsControl; itemsControl !== this; itemsControl = parentItemsControl) {
                                var tvi3 = itemsControl;
                                if (tvi3 != null) {
                                    parentItemsControl = tvi3.ParentItemsControl;
                                    if (!parentItemsControl)
                                        break;
                                    tvi2 = tvi3;
                                }
                                break;
                            }
                        }
                        var index = itemsControl.ItemContainersManager.IndexFromContainer(tvi2);
                        var count = itemsControl.Items.Count;
                        while (itemsControl != null && tvi2 != null) {
                            if (tvi2.IsEnabled) {
                                var currentDelta = { Value: 0 };
                                if (tvi2.HandleScrollByPage(up, scrollHost, viewportHeight, top.Value, bottom.Value, currentDelta))
                                    return true;
                                if (NumberEx.IsGreaterThanClose(currentDelta.Value, viewportHeight)) {
                                    if (tvi1 === this.SelectedContainer || tvi1 == null) {
                                        if (!up)
                                            return this.SelectedContainer.HandleDownKey();
                                        return this.SelectedContainer.HandleUpKey();
                                    }
                                    break;
                                }
                                else
                                    tvi1 = tvi2;
                            }
                            index += up ? -1 : 1;
                            if (0 <= index && index < count) {
                                tvi2 = itemsControl.ItemContainersManager.ContainerFromIndex(index);
                                if (!(tvi2 instanceof Controls.TreeViewItem))
                                    tvi2 = null;
                            }
                            else if (itemsControl === this) {
                                tvi2 = null;
                            }
                            else {
                                while (itemsControl != null) {
                                    var tvi3 = itemsControl instanceof Controls.TreeViewItem ? itemsControl : null;
                                    itemsControl = tvi3.ParentItemsControl;
                                    if (itemsControl != null) {
                                        count = itemsControl.Items.Count;
                                        index = itemsControl.ItemContainersManager.IndexFromContainer(tvi3) + (up ? -1 : 1);
                                        if (index > -1 && index < count) {
                                            tvi2 = itemsControl.ItemContainersManager.ContainerFromIndex(index);
                                            if (!(tvi2 instanceof Controls.TreeViewItem))
                                                tvi2 = null;
                                            break;
                                        }
                                        else if (itemsControl == this) {
                                            tvi2 = null;
                                            itemsControl = null;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (tvi1 != null) {
                        if (up) {
                            if (tvi1 !== this.SelectedContainer)
                                return tvi1.Focus();
                        }
                        else
                            tvi1.FocusInto();
                    }
                }
                return false;
            };
            TreeView.prototype.OnMouseEnter = function (e) {
                _super.prototype.OnMouseEnter.call(this, e);
                this.UpdateVisualState();
            };
            TreeView.prototype.OnMouseLeave = function (e) {
                _super.prototype.OnMouseLeave.call(this, e);
                this.UpdateVisualState();
            };
            TreeView.prototype.OnMouseMove = function (e) {
                _super.prototype.OnMouseMove.call(this, e);
                this.UpdateVisualState();
            };
            TreeView.prototype.OnMouseLeftButtonDown = function (e) {
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
                if (!e.Handled && this.HandleMouseButtonDown())
                    e.Handled = true;
                this.UpdateVisualState();
            };
            TreeView.prototype.HandleMouseButtonDown = function () {
                if (!this.SelectedContainer)
                    return false;
                if (!this.SelectedContainer.IsFocused)
                    this.SelectedContainer.Focus();
                return true;
            };
            TreeView.prototype.OnMouseLeftButtonUp = function (e) {
                _super.prototype.OnMouseLeftButtonUp.call(this, e);
                this.UpdateVisualState();
            };
            TreeView.prototype.OnGotFocus = function (e) {
                _super.prototype.OnGotFocus.call(this, e);
                this.UpdateVisualState();
            };
            TreeView.prototype.OnLostFocus = function (e) {
                _super.prototype.OnLostFocus.call(this, e);
                this.UpdateVisualState();
            };
            TreeView.prototype.ChangeSelection = function (itemOrContainer, container, selected) {
                if (this.IsSelectionChangeActive)
                    return;
                var oldValue = null;
                var newValue = null;
                var flag = false;
                var selContainer = this.SelectedContainer;
                this.IsSelectionChangeActive = true;
                try {
                    if (selected && container !== selContainer) {
                        oldValue = this.SelectedItem;
                        if (selContainer != null) {
                            selContainer.IsSelected = false;
                            selContainer.UpdateContainsSelection(false);
                        }
                        newValue = itemOrContainer;
                        this.SelectedContainer = container;
                        this.SelectedContainer.UpdateContainsSelection(true);
                        this.SelectedItem = itemOrContainer;
                        this.UpdateSelectedValue(itemOrContainer);
                        flag = true;
                        this.ItemsControlHelper.ScrollIntoView(container.HeaderElement || container);
                    }
                    else if (!selected && container === selContainer) {
                        this.SelectedContainer.UpdateContainsSelection(false);
                        this.SelectedContainer = null;
                        this.SelectedItem = null;
                        this.SelectedValue = null;
                        oldValue = itemOrContainer;
                        flag = true;
                    }
                    container.IsSelected = selected;
                }
                finally {
                    this.IsSelectionChangeActive = false;
                }
                if (!flag)
                    return;
                this.SelectedItemChanged.raise(this, new Fayde.RoutedPropertyChangedEventArgs(oldValue, newValue));
            };
            TreeView.prototype.UpdateSelectedValue = function (item) {
                if (!item) {
                    this.ClearValue(TreeView.SelectedValueProperty);
                    return;
                }
                var selectedValuePath = this.SelectedValuePath;
                if (!selectedValuePath) {
                    this.SelectedValue = item;
                }
                else {
                    var binding = new Fayde.Data.Binding(selectedValuePath);
                    binding.Source = item;
                    var contentControl = new Controls.ContentControl();
                    contentControl.SetBinding(Controls.ContentControl.ContentProperty, binding);
                    this.SelectedValue = contentControl.Content;
                    contentControl.ClearValue(Controls.ContentControl.ContentProperty);
                }
            };
            TreeView.prototype.SelectFirstItem = function () {
                var container = this.ItemContainersManager.ContainerFromIndex(0);
                var selected = container instanceof Controls.TreeViewItem;
                if (!selected)
                    container = this.SelectedContainer;
                this.ChangeSelection(selected ? this.ItemContainersManager.ItemFromContainer(container) : this.SelectedItem, container, selected);
            };
            TreeView.prototype.FocusFirstItem = function () {
                var tvi = this.ItemContainersManager.ContainerFromIndex(0);
                if (!tvi)
                    return false;
                if (!tvi.IsEnabled || !tvi.Focus())
                    return tvi.FocusDown();
                return true;
            };
            TreeView.prototype.FocusLastItem = function () {
                for (var index = this.Items.Count - 1; index >= 0; --index) {
                    var tvi = this.ItemContainersManager.ContainerFromIndex(index);
                    if (tvi instanceof Controls.TreeViewItem && tvi.IsEnabled)
                        return tvi.FocusInto();
                }
                return false;
            };
            TreeView.SelectedItemProperty = DependencyProperty.Register("SelectedItem", function () { return Object; }, TreeView, null, function (d, args) { return d.OnSelectedItemChanged(args); });
            TreeView.SelectedValueProperty = DependencyProperty.Register("SelectedValue", function () { return Object; }, TreeView, null, function (d, args) { return d.OnSelectedValueChanged(args); });
            TreeView.SelectedValuePathProperty = DependencyProperty.Register("SelectedValuePath", function () { return String; }, TreeView, "", function (d, args) { return d.OnSelectedValuePathChanged(args); });
            TreeView.ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", function () { return Fayde.Style; }, TreeView, null, function (d, args) { return d.OnItemContainerStyleChanged(args); });
            return TreeView;
        })(Controls.ItemsControl);
        Controls.TreeView = TreeView;
        Controls.TemplateVisualStates(TreeView, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "MouseOver" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" }, { GroupName: "ValidationStates", Name: "Valid" }, { GroupName: "ValidationStates", Name: "InvalidUnfocused" }, { GroupName: "ValidationStates", Name: "InvalidFocused" });
        Object.defineProperty(TreeView.prototype, "SelectedValue", {
            get: function () {
                return this.GetValue(TreeView.SelectedValueProperty);
            },
            set: function (value) {
                try {
                    this._AllowWrite = true;
                    this.SetValue(TreeView.SelectedValueProperty, value);
                }
                finally {
                    this._AllowWrite = false;
                }
            }
        });
        Object.defineProperty(TreeView.prototype, "SelectedItem", {
            get: function () {
                return this.GetValue(TreeView.SelectedItemProperty);
            },
            set: function (value) {
                try {
                    this._AllowWrite = true;
                    this.SetValue(TreeView.SelectedItemProperty, value);
                }
                finally {
                    this._AllowWrite = false;
                }
            }
        });
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ScrollExtensions = Controls.Internal.ScrollEx;
        var TreeViewItem = (function (_super) {
            __extends(TreeViewItem, _super);
            function TreeViewItem() {
                _super.call(this);
                this.Collapsed = new Fayde.RoutedEvent();
                this.Expanded = new Fayde.RoutedEvent();
                this.Selected = new Fayde.RoutedEvent();
                this.Unselected = new Fayde.RoutedEvent();
                this._AllowWrite = false;
                this._MultiClick = new Controls.Internal.MultiClickHelper();
                this._IsPressed = false;
                this.DefaultStyleKey = TreeViewItem;
            }
            TreeViewItem.prototype.$SetHasItems = function (value) {
                try {
                    this._AllowWrite = true;
                    this.SetCurrentValue(TreeViewItem.HasItemsProperty, value);
                }
                finally {
                    this._AllowWrite = false;
                }
            };
            TreeViewItem.prototype.$SetIsSelectionActive = function (value) {
                try {
                    this._AllowWrite = true;
                    this.SetCurrentValue(TreeViewItem.IsSelectionActiveProperty, value === true);
                }
                finally {
                    this._AllowWrite = false;
                }
            };
            TreeViewItem.prototype.OnHasItemsChanged = function (e) {
                if (this.IgnorePropertyChange)
                    this.IgnorePropertyChange = false;
                else if (!this._AllowWrite) {
                    this.IgnorePropertyChange = true;
                    this.SetCurrentValue(TreeViewItem.HasItemsProperty, e.OldValue);
                    throw new InvalidOperationException("Cannot set read-only property HasItems.");
                }
                else
                    this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnIsExpandedPropertyChanged = function (e) {
                var newValue = e.NewValue === true;
                if (newValue)
                    this.OnExpanded(new Fayde.RoutedEventArgs());
                else
                    this.OnCollapsed(new Fayde.RoutedEventArgs());
                if (newValue) {
                    if (this.ExpansionStateGroup != null || !this.UserInitiatedExpansion)
                        return;
                    this.UserInitiatedExpansion = false;
                    var parentTreeView = this.ParentTreeView;
                    if (!parentTreeView)
                        return;
                    parentTreeView.ItemsControlHelper.ScrollIntoView(this);
                }
                else {
                    if (!this.ContainsSelection)
                        return;
                    this.Focus();
                }
            };
            TreeViewItem.prototype.OnIsSelectedChanged = function (e) {
                if (this.IgnorePropertyChange) {
                    this.IgnorePropertyChange = false;
                }
                else if (e.NewValue === true) {
                    this.Select(true);
                    this.OnSelected(new Fayde.RoutedEventArgs());
                }
                else {
                    this.Select(false);
                    this.OnUnselected(new Fayde.RoutedEventArgs());
                }
            };
            TreeViewItem.prototype.OnIsSelectionActiveChanged = function (e) {
                if (this.IgnorePropertyChange)
                    this.IgnorePropertyChange = false;
                else if (!this._AllowWrite) {
                    this.IgnorePropertyChange = true;
                    this.SetValueInternal(TreeViewItem.IsSelectionActiveProperty, e.OldValue);
                    throw new InvalidOperationException("Cannot set read-only property IsSelectionActive.");
                }
                else
                    this.UpdateVisualState();
            };
            Object.defineProperty(TreeViewItem.prototype, "ExpanderButton", {
                get: function () { return this._expanderButton; },
                set: function (value) {
                    if (this._expanderButton) {
                        this._expanderButton.Click.off(this.OnExpanderClick, this);
                        this._expanderButton.GotFocus.off(this.OnExpanderGotFocus, this);
                    }
                    this._expanderButton = value;
                    if (this._expanderButton) {
                        this._expanderButton.IsChecked = this.IsExpanded;
                        this._expanderButton.Click.on(this.OnExpanderClick, this);
                        this._expanderButton.GotFocus.on(this.OnExpanderGotFocus, this);
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TreeViewItem.prototype, "HeaderElement", {
                get: function () { return this._headerElement; },
                set: function (value) {
                    if (this._headerElement)
                        this._headerElement.MouseLeftButtonDown.off(this.OnHeaderMouseLeftButtonDown, this);
                    this._headerElement = value;
                    if (this._headerElement)
                        this._headerElement.MouseLeftButtonDown.on(this.OnHeaderMouseLeftButtonDown, this);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TreeViewItem.prototype, "ExpansionStateGroup", {
                get: function () { return this._expansionStateGroup; },
                set: function (value) {
                    if (this._expansionStateGroup)
                        this._expansionStateGroup.CurrentStateChanged.off(this.OnExpansionStateGroupStateChanged, this);
                    this._expansionStateGroup = value;
                    if (this._expansionStateGroup)
                        this._expansionStateGroup.CurrentStateChanged.on(this.OnExpansionStateGroupStateChanged, this);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TreeViewItem.prototype, "ParentItemsControl", {
                get: function () { return this._parentItemsControl; },
                set: function (value) {
                    if (this._parentItemsControl == value)
                        return;
                    this._parentItemsControl = value;
                    var parentTreeView = this.ParentTreeView;
                    if (parentTreeView == null)
                        return;
                    if (this.RequiresContainsSelectionUpdate) {
                        this.RequiresContainsSelectionUpdate = false;
                        this.UpdateContainsSelection(true);
                    }
                    parentTreeView.CheckForSelectedDescendents(this);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TreeViewItem.prototype, "ParentTreeViewItem", {
                get: function () {
                    var pic = this.ParentItemsControl;
                    if (pic instanceof TreeViewItem)
                        return pic;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TreeViewItem.prototype, "ParentTreeView", {
                get: function () {
                    for (var tvi = this; tvi != null; tvi = tvi.ParentTreeViewItem) {
                        var treeView = tvi.ParentItemsControl;
                        if (treeView instanceof Controls.TreeView)
                            return treeView;
                    }
                    return null;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TreeViewItem.prototype, "IsRoot", {
                get: function () { return this.ParentItemsControl instanceof Controls.TreeView; },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(TreeViewItem.prototype, "CanExpandOnInput", {
                get: function () { return this.HasItems && this.IsEnabled; },
                enumerable: true,
                configurable: true
            });
            TreeViewItem.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                this.ExpanderButton = this.GetTemplateChild("ExpanderButton", Controls.Primitives.ToggleButton);
                this.HeaderElement = this.GetTemplateChild("Header", Fayde.FrameworkElement);
                this.ExpansionStateGroup = Fayde.Media.VSM.VisualStateManager.GetGroup(this, "ExpansionStates");
                this.UpdateVisualState(false);
            };
            TreeViewItem.prototype.OnExpansionStateGroupStateChanged = function (sender, e) {
                if (e.NewState.Name && e.NewState.Name.toLowerCase() === "expanded")
                    this.BringIntoView();
            };
            TreeViewItem.prototype.BringIntoView = function () {
                var _this = this;
                if (!this.UserInitiatedExpansion)
                    return;
                this.UserInitiatedExpansion = false;
                var parent = this.ParentTreeView;
                if (!parent)
                    return;
                setTimeout(function () {
                    parent.ItemsControlHelper.ScrollIntoView(_this);
                }, 1);
            };
            TreeViewItem.prototype.GoToStates = function (gotoFunc) {
                _super.prototype.GoToStates.call(this, gotoFunc);
                this.GoToStateExpansion(gotoFunc);
                this.GoToStateHasItems(gotoFunc);
                this.GoToStateSelection(gotoFunc);
            };
            TreeViewItem.prototype.GoToStateCommon = function (gotoFunc) {
                if (!this.IsEnabled)
                    return gotoFunc("Disabled");
                if (this._IsPressed)
                    return gotoFunc("Pressed");
                if (this.IsMouseOver)
                    return gotoFunc("MouseOver");
                return gotoFunc("Normal");
            };
            TreeViewItem.prototype.GoToStateExpansion = function (gotoFunc) {
                return gotoFunc(this.IsExpanded ? "Expanded" : "Collapsed");
            };
            TreeViewItem.prototype.GoToStateHasItems = function (gotoFunc) {
                return gotoFunc(this.HasItems ? "HasItems" : "NoItems");
            };
            TreeViewItem.prototype.GoToStateSelection = function (gotoFunc) {
                if (!this.IsSelected)
                    return gotoFunc("Unselected");
                if (!this.IsSelectionActive)
                    return gotoFunc("SelectedInactive");
                return gotoFunc("Selected");
            };
            TreeViewItem.prototype.GetContainerForItem = function () {
                return new TreeViewItem();
            };
            TreeViewItem.prototype.IsItemItsOwnContainer = function (item) {
                return item instanceof TreeViewItem;
            };
            TreeViewItem.prototype.PrepareContainerForItem = function (element, item) {
                var treeViewItem = element;
                if (treeViewItem instanceof TreeViewItem)
                    treeViewItem.ParentItemsControl = this;
                _super.prototype.PrepareContainerForItem.call(this, element, item);
            };
            TreeViewItem.prototype.ClearContainerForItem = function (element, item) {
                var treeViewItem = element;
                if (treeViewItem instanceof TreeViewItem)
                    treeViewItem.ParentItemsControl = null;
                _super.prototype.ClearContainerForItem.call(this, element, item);
            };
            TreeViewItem.prototype.OnItemsChanged = function (e) {
                _super.prototype.OnItemsChanged.call(this, e);
                this.$SetHasItems(this.Items.Count > 0);
                if (e.NewItems != null) {
                    for (var i = 0, items = e.NewItems, len = items.length; i < len; i++) {
                        items[i].ParentItemsControl = this;
                    }
                }
                switch (e.Action) {
                    case Fayde.Collections.CollectionChangedAction.Remove:
                    case Fayde.Collections.CollectionChangedAction.Reset:
                        if (this.ContainsSelection) {
                            var parentTreeView = this.ParentTreeView;
                            if (parentTreeView != null && !parentTreeView.IsSelectedContainerHookedUp) {
                                this.ContainsSelection = false;
                                this.Select(true);
                            }
                        }
                        break;
                    case Fayde.Collections.CollectionChangedAction.Replace:
                        if (this.ContainsSelection) {
                            var parentTreeView = this.ParentTreeView;
                            if (parentTreeView != null) {
                                var selectedItem = parentTreeView.SelectedItem;
                                if (selectedItem != null && (e.OldItems == null || nullstone.equals(selectedItem, e.OldItems[0])))
                                    parentTreeView.ChangeSelection(selectedItem, parentTreeView.SelectedContainer, false);
                            }
                        }
                        break;
                }
                if (e.OldItems == null)
                    return;
                for (var i = 0, items = e.OldItems, len = items.length; i < len; i++) {
                    items[i].ParentItemsControl = null;
                }
            };
            TreeViewItem.prototype.OnExpanded = function (e) {
                this.ToggleExpanded();
                this.Expanded.raise(this, e);
            };
            TreeViewItem.prototype.OnCollapsed = function (e) {
                this.ToggleExpanded();
                this.Collapsed.raise(this, e);
            };
            TreeViewItem.prototype.ToggleExpanded = function () {
                var expanderButton = this.ExpanderButton;
                if (!expanderButton)
                    return;
                expanderButton.IsChecked = this.IsExpanded;
                this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnSelected = function (e) {
                this.UpdateVisualState();
                this.Selected.raise(this, e);
            };
            TreeViewItem.prototype.OnUnselected = function (e) {
                this.UpdateVisualState();
                this.Unselected.raise(this, e);
            };
            TreeViewItem.prototype.OnGotFocus = function (e) {
                _super.prototype.OnGotFocus.call(this, e);
                var parentTreeViewItem = this.ParentTreeViewItem;
                if (parentTreeViewItem)
                    parentTreeViewItem.CancelGotFocusBubble = true;
                try {
                    if (!this.IsEnabled || this.CancelGotFocusBubble)
                        return;
                    this.Select(true);
                    this.$SetIsSelectionActive(true);
                    this.UpdateVisualState();
                }
                finally {
                    this.CancelGotFocusBubble = false;
                }
            };
            TreeViewItem.prototype.OnLostFocus = function (e) {
                _super.prototype.OnLostFocus.call(this, e);
                this.$SetIsSelectionActive(false);
                this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnExpanderGotFocus = function (sender, e) {
                this.CancelGotFocusBubble = true;
                this.$SetIsSelectionActive(true);
                this.UpdateVisualState(true);
            };
            TreeViewItem.prototype.OnMouseEnter = function (e) {
                _super.prototype.OnMouseEnter.call(this, e);
                this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnMouseLeave = function (e) {
                _super.prototype.OnMouseLeave.call(this, e);
                this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnHeaderMouseLeftButtonDown = function (sender, e) {
                this._MultiClick.OnMouseLeftButtonDown(this, e);
                if (!e.Handled && this.IsEnabled) {
                    if (this.Focus())
                        e.Handled = true;
                    if (this._MultiClick.ClickCount % 2 === 0) {
                        var isExpanded = this.IsExpanded;
                        this.UserInitiatedExpansion = this.UserInitiatedExpansion || !isExpanded;
                        this.IsExpanded = !isExpanded;
                        e.Handled = true;
                    }
                }
                this.OnMouseLeftButtonDown(e);
                this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnExpanderClick = function (sender, e) {
                var isExpanded = this.IsExpanded;
                this.UserInitiatedExpansion = this.UserInitiatedExpansion || !isExpanded;
                this.IsExpanded = !isExpanded;
            };
            TreeViewItem.prototype.OnMouseLeftButtonDown = function (e) {
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
                var parentTreeView;
                if (!e.Handled && (parentTreeView = this.ParentTreeView) != null && parentTreeView.HandleMouseButtonDown())
                    e.Handled = true;
                this._IsPressed = true;
                this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnMouseLeftButtonUp = function (e) {
                _super.prototype.OnMouseLeftButtonUp.call(this, e);
                this._IsPressed = false;
                this.UpdateVisualState();
            };
            TreeViewItem.prototype.OnIsEnabledChanged = function (e) {
                _super.prototype.OnIsEnabledChanged.call(this, e);
                if (!e.NewValue)
                    this._IsPressed = false;
            };
            TreeViewItem.prototype.OnKeyDown = function (e) {
                _super.prototype.OnKeyDown.call(this, e);
                if (this.IsEnabled) {
                    if (e.Handled)
                        return;
                    var isRTL = this.FlowDirection === Fayde.FlowDirection.RightToLeft;
                    switch (e.Key) {
                        case Fayde.Input.Key.Left:
                            if (!Fayde.Input.Keyboard.HasControl() && (isRTL ? this.HandleRightKey() : this.HandleLeftKey()))
                                e.Handled = true;
                            break;
                        case Fayde.Input.Key.Up:
                            if (!Fayde.Input.Keyboard.HasControl() && this.HandleUpKey())
                                e.Handled = true;
                            break;
                        case Fayde.Input.Key.Right:
                            if (!Fayde.Input.Keyboard.HasControl() && (isRTL ? this.HandleLeftKey() : this.HandleRightKey()))
                                e.Handled = true;
                            break;
                        case Fayde.Input.Key.Down:
                            if (!Fayde.Input.Keyboard.HasControl() && this.HandleDownKey())
                                e.Handled = true;
                            break;
                        case Fayde.Input.Key.Add:
                            if (this.CanExpandOnInput && !this.IsExpanded) {
                                this.UserInitiatedExpansion = true;
                                this.IsExpanded = true;
                                e.Handled = true;
                            }
                            break;
                        case Fayde.Input.Key.Subtract:
                            if (this.CanExpandOnInput && this.IsExpanded) {
                                this.IsExpanded = false;
                                e.Handled = true;
                            }
                            break;
                    }
                }
                if (!this.IsRoot)
                    return;
                var parentTreeView = this.ParentTreeView;
                if (!parentTreeView)
                    return;
                parentTreeView.PropagateKeyDown(e);
            };
            TreeViewItem.prototype.HandleRightKey = function () {
                if (!this.CanExpandOnInput)
                    return false;
                if (!this.IsExpanded) {
                    this.UserInitiatedExpansion = true;
                    this.IsExpanded = true;
                    return true;
                }
                return this.HandleDownKey();
            };
            TreeViewItem.prototype.HandleLeftKey = function () {
                if (!this.CanExpandOnInput || !this.IsExpanded)
                    return false;
                if (this.IsFocused)
                    this.Focus();
                else
                    this.IsExpanded = false;
                return true;
            };
            TreeViewItem.prototype.HandleDownKey = function () {
                return this.AllowKeyHandleEvent() && this.FocusDown();
            };
            TreeViewItem.prototype.HandleUpKey = function () {
                if (!this.AllowKeyHandleEvent())
                    return false;
                var previousFocusableItem = this.FindPreviousFocusableItem();
                if (!previousFocusableItem)
                    return false;
                if (previousFocusableItem != this.ParentItemsControl || previousFocusableItem != this.ParentTreeView)
                    return previousFocusableItem.Focus();
                return true;
            };
            TreeViewItem.prototype.HandleScrollByPage = function (up, scrollHost, viewportHeight, top, bottom, currentDelta) {
                var closeEdge1 = { Value: 0.0 };
                currentDelta.Value = calculateDelta(up, this, scrollHost, top, bottom, closeEdge1);
                if (NumberEx.IsGreaterThanClose(closeEdge1.Value, viewportHeight) || NumberEx.IsLessThanClose(currentDelta.Value, viewportHeight))
                    return false;
                var flag1 = false;
                var headerElement = this.HeaderElement;
                if (headerElement != null && NumberEx.IsLessThanClose(calculateDelta(up, headerElement, scrollHost, top, bottom, { Value: 0 }), viewportHeight))
                    flag1 = true;
                var tvi1 = null;
                var count = this.Items.Count;
                var flag2 = up && this.ContainsSelection;
                var index = up ? count - 1 : 0;
                while (0 <= index && index < count) {
                    var tvi2 = this.ItemContainersManager.ContainerFromIndex(index);
                    if (tvi2 instanceof TreeViewItem && tvi2.IsEnabled) {
                        if (flag2) {
                            if (tvi2.IsSelected) {
                                flag2 = false;
                                index += up ? -1 : 1;
                                continue;
                            }
                            else if (tvi2.ContainsSelection) {
                                flag2 = false;
                            }
                            else {
                                index += up ? -1 : 1;
                                continue;
                            }
                        }
                        var currentDelta1 = { Value: 0 };
                        if (tvi2.HandleScrollByPage(up, scrollHost, viewportHeight, top, bottom, currentDelta1))
                            return true;
                        if (!NumberEx.IsGreaterThanClose(currentDelta1.Value, viewportHeight))
                            tvi1 = tvi2;
                        else
                            break;
                    }
                    index += up ? -1 : 1;
                }
                if (tvi1 != null) {
                    if (up)
                        return tvi1.Focus();
                    return tvi1.FocusInto();
                }
                else if (flag1)
                    return this.Focus();
                return false;
            };
            TreeViewItem.prototype.Select = function (selected) {
                var parentTreeView = this.ParentTreeView;
                if (!parentTreeView || parentTreeView.IsSelectionChangeActive)
                    return;
                var parentTreeViewItem = this.ParentTreeViewItem;
                var itemOrContainer = parentTreeViewItem != null ? parentTreeViewItem.ItemContainersManager.ItemFromContainer(this) : parentTreeView.ItemContainersManager.ItemFromContainer(this);
                parentTreeView.ChangeSelection(itemOrContainer, this, selected);
            };
            TreeViewItem.prototype.UpdateContainsSelection = function (selected) {
                for (var parentTreeViewItem = this.ParentTreeViewItem; parentTreeViewItem != null; parentTreeViewItem = parentTreeViewItem.ParentTreeViewItem)
                    parentTreeViewItem.ContainsSelection = selected;
            };
            TreeViewItem.prototype.AllowKeyHandleEvent = function () {
                return this.IsSelected;
            };
            TreeViewItem.prototype.FocusDown = function () {
                var nextFocusableItem = this.FindNextFocusableItem(true);
                return nextFocusableItem && nextFocusableItem.Focus();
            };
            TreeViewItem.prototype.FocusInto = function () {
                var lastFocusableItem = this.FindLastFocusableItem();
                return lastFocusableItem && lastFocusableItem.Focus();
            };
            TreeViewItem.prototype.FindNextFocusableItem = function (recurse) {
                if (recurse && this.IsExpanded && this.HasItems) {
                    var treeViewItem = this.ItemContainersManager.ContainerFromIndex(0);
                    if (treeViewItem instanceof TreeViewItem) {
                        if (!treeViewItem.IsEnabled)
                            return treeViewItem.FindNextFocusableItem(false);
                        return treeViewItem;
                    }
                }
                var parentItemsControl = this.ParentItemsControl;
                if (parentItemsControl != null) {
                    var index = parentItemsControl.ItemContainersManager.IndexFromContainer(this);
                    var count = parentItemsControl.Items.Count;
                    while (index++ < count) {
                        var treeViewItem = parentItemsControl.ItemContainersManager.ContainerFromIndex(index);
                        if (treeViewItem instanceof TreeViewItem && treeViewItem.IsEnabled)
                            return treeViewItem;
                    }
                    var parentTreeViewItem = this.ParentTreeViewItem;
                    if (parentTreeViewItem instanceof TreeViewItem)
                        return parentTreeViewItem.FindNextFocusableItem(false);
                }
                return null;
            };
            TreeViewItem.prototype.FindLastFocusableItem = function () {
                var tvi1 = this;
                var tvi2 = null;
                for (var index = -1; tvi1 instanceof TreeViewItem; tvi1 = tvi2.ItemContainersManager.ContainerFromIndex(index)) {
                    if (tvi1.IsEnabled) {
                        if (!tvi1.IsExpanded || !tvi1.HasItems)
                            return tvi1;
                        tvi2 = tvi1;
                        index = tvi1.Items.Count - 1;
                    }
                    else if (index > 0)
                        --index;
                    else
                        break;
                }
                return tvi2;
            };
            TreeViewItem.prototype.FindPreviousFocusableItem = function () {
                var parentItemsControl = this.ParentItemsControl;
                if (!parentItemsControl)
                    return null;
                var index = parentItemsControl.ItemContainersManager.IndexFromContainer(this);
                while (index-- > 0) {
                    var treeViewItem = parentItemsControl.ItemContainersManager.ContainerFromIndex(index);
                    if (treeViewItem instanceof TreeViewItem && treeViewItem.IsEnabled) {
                        var lastFocusableItem = treeViewItem.FindLastFocusableItem();
                        if (lastFocusableItem != null)
                            return lastFocusableItem;
                    }
                }
                return parentItemsControl;
            };
            TreeViewItem.HasItemsProperty = DependencyProperty.RegisterReadOnly("HasItems", function () { return Boolean; }, TreeViewItem, false, function (d, args) { return d.OnHasItemsChanged(args); });
            TreeViewItem.IsExpandedProperty = DependencyProperty.Register("IsExpanded", function () { return Boolean; }, TreeViewItem, false, function (d, args) { return d.OnIsExpandedPropertyChanged(args); });
            TreeViewItem.IsSelectedProperty = DependencyProperty.Register("IsSelected", function () { return Boolean; }, TreeViewItem, false, function (d, args) { return d.OnIsSelectedChanged(args); });
            TreeViewItem.IsSelectionActiveProperty = DependencyProperty.RegisterReadOnly("IsSelectionActive", function () { return Boolean; }, TreeViewItem, false, function (d, args) { return d.OnIsSelectionActiveChanged(args); });
            return TreeViewItem;
        })(Controls.HeaderedItemsControl);
        Controls.TreeViewItem = TreeViewItem;
        Controls.TemplateVisualStates(TreeViewItem, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "MouseOver" }, { GroupName: "CommonStates", Name: "Pressed" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "FocusStates", Name: "Unfocused" }, { GroupName: "FocusStates", Name: "Focused" }, { GroupName: "ExpansionStates", Name: "Collapsed" }, { GroupName: "ExpansionStates", Name: "Expanded" }, { GroupName: "HasItemsStates", Name: "HasItems" }, { GroupName: "HasItemsStates", Name: "NoItems" }, { GroupName: "SelectionStates", Name: "Unselected" }, { GroupName: "SelectionStates", Name: "Selected" }, { GroupName: "SelectionStates", Name: "SelectedInactive" });
        Controls.TemplateParts(TreeViewItem, { Name: "Header", Type: Fayde.FrameworkElement }, { Name: "ExpanderButton", Type: Controls.Primitives.ToggleButton });
        function calculateDelta(up, element, scrollHost, top, bottom, closeEdge) {
            var top1 = { Value: 0 };
            var bottom1 = { Value: 0 };
            ScrollExtensions.GetTopAndBottom(element, scrollHost, top1, bottom1);
            var ce = 0;
            if (up) {
                ce = bottom - bottom1.Value;
                return bottom - top1.Value;
            }
            else {
                ce = top1.Value - top;
                return bottom1.Value - top;
            }
            closeEdge.Value = ce;
        }
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var UpDownParseErrorEventArgs = (function (_super) {
            __extends(UpDownParseErrorEventArgs, _super);
            function UpDownParseErrorEventArgs(text, error) {
                _super.call(this);
                this.Handled = false;
                Object.defineProperty(this, "Text", { value: text, writable: false });
                Object.defineProperty(this, "Error", { value: error, writable: false });
            }
            return UpDownParseErrorEventArgs;
        })(Fayde.RoutedEventArgs);
        Controls.UpDownParseErrorEventArgs = UpDownParseErrorEventArgs;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var UpDownParsingEventArgs = (function (_super) {
            __extends(UpDownParsingEventArgs, _super);
            function UpDownParsingEventArgs(text) {
                _super.call(this);
                this.Value = null;
                this.Handled = false;
                Object.defineProperty(this, "Text", { value: text, writable: false });
            }
            return UpDownParsingEventArgs;
        })(Fayde.RoutedEventArgs);
        Controls.UpDownParsingEventArgs = UpDownParsingEventArgs;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var contextmenu;
        (function (contextmenu) {
            var RootVisualTracker = (function () {
                function RootVisualTracker(owner) {
                    this.mousePosition = new Point();
                    this.$$rootVisual = null;
                    owner.LayoutUpdated.on(this._HandleLayoutUpdated, this);
                }
                Object.defineProperty(RootVisualTracker.prototype, "rootVisual", {
                    get: function () {
                        return this.$$rootVisual;
                    },
                    set: function (value) {
                        if (this.$$rootVisual) {
                            this.$$rootVisual.MouseMove.off(this._HandleRootVisualMouseMove, this);
                            this.$$rootVisual.SizeChanged.off(this._HandleSizeChanged, this);
                        }
                        this.$$rootVisual = value;
                        if (value) {
                            value.MouseMove.on(this._HandleRootVisualMouseMove, this);
                            value.SizeChanged.on(this._HandleSizeChanged, this);
                        }
                    },
                    enumerable: true,
                    configurable: true
                });
                RootVisualTracker.prototype.tryInit = function (visual) {
                    if (!visual)
                        return;
                    var surface = visual.XamlNode.LayoutUpdater.tree.surface;
                    if (!surface)
                        return;
                    this.rootVisual = surface.App.RootVisual;
                };
                RootVisualTracker.prototype.setOnSizeChanged = function (onSizeChanged) {
                    this.$$onSizeChanged = onSizeChanged;
                };
                RootVisualTracker.prototype.getAvailableSize = function () {
                    return new minerva.Size(this.rootVisual.ActualWidth, this.rootVisual.ActualHeight);
                };
                RootVisualTracker.prototype._HandleLayoutUpdated = function (sender, e) {
                    if (!this.rootVisual) {
                        var surface = sender.XamlNode.LayoutUpdater.tree.surface;
                        if (surface)
                            this.rootVisual = surface.App.RootVisual;
                    }
                    if (this.rootVisual)
                        sender.LayoutUpdated.off(this._HandleLayoutUpdated, this);
                };
                RootVisualTracker.prototype._HandleRootVisualMouseMove = function (sender, e) {
                    this.mousePosition = e.GetPosition(null);
                };
                RootVisualTracker.prototype._HandleSizeChanged = function (sender, e) {
                    this.$$onSizeChanged && this.$$onSizeChanged(e.NewSize);
                };
                return RootVisualTracker;
            })();
            contextmenu.RootVisualTracker = RootVisualTracker;
        })(contextmenu = Controls.contextmenu || (Controls.contextmenu = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var BindingSourceEvaluator = (function (_super) {
                __extends(BindingSourceEvaluator, _super);
                function BindingSourceEvaluator(binding) {
                    _super.call(this);
                    this._ValueBinding = null;
                    this._ValueBinding = binding;
                }
                Object.defineProperty(BindingSourceEvaluator.prototype, "ValueBinding", {
                    get: function () { return this._ValueBinding; },
                    enumerable: true,
                    configurable: true
                });
                BindingSourceEvaluator.prototype.GetDynamicValue = function (source) {
                    var vb = this._ValueBinding;
                    var binding1 = new Fayde.Data.Binding();
                    binding1.BindsDirectlyToSource = vb.BindsDirectlyToSource;
                    binding1.Converter = vb.Converter;
                    binding1.ConverterCulture = vb.ConverterCulture;
                    binding1.ConverterParameter = vb.ConverterParameter;
                    binding1.FallbackValue = vb.FallbackValue;
                    binding1.Mode = vb.Mode;
                    binding1.NotifyOnValidationError = vb.NotifyOnValidationError;
                    binding1.Path = vb.Path;
                    binding1.StringFormat = vb.StringFormat;
                    binding1.TargetNullValue = vb.TargetNullValue;
                    binding1.UpdateSourceTrigger = vb.UpdateSourceTrigger;
                    binding1.ValidatesOnDataErrors = vb.ValidatesOnDataErrors;
                    binding1.ValidatesOnExceptions = vb.ValidatesOnExceptions;
                    binding1.ValidatesOnNotifyDataErrors = vb.ValidatesOnNotifyDataErrors;
                    binding1.Source = source;
                    this.SetBinding(BindingSourceEvaluator.ValueProperty, binding1);
                    var obj = this.Value;
                    this.ClearValue(BindingSourceEvaluator.ValueProperty);
                    return obj;
                };
                BindingSourceEvaluator.ValueProperty = DependencyProperty.Register("Value", function () { return Object; }, BindingSourceEvaluator);
                return BindingSourceEvaluator;
            })(Fayde.FrameworkElement);
            Internal.BindingSourceEvaluator = BindingSourceEvaluator;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var DomainCoercer = (function () {
                function DomainCoercer(Owner, OnCoerceValue, OnCoerceCurrentIndex) {
                    this.Owner = Owner;
                    this.OnCoerceValue = OnCoerceValue;
                    this.OnCoerceCurrentIndex = OnCoerceCurrentIndex;
                    this.TextBox = null;
                    this.Text = "";
                    this.IsCoercing = false;
                    this._IsEditing = false;
                    this._IsInvalidInput = false;
                    this.Owner.KeyDown.on(this.OnKeyDown, this);
                }
                Object.defineProperty(DomainCoercer.prototype, "IsEditing", {
                    get: function () {
                        return this._IsEditing;
                    },
                    set: function (value) {
                        if (value === this._IsEditing)
                            return;
                        this._IsEditing = value;
                        this.OnIsEditingChanged(value);
                    },
                    enumerable: true,
                    configurable: true
                });
                DomainCoercer.prototype.OnIsEditingChanged = function (isEditing) {
                    this.Owner.OnIsEditingChanged(isEditing);
                    if (!this.TextBox)
                        return;
                    if (!isEditing) {
                        this.TextBox.Text = this.Owner.FormatValue();
                        this.TextBox.IsHitTestVisible = false;
                    }
                    else {
                        if (this.TextBox.IsFocused)
                            this.TextBox.Select(0, this.TextBox.Text.length);
                        this.TextBox.IsHitTestVisible = true;
                    }
                };
                Object.defineProperty(DomainCoercer.prototype, "IsInvalidInput", {
                    get: function () {
                        return this._IsInvalidInput;
                    },
                    set: function (value) {
                        if (value === this._IsInvalidInput)
                            return;
                        this._IsInvalidInput = value;
                        this.Owner.OnIsInvalidInputChanged(value);
                    },
                    enumerable: true,
                    configurable: true
                });
                DomainCoercer.prototype.Attach = function (textBox) {
                    this.TextBox = textBox;
                    if (textBox) {
                        textBox.GotFocus.on(this.TextBox_GotFocus, this);
                        textBox.LostFocus.on(this.TextBox_LostFocus, this);
                    }
                    this.UpdateTextBoxText();
                    this.UpdateIsEditable();
                };
                DomainCoercer.prototype.Detach = function () {
                    if (this.TextBox) {
                        this.TextBox.GotFocus.off(this.TextBox_GotFocus, this);
                        this.TextBox.LostFocus.off(this.TextBox_LostFocus, this);
                    }
                    this.TextBox = null;
                };
                DomainCoercer.prototype.OnKeyDown = function (sender, e) {
                    if (e != null && ((e.Key === Fayde.Input.Key.Enter || e.Key === Fayde.Input.Key.Space) && !this.IsEditing && this.Owner.IsEditable)) {
                        this.IsEditing = true;
                        e.Handled = true;
                    }
                    else {
                        if (e == null || e.Handled)
                            return;
                        if (e.Key === Fayde.Input.Key.Escape) {
                            this.IsInvalidInput = false;
                            this.IsEditing = false;
                            e.Handled = true;
                        }
                        else if (!this.IsEditing && this.Owner.IsEditable)
                            this.IsEditing = true;
                    }
                };
                DomainCoercer.prototype.EscapeFocus = function () {
                    var _this = this;
                    if (!this.IsInvalidInput)
                        this.IsEditing = false;
                    else if (this.Owner.InvalidInputAction === Controls.InvalidInputAction.TextBoxCannotLoseFocus && this.TextBox.IsFocused)
                        window.setTimeout(function () { return _this.TextBox.Focus(); }, 1);
                };
                DomainCoercer.prototype.OnValueChanged = function (oldValue, newValue) {
                    if (!this.IsCoercing) {
                        var index = this.Owner.Items.IndexOf(newValue);
                        if (index > -1) {
                            this.IsCoercing = true;
                            this.OnCoerceCurrentIndex(index);
                            this.IsCoercing = false;
                        }
                    }
                    this.UpdateTextBoxText();
                    this.Owner.OnValueChanged(oldValue, newValue);
                };
                DomainCoercer.prototype.OnCurrentIndexChanged = function (oldIndex, newIndex) {
                    if (!this.IsCoercing) {
                        if (newIndex >= 0 && newIndex < this.Owner.Items.Count) {
                            this.IsCoercing = true;
                            this.OnCoerceValue(this.Owner.Items.GetValueAt(newIndex));
                            this.IsCoercing = false;
                        }
                    }
                    this.IsEditing = false;
                    this.Owner.OnCurrentIndexChanged(oldIndex, newIndex);
                };
                DomainCoercer.prototype.TextBox_LostFocus = function (sender, e) {
                    this.ProcessUserInput();
                };
                DomainCoercer.prototype.TextBox_GotFocus = function (sender, e) {
                    this.SelectAllText();
                };
                DomainCoercer.prototype.SelectAllText = function () {
                    if (this.TextBox)
                        this.TextBox.SelectAll();
                };
                DomainCoercer.prototype.UpdateTextBoxText = function () {
                    if (!this.TextBox)
                        return;
                    this.Text = this.Owner.FormatValue() || "";
                    this.TextBox.Text = this.Text;
                    this.TextBox.SelectionStart = this.Text.length;
                };
                DomainCoercer.prototype.UpdateIsEditable = function () {
                    if (this.TextBox)
                        this.TextBox.IsReadOnly = !this.Owner.IsEditable;
                };
                DomainCoercer.prototype.ProcessUserInput = function () {
                    if (!this.TextBox || this.Text === this.TextBox.Text)
                        return;
                    var selectionStart = this.TextBox.SelectionStart;
                    this.Text = this.TextBox.Text;
                    this.ApplyValue(this.Text);
                    if (selectionStart < this.TextBox.Text.length)
                        this.TextBox.SelectionStart = selectionStart;
                };
                DomainCoercer.prototype.OnParseError = function (e) {
                    this.Owner.ParseError.raise(this, e);
                };
                DomainCoercer.prototype.ApplyValue = function (text) {
                    if (!this.Owner.IsEditable)
                        return;
                    this.IsEditing = true;
                    try {
                        var val = { Value: null };
                        this.IsInvalidInput = !this.Owner.TryParseValue(text, val);
                        this.OnCoerceValue(val.Value);
                    }
                    catch (err) {
                        var e = new Controls.UpDownParseErrorEventArgs(text, err);
                        this.OnParseError(e);
                        if (!e.Handled)
                            this.UpdateTextBoxText();
                    }
                    finally {
                        if (!this.IsInvalidInput)
                            this.IsEditing = false;
                    }
                };
                return DomainCoercer;
            })();
            Internal.DomainCoercer = DomainCoercer;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var EventGesture = (function () {
                function EventGesture() {
                }
                EventGesture.prototype.Attach = function (event, callback) {
                    var _this = this;
                    this._Callback = callback;
                    event.on(this._OnEvent, this);
                    this.Detach = function () {
                        event.off(_this._OnEvent, _this);
                        _this.Detach = function () {
                        };
                    };
                };
                EventGesture.prototype.Detach = function () {
                };
                EventGesture.prototype._OnEvent = function (sender, e) {
                    this._Callback && this._Callback(sender, e);
                };
                return EventGesture;
            })();
            Internal.EventGesture = EventGesture;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var FormattedRangeCoercer = (function (_super) {
                __extends(FormattedRangeCoercer, _super);
                function FormattedRangeCoercer(range, onCoerceMaximum, onCoerceValue, OnCoerceFormat) {
                    _super.call(this, range, onCoerceMaximum, onCoerceValue);
                    this.OnCoerceFormat = OnCoerceFormat;
                }
                FormattedRangeCoercer.prototype.OnDecimalPlacesChanged = function (oldDecPlaces, newDecPlaces) {
                    this.CoerceDepth++;
                    this.OnCoerceFormat();
                    this.CoerceDepth--;
                };
                FormattedRangeCoercer.prototype.AddToValue = function (inc) {
                    this.OnCoerceValue(this.Value + inc);
                    this.RequestedVal = this.Value;
                };
                return FormattedRangeCoercer;
            })(Internal.RangeCoercer);
            Internal.FormattedRangeCoercer = FormattedRangeCoercer;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var GridUnitType = minerva.controls.grid.GridUnitType;
            (function (GridResizeDirection) {
                GridResizeDirection[GridResizeDirection["Auto"] = 0] = "Auto";
                GridResizeDirection[GridResizeDirection["Columns"] = 1] = "Columns";
                GridResizeDirection[GridResizeDirection["Rows"] = 2] = "Rows";
            })(Internal.GridResizeDirection || (Internal.GridResizeDirection = {}));
            var GridResizeDirection = Internal.GridResizeDirection;
            (function (GridResizeBehavior) {
                GridResizeBehavior[GridResizeBehavior["BasedOnAlignment"] = 0] = "BasedOnAlignment";
                GridResizeBehavior[GridResizeBehavior["CurrentAndNext"] = 1] = "CurrentAndNext";
                GridResizeBehavior[GridResizeBehavior["PreviousAndCurrent"] = 2] = "PreviousAndCurrent";
                GridResizeBehavior[GridResizeBehavior["PreviousAndNext"] = 3] = "PreviousAndNext";
            })(Internal.GridResizeBehavior || (Internal.GridResizeBehavior = {}));
            var GridResizeBehavior = Internal.GridResizeBehavior;
            (function (SplitBehavior) {
                SplitBehavior[SplitBehavior["Split"] = 0] = "Split";
                SplitBehavior[SplitBehavior["ResizeDefinition1"] = 1] = "ResizeDefinition1";
                SplitBehavior[SplitBehavior["ResizeDefinition2"] = 2] = "ResizeDefinition2";
            })(Internal.SplitBehavior || (Internal.SplitBehavior = {}));
            var SplitBehavior = Internal.SplitBehavior;
            var GridSplitterResizer = (function () {
                function GridSplitterResizer(gs) {
                    this.UpdateResizeDirection(gs);
                    this.Behavior = resizeBehaviors[this.Direction !== GridResizeDirection.Columns ? gs.VerticalAlignment : gs.HorizontalAlignment]
                        || GridResizeBehavior.PreviousAndNext;
                    this.SplitterLength = Math.min(gs.ActualWidth, gs.ActualHeight);
                }
                GridSplitterResizer.prototype.Setup = function (gs, grid) {
                    var isColumns = this.Direction === GridResizeDirection.Columns;
                    var span = isColumns ? Controls.Grid.GetColumnSpan(gs) : Controls.Grid.GetRowSpan(gs);
                    if (span > 1)
                        return false;
                    var index = isColumns ? Controls.Grid.GetColumn(gs) : Controls.Grid.GetRow(gs);
                    var indices = this.GetBehaviorIndices(index);
                    var defs = isColumns ? grid.ColumnDefinitions : grid.RowDefinitions;
                    if (indices[0] < 0 || indices[1] >= defs.Count)
                        return false;
                    this.SplitterIndex = index;
                    this.DS1 = createSize(defs.GetValueAt(indices[0]));
                    this.DS1.Index = indices[0];
                    this.DS2 = createSize(defs.GetValueAt(indices[1]));
                    this.DS2.Index = indices[1];
                    this.SplitBehavior = (this.DS1.IsStar && this.DS2.IsStar) ? SplitBehavior.Split : (!this.DS1.IsStar ? SplitBehavior.ResizeDefinition1 : SplitBehavior.ResizeDefinition2);
                    return true;
                };
                GridSplitterResizer.prototype.Move = function (grid, horiz, vert) {
                    var ds1 = this.DS1;
                    var ds2 = this.DS2;
                    if (!ds1 || !ds2)
                        return true;
                    if (this.SplitBehavior === SplitBehavior.Split && !NumberEx.AreClose((ds1.ActualSize + ds2.ActualSize), (ds1.OrigActualSize + ds2.OrigActualSize)))
                        return false;
                    var deltaConstraints = this.GetConstraints();
                    var num1 = deltaConstraints[0];
                    var num2 = deltaConstraints[1];
                    var num = this.Direction === GridResizeDirection.Columns ? horiz : vert;
                    num = Math.min(Math.max(num, num1), num2);
                    this.SetLengths(grid, ds1.ActualSize + num, ds2.ActualSize - num);
                    return true;
                };
                GridSplitterResizer.prototype.UpdateResizeDirection = function (gs) {
                    var old = this.Direction;
                    if (gs.HorizontalAlignment !== Fayde.HorizontalAlignment.Stretch)
                        this.Direction = GridResizeDirection.Columns;
                    else if (gs.VerticalAlignment === Fayde.VerticalAlignment.Stretch && gs.ActualWidth <= gs.ActualHeight)
                        this.Direction = GridResizeDirection.Columns;
                    else
                        this.Direction = GridResizeDirection.Rows;
                    return old !== this.Direction;
                };
                GridSplitterResizer.prototype.SetLengths = function (grid, definition1Pixels, definition2Pixels) {
                    var columnDefinitions;
                    if (this.SplitBehavior !== SplitBehavior.Split) {
                        if (this.SplitBehavior === SplitBehavior.ResizeDefinition1)
                            this.DS1.Size = new Controls.GridLength(definition1Pixels, GridUnitType.Pixel);
                        else
                            this.DS2.Size = new Controls.GridLength(definition2Pixels, GridUnitType.Pixel);
                        return;
                    }
                    var enumerator = this.Direction === GridResizeDirection.Columns
                        ? grid.ColumnDefinitions.getEnumerator() : grid.RowDefinitions.getEnumerator();
                    var i = 0;
                    while (enumerator.moveNext()) {
                        var ds = createSize(enumerator.current);
                        if (this.DS1.Index === i)
                            ds.Size = new Controls.GridLength(definition1Pixels, GridUnitType.Star);
                        else if (this.DS2.Index === i)
                            ds.Size = new Controls.GridLength(definition2Pixels, GridUnitType.Star);
                        else if (ds.IsStar)
                            ds.Size = new Controls.GridLength(ds.ActualSize, GridUnitType.Star);
                        i++;
                    }
                };
                GridSplitterResizer.prototype.GetConstraints = function () {
                    var actualLength = this.DS1.ActualSize;
                    var minSize = this.DS1.MinSize;
                    var maxSize = this.DS1.MaxSize;
                    var actualLength1 = this.DS2.ActualSize;
                    var minSize1 = this.DS2.MinSize;
                    var maxSize1 = this.DS2.MaxSize;
                    if (this.SplitterIndex === this.DS1.Index) {
                        minSize = Math.max(minSize, this.SplitterLength);
                    }
                    else if (this.SplitterIndex === this.DS2.Index) {
                        minSize1 = Math.max(minSize1, this.SplitterLength);
                    }
                    if (this.SplitBehavior === SplitBehavior.Split) {
                        return [
                            -Math.min(actualLength - minSize, maxSize1 - actualLength1),
                            Math.min(maxSize - actualLength, actualLength1 - minSize1)
                        ];
                    }
                    if (this.SplitBehavior !== SplitBehavior.ResizeDefinition1) {
                        return [
                            actualLength1 - maxSize1,
                            actualLength1 - minSize1
                        ];
                    }
                    return [
                        minSize - actualLength,
                        maxSize - actualLength
                    ];
                };
                GridSplitterResizer.prototype.GetBehaviorIndices = function (index) {
                    switch (this.Behavior) {
                        case GridResizeBehavior.CurrentAndNext:
                            return [index, index + 1];
                        case GridResizeBehavior.PreviousAndCurrent:
                            return [index - 1, index];
                        default:
                            return [index - 1, index + 1];
                    }
                };
                return GridSplitterResizer;
            })();
            Internal.GridSplitterResizer = GridSplitterResizer;
            var resizeBehaviors = [];
            resizeBehaviors[Fayde.VerticalAlignment.Top] = GridResizeBehavior.PreviousAndCurrent;
            resizeBehaviors[Fayde.VerticalAlignment.Bottom] = GridResizeBehavior.CurrentAndNext;
            resizeBehaviors[Fayde.HorizontalAlignment.Left] = GridResizeBehavior.PreviousAndCurrent;
            resizeBehaviors[Fayde.HorizontalAlignment.Right] = GridResizeBehavior.CurrentAndNext;
            var RowDefinition = Fayde.Controls.RowDefinition;
            var ColumnDefinition = Fayde.Controls.ColumnDefinition;
            function createSize(definition) {
                if (definition instanceof RowDefinition) {
                    var rd = definition;
                    var ds = {};
                    Object.defineProperty(ds, "ActualSize", {
                        get: function () {
                            return rd.ActualHeight;
                        }
                    });
                    Object.defineProperty(ds, "MaxSize", {
                        get: function () {
                            return rd.MaxHeight || 0;
                        }
                    });
                    Object.defineProperty(ds, "MinSize", {
                        get: function () {
                            return rd.MinHeight || 0;
                        }
                    });
                    Object.defineProperty(ds, "Size", {
                        get: function () {
                            return rd.Height;
                        },
                        set: function (value) {
                            rd.Height = value;
                        }
                    });
                    Object.defineProperty(ds, "IsStar", {
                        get: function () {
                            return !!rd.Height && rd.Height.Type === GridUnitType.Star;
                        }
                    });
                    ds.Index = 0;
                    ds.OrigActualSize = rd.ActualHeight;
                    return ds;
                }
                if (definition instanceof ColumnDefinition) {
                    var cd = definition;
                    var ds = {};
                    Object.defineProperty(ds, "ActualSize", {
                        get: function () {
                            return cd.ActualWidth;
                        }
                    });
                    Object.defineProperty(ds, "MaxSize", {
                        get: function () {
                            return cd.MaxWidth || 0;
                        }
                    });
                    Object.defineProperty(ds, "MinSize", {
                        get: function () {
                            return cd.MinWidth || 0;
                        }
                    });
                    Object.defineProperty(ds, "Size", {
                        get: function () {
                            return cd.Width;
                        },
                        set: function (value) {
                            cd.Width = value;
                        }
                    });
                    Object.defineProperty(ds, "IsStar", {
                        get: function () {
                            return !!cd.Width && cd.Width.Type === GridUnitType.Star;
                        }
                    });
                    ds.Index = 0;
                    ds.OrigActualSize = cd.ActualWidth;
                    return ds;
                }
            }
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var ItemsControlHelper = (function () {
                function ItemsControlHelper(control) {
                    this.ItemsControl = control;
                }
                Object.defineProperty(ItemsControlHelper.prototype, "ItemsHost", {
                    get: function () {
                        if (!(this._itemsHost instanceof Controls.Panel) && this.ItemsControl != null && this.ItemsControl.ItemContainersManager != null) {
                            var container = this.ItemsControl.ItemContainersManager.ContainerFromIndex(0);
                            if (container != null)
                                this._itemsHost = Fayde.VisualTreeHelper.GetParent(container);
                        }
                        return this._itemsHost;
                    },
                    enumerable: true,
                    configurable: true
                });
                Object.defineProperty(ItemsControlHelper.prototype, "ScrollHost", {
                    get: function () {
                        if (!this._scrollHost) {
                            var itemsHost = this.ItemsHost;
                            if (itemsHost != null) {
                                for (var cur = itemsHost; cur !== this.ItemsControl && cur != null; cur = Fayde.VisualTreeHelper.GetParent(cur)) {
                                    var scrollViewer = cur;
                                    if (scrollViewer instanceof Controls.ScrollViewer) {
                                        this._scrollHost = scrollViewer;
                                        break;
                                    }
                                }
                            }
                        }
                        return this._scrollHost;
                    },
                    enumerable: true,
                    configurable: true
                });
                ItemsControlHelper.prototype.OnApplyTemplate = function () {
                    this._itemsHost = null;
                    this._scrollHost = null;
                };
                ItemsControlHelper.PrepareContainerForItemOverride = function (element, parentItemContainerStyle) {
                    if (!parentItemContainerStyle)
                        return;
                    var control = element instanceof Controls.Control ? element : null;
                    if (!control || control.Style != null)
                        return;
                    control.SetValue(Fayde.FrameworkElement.StyleProperty, parentItemContainerStyle);
                };
                ItemsControlHelper.prototype.UpdateItemContainerStyle = function (itemContainerStyle) {
                    if (!itemContainerStyle)
                        return;
                    var itemsHost = this.ItemsHost;
                    if (!itemsHost || !itemsHost.Children)
                        return;
                    var enumerator = itemsHost.Children.getEnumerator();
                    while (enumerator.moveNext()) {
                        var cur = enumerator.current;
                        if (!cur.Style)
                            cur.Style = itemContainerStyle;
                    }
                };
                ItemsControlHelper.prototype.ScrollIntoView = function (element) {
                    var scrollHost = this.ScrollHost;
                    if (!scrollHost)
                        return;
                    var generalTransform;
                    try {
                        generalTransform = element.TransformToVisual(scrollHost);
                    }
                    catch (err) {
                        return;
                    }
                    var tl = generalTransform.Transform(new Point());
                    var sz = generalTransform.Transform(new Point(element.ActualWidth, element.ActualHeight));
                    var r = new minerva.Rect(tl.x, tl.y, sz.x, sz.y);
                    var verticalOffset = scrollHost.VerticalOffset;
                    var num1 = 0.0;
                    var viewportHeight = scrollHost.ViewportHeight;
                    var bottom = r.y + r.height;
                    if (viewportHeight < bottom) {
                        num1 = bottom - viewportHeight;
                        verticalOffset += num1;
                    }
                    var top = r.y;
                    if (top - num1 < 0.0)
                        verticalOffset -= num1 - top;
                    scrollHost.ScrollToVerticalOffset(verticalOffset);
                    var horizontalOffset = scrollHost.HorizontalOffset;
                    var num2 = 0.0;
                    var viewportWidth = scrollHost.ViewportWidth;
                    var right = r.x + r.width;
                    if (viewportWidth < right) {
                        num2 = right - viewportWidth;
                        horizontalOffset += num2;
                    }
                    var left = r.x;
                    if (left - num2 < 0.0)
                        horizontalOffset -= num2 - left;
                    scrollHost.ScrollToHorizontalOffset(horizontalOffset);
                };
                return ItemsControlHelper;
            })();
            Internal.ItemsControlHelper = ItemsControlHelper;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var MultiClickHelper = (function () {
                function MultiClickHelper() {
                    this.ClickCount = 0;
                }
                MultiClickHelper.prototype.OnMouseLeftButtonDown = function (control, e) {
                    if (!control.IsEnabled) {
                        this.ClickCount = 1;
                        return;
                    }
                    var now = new Date().getTime();
                    var deltaMs = now - this.LastClickTime;
                    var pos = e.GetPosition(control);
                    var dist = getDistance(this.LastClickPosition, pos);
                    if (deltaMs < 500.0 && dist < 9.0)
                        this.ClickCount++;
                    else
                        this.ClickCount = 1;
                    this.LastClickTime = now;
                    this.LastClickPosition = pos;
                };
                return MultiClickHelper;
            })();
            Internal.MultiClickHelper = MultiClickHelper;
            function getDistance(oldPosition, newPosition) {
                var xdiff = newPosition.x;
                var ydiff = newPosition.y;
                if (oldPosition) {
                    xdiff -= oldPosition.x;
                    ydiff -= oldPosition.y;
                }
                return xdiff * xdiff + ydiff * ydiff;
            }
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var ObservableObjectCollection = (function (_super) {
                __extends(ObservableObjectCollection, _super);
                function ObservableObjectCollection(collection) {
                    _super.call(this);
                    this.IsReadOnly = false;
                    if (!collection)
                        return;
                    for (var en = collection.getEnumerator(); en.moveNext();) {
                        this.Add(en.current);
                    }
                }
                ObservableObjectCollection.prototype.Add = function (value) {
                    if (this.IsReadOnly)
                        throw new InvalidOperationException("ObservableObjectCollection is read only.");
                    _super.prototype.Add.call(this, value);
                };
                ObservableObjectCollection.prototype.AddRange = function (values) {
                    if (this.IsReadOnly)
                        throw new InvalidOperationException("ObservableObjectCollection is read only.");
                    _super.prototype.AddRange.call(this, values);
                };
                ObservableObjectCollection.prototype.Insert = function (item, index) {
                    if (this.IsReadOnly)
                        throw new InvalidOperationException("ObservableObjectCollection is read only.");
                    _super.prototype.Insert.call(this, item, index);
                };
                ObservableObjectCollection.prototype.RemoveAt = function (index) {
                    if (this.IsReadOnly)
                        throw new InvalidOperationException("ObservableObjectCollection is read only.");
                    _super.prototype.RemoveAt.call(this, index);
                };
                ObservableObjectCollection.prototype.SetValueAt = function (index, item) {
                    if (this.IsReadOnly)
                        throw new InvalidOperationException("ObservableObjectCollection is read only.");
                    _super.prototype.SetValueAt.call(this, index, item);
                };
                ObservableObjectCollection.prototype.Clear = function () {
                    if (this.IsReadOnly)
                        throw new InvalidOperationException("ObservableObjectCollection is read only.");
                    _super.prototype.Clear.call(this);
                };
                return ObservableObjectCollection;
            })(Fayde.Collections.ObservableCollection);
            Internal.ObservableObjectCollection = ObservableObjectCollection;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var LineChange = 16.0;
            var ScrollEx = (function () {
                function ScrollEx() {
                }
                ScrollEx.HandleKey = function (sv, key, flowDirection) {
                    if (!sv)
                        return false;
                    var isRTL = flowDirection === Fayde.FlowDirection.RightToLeft;
                    switch (key) {
                        case Fayde.Input.Key.PageUp:
                            if (!NumberEx.IsGreaterThanClose(sv.ExtentHeight, sv.ViewportHeight))
                                ScrollEx.PageLeft(sv);
                            else
                                ScrollEx.PageUp(sv);
                            return true;
                        case Fayde.Input.Key.PageDown:
                            if (!NumberEx.IsGreaterThanClose(sv.ExtentHeight, sv.ViewportHeight))
                                ScrollEx.PageRight(sv);
                            else
                                ScrollEx.PageDown(sv);
                            return true;
                        case Fayde.Input.Key.End:
                            ScrollEx.ScrollToBottom(sv);
                            return true;
                        case Fayde.Input.Key.Home:
                            ScrollEx.ScrollToTop(sv);
                            return true;
                        case Fayde.Input.Key.Left:
                            isRTL ? ScrollEx.LineRight(sv) : ScrollEx.LineLeft(sv);
                            return true;
                        case Fayde.Input.Key.Up:
                            ScrollEx.LineUp(sv);
                            return true;
                        case Fayde.Input.Key.Right:
                            isRTL ? ScrollEx.LineLeft(sv) : ScrollEx.LineRight(sv);
                            return true;
                        case Fayde.Input.Key.Down:
                            ScrollEx.LineDown(sv);
                            return true;
                    }
                    return false;
                };
                ScrollEx.LineUp = function (viewer) {
                    scrollByVerticalOffset(viewer, -16.0);
                };
                ScrollEx.LineDown = function (viewer) {
                    scrollByVerticalOffset(viewer, 16.0);
                };
                ScrollEx.LineLeft = function (viewer) {
                    scrollByHorizontalOffset(viewer, -16.0);
                };
                ScrollEx.LineRight = function (viewer) {
                    scrollByHorizontalOffset(viewer, 16.0);
                };
                ScrollEx.PageUp = function (viewer) {
                    scrollByVerticalOffset(viewer, -viewer.ViewportHeight);
                };
                ScrollEx.PageDown = function (viewer) {
                    scrollByVerticalOffset(viewer, viewer.ViewportHeight);
                };
                ScrollEx.PageLeft = function (viewer) {
                    scrollByHorizontalOffset(viewer, -viewer.ViewportWidth);
                };
                ScrollEx.PageRight = function (viewer) {
                    scrollByHorizontalOffset(viewer, viewer.ViewportWidth);
                };
                ScrollEx.ScrollToTop = function (viewer) {
                    viewer.ScrollToVerticalOffset(0.0);
                };
                ScrollEx.ScrollToBottom = function (viewer) {
                    viewer.ScrollToVerticalOffset(viewer.ExtentHeight);
                };
                ScrollEx.GetTopAndBottom = function (element, parent, top, bottom) {
                    var xform = element.TransformToVisual(parent);
                    top.Value = xform.Transform(new Point(0.0, 0.0)).y;
                    bottom.Value = xform.Transform(new Point(0.0, element.ActualHeight)).y;
                };
                return ScrollEx;
            })();
            Internal.ScrollEx = ScrollEx;
            function scrollByVerticalOffset(viewer, offset) {
                offset += viewer.VerticalOffset;
                offset = Math.max(Math.min(offset, viewer.ExtentHeight), 0.0);
                viewer.ScrollToVerticalOffset(offset);
            }
            function scrollByHorizontalOffset(viewer, offset) {
                offset += viewer.HorizontalOffset;
                offset = Math.max(Math.min(offset, viewer.ExtentWidth), 0.0);
                viewer.ScrollToHorizontalOffset(offset);
            }
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var SelectionHandler = (function () {
                function SelectionHandler(textBoxes) {
                    var _this = this;
                    this._ActiveBox = null;
                    this._IsMouseDown = false;
                    this._TextBoxes = [];
                    this._TextBoxes = textBoxes = textBoxes.filter(function (tb) { return !!tb; });
                    textBoxes.forEach(function (tb) {
                        tb.MouseLeftButtonDown.on(_this._MouseDown, _this);
                        tb.MouseLeftButtonUp.on(_this._MouseUp, _this);
                        tb.GotFocus.on(_this._GotFocus, _this);
                        tb.LostFocus.on(_this._LostFocus, _this);
                    });
                }
                Object.defineProperty(SelectionHandler.prototype, "ActiveBox", {
                    get: function () { return this._ActiveBox; },
                    enumerable: true,
                    configurable: true
                });
                SelectionHandler.prototype.Dispose = function () {
                    var _this = this;
                    this._TextBoxes.forEach(function (tb) {
                        tb.MouseLeftButtonDown.off(_this._MouseDown, _this);
                        tb.MouseLeftButtonUp.off(_this._MouseUp, _this);
                        tb.GotFocus.off(_this._GotFocus, _this);
                        tb.LostFocus.off(_this._LostFocus, _this);
                    });
                };
                SelectionHandler.prototype._GotFocus = function (sender, e) {
                    if (this._IsMouseDown)
                        return;
                    sender.SelectAll();
                };
                SelectionHandler.prototype._MouseDown = function (sender, e) {
                    this._IsMouseDown = true;
                };
                SelectionHandler.prototype._MouseUp = function (sender, e) {
                    this._IsMouseDown = false;
                    if (this._ActiveBox === sender)
                        return;
                    this._ActiveBox = sender;
                    if (this._ActiveBox.SelectionLength <= 0)
                        sender.SelectAll();
                };
                SelectionHandler.prototype._LostFocus = function (sender, e) {
                    sender.Select(0, 0);
                    if (this._ActiveBox === sender)
                        this._ActiveBox = null;
                };
                return SelectionHandler;
            })();
            Internal.SelectionHandler = SelectionHandler;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var SpinFlow = (function () {
                function SpinFlow(Owner, Spinner) {
                    this.Owner = Owner;
                    this.Spinner = Spinner;
                    if (this.Owner) {
                        this.Owner.KeyDown.on(this.OnKeyDown, this);
                        this.Owner.MouseWheel.on(this.OnMouseWheel, this);
                    }
                    if (this.Spinner)
                        this.Spinner.Spin.on(this.Spinner_Spin, this);
                }
                SpinFlow.prototype.UpdateValid = function (increase, decrease) {
                    var validSpinDirections = Controls.ValidSpinDirections.None;
                    if (increase)
                        validSpinDirections |= Controls.ValidSpinDirections.Increase;
                    if (decrease)
                        validSpinDirections |= Controls.ValidSpinDirections.Decrease;
                    if (this.Spinner)
                        this.Spinner.ValidSpinDirection = validSpinDirections;
                };
                SpinFlow.prototype.Dispose = function () {
                    if (this.Owner) {
                        this.Owner.KeyDown.off(this.OnKeyDown, this);
                        this.Owner.MouseWheel.off(this.OnMouseWheel, this);
                    }
                    if (this.Spinner)
                        this.Spinner.Spin.on(this.Spinner_Spin, this);
                };
                SpinFlow.prototype.OnKeyDown = function (sender, e) {
                    if (e.Handled)
                        return;
                    switch (e.Key) {
                        case Fayde.Input.Key.Enter:
                            this.Owner.OnSpin();
                            e.Handled = true;
                            break;
                        case Fayde.Input.Key.Up:
                            this.DoIncrement();
                            e.Handled = true;
                            break;
                        case Fayde.Input.Key.Down:
                            this.DoDecrement();
                            e.Handled = true;
                            break;
                    }
                };
                SpinFlow.prototype.OnMouseWheel = function (sender, e) {
                    if (e.Handled)
                        return;
                    if (e.Delta < 0)
                        this.DoDecrement();
                    else if (0 < e.Delta)
                        this.DoIncrement();
                    e.Handled = true;
                };
                SpinFlow.prototype.Spinner_Spin = function (sender, e) {
                    this.Owner.OnSpin();
                    if (!this.Spinner)
                        return;
                    if (e.Direction === Controls.SpinDirection.Increase)
                        this.DoIncrement();
                    else
                        this.DoDecrement();
                };
                SpinFlow.prototype.DoIncrement = function () {
                    if (this.Spinner && (this.Spinner.ValidSpinDirection & Controls.ValidSpinDirections.Increase) === Controls.ValidSpinDirections.Increase)
                        this.Owner.OnIncrement();
                };
                SpinFlow.prototype.DoDecrement = function () {
                    if (this.Spinner && (this.Spinner.ValidSpinDirection & Controls.ValidSpinDirections.Decrease) === Controls.ValidSpinDirections.Decrease)
                        this.Owner.OnDecrement();
                };
                return SpinFlow;
            })();
            Internal.SpinFlow = SpinFlow;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Internal;
        (function (Internal) {
            var TextBoxFormatter = (function () {
                function TextBoxFormatter(Control, TextBox, OnCoerceValue) {
                    this.Control = Control;
                    this.TextBox = TextBox;
                    this.OnCoerceValue = OnCoerceValue;
                    this.Text = "";
                    if (this.TextBox) {
                        this.TextBox.GotFocus.on(this.TextBox_GotFocus, this);
                        this.TextBox.LostFocus.on(this.TextBox_LostFocus, this);
                    }
                    this.UpdateTextBoxText();
                    this.UpdateIsEditable();
                }
                Object.defineProperty(TextBoxFormatter.prototype, "Value", {
                    get: function () { return this.Control.Value; },
                    enumerable: true,
                    configurable: true
                });
                TextBoxFormatter.prototype.ProcessUserInput = function () {
                    if (!this.TextBox || this.Text === this.TextBox.Text)
                        return;
                    var selectionStart = this.TextBox.SelectionStart;
                    this.Text = this.TextBox.Text;
                    this.ApplyValue(this.Text);
                    if (selectionStart < this.TextBox.Text.length)
                        this.TextBox.SelectionStart = selectionStart;
                };
                TextBoxFormatter.prototype.Dispose = function () {
                    if (this.TextBox) {
                        this.TextBox.GotFocus.off(this.TextBox_GotFocus, this);
                        this.TextBox.LostFocus.off(this.TextBox_LostFocus, this);
                    }
                };
                TextBoxFormatter.prototype.TextBox_LostFocus = function (sender, e) {
                    this.ProcessUserInput();
                };
                TextBoxFormatter.prototype.TextBox_GotFocus = function (sender, e) {
                    this.SelectAllText();
                };
                TextBoxFormatter.prototype.ApplyValue = function (text) {
                    var e1 = new Controls.UpDownParsingEventArgs(text);
                    var obj1;
                    var error = null;
                    try {
                        obj1 = this.Control.ParseValue(text);
                        e1.Value = obj1;
                    }
                    catch (err) {
                        error = err;
                    }
                    try {
                        this.OnParsing(e1);
                    }
                    catch (err) {
                    }
                    if (error == null) {
                        var obj2 = e1.Handled ? e1.Value : obj1;
                        var value = this.Value;
                        if (this.Value === obj2)
                            this.UpdateTextBoxText();
                        this.OnCoerceValue(obj2);
                    }
                    else if (e1.Handled) {
                        if (this.Value === e1.Value)
                            this.UpdateTextBoxText();
                        this.OnCoerceValue(e1.Value);
                    }
                    else {
                        var e2 = new Controls.UpDownParseErrorEventArgs(text, error);
                        this.OnParseError(e2);
                        if (!e2.Handled)
                            this.UpdateTextBoxText();
                    }
                };
                TextBoxFormatter.prototype.OnParseError = function (e) {
                    this.Control.ParseError.raise(this, e);
                };
                TextBoxFormatter.prototype.OnParsing = function (e) {
                    this.Control.Parsing.raise(this, e);
                };
                TextBoxFormatter.prototype.SelectAllText = function () {
                    if (this.TextBox)
                        this.TextBox.SelectAll();
                };
                TextBoxFormatter.prototype.UpdateTextBoxText = function () {
                    if (!this.TextBox)
                        return;
                    this.Text = this.Control.FormatValue(this.Value) || "";
                    this.TextBox.Text = this.Text;
                    this.TextBox.SelectionStart = this.Text.length;
                };
                TextBoxFormatter.prototype.UpdateIsEditable = function () {
                    if (this.TextBox)
                        this.TextBox.IsReadOnly = !this.Control.IsEditable;
                };
                return TextBoxFormatter;
            })();
            Internal.TextBoxFormatter = TextBoxFormatter;
        })(Internal = Controls.Internal || (Controls.Internal = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var TabPanel = (function (_super) {
            __extends(TabPanel, _super);
            function TabPanel() {
                _super.apply(this, arguments);
            }
            TabPanel.prototype.CreateLayoutUpdater = function () {
                return new Controls.tabpanel.TabPanelUpdater();
            };
            Object.defineProperty(TabPanel.prototype, "TabAlignment", {
                //TODO: Alter TabNavigation, DirectionalNavigation
                get: function () {
                    var tabControlParent = Fayde.VisualTreeHelper.GetParentOfType(this, Controls.TabControl);
                    if (tabControlParent != null)
                        return tabControlParent.TabStripPlacement;
                    return Controls.Dock.Top;
                },
                enumerable: true,
                configurable: true
            });
            TabPanel.setTabAlignment = function (tp, alignment) {
                if (!tp)
                    return;
                var upd = tp.XamlNode.LayoutUpdater;
                upd.assets.tabAlignment = alignment;
            };
            return TabPanel;
        })(Controls.Panel);
        Controls.TabPanel = TabPanel;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var TabPanelUpdater = (function (_super) {
                __extends(TabPanelUpdater, _super);
                function TabPanelUpdater() {
                    _super.apply(this, arguments);
                }
                TabPanelUpdater.prototype.init = function () {
                    this.setMeasurePipe(minerva.singleton(tabpanel.measure.TabPanelMeasurePipeDef))
                        .setArrangePipe(minerva.singleton(tabpanel.arrange.TabPanelArrangePipeDef));
                    var assets = this.assets;
                    assets.tabAlignment = Controls.Dock.Top;
                    assets.numRows = 1;
                    assets.numHeaders = 0;
                    assets.rowHeight = 0.0;
                    _super.prototype.init.call(this);
                };
                return TabPanelUpdater;
            })(minerva.controls.panel.PanelUpdater);
            tabpanel.TabPanelUpdater = TabPanelUpdater;
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var arrange;
            (function (arrange) {
                var TabPanelArrangePipeDef = (function (_super) {
                    __extends(TabPanelArrangePipeDef, _super);
                    function TabPanelArrangePipeDef() {
                        _super.call(this);
                        this.addTapinAfter('doOverride', 'doVertical', arrange.tapins.doVertical)
                            .addTapinAfter('doVertical', 'doHorizontal', arrange.tapins.doHorizontal)
                            .removeTapin('doOverride');
                    }
                    return TabPanelArrangePipeDef;
                })(minerva.controls.panel.arrange.PanelArrangePipeDef);
                arrange.TabPanelArrangePipeDef = TabPanelArrangePipeDef;
            })(arrange = tabpanel.arrange || (tabpanel.arrange = {}));
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var arrange;
            (function (arrange) {
                var tapins;
                (function (tapins) {
                    var Point = minerva.Point;
                    function doHorizontal(input, state, output, tree, finalRect) {
                        if (input.tabAlignment !== Controls.Dock.Top && input.tabAlignment !== Controls.Dock.Bottom)
                            return true;
                        var fs = state.finalSize;
                        var isMultiRow = input.numRows > 1;
                        var activeRow = 0;
                        var solution = [];
                        var childOffset = new Point();
                        var headersSize = tabpanel.helpers.getHeadersSize(tree);
                        if (isMultiRow) {
                            solution = tabpanel.helpers.calculateHeaderDistribution(tree, fs.width, headersSize);
                            activeRow = tabpanel.helpers.getActiveRow(tree, solution, input.tabAlignment === Controls.Dock.Top);
                            if (input.tabAlignment === Controls.Dock.Top)
                                childOffset.y = (input.numRows - 1.0 - activeRow) * input.rowHeight;
                            if (input.tabAlignment === Controls.Dock.Bottom && activeRow !== 0)
                                childOffset.y = (input.numRows - activeRow) * input.rowHeight;
                        }
                        var cr = state.childRect;
                        cr.x = cr.y = cr.width = cr.height = 0;
                        cr.height = input.rowHeight;
                        var childIndex = 0;
                        var separatorIndex = 0;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            if (child.assets.visibility === minerva.Visibility.Collapsed)
                                continue;
                            cr.width = headersSize[childIndex];
                            cr.height = input.rowHeight;
                            var isLastHeaderInRow = isMultiRow && (separatorIndex < solution.length && solution[separatorIndex] === childIndex || childIndex === (input.numHeaders - 1));
                            if (isLastHeaderInRow)
                                cr.width = fs.width - childOffset.x;
                            child.arrange(cr);
                            cr.x += cr.width;
                            if (isLastHeaderInRow) {
                                if ((separatorIndex === activeRow && input.tabAlignment === Controls.Dock.Top) ||
                                    (separatorIndex === activeRow - 1 && input.tabAlignment === Controls.Dock.Bottom))
                                    childOffset.y = 0;
                                else
                                    childOffset.y += input.rowHeight;
                                childOffset.x = 0;
                                separatorIndex++;
                            }
                            childIndex++;
                        }
                        return true;
                    }
                    tapins.doHorizontal = doHorizontal;
                })(tapins = arrange.tapins || (arrange.tapins = {}));
            })(arrange = tabpanel.arrange || (tabpanel.arrange = {}));
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var arrange;
            (function (arrange) {
                var tapins;
                (function (tapins) {
                    function doVertical(input, state, output, tree, finalRect) {
                        if (input.tabAlignment !== Controls.Dock.Left && input.tabAlignment !== Controls.Dock.Right)
                            return true;
                        var cr = state.childRect;
                        cr.x = cr.y = 0;
                        cr.width = state.finalSize.width;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            if (child.assets.visibility === minerva.Visibility.Collapsed)
                                continue;
                            tabpanel.helpers.setTabItemZ(child);
                            var sizeWithoutMargin = tabpanel.helpers.getDesiredSizeWithoutMargin(child);
                            cr.height = sizeWithoutMargin.height;
                            child.arrange(cr);
                            cr.y += sizeWithoutMargin.height;
                        }
                        return true;
                    }
                    tapins.doVertical = doVertical;
                })(tapins = arrange.tapins || (arrange.tapins = {}));
            })(arrange = tabpanel.arrange || (tabpanel.arrange = {}));
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var Size = minerva.Size;
            var Visibility = minerva.Visibility;
            var helpers;
            (function (helpers) {
                function getDesiredSizeWithoutMargin(upd) {
                    var timargin = getTabItemMargin(upd);
                    var size = new Size();
                    Size.copyTo(upd.assets.desiredSize, size);
                    var margin = upd.assets.margin;
                    size.height = Math.max(0.0, size.height - margin.top - margin.bottom);
                    size.width = Math.max(0.0, size.width - margin.left - margin.right + timargin);
                    return size;
                }
                helpers.getDesiredSizeWithoutMargin = getDesiredSizeWithoutMargin;
                function getTabItemMargin(upd) {
                    var node = upd.getAttachedValue("$node");
                    var ti = node ? node.XObject : null;
                    if (!(ti instanceof Controls.TabItem) || ti.IsSelected)
                        return 0;
                    var panel = ti.GetTemplate(ti.IsSelected, ti.TabStripPlacement);
                    if (!(panel instanceof Controls.Panel) || panel.Children.Count <= 0)
                        return 0;
                    var fe = panel.Children.GetValueAt(0);
                    if (!(fe instanceof Fayde.FrameworkElement) || !fe.Margin)
                        return 0;
                    return Math.abs(fe.Margin.left + fe.Margin.right);
                }
                function getHeadersSize(tree) {
                    var arr = [];
                    for (var walker = tree.walk(); walker.step();) {
                        var child = walker.current;
                        var width = child.assets.visibility === Visibility.Collapsed ? 0.0 : getDesiredSizeWithoutMargin(child).width;
                        arr.push(width);
                    }
                    return arr;
                }
                helpers.getHeadersSize = getHeadersSize;
                function setTabItemZ(upd) {
                    var node = upd.getAttachedValue("$node");
                    var ti = node ? node.XObject : null;
                    if (!(ti instanceof Controls.TabItem))
                        return;
                    var zi = ti.IsSelected ? 1 : 0;
                    ti.SetCurrentValue(Controls.Canvas.ZIndexProperty, zi);
                }
                helpers.setTabItemZ = setTabItemZ;
                function getTabItemIsSelected(upd) {
                    var node = upd.getAttachedValue("$node");
                    var ti = node ? node.XObject : null;
                    if (!(ti instanceof Controls.TabItem))
                        return;
                    return ti.IsSelected === true;
                }
                function getActiveRow(tree, solution, isDockTop) {
                    var index = 0;
                    var num = 0;
                    if (solution.length > 0) {
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            if (getTabItemIsSelected(child))
                                return index;
                            if (index < solution.length && solution[index] === num)
                                ++index;
                            ++num;
                        }
                    }
                    if (isDockTop)
                        index = this._NumberOfRows - 1;
                    return index;
                }
                helpers.getActiveRow = getActiveRow;
                function calculateHeaderDistribution(tree, rowWidthLimit, headerWidth) {
                    var num1 = 0.0;
                    var length1 = headerWidth.length;
                    var length2 = this._NumberOfRows - 1;
                    var num2 = 0.0;
                    var num3 = 0;
                    var numArray1 = new Array(length2);
                    var numArray2 = new Array(length2);
                    var numArray3 = new Array(this._NumberOfRows);
                    var numArray4 = numArray3.slice(0);
                    var numArray5 = numArray3.slice(0);
                    var numArray6 = numArray3.slice(0);
                    var index1 = 0;
                    for (var index2 = 0; index2 < length1; ++index2) {
                        if (num2 + headerWidth[index2] > rowWidthLimit && num3 > 0) {
                            numArray4[index1] = num2;
                            numArray3[index1] = num3;
                            var num4 = Math.max(0.0, (rowWidthLimit - num2) / num3);
                            numArray5[index1] = num4;
                            numArray1[index1] = index2 - 1;
                            if (num1 < num4)
                                num1 = num4;
                            ++index1;
                            num2 = headerWidth[index2];
                            num3 = 1;
                        }
                        else {
                            num2 += headerWidth[index2];
                            if (headerWidth[index2] != 0.0)
                                ++num3;
                        }
                    }
                    if (index1 === 0)
                        return [];
                    numArray4[index1] = num2;
                    numArray3[index1] = num3;
                    var num5 = (rowWidthLimit - num2) / num3;
                    numArray5[index1] = num5;
                    if (num1 < num5)
                        num1 = num5;
                    numArray2 = numArray1.slice(0);
                    numArray6 = numArray5.slice(0);
                    while (true) {
                        var num4 = 0;
                        do {
                            var num6 = 0;
                            var num7 = 0.0;
                            for (var index2 = 0; index2 < this._NumberOfRows; ++index2) {
                                if (num7 < numArray5[index2]) {
                                    num7 = numArray5[index2];
                                    num6 = index2;
                                }
                            }
                            if (num6 != 0) {
                                var index2 = num6;
                                var index3 = index2 - 1;
                                var index4 = numArray1[index3];
                                var num8 = headerWidth[index4];
                                numArray4[index2] += num8;
                                if (numArray4[index2] <= rowWidthLimit) {
                                    --numArray1[index3];
                                    ++numArray3[index2];
                                    numArray4[index3] -= num8;
                                    --numArray3[index3];
                                    numArray5[index3] = (rowWidthLimit - numArray4[index3]) / numArray3[index3];
                                    numArray5[index2] = (rowWidthLimit - numArray4[index2]) / numArray3[index2];
                                    num4 = 0.0;
                                    for (var index5 = 0; index5 < this._NumberOfRows; ++index5) {
                                        if (num4 < numArray5[index5])
                                            num4 = numArray5[index5];
                                    }
                                }
                                else
                                    break;
                            }
                            else
                                break;
                        } while (num4 >= num1);
                        num1 = num4;
                        numArray2 = numArray1.slice(0);
                        numArray6 = numArray5.slice(0);
                    }
                    var index6 = 0;
                    var index7 = 0;
                    for (var walker = tree.walk(); walker.step();) {
                        var child = walker.current;
                        if (child.assets.visibility === Visibility.Visible)
                            headerWidth[index7] += numArray6[index6];
                        if (index6 < length2 && numArray2[index6] == index7)
                            ++index6;
                        ++index7;
                    }
                    return numArray2;
                }
                helpers.calculateHeaderDistribution = calculateHeaderDistribution;
            })(helpers = tabpanel.helpers || (tabpanel.helpers = {}));
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var measure;
            (function (measure) {
                var panel = minerva.controls.panel;
                var TabPanelMeasurePipeDef = (function (_super) {
                    __extends(TabPanelMeasurePipeDef, _super);
                    function TabPanelMeasurePipeDef() {
                        _super.call(this);
                        this.addTapinAfter('doOverride', 'doVertical', measure.tapins.doVertical)
                            .addTapinAfter('doVertical', 'doHorizontal', measure.tapins.doHorizontal)
                            .removeTapin('doOverride');
                    }
                    TabPanelMeasurePipeDef.prototype.createOutput = function () {
                        var output = _super.prototype.createOutput.call(this);
                        output.numRows = 1;
                        output.numHeaders = 0;
                        output.rowHeight = 0.0;
                        return output;
                    };
                    TabPanelMeasurePipeDef.prototype.prepare = function (input, state, output) {
                        output.numRows = input.numRows;
                        output.numHeaders = input.numHeaders;
                        output.rowHeight = input.rowHeight;
                        _super.prototype.prepare.call(this, input, state, output);
                    };
                    TabPanelMeasurePipeDef.prototype.flush = function (input, state, output) {
                        _super.prototype.flush.call(this, input, state, output);
                        input.numRows = output.numRows;
                        input.numHeaders = output.numHeaders;
                        input.rowHeight = output.rowHeight;
                    };
                    return TabPanelMeasurePipeDef;
                })(panel.measure.PanelMeasurePipeDef);
                measure.TabPanelMeasurePipeDef = TabPanelMeasurePipeDef;
            })(measure = tabpanel.measure || (tabpanel.measure = {}));
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var measure;
            (function (measure) {
                var tapins;
                (function (tapins) {
                    function doHorizontal(input, state, output, tree, availableSize) {
                        if (input.tabAlignment !== Controls.Dock.Top && input.tabAlignment !== Controls.Dock.Bottom)
                            return true;
                        var ds = output.desiredSize;
                        ds.width = ds.height = 0;
                        output.numRows = 1;
                        output.numHeaders = 0;
                        output.rowHeight = 0.0;
                        var count = 0;
                        var totalWidth = 0.0;
                        var num3 = 0.0;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            if (child.assets.visibility === minerva.Visibility.Collapsed)
                                break;
                            output.numHeaders++;
                            child.measure(state.availableSize);
                            var sizeWithoutMargin = tabpanel.helpers.getDesiredSizeWithoutMargin(child);
                            if (output.rowHeight < sizeWithoutMargin.height)
                                output.rowHeight = sizeWithoutMargin.height;
                            if (totalWidth + sizeWithoutMargin.width > availableSize.width && count > 0) {
                                if (num3 < totalWidth)
                                    num3 = totalWidth;
                                totalWidth = sizeWithoutMargin.width;
                                count = 1;
                                output.numRows++;
                            }
                            else {
                                totalWidth += sizeWithoutMargin.width;
                                count++;
                            }
                        }
                        if (num3 < totalWidth)
                            num3 = totalWidth;
                        ds.height = output.rowHeight * output.numRows;
                        ds.width = !isFinite(ds.width) || isNaN(ds.width) || num3 < availableSize.width ? num3 : availableSize.width;
                        return true;
                    }
                    tapins.doHorizontal = doHorizontal;
                })(tapins = measure.tapins || (measure.tapins = {}));
            })(measure = tabpanel.measure || (tabpanel.measure = {}));
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var tabpanel;
        (function (tabpanel) {
            var measure;
            (function (measure) {
                var tapins;
                (function (tapins) {
                    function doVertical(input, state, output, tree, availableSize) {
                        if (input.tabAlignment !== Controls.Dock.Left && input.tabAlignment !== Controls.Dock.Right)
                            return true;
                        var ds = output.desiredSize;
                        ds.width = ds.height = 0;
                        output.numRows = 1;
                        output.numHeaders = 0;
                        output.rowHeight = 0.0;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            if (child.assets.visibility === minerva.Visibility.Collapsed)
                                break;
                            output.numHeaders++;
                            child.measure(state.availableSize);
                            var sizeWithoutMargin = tabpanel.helpers.getDesiredSizeWithoutMargin(child);
                            if (ds.width < sizeWithoutMargin.width)
                                ds.width = sizeWithoutMargin.width;
                            ds.height += sizeWithoutMargin.height;
                        }
                        return true;
                    }
                    tapins.doVertical = doVertical;
                })(tapins = measure.tapins || (measure.tapins = {}));
            })(measure = tabpanel.measure || (tabpanel.measure = {}));
        })(tabpanel = Controls.tabpanel || (Controls.tabpanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var FocusingInvalidControlEventArgs = (function () {
            function FocusingInvalidControlEventArgs(item, target) {
                this.Handled = false;
                Object.defineProperties(this, {
                    "Item": {
                        value: item,
                        writable: false
                    },
                    "Target": {
                        value: target,
                        writable: false
                    }
                });
            }
            return FocusingInvalidControlEventArgs;
        })();
        Controls.FocusingInvalidControlEventArgs = FocusingInvalidControlEventArgs;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ObservableCollection = Fayde.Collections.ObservableCollection;
        var ReadOnlyObservableCollection = Fayde.Collections.ReadOnlyObservableCollection;
        var ValidationSummary = (function (_super) {
            __extends(ValidationSummary, _super);
            function ValidationSummary() {
                _super.call(this);
                this._ErrorsListBox = null;
                this._HeaderContentControl = null;
                this._ValidationSummaryItemDictionary = {};
                this._Errors = new ValidationItemCollection();
                this._DisplayedErrors = new ValidationItemCollection();
                this.FocusingInvalidControl = new nullstone.Event();
                this.SelectionChanged = new nullstone.Event();
                this.DefaultStyleKey = ValidationSummary;
                this._Errors.CollectionChanged.on(this.Errors_CollectionChanged, this);
                this.Loaded.on(this.ValidationSummary_Loaded, this);
                this.Unloaded.on(this.ValidationSummary_Unloaded, this);
                this.IsEnabledChanged.on(this.ValidationSummary_IsEnabledChanged, this);
            }
            ValidationSummary.GetShowErrorsInSummary = function (dobj) {
                return dobj.GetValue(ValidationSummary.ShowErrorsInSummaryProperty) === true;
            };
            ValidationSummary.SetShowErrorsInSummary = function (dobj, value) {
                dobj.SetValue(ValidationSummary.ShowErrorsInSummaryProperty, value === true);
            };
            ValidationSummary.OnShowErrorsInSummaryChanged = function (dobj, args) {
                var root = Fayde.VisualTreeHelper.GetRoot(dobj);
                if (root)
                    ValidationSummary.UpdateDisplayedErrorsOnAllValidationSummaries(root);
            };
            ValidationSummary.prototype.OnFilterChanged = function (oldValue, newValue) {
                this.UpdateDisplayedErrors();
            };
            ValidationSummary.prototype.OnHeaderChanged = function (oldValue, newValue) {
                this.UpdateHeaderText();
            };
            ValidationSummary.prototype.OnTargetChanged = function (oldValue, newValue) {
                if (this._RegisteredParent != null) {
                    this._RegisteredParent.BindingValidationError.off(this.Target_BindingValidationError, this);
                    this._RegisteredParent = null;
                }
                if (oldValue instanceof Fayde.FrameworkElement)
                    oldValue.BindingValidationError.off(this.Target_BindingValidationError, this);
                if (newValue instanceof Fayde.FrameworkElement)
                    newValue.BindingValidationError.on(this.Target_BindingValidationError, this);
                this._Errors.ClearErrors(Controls.ValidationSummaryItemType.PropertyError);
                this.UpdateDisplayedErrors();
            };
            Object.defineProperty(ValidationSummary.prototype, "Errors", {
                get: function () {
                    return this._Errors;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(ValidationSummary.prototype, "DisplayedErrors", {
                get: function () {
                    return new ReadOnlyObservableCollection(this._DisplayedErrors);
                },
                enumerable: true,
                configurable: true
            });
            ValidationSummary.prototype.OnApplyTemplate = function () {
                _super.prototype.OnApplyTemplate.call(this);
                if (this._ErrorsListBox != null) {
                    this._ErrorsListBox.MouseLeftButtonUp.off(this.ErrorsListBox_MouseLeftButtonUp, this);
                    this._ErrorsListBox.KeyDown.off(this.ErrorsListBox_KeyDown, this);
                    this._ErrorsListBox.SelectionChanged.off(this.ErrorsListBox_SelectionChanged, this);
                }
                this._ErrorsListBox = this.GetTemplateChild("SummaryListBox", Controls.ListBox);
                if (this._ErrorsListBox != null) {
                    this._ErrorsListBox.MouseLeftButtonUp.on(this.ErrorsListBox_MouseLeftButtonUp, this);
                    this._ErrorsListBox.KeyDown.on(this.ErrorsListBox_KeyDown, this);
                    this._ErrorsListBox.ItemsSource = this.DisplayedErrors;
                    this._ErrorsListBox.SelectionChanged.on(this.ErrorsListBox_SelectionChanged, this);
                }
                this._HeaderContentControl = this.GetTemplateChild("HeaderContentControl", Controls.ContentControl);
                this.UpdateDisplayedErrors();
                this.UpdateCommon(false);
                this.UpdateValidation(false);
            };
            ValidationSummary.prototype.Errors_CollectionChanged = function (sender, e) {
                if (e.OldItems != null) {
                    for (var i = 0, items = e.OldItems; i < items.length; i++) {
                        var item = items[i];
                        if (item)
                            item.PropertyChanged.off(this.ValidationSummaryItem_PropertyChanged, this);
                    }
                }
                if (e.NewItems != null) {
                    for (var i = 0, items = e.NewItems; i < items.length; i++) {
                        var item = items[i];
                        if (item)
                            item.PropertyChanged.on(this.ValidationSummaryItem_PropertyChanged, this);
                    }
                }
                this.SetCurrentValue(ValidationSummary.HasErrorsProperty, this._Errors.Count > 0);
                this.UpdateDisplayedErrors();
            };
            ValidationSummary.prototype.ErrorsListBox_KeyDown = function (sender, e) {
                if (e.Key !== Fayde.Input.Key.Enter)
                    return;
                this.ExecuteClick(sender);
            };
            ValidationSummary.prototype.ErrorsListBox_MouseLeftButtonUp = function (sender, e) {
                this.ExecuteClick(sender);
            };
            ValidationSummary.prototype.ErrorsListBox_SelectionChanged = function (sender, e) {
                this.SelectionChanged.raise(this, e);
            };
            ValidationSummary.prototype.ValidationSummary_Loaded = function (sender, e) {
                if (!this.Target && !this._RegisteredParent) {
                    var rp = Fayde.VisualTreeHelper.GetParent(this);
                    this._RegisteredParent = rp instanceof Fayde.FrameworkElement ? rp : null;
                    if (this._RegisteredParent != null)
                        this._RegisteredParent.BindingValidationError.on(this.Target_BindingValidationError, this);
                }
                this.Loaded.off(this.ValidationSummary_Loaded, this);
                //this._initialized = true;
            };
            ValidationSummary.prototype.ValidationSummary_Unloaded = function (sender, e) {
                if (this._RegisteredParent != null)
                    this._RegisteredParent.BindingValidationError.off(this.Target_BindingValidationError, this);
                this.Unloaded.off(this.ValidationSummary_Unloaded, this);
                //this._initialized = false;
            };
            ValidationSummary.prototype.ValidationSummary_IsEnabledChanged = function (sender, e) {
                this.UpdateCommon(true);
            };
            ValidationSummary.prototype.ValidationSummaryItem_PropertyChanged = function (sender, e) {
                if (!(e.PropertyName === "ItemType"))
                    return;
                this.UpdateDisplayedErrors();
            };
            ValidationSummary.prototype.UpdateValidation = function (useTransitions) {
                var _this = this;
                var gotoFunc = function (state) { return Fayde.Media.VSM.VisualStateManager.GoToState(_this, state, useTransitions); };
                if (this._DisplayedErrors.Count > 0) {
                    this.SetCurrentValue(ValidationSummary.HasDisplayedErrorsProperty, true);
                    gotoFunc("HasErrors");
                }
                else {
                    this.SetCurrentValue(ValidationSummary.HasDisplayedErrorsProperty, false);
                    gotoFunc("Empty");
                }
            };
            ValidationSummary.prototype.UpdateCommon = function (useTransitions) {
                var _this = this;
                var gotoFunc = function (state) { return Fayde.Media.VSM.VisualStateManager.GoToState(_this, state, useTransitions); };
                if (this.IsEnabled)
                    gotoFunc("Normal");
                else
                    gotoFunc("Disabled");
            };
            ValidationSummary.prototype.UpdateHeaderText = function () {
                var hcc = this._HeaderContentControl;
                if (!hcc)
                    return;
                hcc.Content = (this.Header != null) ? this.Header : this.GetHeaderString();
            };
            ValidationSummary.prototype.UpdateDisplayedErrors = function () {
                var showoe = (this.Filter & Controls.ValidationSummaryFilters.ObjectErrors) !== Controls.ValidationSummaryFilters.None;
                var showpe = (this.Filter & Controls.ValidationSummaryFilters.PropertyErrors) !== Controls.ValidationSummaryFilters.None;
                var arr = [];
                for (var en = this.Errors.getEnumerator(); en.moveNext();) {
                    var item = en.current;
                    if (!item)
                        continue;
                    if (showoe && item.ItemType === Controls.ValidationSummaryItemType.ObjectError)
                        arr.push(item);
                    else if (showpe && item.ItemType === Controls.ValidationSummaryItemType.PropertyError)
                        arr.push(item);
                }
                arr.sort(Controls.compareSummaryItems);
                this._DisplayedErrors.Clear();
                this._DisplayedErrors.AddRange(arr);
                this.UpdateValidation(true);
                this.UpdateHeaderText();
            };
            ValidationSummary.prototype.Target_BindingValidationError = function (sender, e) {
                var element = e.OriginalSource;
                if (!e || !e.Error || (e.Error.ErrorContent == null || !(element instanceof Fayde.FrameworkElement)))
                    return;
                var message = e.Error.ErrorContent.toString();
                var key = (element.Name || (element._ID).toString()) + message;
                var dict = this._ValidationSummaryItemDictionary;
                if (e.Action === Fayde.Validation.ValidationErrorEventAction.Added) {
                    if (ValidationSummary.GetShowErrorsInSummary(element) === false)
                        return;
                    var caption = e.Error.PropertyName;
                    var item = new Controls.ValidationSummaryItem(message, caption, Controls.ValidationSummaryItemType.PropertyError, new Controls.ValidationSummaryItemSource(caption, element), null);
                    this._Errors.Add(item);
                    dict[key] = item;
                }
                else if (e.Action === Fayde.Validation.ValidationErrorEventAction.Removed) {
                    if (dict[key]) {
                        this._Errors.Remove(dict[key]);
                        dict[key] = undefined;
                    }
                }
            };
            ValidationSummary.prototype.GetHeaderString = function () {
                var count = this._DisplayedErrors.Count;
                if (count === 1)
                    return "1 Error";
                return count.toString() + " Errors";
            };
            ValidationSummary.prototype.ExecuteClick = function (sender) {
                var lb = sender;
                if (!(lb instanceof Controls.ListBox))
                    return;
                var item = lb.SelectedItem;
                if (!(item instanceof Controls.ValidationSummaryItem) || !this.FocusControlsOnClick)
                    return;
                if (item.Sources.Count === 0)
                    this._CurSummItemsSource = null;
                else if (ValidationSummary.FindMatchingErrorSource(item.Sources, this._CurSummItemsSource) < 0)
                    this._CurSummItemsSource = item.Sources.GetValueAt(0);
                var e = new Controls.FocusingInvalidControlEventArgs(item, this._CurSummItemsSource);
                this.FocusingInvalidControl.raise(this, e);
                if (!e.Handled && e.Target != null && e.Target.Control != null)
                    e.Target.Control.Focus();
                if (item.Sources.Count <= 0)
                    return;
                var matchingErrorSource = ValidationSummary.FindMatchingErrorSource(item.Sources, e.Target);
                var index = matchingErrorSource < 0 ? 0 : (matchingErrorSource + 1) % item.Sources.Count;
                this._CurSummItemsSource = item.Sources.GetValueAt(index);
            };
            ValidationSummary.FindMatchingErrorSource = function (sources, sourceToFind) {
                if (!sources)
                    return -1;
                for (var i = 0; i < sources.Count; i++) {
                    if (sources.GetValueAt(i).Equals(sourceToFind))
                        return i;
                }
                return -1;
            };
            ValidationSummary.UpdateDisplayedErrorsOnAllValidationSummaries = function (parent) {
                if (!parent)
                    return;
                if (parent instanceof ValidationSummary) {
                    parent.UpdateDisplayedErrors();
                }
                else {
                    for (var i = 0, count = Fayde.VisualTreeHelper.GetChildrenCount(parent); i < count; i++) {
                        ValidationSummary.UpdateDisplayedErrorsOnAllValidationSummaries(Fayde.VisualTreeHelper.GetChild(parent, i));
                    }
                }
            };
            ValidationSummary.ShowErrorsInSummaryProperty = DependencyProperty.RegisterAttached("ShowErrorsInSummary", function () { return Boolean; }, ValidationSummary, true, ValidationSummary.OnShowErrorsInSummaryChanged);
            ValidationSummary.ErrorStyleProperty = DependencyProperty.Register("ErrorStyle", function () { return Fayde.Style; }, ValidationSummary);
            ValidationSummary.FilterProperty = DependencyProperty.Register("Filter", function () { return new Fayde.Enum(Controls.ValidationSummaryFilters); }, ValidationSummary, Controls.ValidationSummaryFilters.All, function (d, args) { return d.OnFilterChanged(args.OldValue, args.NewValue); });
            ValidationSummary.FocusControlsOnClickProperty = DependencyProperty.Register("FocusControlsOnClick", function () { return Boolean; }, ValidationSummary, true);
            ValidationSummary.HasErrorsProperty = DependencyProperty.RegisterReadOnly("HasErrors", function () { return Boolean; }, ValidationSummary, false);
            ValidationSummary.HasDisplayedErrorsProperty = DependencyProperty.RegisterReadOnly("HasDisplayedErrors", function () { return Boolean; }, ValidationSummary, false);
            ValidationSummary.HeaderProperty = DependencyProperty.Register("Header", function () { return Object; }, ValidationSummary, undefined, function (d, args) { return d.OnHeaderChanged(args.OldValue, args.NewValue); });
            ValidationSummary.HeaderTemplateProperty = DependencyProperty.Register("HeaderTemplate", function () { return Fayde.DataTemplate; }, ValidationSummary);
            ValidationSummary.SummaryListBoxStyleProperty = DependencyProperty.Register("SummaryListBoxStyle", function () { return Fayde.Style; }, ValidationSummary);
            ValidationSummary.TargetProperty = DependencyProperty.Register("Target", function () { return Fayde.UIElement; }, ValidationSummary, undefined, function (d, args) { return d.OnTargetChanged(args.OldValue, args.NewValue); });
            return ValidationSummary;
        })(Controls.Control);
        Controls.ValidationSummary = ValidationSummary;
        Controls.TemplateVisualStates(ValidationSummary, { GroupName: "CommonStates", Name: "Normal" }, { GroupName: "CommonStates", Name: "Disabled" }, { GroupName: "ValidationStates", Name: "HasErrors" }, { GroupName: "ValidationStates", Name: "Empty" });
        Controls.TemplateParts(ValidationSummary, { Name: "SummaryListBox", Type: Controls.ListBox });
        var ValidationItemCollection = (function (_super) {
            __extends(ValidationItemCollection, _super);
            function ValidationItemCollection() {
                _super.apply(this, arguments);
            }
            ValidationItemCollection.prototype.ClearErrors = function (errorType) {
                var toremove = [];
                for (var en = this.getEnumerator(); en.moveNext();) {
                    if (en.current != null && en.current.ItemType === errorType)
                        toremove.push(en.current);
                }
                for (var i = 0; i < toremove.length; i++) {
                    this.Remove(toremove[i]);
                }
            };
            ValidationItemCollection.prototype.ClearItems = function () {
                while (this.Count > 0) {
                    this.RemoveAt(0);
                }
            };
            return ValidationItemCollection;
        })(ObservableCollection);
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ObservableCollection = Fayde.Collections.ObservableCollection;
        var ValidationSummaryItem = (function (_super) {
            __extends(ValidationSummaryItem, _super);
            function ValidationSummaryItem(message, messageHeader, itemType, source, context) {
                _super.call(this);
                this.Message = message || null;
                this.MessageHeader = messageHeader || null;
                this.ItemType = itemType || Controls.ValidationSummaryItemType.ObjectError;
                this._Sources = new ObservableCollection();
                if (source != null)
                    this._Sources.Add(source);
                this.Context = context;
            }
            Object.defineProperty(ValidationSummaryItem.prototype, "Sources", {
                get: function () {
                    return this._Sources;
                },
                enumerable: true,
                configurable: true
            });
            return ValidationSummaryItem;
        })(Fayde.MVVM.ObservableObject);
        Controls.ValidationSummaryItem = ValidationSummaryItem;
        Fayde.MVVM.NotifyProperties(ValidationSummaryItem, ["Message", "MessageHeader", "ItemType", "Context"]);
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var ValidationSummaryItemSource = (function () {
            function ValidationSummaryItemSource(propertyName, control) {
                Object.defineProperties(this, {
                    "PropertyName": {
                        value: propertyName,
                        writable: false
                    },
                    "Control": {
                        value: control || null,
                        writable: false
                    }
                });
            }
            ValidationSummaryItemSource.prototype.Equals = function (other) {
                if (!(other instanceof ValidationSummaryItemSource))
                    return false;
                var vsis = other;
                return vsis.PropertyName === this.PropertyName && vsis.Control === this.Control;
            };
            return ValidationSummaryItemSource;
        })();
        Controls.ValidationSummaryItemSource = ValidationSummaryItemSource;
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        function compareSummaryItems(item1, item2) {
            var refs = compareRefs(item1, item2);
            if (refs != null)
                return refs;
            var comp = compareNum(item1.ItemType, item2.ItemType);
            if (comp !== 0)
                return comp;
            var control1 = item1.Sources.Count > 0 ? item1.Sources.GetValueAt(0).Control : null;
            var control2 = item2.Sources.Count > 0 ? item2.Sources.GetValueAt(0).Control : null;
            if (control1 !== control2) {
                refs = compareRefs(control1, control2);
                if (refs != null)
                    return refs;
                comp = compareNum(control1.TabIndex, control2.TabIndex);
                if (comp !== 0)
                    return comp;
                return compareVisualOrder(control1, control2);
            }
        }
        Controls.compareSummaryItems = compareSummaryItems;
        function compareRefs(item1, item2) {
            if (item1 == null)
                return item2 == null ? null : -1;
            if (item2 == null)
                return 1;
            return null;
        }
        function compareNum(x, y) {
            return x === y ? 0 : (x < y ? -1 : 1);
        }
        function compareVisualOrder(control1, control2) {
            if (!control1 || !control2 || control1 === control2)
                return 0;
            var trail = [];
            var cur = control1;
            trail.push(cur);
            while ((cur = Fayde.VisualTreeHelper.GetParent(cur)) != null) {
                trail.push(cur);
            }
            cur = control2;
            var last = cur;
            while ((cur = Fayde.VisualTreeHelper.GetParent(cur)) != null) {
                var index = trail.indexOf(cur);
                if (index === 0)
                    return -1;
                if (index < 0)
                    continue;
                var prev = trail[index - 1];
                if (!last || !prev)
                    return 0;
                for (var i = 0, count = Fayde.VisualTreeHelper.GetChildrenCount(cur); i < count; i++) {
                    var child = Fayde.VisualTreeHelper.GetChild(cur, i);
                    if (child === prev)
                        return 1;
                    if (child === last)
                        return -1;
                }
                last = cur;
            }
            return 0;
        }
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var Viewbox = (function (_super) {
            __extends(Viewbox, _super);
            function Viewbox() {
                _super.apply(this, arguments);
            }
            Viewbox.prototype.CreateLayoutUpdater = function () {
                return new Controls.viewbox.ViewboxUpdater();
            };
            Viewbox.ChildProperty = DependencyProperty.Register("Child", function () { return Fayde.UIElement; }, Viewbox);
            Viewbox.StretchProperty = DependencyProperty.Register("Stretch", function () { return new Fayde.Enum(Fayde.Media.Stretch); }, Viewbox, undefined, function (d, args) { return d.InvalidateMeasure(); });
            Viewbox.StretchDirectionProperty = DependencyProperty.Register("StretchDirection", function () { return new Fayde.Enum(Controls.StretchDirection); }, Viewbox, undefined, function (d, args) { return d.InvalidateMeasure(); });
            return Viewbox;
        })(Fayde.FrameworkElement);
        Controls.Viewbox = Viewbox;
        Fayde.Markup.Content(Viewbox, Viewbox.ChildProperty);
        var reactions;
        (function (reactions) {
            Fayde.UIReaction(Viewbox.StretchProperty, function (updater, ov, nv) { return updater.invalidateMeasure(); }, false);
            Fayde.UIReaction(Viewbox.StretchDirectionProperty, function (updater, ov, nv) { return updater.invalidateMeasure(); }, false);
            Fayde.UIReaction(Viewbox.ChildProperty, function (upd, ov, nv, viewbox) {
                var node = viewbox.XamlNode;
                var error = new BError();
                if (ov instanceof Fayde.UIElement)
                    node.DetachVisualChild(ov, error);
                if (nv instanceof Fayde.UIElement)
                    node.AttachVisualChild(nv, error);
                if (error.Message)
                    error.ThrowException();
                upd.updateBounds();
                upd.invalidateMeasure();
            }, false, false);
        })(reactions || (reactions = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var viewbox;
        (function (viewbox) {
            var ViewboxUpdater = (function (_super) {
                __extends(ViewboxUpdater, _super);
                function ViewboxUpdater() {
                    _super.apply(this, arguments);
                }
                ViewboxUpdater.prototype.init = function () {
                    this.setProcessDownPipe(minerva.singleton(viewbox.processdown.ViewboxProcessDownPipeDef));
                    var assets = this.assets;
                    assets.stretch = Fayde.Media.Stretch.Uniform;
                    assets.stretchDirection = Controls.StretchDirection.Both;
                    assets.viewXform = mat3.identity();
                    _super.prototype.init.call(this);
                };
                ViewboxUpdater.prototype.measureOverride = function (availableSize) {
                    var child = this.tree.subtree;
                    if (!child)
                        return new Size();
                    child.measure(new Size(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY));
                    var childSize = child.assets.desiredSize;
                    var scalefac = viewbox.helpers.computeScaleFactor(availableSize, childSize, this.assets.stretch, this.assets.stretchDirection);
                    return new Size(scalefac.width * childSize.width, scalefac.height * childSize.height);
                };
                ViewboxUpdater.prototype.arrangeOverride = function (finalSize) {
                    var child = this.tree.subtree;
                    if (!child)
                        return new Size();
                    var assets = this.assets;
                    var childSize = child.assets.desiredSize;
                    var scale = viewbox.helpers.computeScaleFactor(finalSize, childSize, assets.stretch, assets.stretchDirection);
                    child.arrange(new Rect(0, 0, childSize.width, childSize.height));
                    this.setViewXform(scale.width, scale.height);
                    return new Size(scale.width * childSize.width, scale.height * childSize.height);
                };
                ViewboxUpdater.prototype.setViewXform = function (sx, sy) {
                    var assets = this.assets;
                    var xform = mat3.createScale(sx, sy);
                    if (!mat3.equal(assets.viewXform, xform)) {
                        mat3.copyTo(xform, assets.viewXform);
                        assets.dirtyFlags |= minerva.DirtyFlags.Transform;
                    }
                };
                return ViewboxUpdater;
            })(minerva.anon.AnonymousUpdater);
            viewbox.ViewboxUpdater = ViewboxUpdater;
        })(viewbox = Controls.viewbox || (Controls.viewbox = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var viewbox;
        (function (viewbox) {
            var helpers;
            (function (helpers) {
                function computeScaleFactor(availableSize, contentSize, stretch, stretchDirection) {
                    var scaleX = 1.0;
                    var scaleY = 1.0;
                    var isConstrainedWidth = isFinite(availableSize.width);
                    var isConstrainedHeight = isFinite(availableSize.height);
                    if ((stretch === Fayde.Media.Stretch.Uniform || stretch === Fayde.Media.Stretch.UniformToFill || stretch === Fayde.Media.Stretch.Fill)
                        && (isConstrainedWidth || isConstrainedHeight)) {
                        scaleX = isZero(contentSize.width) ? 0.0 : availableSize.width / contentSize.width;
                        scaleY = isZero(contentSize.height) ? 0.0 : availableSize.height / contentSize.height;
                        if (!isConstrainedWidth)
                            scaleX = scaleY;
                        else if (!isConstrainedHeight)
                            scaleY = scaleX;
                        else {
                            switch (stretch) {
                                case Fayde.Media.Stretch.Uniform:
                                    var minscale = scaleX < scaleY ? scaleX : scaleY;
                                    scaleX = scaleY = minscale;
                                    break;
                                case Fayde.Media.Stretch.UniformToFill:
                                    var maxscale = scaleX > scaleY ? scaleX : scaleY;
                                    scaleX = scaleY = maxscale;
                                    break;
                                case Fayde.Media.Stretch.Fill:
                                    break;
                            }
                        }
                        //Apply stretch direction by bounding scales.
                        //In the uniform case, scaleX=scaleY, so this sort of clamping will maintain aspect ratio
                        //In the uniform fill case, we have the same result too.
                        //In the fill case, note that we change aspect ratio, but that is okay
                        switch (stretchDirection) {
                            case Controls.StretchDirection.UpOnly:
                                if (scaleX < 1.0)
                                    scaleX = 1.0;
                                if (scaleY < 1.0)
                                    scaleY = 1.0;
                                break;
                            case Controls.StretchDirection.DownOnly:
                                if (scaleX > 1.0)
                                    scaleX = 1.0;
                                if (scaleY > 1.0)
                                    scaleY = 1.0;
                                break;
                            case Controls.StretchDirection.Both:
                                break;
                            default:
                                break;
                        }
                    }
                    return new Size(scaleX, scaleY);
                }
                helpers.computeScaleFactor = computeScaleFactor;
                var epsilon = 1.192093E-07;
                function isZero(val) {
                    return Math.abs(val) < epsilon;
                }
            })(helpers = viewbox.helpers || (viewbox.helpers = {}));
        })(viewbox = Controls.viewbox || (Controls.viewbox = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var viewbox;
        (function (viewbox) {
            var processdown;
            (function (processdown) {
                var ViewboxProcessDownPipeDef = (function (_super) {
                    __extends(ViewboxProcessDownPipeDef, _super);
                    function ViewboxProcessDownPipeDef() {
                        _super.call(this);
                        this.addTapinAfter('calcRenderXform', 'applyViewXform', tapins.applyViewXform);
                    }
                    return ViewboxProcessDownPipeDef;
                })(minerva.core.processdown.ProcessDownPipeDef);
                processdown.ViewboxProcessDownPipeDef = ViewboxProcessDownPipeDef;
                var tapins;
                (function (tapins) {
                    function applyViewXform(input, state, output, vpinput, tree) {
                        if ((input.dirtyFlags & minerva.DirtyFlags.Transform) === 0)
                            return true;
                        mat3.preapply(output.renderXform, input.viewXform);
                        return true;
                    }
                    tapins.applyViewXform = applyViewXform;
                })(tapins || (tapins = {}));
            })(processdown = viewbox.processdown || (viewbox.processdown = {}));
        })(viewbox = Controls.viewbox || (Controls.viewbox = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var WrapPanel = (function (_super) {
            __extends(WrapPanel, _super);
            function WrapPanel() {
                _super.apply(this, arguments);
            }
            WrapPanel.prototype.CreateLayoutUpdater = function () {
                return new Controls.wrappanel.WrapPanelUpdater();
            };
            WrapPanel.OrientationProperty = DependencyProperty.Register("Orientation", function () { return new Fayde.Enum(Fayde.Orientation); }, WrapPanel, Fayde.Orientation.Horizontal);
            WrapPanel.ItemWidthProperty = DependencyProperty.Register("ItemWidth", function () { return Number; }, WrapPanel, NaN);
            WrapPanel.ItemHeightProperty = DependencyProperty.Register("ItemHeight", function () { return Number; }, WrapPanel, NaN);
            return WrapPanel;
        })(Fayde.Controls.Panel);
        Controls.WrapPanel = WrapPanel;
        var reactions;
        (function (reactions) {
            Fayde.UIReaction(WrapPanel.OrientationProperty, function (upd, ov, nv) { return upd.invalidateMeasure(); }, false);
            Fayde.UIReaction(WrapPanel.ItemWidthProperty, function (upd, ov, nv) { return upd.invalidateMeasure(); }, false);
            Fayde.UIReaction(WrapPanel.ItemHeightProperty, function (upd, ov, nv) { return upd.invalidateMeasure(); }, false);
        })(reactions || (reactions = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var WrapPanelUpdater = (function (_super) {
                __extends(WrapPanelUpdater, _super);
                function WrapPanelUpdater() {
                    _super.apply(this, arguments);
                }
                WrapPanelUpdater.prototype.init = function () {
                    this.setMeasurePipe(minerva.singleton(wrappanel.measure.WrapPanelMeasurePipeDef))
                        .setArrangePipe(minerva.singleton(wrappanel.arrange.WrapPanelArrangePipeDef));
                    var assets = this.assets;
                    assets.orientation = Fayde.Orientation.Horizontal;
                    assets.itemWidth = NaN;
                    assets.itemHeight = NaN;
                    _super.prototype.init.call(this);
                };
                return WrapPanelUpdater;
            })(minerva.controls.panel.PanelUpdater);
            wrappanel.WrapPanelUpdater = WrapPanelUpdater;
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var arrange;
            (function (arrange) {
                var panel = minerva.controls.panel;
                var WrapPanelArrangePipeDef = (function (_super) {
                    __extends(WrapPanelArrangePipeDef, _super);
                    function WrapPanelArrangePipeDef() {
                        _super.call(this);
                        this.addTapinAfter('doOverride', 'doHorizontal', arrange.tapins.doHorizontal)
                            .addTapinAfter('doOverride', 'doVertical', arrange.tapins.doVertical)
                            .removeTapin('doOverride');
                    }
                    return WrapPanelArrangePipeDef;
                })(panel.arrange.PanelArrangePipeDef);
                arrange.WrapPanelArrangePipeDef = WrapPanelArrangePipeDef;
            })(arrange = wrappanel.arrange || (wrappanel.arrange = {}));
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var arrange;
            (function (arrange) {
                var tapins;
                (function (tapins) {
                    var Size = minerva.Size;
                    function doHorizontal(input, state, output, tree, finalRect) {
                        if (input.orientation !== Fayde.Orientation.Horizontal)
                            return true;
                        var fs = state.finalSize;
                        var as = state.arrangedSize;
                        Size.copyTo(fs, as);
                        var cr = state.childRect;
                        cr.x = cr.y = cr.width = cr.height = 0;
                        var rowHeight = 0;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            var childDesired = child.assets.desiredSize;
                            if (fs.width < (cr.x + childDesired.width)) {
                                cr.x = 0; // reset offsetX to 0
                                cr.y += rowHeight; //offsetY + lastrow height
                                rowHeight = 0; //reset row spacing
                            }
                            rowHeight = Math.max(rowHeight, childDesired.height);
                            Size.copyTo(childDesired, cr);
                            child.arrange(cr);
                            cr.x += childDesired.width;
                        }
                        as.width = Math.max(as.width, fs.width);
                        return true;
                    }
                    tapins.doHorizontal = doHorizontal;
                })(tapins = arrange.tapins || (arrange.tapins = {}));
            })(arrange = wrappanel.arrange || (wrappanel.arrange = {}));
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var arrange;
            (function (arrange) {
                var tapins;
                (function (tapins) {
                    var Size = minerva.Size;
                    function doVertical(input, state, output, tree, finalRect) {
                        if (input.orientation !== Fayde.Orientation.Vertical)
                            return true;
                        var fs = state.finalSize;
                        var as = state.arrangedSize;
                        Size.copyTo(fs, as);
                        var cr = state.childRect;
                        cr.x = cr.y = cr.width = cr.height = 0;
                        var colWidth = 0;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            var childDesired = child.assets.desiredSize;
                            if (fs.height < (cr.y + childDesired.height)) {
                                cr.x += colWidth; //and colWidth
                                cr.y = 0; //reset OffsetY to top
                                colWidth = 0; //reset colWidth
                            }
                            colWidth = Math.max(colWidth, childDesired.width);
                            Size.copyTo(childDesired, cr);
                            child.arrange(cr);
                            cr.y += childDesired.height;
                        }
                        as.height = Math.max(as.height, fs.height);
                        return true;
                    }
                    tapins.doVertical = doVertical;
                })(tapins = arrange.tapins || (arrange.tapins = {}));
            })(arrange = wrappanel.arrange || (wrappanel.arrange = {}));
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var helpers;
            (function (helpers) {
                function coerceChildSize(child, itemWidth, itemHeight) {
                    var node = child.getAttachedValue("$node");
                    var xobj = node ? node.XObject : null;
                    if (!xobj)
                        return;
                    if (isNaN(child.assets.width) && !isNaN(itemWidth))
                        xobj.Width = itemWidth;
                    if (isNaN(child.assets.height) && !isNaN(itemHeight))
                        xobj.Height = itemHeight;
                }
                helpers.coerceChildSize = coerceChildSize;
            })(helpers = wrappanel.helpers || (wrappanel.helpers = {}));
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var measure;
            (function (measure) {
                var panel = minerva.controls.panel;
                var WrapPanelMeasurePipeDef = (function (_super) {
                    __extends(WrapPanelMeasurePipeDef, _super);
                    function WrapPanelMeasurePipeDef() {
                        _super.call(this);
                        this.addTapinAfter('doOverride', 'doHorizontal', measure.tapins.doHorizontal)
                            .addTapinAfter('doOverride', 'doVertical', measure.tapins.doVertical)
                            .removeTapin('doOverride');
                    }
                    return WrapPanelMeasurePipeDef;
                })(panel.measure.PanelMeasurePipeDef);
                measure.WrapPanelMeasurePipeDef = WrapPanelMeasurePipeDef;
            })(measure = wrappanel.measure || (wrappanel.measure = {}));
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var measure;
            (function (measure) {
                var tapins;
                (function (tapins) {
                    function doHorizontal(input, state, output, tree, availableSize) {
                        if (input.orientation !== Fayde.Orientation.Horizontal)
                            return true;
                        var as = state.availableSize;
                        if (!isNaN(input.height))
                            as.height = input.height;
                        as.height = Math.min(as.height, input.maxHeight);
                        as.height = Math.max(as.height, input.minHeight);
                        var ds = output.desiredSize;
                        ds.width = ds.height = 0;
                        var rowHeight = 0;
                        var offsetX = 0;
                        var offsetY = 0;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            //TODO: We should coerce width/height before measure
                            wrappanel.helpers.coerceChildSize(child, input.itemWidth, input.itemHeight);
                            child.measure(as);
                            var childDesired = child.assets.desiredSize;
                            if (as.width < (offsetX + childDesired.width)) {
                                offsetX = 0; // reset offsetX to 0
                                offsetY += rowHeight;
                                rowHeight = 0; //reset row height
                            }
                            rowHeight = Math.max(rowHeight, childDesired.height);
                            ds.height = Math.max(ds.height, offsetY + childDesired.height);
                            ds.width = Math.max(ds.width, offsetX + childDesired.width);
                            offsetX += childDesired.width;
                        }
                        return true;
                    }
                    tapins.doHorizontal = doHorizontal;
                })(tapins = measure.tapins || (measure.tapins = {}));
            })(measure = wrappanel.measure || (wrappanel.measure = {}));
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Controls;
    (function (Controls) {
        var wrappanel;
        (function (wrappanel) {
            var measure;
            (function (measure) {
                var tapins;
                (function (tapins) {
                    function doVertical(input, state, output, tree, availableSize) {
                        if (input.orientation !== Fayde.Orientation.Vertical)
                            return true;
                        var as = state.availableSize;
                        if (!isNaN(input.width))
                            as.width = input.width;
                        as.width = Math.min(as.width, input.maxWidth);
                        as.width = Math.max(as.width, input.minWidth);
                        var ds = output.desiredSize;
                        ds.width = ds.height = 0;
                        var colWidth = 0;
                        var offsetX = 0;
                        var offsetY = 0;
                        for (var walker = tree.walk(); walker.step();) {
                            var child = walker.current;
                            //TODO: We should coerce width/height before measure
                            wrappanel.helpers.coerceChildSize(child, input.itemWidth, input.itemHeight);
                            child.measure(as);
                            var childDesired = child.assets.desiredSize;
                            if (as.height < (offsetY + childDesired.height)) {
                                offsetX += colWidth;
                                offsetY = 0; //reset offsetY to 0
                                colWidth = 0; //reset col spacing
                            }
                            colWidth = Math.max(colWidth, childDesired.width);
                            ds.height = Math.max(ds.height, offsetY + childDesired.height);
                            ds.width = Math.max(ds.width, offsetX + childDesired.width);
                            offsetY += childDesired.height;
                        }
                        return true;
                    }
                    tapins.doVertical = doVertical;
                })(tapins = measure.tapins || (measure.tapins = {}));
            })(measure = wrappanel.measure || (wrappanel.measure = {}));
        })(wrappanel = Controls.wrappanel || (Controls.wrappanel = {}));
    })(Controls = Fayde.Controls || (Fayde.Controls = {}));
})(Fayde || (Fayde = {}));
//# sourceMappingURL=fayde.controls.js.map
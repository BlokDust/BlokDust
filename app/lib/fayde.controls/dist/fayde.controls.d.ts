declare module Fayde.Controls {
    var version: string;
}
declare module Fayde.Controls {
    var Library: nullstone.ILibrary;
}
declare module Fayde.Controls.Primitives {
    class MenuBase extends Fayde.Controls.ItemsControl {
        static ItemContainerStyleProperty: DependencyProperty;
        ItemContainerStyle: Style;
        IsItemItsOwnContainer(item: any): boolean;
        GetContainerForItem(): UIElement;
        PrepareContainerForItem(element: UIElement, item: any): void;
        private static HasDefaultValue(control, propd);
    }
}
declare module Fayde.Controls {
    class ContextMenu extends Primitives.MenuBase {
        static HorizontalOffsetProperty: DependencyProperty;
        static VerticalOffsetProperty: DependencyProperty;
        static IsOpenProperty: DependencyProperty;
        HorizontalOffset: number;
        VerticalOffset: number;
        IsOpen: boolean;
        private OnHorizontalOffsetChanged(args);
        private OnVerticalOffsetChanged(args);
        private OnIsOpenChanged(args);
        Opened: RoutedEvent<RoutedEventArgs>;
        Closed: RoutedEvent<RoutedEventArgs>;
        private $RootVisualTracker;
        constructor();
        OnKeyDown(e: Input.KeyEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseRightButtonDown(e: Input.MouseButtonEventArgs): void;
        private _Owner;
        Owner: DependencyObject;
        private _PopupAlignmentPoint;
        private _SettingIsOpen;
        private _Popup;
        private _Overlay;
        private _HandleOwnerMouseRightButtonDown(sender, e);
        private _HandleOverlayMouseButtonDown(sender, e);
        private _HandleContextMenuSizeChanged(sender, e);
        ChildMenuItemClicked(): void;
        private UpdateContextMenuPlacement();
        private OpenPopup(position);
        OnOpened(e: RoutedEventArgs): void;
        private ClosePopup();
        OnClosed(e: RoutedEventArgs): void;
        private FocusNextItem(down);
    }
}
declare module Fayde.Controls {
    class ContextMenuService {
        static ContextMenuProperty: DependencyProperty;
        static GetContextMenu(d: DependencyObject): ContextMenu;
        static SetContextMenu(d: DependencyObject, value: ContextMenu): void;
        private static OnContextMenuPropertyChanged(d, args);
    }
}
declare module Fayde.Controls {
    class DatePicker extends Control {
        static SelectedMonthProperty: DependencyProperty;
        static SelectedDayProperty: DependencyProperty;
        static SelectedYearProperty: DependencyProperty;
        static SelectedDateProperty: DependencyProperty;
        SelectedMonth: number;
        SelectedDay: number;
        SelectedYear: number;
        SelectedDate: DateTime;
        private OnSelectedMonthChanged(args);
        private OnSelectedDayChanged(args);
        private OnSelectedYearChanged(args);
        private OnSelectedDateChanged(args);
        private _MonthTextBox;
        private _DayTextBox;
        private _YearTextBox;
        private _MonthGesture;
        private _DayGesture;
        private _YearGesture;
        private _SelectionHandler;
        constructor();
        OnApplyTemplate(): void;
        private CoerceMonth(month);
        private CoerceDay(day);
        private CoerceYear(year);
        private CoerceDate();
        private _UpdateText();
    }
}
declare module Fayde.Controls {
    enum ValidSpinDirections {
        None = 0,
        Increase = 1,
        Decrease = 2,
    }
    enum SpinDirection {
        Increase = 0,
        Decrease = 1,
    }
    enum InvalidInputAction {
        UseFallbackItem = 0,
        TextBoxCannotLoseFocus = 1,
    }
    enum Dock {
        Left = 0,
        Top = 1,
        Right = 2,
        Bottom = 3,
    }
    enum DatePickerFormat {
        Long = 0,
        Short = 1,
    }
    enum TimeDisplayMode {
        Regular = 0,
        Military = 1,
    }
    enum ValidationSummaryFilters {
        None = 0,
        ObjectErrors = 1,
        PropertyErrors = 2,
        All = 3,
    }
    enum ValidationSummaryItemType {
        ObjectError = 1,
        PropertyError = 2,
    }
    enum StretchDirection {
        UpOnly = 0,
        DownOnly = 1,
        Both = 2,
    }
}
declare module Fayde.Controls {
    class Spinner extends Control {
        static ContentProperty: DependencyProperty;
        static ValidSpinDirectionProperty: DependencyProperty;
        Content: any;
        ValidSpinDirection: ValidSpinDirections;
        OnContentChanged(oldContent: any, newContent: any): void;
        OnValidSpinDirectionChanged(args: IDependencyPropertyChangedEventArgs): void;
        Spin: RoutedEvent<SpinEventArgs>;
        OnSpin(e: SpinEventArgs): void;
        private _IncreaseButton;
        private _DecreaseButton;
        constructor();
        OnApplyTemplate(): void;
        private OnIncreaseClick(sender, e);
        private OnDecreaseClick(sender, e);
        private EnableButtons();
        GoToStates(gotoFunc: (state: string) => boolean): void;
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean;
        GoToStateIncrease(gotoFunc: (state: string) => boolean): boolean;
        GoToStateDecrease(gotoFunc: (state: string) => boolean): boolean;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
    }
}
declare module Fayde.Controls {
    class UpDownBase<T> extends Control {
        private _IgnoreValueChange;
        _TextBox: TextBox;
        _Spinner: Spinner;
        private _Text;
        static SpinnerStyleProperty: DependencyProperty;
        SpinnerStyle: Style;
        private OnSpinnerStyleChanged(oldStyle, newStyle);
        Value: T;
        _OnValueChanged(args: IDependencyPropertyChangedEventArgs): void;
        OnValueChanging(e: RoutedPropertyChangingEventArgs<T>): void;
        OnValueChanged(e: RoutedPropertyChangedEventArgs<T>): void;
        static IsEditableProperty: DependencyProperty;
        IsEditable: boolean;
        private OnIsEditableChanged(args);
        ValueChanging: RoutedPropertyChangingEvent<T>;
        ValueChanged: RoutedPropertyChangedEvent<T>;
        Parsing: RoutedEvent<UpDownParsingEventArgs<T>>;
        ParseError: RoutedEvent<UpDownParseErrorEventArgs>;
        OnApplyTemplate(): void;
        private SetTextBox(d);
        private SetSpinner(d);
        OnKeyDown(e: Fayde.Input.KeyEventArgs): void;
        OnMouseWheel(e: Fayde.Input.MouseWheelEventArgs): void;
        ApplyValue(text: string): void;
        OnParseError(e: UpDownParseErrorEventArgs): void;
        OnParsing(e: UpDownParsingEventArgs<T>): void;
        ParseValue(text: string): T;
        FormatValue(): string;
        SelectAllText(): void;
        SetTextBoxText(): void;
        private TextBox_LostFocus(sender, e);
        private TextBox_GotFocus(sender, e);
        private Spinner_Spin(sender, e);
        OnSpin(e: SpinEventArgs): void;
        private ProcessUserInput();
        private DoDecrement();
        OnDecrement(): void;
        private DoIncrement();
        OnIncrement(): void;
    }
}
declare module Fayde.Controls {
    interface IOutValue {
        Value: any;
    }
    class DomainUpDown extends Control {
        static ValueProperty: DependencyProperty;
        static IsEditableProperty: DependencyProperty;
        static SpinnerStyleProperty: DependencyProperty;
        static CurrentIndexProperty: DependencyProperty;
        static IsCyclicProperty: DependencyProperty;
        static InvalidInputActionProperty: DependencyProperty;
        static FallbackItemProperty: DependencyProperty;
        static ItemsSourceProperty: DependencyProperty;
        static ItemTemplateProperty: DependencyProperty;
        Value: any;
        IsEditable: boolean;
        SpinnerStyle: Style;
        CurrentIndex: number;
        IsCyclic: boolean;
        InvalidInputAction: InvalidInputAction;
        FallbackItem: any;
        ItemsSource: nullstone.IEnumerable<any>;
        ItemTemplate: DataTemplate;
        Items: Internal.ObservableObjectCollection;
        OnValueChanged(oldItem: any, newItem: any): void;
        OnCurrentIndexChanged(oldIndex: number, newIndex: number): void;
        private _OnIsCyclicChanged(args);
        private _OnItemsSourceChanged(oldItemsSource, newItemsSource);
        private _ItemsSourceModified(sender, e);
        private _OnItemsChanged(sender, e);
        ValueChanging: RoutedPropertyChangingEvent<number>;
        ParseError: RoutedEvent<UpDownParseErrorEventArgs>;
        ValueMemberPath: string;
        private _ValueBindingEvaluator;
        ValueMemberBinding: Fayde.Data.Binding;
        private _Coercer;
        private _SpinFlow;
        private _CanEditByFocus;
        constructor();
        OnApplyTemplate(): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnMouseEnter(e: Fayde.Input.MouseEventArgs): void;
        OnMouseLeave(e: Fayde.Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Fayde.Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Fayde.Input.MouseButtonEventArgs): void;
        GoToStates(gotoFunc: (state: string) => boolean): void;
        GoToStateEditing(gotoFunc: (state: string) => boolean): boolean;
        GoToStateValid(gotoFunc: (state: string) => boolean): boolean;
        private UpdateValidSpinDirection();
        private TryEnterEditMode();
        OnIsEditingChanged(isEditing: boolean): void;
        OnIsInvalidInputChanged(isInvalid: boolean): void;
        OnSpin(): void;
        OnIncrement(): void;
        OnDecrement(): void;
        TryParseValue(text: string, ov: IOutValue): boolean;
        FormatValue(): string;
    }
}
declare module Fayde.Controls {
    class GridSplitter extends Control {
        private _Helper;
        private _HorizontalTemplate;
        private _VerticalTemplate;
        private _DragStart;
        private _IsDragging;
        constructor();
        OnApplyTemplate(): void;
        private _OnLayoutUpdated(sender, e);
        private _OnResizeDirectionChanged();
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        private InitHelper();
        private _HandleMove(horiz, vert, isKeyboard);
        private _GetTransformedPos(e);
    }
}
declare module Fayde.Controls {
    class HeaderedItemsControl extends ItemsControl {
        private _HeaderIsItem;
        private _ItemsControlHelper;
        static HeaderProperty: DependencyProperty;
        static HeaderTemplateProperty: DependencyProperty;
        static ItemContainerStyleProperty: DependencyProperty;
        Header: any;
        HeaderTemplate: DataTemplate;
        ItemContainerStyle: Style;
        OnHeaderChanged(oldHeader: any, newHeader: any): void;
        OnHeaderTemplateChanged(oldHeaderTemplate: DataTemplate, newHeaderTemplate: DataTemplate): void;
        private OnItemContainerStyleChanged(args);
        constructor();
        OnApplyTemplate(): void;
        PrepareContainerForItem(element: UIElement, item: any): void;
        static PrepareHeaderedItemsControlContainer(control: HeaderedItemsControl, item: any, parentItemsControl: ItemsControl, parentItemContainerStyle: Style): void;
    }
}
declare module Fayde.Controls {
    class MenuItem extends Fayde.Controls.HeaderedItemsControl {
        ParentMenuBase: Primitives.MenuBase;
        Click: RoutedEvent<RoutedEventArgs>;
        static CommandProperty: DependencyProperty;
        static CommandParameterProperty: DependencyProperty;
        static IconProperty: DependencyProperty;
        Command: Input.ICommand;
        CommandParameter: any;
        Icon: any;
        private OnCommandChanged(args);
        private _CanExecuteChanged(sender, e);
        private OnCommandParameterChanged(args);
        constructor();
        OnApplyTemplate(): void;
        private UpdateIsEnabled();
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseRightButtonDown(e: Input.MouseButtonEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        private OnClick();
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean;
    }
}
declare module Fayde.Controls {
    class NumericUpDown extends Control {
        static MinimumProperty: DependencyProperty;
        static MaximumProperty: DependencyProperty;
        static ValueProperty: DependencyProperty;
        static IncrementProperty: DependencyProperty;
        static DecimalPlacesProperty: DependencyProperty;
        static SpinnerStyleProperty: DependencyProperty;
        static IsEditableProperty: DependencyProperty;
        Minimum: number;
        Maximum: number;
        Value: number;
        Increment: number;
        DecimalPlaces: number;
        SpinnerStyle: Style;
        IsEditable: boolean;
        OnMinimumChanged(oldMinimum: number, newMinimum: number): void;
        OnMaximumChanged(oldMaximum: number, newMaximum: number): void;
        OnValueChanged(oldValue: number, newValue: number): void;
        OnIncrementChanged(oldIncrement: number, newIncrement: number): void;
        OnDecimalPlacesChanged(oldDecimalPlaces: number, newDecimalPlaces: number): void;
        Parsing: RoutedEvent<UpDownParsingEventArgs<number>>;
        ParseError: RoutedEvent<UpDownParseErrorEventArgs>;
        private _Coercer;
        private _Formatter;
        private _SpinFlow;
        constructor();
        OnApplyTemplate(): void;
        private UpdateValidSpinDirection();
        ParseValue(text: string): number;
        FormatValue(val: number): string;
        OnSpin(): void;
        OnIncrement(): void;
        OnDecrement(): void;
    }
}
declare module Fayde.Controls {
    class Separator extends Control {
        constructor();
    }
}
declare module Fayde.Controls {
    class SpinEventArgs extends RoutedEventArgs {
        Direction: SpinDirection;
        constructor(direction: SpinDirection);
    }
}
declare module Fayde.Controls {
    class TabControl extends ItemsControl {
        static SelectedItemProperty: DependencyProperty;
        static SelectedIndexProperty: DependencyProperty;
        static SelectedContentProperty: DependencyProperty;
        static TabStripPlacementProperty: DependencyProperty;
        SelectedItem: any;
        SelectedIndex: number;
        SelectedContent: any;
        TabStripPlacement: Dock;
        SelectionChanged: RoutedEvent<Primitives.SelectionChangedEventArgs>;
        private _ElementTemplateTop;
        private _ElementTemplateBottom;
        private _ElementTemplateLeft;
        private _ElementTemplateRight;
        private _ElementTabPanelTop;
        private _ElementTabPanelBottom;
        private _ElementTabPanelLeft;
        private _ElementTabPanelRight;
        private _ElementContentTop;
        private _ElementContentBottom;
        private _ElementContentLeft;
        private _ElementContentRight;
        private _UpdateIndex;
        private _DesiredIndex;
        constructor();
        OnApplyTemplate(): void;
        private OnSelectedItemChanged(args);
        private OnSelectedIndexChanged(args);
        private OnSelectedContentChanged(args);
        private OnTabStripPlacementPropertyChanged(args);
        OnItemsChanged(e: Collections.CollectionChangedEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        private _FindEndTabItem();
        private _FindHomeTabItem();
        private SelectItem(oldItem, newItem);
        OnSelectionChanged(e: Controls.Primitives.SelectionChangedEventArgs): void;
        private UpdateTabPanelLayout(oldValue, newValue);
        private UpdateSelectedContent(content);
        private EnsureLanguageBinding(tabItem);
        private ClearLanguageBinding(tabItem);
        private _AddToTabPanel(ti);
        private _InsertIntoTabPanel(index, ti);
        private _RemoveFromTabPanel(ti);
        private _ClearTabPanel();
        private _GetTabPanel(tabPlacement);
        private _GetTemplate(tabPlacement);
        private _GetContentHost(tabPlacement);
        private _GetItemAtIndex(index);
        private _ThrowInvalidTabItem(obj);
    }
}
declare module Fayde.Controls {
    class TabItem extends ContentControl {
        static HasHeaderProperty: DependencyProperty;
        static HeaderProperty: DependencyProperty;
        static HeaderTemplateProperty: DependencyProperty;
        static IsFocusedProperty: DependencyProperty;
        static IsSelectedProperty: DependencyProperty;
        HasHeader: boolean;
        Header: any;
        HeaderTemplate: DataTemplate;
        IsFocused: boolean;
        IsSelected: boolean;
        private _SelectedElements;
        private _UnselectedElements;
        private _PreviousTemplate;
        private _PreviousHeader;
        TabStripPlacement: Dock;
        private TabControlParent;
        constructor();
        OnApplyTemplate(): void;
        private _OnHeaderChanged(args);
        OnHeaderChanged(oldValue: any, newValue: any): void;
        OnHeaderTemplateChanged(oldHeaderTemplate: DataTemplate, newHeaderTemplate: DataTemplate): void;
        private _OnIsSelectedChanged(args);
        OnSelected(e: RoutedEventArgs): void;
        OnUnselected(e: RoutedEventArgs): void;
        UpdateVisualState(useTransitions?: boolean): void;
        private _UpdateHeaderVisuals();
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnContentChanged(oldContent: any, newContent: any): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        GetTemplate(isSelected: boolean, tabPlacement: Dock): FrameworkElement;
        private _GetContentControl(isSelected, tabPlacement);
        private _FindPreviousTabItem(startIndex);
        private _FindNextTabItem(startIndex);
    }
}
declare module Fayde.Controls {
    class TimePicker extends Control {
        static SelectedHourProperty: DependencyProperty;
        static SelectedMinuteProperty: DependencyProperty;
        static SelectedSecondProperty: DependencyProperty;
        static SelectedTimeProperty: DependencyProperty;
        static IsSecondsShownProperty: DependencyProperty;
        static DisplayModeProperty: DependencyProperty;
        SelectedHour: number;
        SelectedMinute: number;
        SelectedSecond: number;
        SelectedTime: TimeSpan;
        IsSecondsShown: boolean;
        DisplayMode: TimeDisplayMode;
        private OnSelectedHourChanged(args);
        private OnSelectedMinuteChanged(args);
        private OnSelectedSecondChanged(args);
        private OnSelectedTimeChanged(args);
        private OnDisplayModeChanged(args);
        private _HourTextBox;
        private _MinuteTextBox;
        private _SecondTextBox;
        private _SecondSeparator;
        private _SuffixTextBlock;
        private _HourGesture;
        private _MinuteGesture;
        private _SecondGesture;
        private _SuffixGesture;
        private _SelectionHandler;
        constructor();
        OnApplyTemplate(): void;
        private _GetHourInput();
        private CoerceHour(hour);
        private CoerceMinute(minute);
        private CoerceSecond(second);
        private CoerceTime();
        private ToggleAmPm();
        private _UpdateText();
    }
}
declare module Fayde.Controls {
    class TreeView extends ItemsControl {
        static SelectedItemProperty: DependencyProperty;
        static SelectedValueProperty: DependencyProperty;
        static SelectedValuePathProperty: DependencyProperty;
        static ItemContainerStyleProperty: DependencyProperty;
        SelectedItem: any;
        SelectedValue: any;
        SelectedValuePath: string;
        ItemContainerStyle: Style;
        private OnSelectedItemChanged(e);
        private OnSelectedValueChanged(e);
        private OnSelectedValuePathChanged(e);
        private OnItemContainerStyleChanged(e);
        private _AllowWrite;
        private _IgnorePropertyChange;
        SelectedContainer: TreeViewItem;
        IsSelectedContainerHookedUp: boolean;
        IsSelectionChangeActive: boolean;
        ItemsControlHelper: Internal.ItemsControlHelper;
        private SelectedItemChanged;
        constructor();
        OnApplyTemplate(): void;
        GetContainerForItem(): UIElement;
        IsItemItsOwnContainer(item: any): boolean;
        PrepareContainerForItem(element: UIElement, item: any): void;
        ClearContainerForItem(element: UIElement, item: any): void;
        OnItemsChanged(e: Collections.CollectionChangedEventArgs): void;
        CheckForSelectedDescendents(item: TreeViewItem): void;
        PropagateKeyDown(e: Input.KeyEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        private HandleScrollByPage(up);
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        HandleMouseButtonDown(): boolean;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        ChangeSelection(itemOrContainer: any, container: TreeViewItem, selected: boolean): void;
        private UpdateSelectedValue(item);
        private SelectFirstItem();
        private FocusFirstItem();
        private FocusLastItem();
    }
}
declare module Fayde.Controls {
    class TreeViewItem extends HeaderedItemsControl {
        static HasItemsProperty: DependencyProperty;
        static IsExpandedProperty: DependencyProperty;
        static IsSelectedProperty: DependencyProperty;
        static IsSelectionActiveProperty: DependencyProperty;
        HasItems: boolean;
        private $SetHasItems(value);
        IsExpanded: boolean;
        IsSelected: boolean;
        IsSelectionActive: boolean;
        private $SetIsSelectionActive(value);
        private OnHasItemsChanged(e);
        private OnIsExpandedPropertyChanged(e);
        private OnIsSelectedChanged(e);
        private OnIsSelectionActiveChanged(e);
        Collapsed: RoutedEvent<RoutedEventArgs>;
        Expanded: RoutedEvent<RoutedEventArgs>;
        Selected: RoutedEvent<RoutedEventArgs>;
        Unselected: RoutedEvent<RoutedEventArgs>;
        private _AllowWrite;
        IgnorePropertyChange: boolean;
        private ContainsSelection;
        private CancelGotFocusBubble;
        RequiresContainsSelectionUpdate: boolean;
        private UserInitiatedExpansion;
        private _expanderButton;
        private ExpanderButton;
        private _headerElement;
        HeaderElement: FrameworkElement;
        private _expansionStateGroup;
        private ExpansionStateGroup;
        private _parentItemsControl;
        ParentItemsControl: ItemsControl;
        private ParentTreeViewItem;
        private ParentTreeView;
        private IsRoot;
        private CanExpandOnInput;
        private _MultiClick;
        private _IsPressed;
        constructor();
        OnApplyTemplate(): void;
        private OnExpansionStateGroupStateChanged(sender, e);
        private BringIntoView();
        GoToStates(gotoFunc: (state: string) => boolean): void;
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean;
        GoToStateExpansion(gotoFunc: (state: string) => boolean): boolean;
        GoToStateHasItems(gotoFunc: (state: string) => boolean): boolean;
        GoToStateSelection(gotoFunc: (state: string) => boolean): boolean;
        GetContainerForItem(): UIElement;
        IsItemItsOwnContainer(item: any): boolean;
        PrepareContainerForItem(element: UIElement, item: any): void;
        ClearContainerForItem(element: UIElement, item: any): void;
        OnItemsChanged(e: Collections.CollectionChangedEventArgs): void;
        OnExpanded(e: RoutedEventArgs): void;
        OnCollapsed(e: RoutedEventArgs): void;
        private ToggleExpanded();
        OnSelected(e: RoutedEventArgs): void;
        OnUnselected(e: RoutedEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        private OnExpanderGotFocus(sender, e);
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        private OnHeaderMouseLeftButtonDown(sender, e);
        private OnExpanderClick(sender, e);
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        HandleRightKey(): boolean;
        HandleLeftKey(): boolean;
        HandleDownKey(): boolean;
        HandleUpKey(): boolean;
        HandleScrollByPage(up: boolean, scrollHost: ScrollViewer, viewportHeight: number, top: number, bottom: number, currentDelta: IOutValue): boolean;
        private Select(selected);
        UpdateContainsSelection(selected: boolean): void;
        private AllowKeyHandleEvent();
        FocusDown(): boolean;
        FocusInto(): boolean;
        private FindNextFocusableItem(recurse);
        private FindLastFocusableItem();
        private FindPreviousFocusableItem();
    }
}
declare module Fayde.Controls {
    class UpDownParseErrorEventArgs extends RoutedEventArgs {
        Text: string;
        Error: Error;
        Handled: boolean;
        constructor(text: string, error: Error);
    }
}
declare module Fayde.Controls {
    class UpDownParsingEventArgs<T> extends RoutedEventArgs {
        Text: string;
        Value: T;
        Handled: boolean;
        constructor(text: string);
    }
}
declare module Fayde.Controls.contextmenu {
    class RootVisualTracker {
        mousePosition: Point;
        private $$rootVisual;
        private $$onSizeChanged;
        rootVisual: FrameworkElement;
        constructor(owner: FrameworkElement);
        tryInit(visual: UIElement): void;
        setOnSizeChanged(onSizeChanged?: (newSize: minerva.Size) => any): void;
        getAvailableSize(): minerva.Size;
        private _HandleLayoutUpdated(sender, e);
        private _HandleRootVisualMouseMove(sender, e);
        private _HandleSizeChanged(sender, e);
    }
}
declare module Fayde.Controls.Internal {
    class BindingSourceEvaluator<T> extends FrameworkElement {
        static ValueProperty: DependencyProperty;
        Value: T;
        private _ValueBinding;
        ValueBinding: Data.Binding;
        constructor(binding: Data.Binding);
        GetDynamicValue(source: any): T;
    }
}
declare module Fayde.Controls.Internal {
    interface IDomainOwner extends UIElement {
        Items: Internal.ObservableObjectCollection;
        InvalidInputAction: InvalidInputAction;
        FallbackItem: any;
        Value: any;
        CurrentIndex: number;
        IsEditable: boolean;
        OnValueChanged(oldValue: any, newValue: any): any;
        OnCurrentIndexChanged(oldIndex: number, newIndex: number): any;
        OnIsEditingChanged(isEditing: boolean): any;
        OnIsInvalidInputChanged(isInvalidInput: boolean): any;
        TryParseValue(text: string, ov: IOutValue): boolean;
        FormatValue(): string;
        ParseError: RoutedEvent<UpDownParseErrorEventArgs>;
    }
    interface IDomainCoercer {
        IsEditing: boolean;
        IsInvalidInput: boolean;
        OnValueChanged(oldValue: any, newValue: any): any;
        OnCurrentIndexChanged(oldIndex: number, newIndex: number): any;
        UpdateTextBoxText(): any;
        UpdateIsEditable(): any;
        ProcessUserInput(): any;
        Attach(textBox: TextBox): any;
        Detach(): any;
        EscapeFocus(): any;
    }
    class DomainCoercer implements IDomainCoercer {
        Owner: IDomainOwner;
        OnCoerceValue: (val: any) => void;
        OnCoerceCurrentIndex: (val: number) => void;
        TextBox: TextBox;
        Text: string;
        IsCoercing: boolean;
        private _IsEditing;
        IsEditing: boolean;
        private OnIsEditingChanged(isEditing);
        private _IsInvalidInput;
        IsInvalidInput: boolean;
        constructor(Owner: IDomainOwner, OnCoerceValue: (val: any) => void, OnCoerceCurrentIndex: (val: number) => void);
        Attach(textBox: TextBox): void;
        Detach(): void;
        private OnKeyDown(sender, e);
        EscapeFocus(): void;
        OnValueChanged(oldValue: any, newValue: any): void;
        OnCurrentIndexChanged(oldIndex: number, newIndex: number): void;
        private TextBox_LostFocus(sender, e);
        private TextBox_GotFocus(sender, e);
        SelectAllText(): void;
        UpdateTextBoxText(): void;
        UpdateIsEditable(): void;
        ProcessUserInput(): void;
        OnParseError(e: UpDownParseErrorEventArgs): void;
        private ApplyValue(text);
    }
}
declare module Fayde.Controls.Internal {
    class EventGesture<T extends UIElement> {
        Target: UIElement;
        private _Callback;
        Attach(event: nullstone.Event<nullstone.IEventArgs>, callback: (t: T, e: nullstone.IEventArgs) => void): void;
        Detach(): void;
        private _OnEvent(sender, e);
    }
}
declare module Fayde.Controls.Internal {
    interface IFormattedRange extends IRange {
        DecimalPlaces: number;
        OnDecimalPlacesChanged(oldDecPlaces: number, newDecPlaces: number): any;
    }
    interface IFormattedRangeCoercer extends IRangeCoercer {
        OnDecimalPlacesChanged(oldDecPlaces: number, newDecPlaces: number): any;
        AddToValue(inc: number): any;
    }
    class FormattedRangeCoercer extends RangeCoercer implements IFormattedRangeCoercer {
        OnCoerceFormat: () => void;
        constructor(range: IFormattedRange, onCoerceMaximum: (val: any) => void, onCoerceValue: (val: any) => void, OnCoerceFormat: () => void);
        OnDecimalPlacesChanged(oldDecPlaces: number, newDecPlaces: number): void;
        AddToValue(inc: number): void;
    }
}
declare module Fayde.Controls.Internal {
    enum GridResizeDirection {
        Auto = 0,
        Columns = 1,
        Rows = 2,
    }
    enum GridResizeBehavior {
        BasedOnAlignment = 0,
        CurrentAndNext = 1,
        PreviousAndCurrent = 2,
        PreviousAndNext = 3,
    }
    enum SplitBehavior {
        Split = 0,
        ResizeDefinition1 = 1,
        ResizeDefinition2 = 2,
    }
    class GridSplitterResizer {
        Direction: GridResizeDirection;
        Behavior: GridResizeBehavior;
        SplitBehavior: SplitBehavior;
        SplitterIndex: number;
        SplitterLength: number;
        DS1: IDefinitionSize;
        DS2: IDefinitionSize;
        constructor(gs: GridSplitter);
        Setup(gs: GridSplitter, grid: Grid): boolean;
        Move(grid: Grid, horiz: number, vert: number): boolean;
        UpdateResizeDirection(gs: GridSplitter): boolean;
        private SetLengths(grid, definition1Pixels, definition2Pixels);
        private GetConstraints();
        private GetBehaviorIndices(index);
    }
    interface IDefinitionSize {
        ActualSize: number;
        MaxSize: number;
        MinSize: number;
        Size: GridLength;
        IsStar: boolean;
        Index: number;
        OrigActualSize: number;
    }
}
declare module Fayde.Controls.Internal {
    class ItemsControlHelper {
        private _itemsHost;
        private _scrollHost;
        ItemsControl: ItemsControl;
        ItemsHost: Panel;
        ScrollHost: ScrollViewer;
        constructor(control: ItemsControl);
        OnApplyTemplate(): void;
        static PrepareContainerForItemOverride(element: DependencyObject, parentItemContainerStyle: Style): void;
        UpdateItemContainerStyle(itemContainerStyle: Style): void;
        ScrollIntoView(element: FrameworkElement): void;
    }
}
declare module Fayde.Controls.Internal {
    class MultiClickHelper {
        ClickCount: number;
        LastClickTime: number;
        LastClickPosition: Point;
        OnMouseLeftButtonDown(control: Control, e: Input.MouseButtonEventArgs): void;
    }
}
declare module Fayde.Controls.Internal {
    class ObservableObjectCollection extends Collections.ObservableCollection<any> {
        IsReadOnly: boolean;
        constructor(collection?: nullstone.IEnumerable<any>);
        Add(value: any): void;
        AddRange(values: any[]): void;
        Insert(item: any, index: number): void;
        RemoveAt(index: number): void;
        SetValueAt(index: number, item: any): void;
        Clear(): void;
    }
}
declare module Fayde.Controls.Internal {
    class ScrollEx {
        static HandleKey(sv: ScrollViewer, key: Input.Key, flowDirection: FlowDirection): boolean;
        static LineUp(viewer: ScrollViewer): void;
        static LineDown(viewer: ScrollViewer): void;
        static LineLeft(viewer: ScrollViewer): void;
        static LineRight(viewer: ScrollViewer): void;
        static PageUp(viewer: ScrollViewer): void;
        static PageDown(viewer: ScrollViewer): void;
        static PageLeft(viewer: ScrollViewer): void;
        static PageRight(viewer: ScrollViewer): void;
        static ScrollToTop(viewer: ScrollViewer): void;
        static ScrollToBottom(viewer: ScrollViewer): void;
        static GetTopAndBottom(element: FrameworkElement, parent: FrameworkElement, top: IOutValue, bottom: IOutValue): void;
    }
}
declare module Fayde.Controls.Internal {
    class SelectionHandler {
        private _ActiveBox;
        ActiveBox: TextBox;
        private _IsMouseDown;
        private _TextBoxes;
        constructor(textBoxes: TextBox[]);
        Dispose(): void;
        private _GotFocus(sender, e);
        private _MouseDown(sender, e);
        private _MouseUp(sender, e);
        private _LostFocus(sender, e);
    }
}
declare module Fayde.Controls.Internal {
    interface ISpinOwner extends UIElement {
        OnSpin(): any;
        OnIncrement(): any;
        OnDecrement(): any;
    }
    interface ISpinFlow {
        UpdateValid(increase: boolean, decrease: boolean): any;
        Dispose(): any;
    }
    class SpinFlow implements ISpinFlow {
        Owner: ISpinOwner;
        Spinner: Spinner;
        constructor(Owner: ISpinOwner, Spinner: Spinner);
        UpdateValid(increase: boolean, decrease: boolean): void;
        Dispose(): void;
        private OnKeyDown(sender, e);
        private OnMouseWheel(sender, e);
        private Spinner_Spin(sender, e);
        private DoIncrement();
        private DoDecrement();
    }
}
declare module Fayde.Controls.Internal {
    interface IFormattedControl<T> {
        Value: T;
        IsEditable: boolean;
        ParseValue(text: string): T;
        FormatValue(val: T): string;
        Parsing: RoutedEvent<UpDownParsingEventArgs<T>>;
        ParseError: RoutedEvent<UpDownParseErrorEventArgs>;
    }
    interface ITextBoxFormatter {
        ProcessUserInput(): any;
        Dispose(): any;
        UpdateTextBoxText(): any;
        UpdateIsEditable(): any;
    }
    class TextBoxFormatter<T> implements ITextBoxFormatter {
        Control: IFormattedControl<T>;
        TextBox: TextBox;
        OnCoerceValue: (val: any) => void;
        Value: T;
        Text: string;
        constructor(Control: IFormattedControl<T>, TextBox: TextBox, OnCoerceValue: (val: any) => void);
        ProcessUserInput(): void;
        Dispose(): void;
        private TextBox_LostFocus(sender, e);
        private TextBox_GotFocus(sender, e);
        ApplyValue(text: string): void;
        OnParseError(e: UpDownParseErrorEventArgs): void;
        OnParsing(e: UpDownParsingEventArgs<T>): void;
        SelectAllText(): void;
        UpdateTextBoxText(): void;
        UpdateIsEditable(): void;
    }
}
declare module Fayde.Controls {
    class TabPanel extends Panel {
        CreateLayoutUpdater(): tabpanel.TabPanelUpdater;
        private TabAlignment;
        static setTabAlignment(tp: TabPanel, alignment: Dock): void;
    }
}
declare module Fayde.Controls.tabpanel {
    interface ITabPanelUpdaterAssets extends minerva.controls.panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }
    class TabPanelUpdater extends minerva.controls.panel.PanelUpdater {
        assets: ITabPanelUpdaterAssets;
        init(): void;
    }
}
declare module Fayde.Controls.tabpanel.arrange {
    import panel = minerva.controls.panel;
    interface IInput extends panel.arrange.IInput {
        tabAlignment: Dock;
        numRows: number;
        numHeaders: number;
        rowHeight: number;
    }
    interface IState extends panel.arrange.IState {
    }
    interface IOutput extends panel.arrange.IOutput {
    }
    class TabPanelArrangePipeDef extends minerva.controls.panel.arrange.PanelArrangePipeDef {
        constructor();
    }
}
declare module Fayde.Controls.tabpanel.arrange.tapins {
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: minerva.controls.panel.PanelUpdaterTree, finalRect: minerva.Rect): boolean;
}
declare module Fayde.Controls.tabpanel.arrange.tapins {
    function doVertical(input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, finalRect: minerva.Rect): boolean;
}
declare module Fayde.Controls.tabpanel {
    import Size = minerva.Size;
    import PanelUpdaterTree = minerva.controls.panel.PanelUpdaterTree;
    module helpers {
        function getDesiredSizeWithoutMargin(upd: minerva.core.Updater): Size;
        function getHeadersSize(tree: PanelUpdaterTree): number[];
        function setTabItemZ(upd: minerva.core.Updater): void;
        function getActiveRow(tree: PanelUpdaterTree, solution: number[], isDockTop: boolean): number;
        function calculateHeaderDistribution(tree: PanelUpdaterTree, rowWidthLimit: number, headerWidth: number[]): number[];
    }
}
declare module Fayde.Controls.tabpanel.measure {
    import panel = minerva.controls.panel;
    interface IInput extends panel.measure.IInput {
        tabAlignment: Dock;
        numRows: number;
        numHeaders: number;
        rowHeight: number;
    }
    interface IState extends panel.measure.IState {
    }
    interface IOutput extends panel.measure.IOutput {
        numRows: number;
        numHeaders: number;
        rowHeight: number;
    }
    class TabPanelMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor();
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module Fayde.Controls.tabpanel.measure.tapins {
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: minerva.Size): boolean;
}
declare module Fayde.Controls.tabpanel.measure.tapins {
    function doVertical(input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: minerva.Size): boolean;
}
declare module Fayde.Controls {
    class FocusingInvalidControlEventArgs implements nullstone.IEventArgs {
        Handled: boolean;
        Item: ValidationSummaryItem;
        Target: ValidationSummaryItemSource;
        constructor(item: ValidationSummaryItem, target: ValidationSummaryItemSource);
    }
}
declare module Fayde.Controls {
    import ObservableCollection = Fayde.Collections.ObservableCollection;
    import ReadOnlyObservableCollection = Fayde.Collections.ReadOnlyObservableCollection;
    class ValidationSummary extends Control {
        static ShowErrorsInSummaryProperty: DependencyProperty;
        static ErrorStyleProperty: DependencyProperty;
        static FilterProperty: DependencyProperty;
        static FocusControlsOnClickProperty: DependencyProperty;
        static HasErrorsProperty: DependencyProperty;
        static HasDisplayedErrorsProperty: DependencyProperty;
        static HeaderProperty: DependencyProperty;
        static HeaderTemplateProperty: DependencyProperty;
        static SummaryListBoxStyleProperty: DependencyProperty;
        static TargetProperty: DependencyProperty;
        static GetShowErrorsInSummary(dobj: DependencyObject): boolean;
        static SetShowErrorsInSummary(dobj: DependencyObject, value: boolean): void;
        ShowErrorsInSummary: boolean;
        ErrorStyle: Style;
        Filter: ValidationSummaryFilters;
        FocusControlsOnClick: boolean;
        HasErrors: boolean;
        HasDisplayedErrors: boolean;
        Header: any;
        HeaderTemplate: DataTemplate;
        SummaryListBoxStyle: Style;
        Target: UIElement;
        private static OnShowErrorsInSummaryChanged(dobj, args);
        OnFilterChanged(oldValue: ValidationSummaryFilters, newValue: ValidationSummaryFilters): void;
        OnHeaderChanged(oldValue: any, newValue: any): void;
        OnTargetChanged(oldValue: UIElement, newValue: UIElement): void;
        private _ErrorsListBox;
        private _HeaderContentControl;
        private _RegisteredParent;
        private _ValidationSummaryItemDictionary;
        private _CurSummItemsSource;
        private _Errors;
        Errors: ObservableCollection<ValidationSummaryItem>;
        private _DisplayedErrors;
        DisplayedErrors: ReadOnlyObservableCollection<ValidationSummaryItem>;
        FocusingInvalidControl: nullstone.Event<FocusingInvalidControlEventArgs>;
        SelectionChanged: nullstone.Event<Primitives.SelectionChangedEventArgs>;
        constructor();
        OnApplyTemplate(): void;
        private Errors_CollectionChanged(sender, e);
        private ErrorsListBox_KeyDown(sender, e);
        private ErrorsListBox_MouseLeftButtonUp(sender, e);
        private ErrorsListBox_SelectionChanged(sender, e);
        private ValidationSummary_Loaded(sender, e);
        private ValidationSummary_Unloaded(sender, e);
        private ValidationSummary_IsEnabledChanged(sender, e);
        private ValidationSummaryItem_PropertyChanged(sender, e);
        private UpdateValidation(useTransitions);
        private UpdateCommon(useTransitions);
        private UpdateHeaderText();
        private UpdateDisplayedErrors();
        private Target_BindingValidationError(sender, e);
        private GetHeaderString();
        private ExecuteClick(sender);
        private static FindMatchingErrorSource(sources, sourceToFind);
        private static UpdateDisplayedErrorsOnAllValidationSummaries(parent);
    }
}
declare module Fayde.Controls {
    import ObservableCollection = Collections.ObservableCollection;
    class ValidationSummaryItem extends MVVM.ObservableObject {
        Message: string;
        MessageHeader: string;
        ItemType: ValidationSummaryItemType;
        Context: any;
        private _Sources;
        Sources: ObservableCollection<ValidationSummaryItemSource>;
        constructor(message?: string, messageHeader?: string, itemType?: ValidationSummaryItemType, source?: ValidationSummaryItemSource, context?: any);
    }
}
declare module Fayde.Controls {
    class ValidationSummaryItemSource {
        PropertyName: string;
        Control: Control;
        constructor(propertyName: string, control?: Control);
        Equals(other: any): boolean;
    }
}
declare module Fayde.Controls {
    function compareSummaryItems(item1: ValidationSummaryItem, item2: ValidationSummaryItem): number;
}
declare module Fayde.Controls {
    class Viewbox extends FrameworkElement {
        CreateLayoutUpdater(): viewbox.ViewboxUpdater;
        static ChildProperty: DependencyProperty;
        static StretchProperty: DependencyProperty;
        static StretchDirectionProperty: DependencyProperty;
        Child: UIElement;
        Stretch: Media.Stretch;
        StretchDirection: StretchDirection;
    }
}
declare module Fayde.Controls.viewbox {
    interface IViewboxUpdaterAssets extends minerva.core.IUpdaterAssets, processdown.IInput {
        stretch: Media.Stretch;
        stretchDirection: StretchDirection;
    }
    class ViewboxUpdater extends minerva.anon.AnonymousUpdater {
        tree: minerva.core.UpdaterTree;
        assets: IViewboxUpdaterAssets;
        init(): void;
        measureOverride(availableSize: Size): Size;
        arrangeOverride(finalSize: Size): Size;
        private setViewXform(sx, sy);
    }
}
declare module Fayde.Controls.viewbox.helpers {
    function computeScaleFactor(availableSize: minerva.ISize, contentSize: minerva.ISize, stretch: Media.Stretch, stretchDirection: StretchDirection): Size;
}
declare module Fayde.Controls.viewbox.processdown {
    interface IInput extends minerva.core.processdown.IInput {
        viewXform: number[];
    }
    interface IState extends minerva.core.processdown.IState {
    }
    interface IOutput extends minerva.core.processdown.IOutput {
    }
    class ViewboxProcessDownPipeDef extends minerva.core.processdown.ProcessDownPipeDef {
        constructor();
    }
}
declare module Fayde.Controls {
    class WrapPanel extends Fayde.Controls.Panel {
        CreateLayoutUpdater(): wrappanel.WrapPanelUpdater;
        static OrientationProperty: DependencyProperty;
        static ItemWidthProperty: DependencyProperty;
        static ItemHeightProperty: DependencyProperty;
        Orientation: Fayde.Orientation;
        ItemWidth: number;
        ItemHeight: number;
    }
}
declare module Fayde.Controls.wrappanel {
    interface IWrapPanelUpdaterAssets extends minerva.controls.panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }
    class WrapPanelUpdater extends minerva.controls.panel.PanelUpdater {
        assets: IWrapPanelUpdaterAssets;
        init(): void;
    }
}
declare module Fayde.Controls.wrappanel.arrange {
    import panel = minerva.controls.panel;
    interface IInput extends panel.arrange.IInput {
        orientation: Orientation;
        itemWidth: number;
        itemHeight: number;
    }
    interface IState extends panel.arrange.IState {
    }
    interface IOutput extends panel.arrange.IOutput {
    }
    class WrapPanelArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor();
    }
}
declare module Fayde.Controls.wrappanel.arrange.tapins {
    import Rect = minerva.Rect;
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module Fayde.Controls.wrappanel.arrange.tapins {
    import Rect = minerva.Rect;
    function doVertical(input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module Fayde.Controls.wrappanel {
    module helpers {
        function coerceChildSize(child: minerva.core.Updater, itemWidth: number, itemHeight: number): void;
    }
}
declare module Fayde.Controls.wrappanel.measure {
    import panel = minerva.controls.panel;
    interface IInput extends panel.measure.IInput {
        orientation: Orientation;
        itemWidth: number;
        itemHeight: number;
    }
    interface IState extends panel.measure.IState {
    }
    interface IOutput extends panel.measure.IOutput {
    }
    class WrapPanelMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor();
    }
}
declare module Fayde.Controls.wrappanel.measure.tapins {
    import Size = minerva.Size;
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: Size): boolean;
}
declare module Fayde.Controls.wrappanel.measure.tapins {
    import Size = minerva.Size;
    function doVertical(input: IInput, state: IState, output: IOutput, tree: minerva.core.IUpdaterTree, availableSize: Size): boolean;
}

declare module Fayde {
    var version: string;
}
declare module Fayde {
    var XMLNS: string;
    var XMLNSX: string;
    var XMLNSINTERNAL: string;
    var Enum: typeof nullstone.Enum;
    interface Enum {
        new (): nullstone.Enum;
    }
    var Uri: typeof nullstone.Uri;
    interface Uri extends nullstone.Uri {
    }
    class ResourceTypeManager extends nullstone.TypeManager {
        resolveResource(uri: Uri): string;
    }
    var TypeManager: ResourceTypeManager;
    var CoreLibrary: nullstone.ILibrary;
    var XLibrary: nullstone.ILibrary;
    function RegisterType(type: Function, uri: string, name?: string): void;
    function RegisterEnum(enu: any, uri: string, name: string): void;
    var IType_: nullstone.Interface<{}>;
}
declare module Fayde.Collections {
    enum CollectionChangedAction {
        Add = 1,
        Remove = 2,
        Replace = 3,
        Reset = 4,
    }
    class CollectionChangedEventArgs implements nullstone.IEventArgs {
        Action: CollectionChangedAction;
        OldStartingIndex: number;
        NewStartingIndex: number;
        OldItems: any[];
        NewItems: any[];
        static Reset(allValues: any[]): CollectionChangedEventArgs;
        static Replace(newValue: any, oldValue: any, index: number): CollectionChangedEventArgs;
        static Add(newValue: any, index: number): CollectionChangedEventArgs;
        static AddRange(newValues: any[], index: number): CollectionChangedEventArgs;
        static Remove(oldValue: any, index: number): CollectionChangedEventArgs;
    }
}
declare module Fayde.Collections {
    interface INotifyCollectionChanged {
        CollectionChanged: nullstone.Event<CollectionChangedEventArgs>;
    }
    var INotifyCollectionChanged_: nullstone.Interface<INotifyCollectionChanged>;
}
declare module Fayde {
    class PropertyChangedEventArgs implements nullstone.IEventArgs {
        PropertyName: string;
        constructor(propertyName: string);
    }
    interface INotifyPropertyChanged {
        PropertyChanged: nullstone.Event<PropertyChangedEventArgs>;
    }
    var INotifyPropertyChanged_: nullstone.Interface<INotifyPropertyChanged>;
}
declare module Fayde.Collections {
    class ObservableCollection<T> implements nullstone.IEnumerable<T>, nullstone.ICollection<T>, INotifyCollectionChanged, INotifyPropertyChanged {
        private _ht;
        getEnumerator(): nullstone.IEnumerator<T>;
        CollectionChanged: nullstone.Event<CollectionChangedEventArgs>;
        PropertyChanged: nullstone.Event<PropertyChangedEventArgs>;
        Count: number;
        ToArray(): T[];
        GetValueAt(index: number): T;
        SetValueAt(index: number, value: T): void;
        Add(value: T): void;
        AddRange(values: T[]): void;
        Insert(index: number, value: T): void;
        IndexOf(value: T): number;
        Contains(value: T): boolean;
        Remove(value: T): boolean;
        RemoveAt(index: number): void;
        Clear(): void;
        private _RaisePropertyChanged(propertyName);
    }
}
declare module Fayde.Collections {
    class DeepObservableCollection<T> extends ObservableCollection<T> {
        ItemPropertyChanged: nullstone.Event<ItemPropertyChangedEventArgs<T>>;
        constructor();
        private _OnCollectionChanged(sender, e);
        private _OnItemPropertyChanged(sender, e);
    }
}
declare module Fayde.Collections {
    interface IFilterItemFunc<T> {
        (item: T): boolean;
    }
    interface IFilterItemIndexFunc<T> {
        (item: T, index: number): boolean;
    }
    class FilteredCollection<T> extends DeepObservableCollection<T> {
        private _Source;
        Source: DeepObservableCollection<T>;
        private _Filter;
        Filter: IFilterItemIndexFunc<T>;
        constructor(filter?: IFilterItemFunc<T>, source?: DeepObservableCollection<T>);
        constructor(filter?: IFilterItemIndexFunc<T>, source?: DeepObservableCollection<T>);
        private _SetSource(source);
        private _OnSourceCollectionChanged(sender, e);
        private _OnSourceItemPropertyChanged(sender, e);
        Update(): void;
    }
}
declare module Fayde.Collections {
    class ItemPropertyChangedEventArgs<T> extends PropertyChangedEventArgs {
        Item: T;
        constructor(item: T, propertyName: string);
    }
}
declare module Fayde.Collections {
    class ReadOnlyObservableCollection<T> implements nullstone.ICollection<T>, INotifyCollectionChanged, INotifyPropertyChanged {
        Count: number;
        private _Source;
        CollectionChanged: nullstone.Event<CollectionChangedEventArgs>;
        PropertyChanged: nullstone.Event<PropertyChangedEventArgs>;
        constructor(source: ObservableCollection<T>);
        GetValueAt(index: number): T;
        getEnumerator(): nullstone.IEnumerator<T>;
        ToArray(): T[];
        IndexOf(value: T): number;
        Contains(value: T): boolean;
        private _OnCollectionChanged(sender, args);
        private _OnPropertyChanged(sender, args);
        SetValueAt(index: number, value: T): void;
        Insert(index: number, value: T): void;
        Add(value: T): void;
        Remove(value: T): boolean;
        RemoveAt(index: number): void;
        Clear(): void;
    }
}
declare module Fayde {
    interface IIsAttachedMonitor {
        Callback: (newIsAttached: boolean) => void;
        Detach(): any;
    }
    class XamlNode {
        XObject: XamlObject;
        ParentNode: XamlNode;
        Name: string;
        NameScope: NameScope;
        DocNameScope: NameScope;
        private IsShareable;
        private _OwnerNameScope;
        private _LogicalChildren;
        private _IAMonitors;
        constructor(xobj: XamlObject);
        private _DataContext;
        DataContext: any;
        OnDataContextChanged(oldDataContext: any, newDataContext: any): void;
        private _IsEnabled;
        IsEnabled: boolean;
        OnIsEnabledChanged(oldValue: boolean, newValue: boolean): void;
        FindName(name: string, doc?: boolean): XamlNode;
        SetName(name: string): void;
        FindNameScope(): NameScope;
        IsAttached: boolean;
        SetIsAttached(value: boolean): void;
        OnIsAttachedChanged(newIsAttached: boolean): void;
        MonitorIsAttached(func: (newIsAttached: boolean) => void): IIsAttachedMonitor;
        AttachTo(parentNode: XamlNode, error: BError): boolean;
        Detach(): void;
        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode): void;
        GetInheritedEnumerator(): nullstone.IEnumerator<DONode>;
        static SetShareable(xn: XamlNode): void;
    }
}
declare module Fayde {
    class XamlObject implements Providers.IIsPropertyInheritable {
        private static _LastID;
        private _ID;
        XamlNode: Fayde.XamlNode;
        TemplateOwner: DependencyObject;
        App: Application;
        constructor();
        CreateNode(): XamlNode;
        Name: string;
        Parent: XamlObject;
        FindName(name: string, doc?: boolean): XamlObject;
        Clone(): XamlObject;
        CloneCore(source: XamlObject): void;
        IsInheritable(propd: DependencyProperty): boolean;
    }
}
interface IOutIsValid {
    IsValid: boolean;
}
interface IType {
}
declare class DependencyProperty {
    static UnsetValue: {};
    private static _IDs;
    private static _LastID;
    _ID: number;
    Name: string;
    GetTargetType: () => IType;
    OwnerType: any;
    DefaultValue: any;
    IsReadOnly: boolean;
    IsCustom: boolean;
    IsAttached: boolean;
    IsInheritable: boolean;
    IsImmutable: boolean;
    ChangedCallback: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void;
    AlwaysChange: boolean;
    Store: Fayde.Providers.PropertyStore;
    private _Coercer;
    private _Validator;
    static Register(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void): DependencyProperty;
    static RegisterReadOnly(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void): DependencyProperty;
    static RegisterAttached(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void): DependencyProperty;
    static RegisterCore(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void): DependencyProperty;
    static RegisterReadOnlyCore(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void): DependencyProperty;
    static RegisterAttachedCore(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void): DependencyProperty;
    static RegisterImmutable<T>(name: string, getTargetType: () => IType, ownerType: any): ImmutableDependencyProperty<T>;
    static RegisterInheritable(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void): DependencyProperty;
    static RegisterFull(name: string, getTargetType: () => IType, ownerType: any, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: DependencyPropertyChangedEventArgs) => void, coercer?: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => any, alwaysChange?: boolean, validator?: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => boolean, isCustom?: boolean, isReadOnly?: boolean, isAttached?: boolean): DependencyProperty;
    private FinishRegister();
    ExtendTo(type: any): DependencyProperty;
    ValidateSetValue(dobj: Fayde.DependencyObject, value: any, isValidOut: IOutIsValid): any;
    static GetDependencyProperty(ownerType: any, name: string, noError?: boolean): DependencyProperty;
}
declare class ImmutableDependencyProperty<T> extends DependencyProperty {
    IsImmutable: boolean;
    Initialize(dobj: Fayde.DependencyObject): T;
}
declare module Fayde.Providers {
    enum PropertyPrecedence {
        IsEnabled = 0,
        LocalValue = 1,
        LocalStyle = 2,
        ImplicitStyle = 3,
        Inherited = 4,
        InheritedDataContext = 5,
        DefaultValue = 6,
        Lowest = 6,
        Highest = 0,
        Count = 7,
    }
    interface IPropertyChangedListener {
        Property: DependencyProperty;
        OnPropertyChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs): any;
        Detach(): any;
    }
    interface IPropertyStorage {
        OwnerNode: DONode;
        Property: DependencyProperty;
        Precedence: PropertyPrecedence;
        Animations: Media.Animation.IAnimationStorage[];
        Local: any;
        LocalStyleValue: any;
        ImplicitStyleValue: any;
        PropListeners: IPropertyChangedListener[];
    }
    interface IPropertyStorageOwner {
        _PropertyStorage: IPropertyStorage[];
    }
    function GetStorage(dobj: DependencyObject, propd: DependencyProperty): IPropertyStorage;
    class PropertyStore {
        static Instance: PropertyStore;
        GetValue(storage: IPropertyStorage): any;
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence;
        SetLocalValue(storage: Providers.IPropertyStorage, newValue: any): void;
        SetLocalStyleValue(storage: IPropertyStorage, newValue: any): void;
        SetImplicitStyle(storage: IPropertyStorage, newValue: any): void;
        ClearValue(storage: Providers.IPropertyStorage): void;
        OnPropertyChanged(storage: IPropertyStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs;
        ListenToChanged(target: DependencyObject, propd: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void, closure: any): Providers.IPropertyChangedListener;
        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IPropertyStorage;
        Clone(dobj: DependencyObject, sourceStorage: IPropertyStorage): IPropertyStorage;
    }
}
declare module Fayde.Providers {
    interface IDataContextStorage extends IPropertyStorage {
        InheritedValue: any;
    }
    class DataContextStore extends PropertyStore {
        static Instance: DataContextStore;
        GetValue(storage: IDataContextStorage): any;
        GetValuePrecedence(storage: IDataContextStorage): PropertyPrecedence;
        OnInheritedChanged(storage: IDataContextStorage, newInherited?: any): void;
        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IDataContextStorage;
        OnPropertyChanged(storage: IDataContextStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs;
        private TryUpdateDataContextExpression(storage, newDataContext);
    }
}
declare module Fayde {
    interface IDPReactionCallback<T> {
        (dobj: DependencyObject, ov: T, nv: T): void;
    }
    function DPReaction<TValue>(propd: DependencyProperty, callback?: IDPReactionCallback<TValue>, listen?: boolean): void;
}
declare module Fayde {
    function Incite(obj: any, val?: any): void;
    function ReactTo(obj: any, scope: any, changed: (val?: any) => any): void;
    function UnreactTo(obj: any, scope: any): void;
}
declare module Fayde {
    class DONode extends XamlNode {
        XObject: DependencyObject;
        constructor(xobj: DependencyObject);
        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode): void;
        DataContext: any;
        OnDataContextChanged(oldDataContext: any, newDataContext: any): void;
    }
    class DependencyObject extends XamlObject implements ICloneable, Providers.IPropertyStorageOwner {
        private _Expressions;
        _PropertyStorage: Providers.IPropertyStorage[];
        static DataContextProperty: DependencyProperty;
        DataContext: any;
        constructor();
        XamlNode: DONode;
        CreateNode(): DONode;
        GetValue(propd: DependencyProperty): any;
        SetValue(propd: DependencyProperty, value: any): void;
        SetValueInternal(propd: DependencyProperty, value: any): void;
        SetCurrentValue(propd: DependencyProperty, value: any): void;
        ClearValue(propd: DependencyProperty): void;
        ReadLocalValue(propd: DependencyProperty): any;
        ReadLocalValueInternal(propd: DependencyProperty): any;
        private _AddExpression(propd, expr);
        private _RemoveExpression(propd);
        _HasDeferredValueExpression(propd: DependencyProperty): boolean;
        GetBindingExpression(propd: DependencyProperty): Data.BindingExpressionBase;
        HasValueOrExpression(propd: DependencyProperty): boolean;
        SetBinding(propd: DependencyProperty, binding: Data.Binding): Data.BindingExpressionBase;
        CloneCore(source: DependencyObject): void;
        ListenToChanged(propd: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void, closure?: any): Providers.IPropertyChangedListener;
    }
}
declare module Fayde {
    interface IUIReactionCallback<T> {
        (updater: minerva.core.Updater, ov: T, nv: T, uie?: UIElement): void;
    }
    function UIReaction<TValue>(propd: DependencyProperty, callback?: IUIReactionCallback<TValue>, listen?: boolean, sync?: (src: TValue, dest: TValue) => void, instance?: any): any;
    function UIReaction<TValue>(propd: DependencyProperty, callback?: IUIReactionCallback<TValue>, listen?: boolean, sync?: boolean, instance?: any): any;
}
declare module Fayde {
    function UIReactionAttached<TValue>(propd: DependencyProperty, callback?: IUIReactionCallback<TValue>): void;
}
declare module Fayde.Providers {
    interface IInheritedStorage extends IPropertyStorage {
        InheritedValue: any;
    }
    interface IIsPropertyInheritable {
        IsInheritable(propd: DependencyProperty): boolean;
    }
    class InheritedStore extends PropertyStore {
        static Instance: InheritedStore;
        GetValue(storage: IInheritedStorage): any;
        GetValuePrecedence(storage: IInheritedStorage): PropertyPrecedence;
        OnPropertyChanged(storage: IPropertyStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs;
        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IInheritedStorage;
        static PropagateInheritedOnAdd(dobj: DependencyObject, subtreeNode: DONode): void;
        static ClearInheritedOnRemove(dobj: DependencyObject, subtreeNode: DONode): void;
        private Propagate(ownerNode, propd, newValue);
        private SetInheritedValue(don, propd, newValue);
    }
}
declare module Fayde {
    enum Orientation {
        Horizontal = 0,
        Vertical = 1,
    }
    enum Visibility {
        Visible = 0,
        Collapsed = 1,
    }
    enum CursorType {
        Default = 0,
        Hand = 1,
        IBeam = 2,
        Wait = 3,
        SizeNESW = 4,
        SizeNWSE = 5,
        SizeNS = 6,
        SizeWE = 7,
    }
    var CursorTypeMappings: {
        Default: string;
        Hand: string;
        IBeam: string;
        Wait: string;
        SizeNESW: string;
        SizeNWSE: string;
        SizeNS: string;
        SizeWE: string;
    };
    enum HorizontalAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Stretch = 3,
    }
    enum VerticalAlignment {
        Top = 0,
        Center = 1,
        Bottom = 2,
        Stretch = 3,
    }
    enum FlowDirection {
        LeftToRight = 0,
        RightToLeft = 1,
    }
    enum FontWeight {
        Thin = 100,
        ExtraLight = 200,
        Light = 300,
        Normal = 400,
        Medium = 500,
        SemiBold = 600,
        Bold = 700,
        ExtraBold = 800,
        Black = 900,
        ExtraBlack = 950,
    }
    enum TextAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Justify = 3,
    }
    enum TextDecorations {
        None = 0,
        Underline = 1,
    }
    enum LineStackingStrategy {
        MaxHeight = 0,
        BlockLineHeight = 1,
    }
}
declare module Fayde {
    var FontStyle: {
        Normal: string;
        Italic: string;
        Oblique: string;
    };
    var FontStretch: {
        UltraCondensed: string;
        ExtraCondensed: string;
        Condensed: string;
        SemiCondensed: string;
        Normal: string;
        SemiExpanded: string;
        Expanded: string;
        ExtraExpanded: string;
        UltraExpanded: string;
    };
    var Font: typeof minerva.Font;
}
declare module Fayde {
    class InheritableOwner {
        static UseLayoutRoundingProperty: DependencyProperty;
        static FlowDirectionProperty: DependencyProperty;
        static ForegroundProperty: DependencyProperty;
        static FontFamilyProperty: DependencyProperty;
        static FontSizeProperty: DependencyProperty;
        static FontStretchProperty: DependencyProperty;
        static FontStyleProperty: DependencyProperty;
        static FontWeightProperty: DependencyProperty;
        static TextDecorationsProperty: DependencyProperty;
        static LanguageProperty: DependencyProperty;
        static AllInheritedProperties: DependencyProperty[];
    }
}
declare module Fayde {
    class UINode extends DONode {
        XObject: UIElement;
        LayoutUpdater: minerva.core.Updater;
        IsMouseOver: boolean;
        constructor(xobj: UIElement);
        VisualParentNode: UINode;
        GetVisualRoot(): UINode;
        IsLoaded: boolean;
        SetIsLoaded(value: boolean): void;
        OnVisualChildAttached(uie: UIElement): void;
        OnVisualChildDetached(uie: UIElement): void;
        private SetVisualParentNode(visualParentNode);
        Focus(recurse?: boolean): boolean;
        _EmitFocusChange(type: string): void;
        private _EmitLostFocus();
        private _EmitGotFocus();
        _EmitKeyDown(args: Fayde.Input.KeyEventArgs): void;
        _EmitKeyUp(args: Fayde.Input.KeyEventArgs): void;
        _EmitLostMouseCapture(pos: Point): void;
        _EmitMouseEvent(type: Input.MouseInputType, isLeftButton: boolean, isRightButton: boolean, args: Input.MouseEventArgs): boolean;
        _EmitTouchEvent(type: Input.TouchInputType, args: Input.TouchEventArgs): boolean;
        _EmitGotTouchCapture(e: Input.TouchEventArgs): void;
        _EmitLostTouchCapture(e: Input.TouchEventArgs): void;
        CanCaptureMouse(): boolean;
        CaptureMouse(): boolean;
        ReleaseMouseCapture(): void;
        IsAncestorOf(uin: UINode): boolean;
        TransformToVisual(uin?: UINode): Media.GeneralTransform;
    }
    class UIElement extends DependencyObject implements Providers.IIsPropertyInheritable {
        XamlNode: UINode;
        CreateNode(): UINode;
        CreateLayoutUpdater(): minerva.core.Updater;
        IsItemsControl: boolean;
        VisualParent: UIElement;
        static AllowDropProperty: DependencyProperty;
        static CacheModeProperty: DependencyProperty;
        static ClipProperty: DependencyProperty;
        static EffectProperty: DependencyProperty;
        static IsHitTestVisibleProperty: DependencyProperty;
        static OpacityMaskProperty: DependencyProperty;
        static OpacityProperty: DependencyProperty;
        static RenderTransformProperty: DependencyProperty;
        static RenderTransformOriginProperty: DependencyProperty;
        static TagProperty: DependencyProperty;
        static TriggersProperty: DependencyProperty;
        static UseLayoutRoundingProperty: DependencyProperty;
        static VisibilityProperty: DependencyProperty;
        IsInheritable(propd: DependencyProperty): boolean;
        IsMouseOver: boolean;
        DesiredSize: minerva.Size;
        RenderSize: minerva.Size;
        Clip: Media.Geometry;
        Effect: Media.Effects.Effect;
        IsHitTestVisible: boolean;
        Cursor: CursorType;
        OpacityMask: Media.Brush;
        Opacity: number;
        RenderTransform: Media.Transform;
        RenderTransformOrigin: Point;
        Tag: any;
        Triggers: TriggerCollection;
        UseLayoutRounding: boolean;
        Visibility: Visibility;
        Focus(): boolean;
        CaptureMouse(): boolean;
        ReleaseMouseCapture(): void;
        IsAncestorOf(uie: UIElement): boolean;
        TransformToVisual(uie: UIElement): Media.GeneralTransform;
        InvalidateMeasure(): void;
        Measure(availableSize: minerva.Size): void;
        InvalidateArrange(): void;
        Arrange(finalRect: minerva.Rect): void;
        LostFocus: RoutedEvent<RoutedEventArgs>;
        GotFocus: RoutedEvent<RoutedEventArgs>;
        LostMouseCapture: RoutedEvent<Input.MouseEventArgs>;
        KeyDown: RoutedEvent<Input.KeyEventArgs>;
        KeyUp: RoutedEvent<Input.KeyEventArgs>;
        MouseLeftButtonUp: RoutedEvent<Input.MouseButtonEventArgs>;
        MouseRightButtonUp: RoutedEvent<Input.MouseButtonEventArgs>;
        MouseLeftButtonDown: RoutedEvent<Input.MouseButtonEventArgs>;
        MouseRightButtonDown: RoutedEvent<Input.MouseButtonEventArgs>;
        MouseLeave: RoutedEvent<Input.MouseEventArgs>;
        MouseEnter: RoutedEvent<Input.MouseEventArgs>;
        MouseMove: RoutedEvent<Input.MouseEventArgs>;
        MouseWheel: RoutedEvent<Input.MouseWheelEventArgs>;
        TouchDown: RoutedEvent<Input.TouchEventArgs>;
        TouchUp: RoutedEvent<Input.TouchEventArgs>;
        TouchEnter: RoutedEvent<Input.TouchEventArgs>;
        TouchLeave: RoutedEvent<Input.TouchEventArgs>;
        TouchMove: RoutedEvent<Input.TouchEventArgs>;
        GotTouchCapture: RoutedEvent<Input.TouchEventArgs>;
        LostTouchCapture: RoutedEvent<Input.TouchEventArgs>;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnLostMouseCapture(e: Input.MouseEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        OnKeyUp(e: Input.KeyEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        OnMouseRightButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseRightButtonUp(e: Input.MouseButtonEventArgs): void;
        OnMouseWheel(e: Input.MouseWheelEventArgs): void;
        OnTouchDown(e: Input.TouchEventArgs): void;
        OnTouchUp(e: Input.TouchEventArgs): void;
        OnTouchEnter(e: Input.TouchEventArgs): void;
        OnTouchLeave(e: Input.TouchEventArgs): void;
        OnTouchMove(e: Input.TouchEventArgs): void;
        OnGotTouchCapture(e: Input.TouchEventArgs): void;
        OnLostTouchCapture(e: Input.TouchEventArgs): void;
        private _TriggersChanged(args);
    }
}
declare module Fayde.Providers {
    class ResourcesStore extends PropertyStore {
        static Instance: ResourcesStore;
        GetValue(storage: IPropertyStorage): ResourceDictionary;
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence;
        SetLocalValue(storage: Providers.IPropertyStorage, newValue: number): void;
        SetLocalStyleValue(storage: IPropertyStorage, newValue: any): void;
        SetImplicitStyle(storage: IPropertyStorage, newValue: any): void;
        ClearValue(storage: Providers.IPropertyStorage, notifyListeners?: boolean): void;
    }
}
declare module Fayde.Providers {
    class ActualSizeStore extends PropertyStore {
        static Instance: ActualSizeStore;
        GetValue(storage: IPropertyStorage): number;
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence;
        SetLocalValue(storage: Providers.IPropertyStorage, newValue: number): void;
        SetLocalStyleValue(storage: IPropertyStorage, newValue: any): void;
        SetImplicitStyle(storage: IPropertyStorage, newValue: any): void;
        ClearValue(storage: Providers.IPropertyStorage, notifyListeners?: boolean): void;
    }
}
declare module Fayde {
    class FENode extends UINode implements Providers.IStyleHolder, Providers.IImplicitStyleHolder {
        _LocalStyle: Style;
        _ImplicitStyles: Style[];
        _StyleMask: number;
        XObject: FrameworkElement;
        constructor(xobj: FrameworkElement);
        SubtreeNode: XamlNode;
        SetSubtreeNode(subtreeNode: XamlNode, error: BError): boolean;
        GetInheritedEnumerator(): nullstone.IEnumerator<DONode>;
        GetVisualTreeEnumerator(): nullstone.IEnumerator<FENode>;
        SetIsLoaded(value: boolean): void;
        OnIsLoadedChanged(newIsLoaded: boolean): void;
        InvokeLoaded(): void;
        AttachVisualChild(uie: UIElement, error: BError): boolean;
        DetachVisualChild(uie: UIElement, error: BError): boolean;
        ApplyTemplateWithError(error: BError): boolean;
        DoApplyTemplateWithError(error: BError): boolean;
        FinishApplyTemplateWithError(uie: UIElement, error: BError): boolean;
        UpdateLayout(): void;
        static DetachFromVisualParent(xobj: UIElement): void;
    }
    class FrameworkElement extends UIElement implements IResourcable, Providers.IIsPropertyInheritable {
        XamlNode: FENode;
        CreateNode(): FENode;
        static ActualHeightProperty: DependencyProperty;
        static ActualWidthProperty: DependencyProperty;
        static CursorProperty: DependencyProperty;
        static FlowDirectionProperty: DependencyProperty;
        static HeightProperty: DependencyProperty;
        static HorizontalAlignmentProperty: DependencyProperty;
        static LanguageProperty: DependencyProperty;
        static MarginProperty: DependencyProperty;
        static MaxHeightProperty: DependencyProperty;
        static MaxWidthProperty: DependencyProperty;
        static MinHeightProperty: DependencyProperty;
        static MinWidthProperty: DependencyProperty;
        static StyleProperty: DependencyProperty;
        static VerticalAlignmentProperty: DependencyProperty;
        static WidthProperty: DependencyProperty;
        static ResourcesProperty: DependencyProperty;
        static DefaultStyleKeyProperty: DependencyProperty;
        IsInheritable(propd: DependencyProperty): boolean;
        ActualHeight: number;
        ActualWidth: number;
        FlowDirection: FlowDirection;
        Height: number;
        HorizontalAlignment: HorizontalAlignment;
        Language: string;
        Margin: Thickness;
        MaxWidth: number;
        MaxHeight: number;
        MinWidth: number;
        MinHeight: number;
        Style: Style;
        VerticalAlignment: VerticalAlignment;
        Width: number;
        Resources: ResourceDictionary;
        DefaultStyleKey: Function;
        SizeChanged: RoutedEvent<RoutedEventArgs>;
        Loaded: RoutedEvent<RoutedEventArgs>;
        Unloaded: RoutedEvent<RoutedEventArgs>;
        LayoutUpdated: nullstone.Event<nullstone.IEventArgs>;
        OnApplyTemplate(): void;
        TemplateApplied: nullstone.Event<nullstone.IEventArgs>;
        OnBindingValidationError(args: Validation.ValidationErrorEventArgs): void;
        BindingValidationError: nullstone.Event<Validation.ValidationErrorEventArgs>;
        UpdateLayout(): void;
    }
}
declare module Fayde.Markup {
    interface IContentAnnotation {
        (type: Function, prop: DependencyProperty): any;
        Get(type: Function): DependencyProperty;
    }
    var Content: IContentAnnotation;
    interface ITextContentAnnotation {
        (type: Function, prop: DependencyProperty): any;
        Get(type: Function): DependencyProperty;
    }
    var TextContent: ITextContentAnnotation;
}
declare module Fayde.Controls {
    class Border extends FrameworkElement {
        CreateLayoutUpdater(): minerva.controls.border.BorderUpdater;
        static BackgroundProperty: DependencyProperty;
        static BorderBrushProperty: DependencyProperty;
        static BorderThicknessProperty: DependencyProperty;
        static ChildProperty: DependencyProperty;
        static CornerRadiusProperty: DependencyProperty;
        static PaddingProperty: DependencyProperty;
        Background: Media.Brush;
        BorderBrush: Media.Brush;
        BorderThickness: minerva.Thickness;
        Child: UIElement;
        CornerRadius: CornerRadius;
        Padding: Thickness;
        constructor();
    }
}
declare module Fayde.Providers {
    interface IIsEnabledStorage extends IPropertyStorage {
        InheritedValue: boolean;
    }
    class IsEnabledStore extends PropertyStore {
        static Instance: IsEnabledStore;
        GetValue(storage: IIsEnabledStorage): boolean;
        GetValuePrecedence(storage: IIsEnabledStorage): PropertyPrecedence;
        SetLocalValue(storage: IIsEnabledStorage, newValue: boolean): void;
        OnPropertyChanged(storage: IPropertyStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any): IDependencyPropertyChangedEventArgs;
        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IIsEnabledStorage;
        EmitInheritedChanged(storage: IIsEnabledStorage, newInherited: boolean): void;
        static EmitInheritedChanged(cn: Controls.ControlNode, value: boolean): void;
    }
}
declare module Fayde.Input {
    enum KeyboardNavigationMode {
        Continue = 0,
        Once = 1,
        Cycle = 2,
        None = 3,
        Contained = 4,
        Local = 5,
    }
    enum ModifierKeys {
        None = 0,
        Alt = 1,
        Control = 2,
        Shift = 4,
        Windows = 8,
        Apple = 16,
    }
    interface IModifiersOn {
        Shift: boolean;
        Ctrl: boolean;
        Alt: boolean;
    }
    class Keyboard {
        static Modifiers: ModifierKeys;
        static RefreshModifiers(e: Fayde.Input.IModifiersOn): void;
        static HasControl(): boolean;
        static HasAlt(): boolean;
        static HasShift(): boolean;
    }
}
declare module Fayde.Controls {
    interface IIsEnabledListener {
        Callback: (newIsEnabled: boolean) => void;
        Detach(): any;
    }
    class ControlNode extends FENode {
        XObject: Control;
        TemplateRoot: FrameworkElement;
        IsFocused: boolean;
        LayoutUpdater: minerva.controls.control.ControlUpdater;
        constructor(xobj: Control);
        TabTo(): boolean;
        ApplyTemplateWithError(error: BError): boolean;
        DoApplyTemplateWithError(error: BError): boolean;
        GetDefaultVisualTree(): UIElement;
        OnIsAttachedChanged(newIsAttached: boolean): void;
        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode): void;
        OnTemplateChanged(oldTemplate: ControlTemplate, newTemplate: ControlTemplate): void;
        IsEnabled: boolean;
        OnIsEnabledChanged(oldValue: boolean, newValue: boolean): void;
        Focus(recurse?: boolean): boolean;
        CanCaptureMouse(): boolean;
    }
    class Control extends FrameworkElement implements Providers.IIsPropertyInheritable {
        XamlNode: ControlNode;
        CreateNode(): ControlNode;
        CreateLayoutUpdater(): minerva.controls.control.ControlUpdater;
        constructor();
        static BackgroundProperty: DependencyProperty;
        static BorderBrushProperty: DependencyProperty;
        static BorderThicknessProperty: DependencyProperty;
        static FontFamilyProperty: DependencyProperty;
        static FontSizeProperty: DependencyProperty;
        static FontStretchProperty: DependencyProperty;
        static FontStyleProperty: DependencyProperty;
        static FontWeightProperty: DependencyProperty;
        static ForegroundProperty: DependencyProperty;
        static HorizontalContentAlignmentProperty: DependencyProperty;
        static IsEnabledProperty: DependencyProperty;
        static IsTabStopProperty: DependencyProperty;
        static PaddingProperty: DependencyProperty;
        static TabIndexProperty: DependencyProperty;
        static TabNavigationProperty: DependencyProperty;
        static TemplateProperty: DependencyProperty;
        static VerticalContentAlignmentProperty: DependencyProperty;
        IsInheritable(propd: DependencyProperty): boolean;
        Background: Media.Brush;
        BorderBrush: Media.Brush;
        BorderThickness: Thickness;
        FontFamily: string;
        FontSize: number;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        Foreground: Media.Brush;
        HorizontalContentAlignment: HorizontalAlignment;
        IsEnabled: boolean;
        IsTabStop: boolean;
        Padding: Thickness;
        TabIndex: number;
        TabNavigation: Input.KeyboardNavigationMode;
        Template: ControlTemplate;
        VerticalContentAlignment: VerticalAlignment;
        IsFocused: boolean;
        GetTemplateChild(childName: string, type?: Function): DependencyObject;
        ApplyTemplate(): boolean;
        GetDefaultStyle(): Style;
        IsEnabledChanged: nullstone.Event<DependencyPropertyChangedEventArgs>;
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        UpdateVisualState(useTransitions?: boolean): void;
        GoToStates(gotoFunc: (state: string) => boolean): void;
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean;
        GoToStateFocus(gotoFunc: (state: string) => boolean): boolean;
        GoToStateSelection(gotoFunc: (state: string) => boolean): boolean;
        UpdateValidationState(valid?: boolean): void;
        GoToStateValidation(valid: boolean, gotoFunc: (state: string) => boolean): boolean;
    }
    interface ITemplateVisualStateDefinition {
        Name: string;
        GroupName: string;
    }
    var TemplateVisualStates: nullstone.ITypedAnnotation<ITemplateVisualStateDefinition>;
    interface ITemplatePartDefinition {
        Name: string;
        Type: Function;
    }
    var TemplateParts: nullstone.ITypedAnnotation<ITemplatePartDefinition>;
}
declare module Fayde.Controls {
    class ContentControlNode extends ControlNode {
        private _DefaultPresenter;
        XObject: ContentControl;
        constructor(xobj: ContentControl);
        GetDefaultVisualTree(): UIElement;
        OnContentChanged(o: any, n: any): void;
        OnTemplateChanged(oldTemplate: ControlTemplate, newTemplate: ControlTemplate): void;
        private CleanOldContent(content);
    }
    class ContentControl extends Control {
        XamlNode: ContentControlNode;
        CreateNode(): ContentControlNode;
        static ContentProperty: DependencyProperty;
        static ContentTemplateProperty: DependencyProperty;
        static ContentUriProperty: DependencyProperty;
        Content: any;
        ContentTemplate: DataTemplate;
        ContentUri: Uri;
        private OnContentPropertyChanged(args);
        private OnContentUriPropertyChanged(args);
        constructor();
        OnContentChanged(oldContent: any, newContent: any): void;
        OnContentTemplateChanged(oldContentTemplate: DataTemplate, newContentTemplate: DataTemplate): void;
        OnContentUriChanged(oldSourceUri: Uri, newSourceUri: Uri): void;
        private _OnLoadedUri(xm);
        private _OnErroredUri(err, src);
    }
}
declare module Fayde.Controls {
    enum TextWrapping {
        NoWrap = 0,
        Wrap = 1,
        WrapWithOverflow = 2,
    }
    enum ScrollBarVisibility {
        Disabled = 0,
        Auto = 1,
        Hidden = 2,
        Visible = 3,
    }
    enum TextTrimming {
        None = 0,
        WordEllipsis = 1,
        CharacterEllipsis = 2,
    }
    enum ClickMode {
        Release = 0,
        Press = 1,
        Hover = 2,
    }
    enum PlacementMode {
        Bottom = 0,
        Right = 1,
        Mouse = 2,
        Left = 3,
        Top = 4,
    }
    enum SelectionMode {
        Single = 0,
        Multiple = 1,
        Extended = 2,
    }
    enum MediaElementState {
        Closed = 0,
        Opening = 1,
        Buffering = 4,
        Playing = 5,
        Paused = 6,
        Stopped = 7,
    }
}
declare module Fayde.Controls.Primitives {
    class ButtonBase extends ContentControl {
        static ClickModeProperty: DependencyProperty;
        static IsPressedProperty: DependencyProperty;
        static IsFocusedProperty: DependencyProperty;
        static CommandProperty: DependencyProperty;
        static CommandParameterProperty: DependencyProperty;
        ClickMode: ClickMode;
        IsPressed: boolean;
        IsFocused: boolean;
        Command: Input.ICommand;
        CommandParameter: any;
        Click: RoutedEvent<RoutedEventArgs>;
        private _IsMouseCaptured;
        private _TouchCaptures;
        private _IsMouseLeftButtonDown;
        private _IsSpaceKeyDown;
        _MousePosition: Point;
        private _SuspendStateChanges;
        constructor();
        OnIsPressedChanged(args: IDependencyPropertyChangedEventArgs): void;
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnTouchMove(e: Input.TouchEventArgs): void;
        OnTouchDown(e: Input.TouchEventArgs): void;
        OnTouchUp(e: Input.TouchEventArgs): void;
        OnClick(): void;
        private _DoWithSuspend(action);
        UpdateVisualState(useTransitions?: boolean): void;
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean;
        private _CaptureMouseInternal();
        private _ReleaseMouseCaptureInternal();
        private _IsValidPosition(pos);
        private OnCommandChanged(args);
        private OnCommandCanExecuteChanged(sender, e);
        private OnCommandParameterChanged(args);
    }
}
declare module Fayde.Controls {
    class Button extends Primitives.ButtonBase {
        constructor();
        OnApplyTemplate(): void;
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs): void;
    }
}
declare module Fayde {
    class XamlObjectCollection<T extends XamlObject> extends XamlObject implements nullstone.ICollection<T> {
        _ht: Array<T>;
        AttachTo(xobj: XamlObject): void;
        Count: number;
        GetRange(startIndex: number, endIndex: number): T[];
        GetValueAt(index: number): T;
        SetValueAt(index: number, value: T): boolean;
        Add(value: T): number;
        Insert(index: number, value: T): boolean;
        Remove(value: T): boolean;
        RemoveAt(index: number): boolean;
        Clear(): boolean;
        IndexOf(value: T): number;
        Contains(value: T): boolean;
        CanAdd(value: T): boolean;
        AddingToCollection(value: T, error: BError): boolean;
        RemovedFromCollection(value: T, isValueSafe: boolean): void;
        getEnumerator(reverse?: boolean): nullstone.IEnumerator<T>;
        GetNodeEnumerator<U extends XamlNode>(reverse?: boolean): nullstone.IEnumerator<U>;
        _RaiseItemAdded(value: T, index: number): void;
        _RaiseItemRemoved(value: T, index: number): void;
        _RaiseItemReplaced(removed: T, added: T, index: number): void;
        _RaiseCleared(old: T[]): void;
        CloneCore(source: XamlObjectCollection<T>): void;
        ToArray(): T[];
    }
}
declare module Fayde.Providers {
    class ImmutableStore extends PropertyStore {
        static Instance: ImmutableStore;
        GetValue(storage: IPropertyStorage): any;
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence;
        SetLocalValue(storage: Providers.IPropertyStorage, newValue: any): void;
        ClearValue(storage: Providers.IPropertyStorage): void;
        ListenToChanged(target: DependencyObject, propd: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void, closure: any): Providers.IPropertyChangedListener;
        Clone(dobj: DependencyObject, sourceStorage: IPropertyStorage): IPropertyStorage;
    }
}
declare module Fayde.Controls {
    class PanelNode extends FENode {
        LayoutUpdater: minerva.controls.panel.PanelUpdater;
        XObject: Panel;
        constructor(xobj: Panel);
        AttachVisualChild(uie: UIElement, error: BError): boolean;
        DetachVisualChild(uie: UIElement, error: BError): boolean;
    }
    class Panel extends FrameworkElement {
        XamlNode: PanelNode;
        CreateNode(): PanelNode;
        CreateLayoutUpdater(): minerva.controls.panel.PanelUpdater;
        static BackgroundProperty: DependencyProperty;
        static ChildrenProperty: ImmutableDependencyProperty<XamlObjectCollection<UIElement>>;
        static ZIndexProperty: DependencyProperty;
        static GetZIndex(uie: UIElement): number;
        static SetZIndex(uie: UIElement, value: number): void;
        Background: Media.Brush;
        Children: XamlObjectCollection<UIElement>;
        constructor();
    }
}
declare module Fayde.Controls {
    class Canvas extends Panel {
        CreateLayoutUpdater(): minerva.controls.canvas.CanvasUpdater;
        static TopProperty: DependencyProperty;
        static GetTop(d: DependencyObject): number;
        static SetTop(d: DependencyObject, value: number): void;
        static LeftProperty: DependencyProperty;
        static GetLeft(d: DependencyObject): number;
        static SetLeft(d: DependencyObject, value: number): void;
    }
}
declare module Fayde.Controls.Primitives {
    class ToggleButton extends ButtonBase {
        Checked: RoutedEvent<RoutedEventArgs>;
        Indeterminate: RoutedEvent<RoutedEventArgs>;
        Unchecked: RoutedEvent<RoutedEventArgs>;
        static IsCheckedProperty: DependencyProperty;
        static IsThreeStateProperty: DependencyProperty;
        IsChecked: boolean;
        IsThreeState: boolean;
        constructor();
        OnApplyTemplate(): void;
        OnContentChanged(oldContent: any, newContent: any): void;
        OnClick(): void;
        UpdateVisualState(useTransitions?: boolean): void;
        OnIsCheckedChanged(args: IDependencyPropertyChangedEventArgs): void;
        OnToggle(): void;
    }
}
declare module Fayde.Controls {
    class CheckBox extends Primitives.ToggleButton {
        constructor();
    }
}
declare module Fayde.Controls {
    class ColumnDefinition extends DependencyObject implements minerva.controls.grid.IColumnDefinition {
        static WidthProperty: DependencyProperty;
        static MaxWidthProperty: DependencyProperty;
        static MinWidthProperty: DependencyProperty;
        static ActualWidthProperty: DependencyProperty;
        Width: GridLength;
        MaxWidth: number;
        MinWidth: number;
        ActualWidth: number;
        setActualWidth(value: number): void;
    }
    class ColumnDefinitionCollection extends XamlObjectCollection<ColumnDefinition> {
        _RaiseItemAdded(value: ColumnDefinition, index: number): void;
        _RaiseItemRemoved(value: ColumnDefinition, index: number): void;
    }
}
declare module Fayde.Controls {
    class ItemsControlNode extends ControlNode {
        XObject: ItemsControl;
        constructor(xobj: ItemsControl);
        ItemsPresenter: ItemsPresenter;
        GetDefaultVisualTree(): UIElement;
    }
    class ItemsControl extends Control {
        XamlNode: ItemsControlNode;
        CreateNode(): ItemsControlNode;
        IsItemsControl: boolean;
        static DisplayMemberPathProperty: DependencyProperty;
        static ItemsPanelProperty: DependencyProperty;
        static ItemsSourceProperty: DependencyProperty;
        static ItemsProperty: ImmutableDependencyProperty<ItemCollection>;
        static ItemTemplateProperty: DependencyProperty;
        static IsItemsHostProperty: DependencyProperty;
        static GetIsItemsHost(d: DependencyObject): boolean;
        static SetIsItemsHost(d: DependencyObject, value: boolean): void;
        DisplayMemberPath: string;
        ItemsPanel: ItemsPanelTemplate;
        ItemsSource: nullstone.IEnumerable<any>;
        Items: ItemCollection;
        ItemTemplate: DataTemplate;
        OnDisplayMemberPathChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnItemsSourceChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnItemTemplateChanged(e: IDependencyPropertyChangedEventArgs): void;
        private _ItemContainersManager;
        ItemContainersManager: Internal.IItemContainersManager;
        constructor();
        PrepareContainerForItem(container: UIElement, item: any): void;
        ClearContainerForItem(container: UIElement, item: any): void;
        GetContainerForItem(): UIElement;
        IsItemItsOwnContainer(item: any): boolean;
        private _IsDataBound;
        private _SuspendItemsChanged;
        private _OnItemsUpdated(sender, e);
        private _OnItemsSourceUpdated(sender, e);
        OnItemsChanged(e: Collections.CollectionChangedEventArgs): void;
        OnItemsAdded(index: number, newItems: any[]): void;
        OnItemsRemoved(index: number, oldItems: any[]): void;
        private UpdateContainerTemplate(container, item);
        private _DisplayMemberTemplate;
        private _GetDisplayMemberTemplate();
    }
}
declare module Fayde.Controls.Primitives {
    class Selector extends ItemsControl {
        static IsSynchronizedWithCurrentItemProperty: DependencyProperty;
        static SelectedIndexProperty: DependencyProperty;
        static SelectedItemProperty: DependencyProperty;
        static SelectedValueProperty: DependencyProperty;
        static SelectedValuePathProperty: DependencyProperty;
        static IsSelectionActiveProperty: DependencyProperty;
        static SelectionModeProperty: DependencyProperty;
        IsSynchronizedWithCurrentItem: boolean;
        SelectedIndex: number;
        SelectedItem: any;
        SelectedValue: any;
        SelectedValuePath: string;
        IsSelectionActive: boolean;
        SelectionMode: SelectionMode;
        SelectionChanged: RoutedEvent<SelectionChangedEventArgs>;
        private _Selection;
        private _SelectedItems;
        _SelectedItemsIsInvalid: boolean;
        $TemplateScrollViewer: ScrollViewer;
        private _SelectedValueWalker;
        private SynchronizeWithCurrentItem;
        constructor();
        SelectedItems: Collections.ObservableCollection<any>;
        private _OnIsSynchronizedWithCurrentItemChanged(args);
        private _OnSelectedIndexChanged(args);
        private _OnSelectedItemChanged(args);
        private _OnSelectedValueChanged(args);
        private _OnSelectedValuePathChanged(args);
        private _OnSelectionModeChanged(args);
        OnApplyTemplate(): void;
        OnItemsChanged(e: Collections.CollectionChangedEventArgs): void;
        OnItemsSourceChanged(args: IDependencyPropertyChangedEventArgs): void;
        OnItemContainerStyleChanged(oldStyle: any, newStyle: any): void;
        ClearContainerForItem(element: UIElement, item: any): void;
        PrepareContainerForItem(element: UIElement, item: any): void;
        _GetValueFromItem(item: any): any;
        private _SelectItemFromValue(selectedValue, ignoreSelectedValue?);
        SelectAll(): void;
        private _OnCurrentItemChanged(sender, e);
        _RaiseSelectionChanged(oldVals: any[], newVals: any[]): void;
        OnSelectionChanged(args: SelectionChangedEventArgs): void;
        NotifyListItemClicked(lbi: ListBoxItem): void;
        NotifyListItemLoaded(lbi: ListBoxItem): void;
        NotifyListItemGotFocus(lbi: ListBoxItem): void;
        NotifyListItemLostFocus(lbi: ListBoxItem): void;
    }
}
declare module Fayde.Markup {
    import XamlMarkup = nullstone.markup.xaml.XamlMarkup;
    function CreateXaml(xaml: string, uri?: string): XamlMarkup;
    function CreateXaml(el: Element, uri?: string): XamlMarkup;
}
declare module Fayde.Controls {
    class ContentPresenterNode extends FENode {
        private _ContentRoot;
        ContentRoot: UIElement;
        XObject: ContentPresenter;
        constructor(xobj: ContentPresenter);
        DoApplyTemplateWithError(error: BError): boolean;
        ClearRoot(): void;
        _ContentChanged(args: IDependencyPropertyChangedEventArgs): void;
        _ContentTemplateChanged(): void;
        private _ShouldInvalidateImplicitTemplate(oldValue, newValue);
        private _GetContentTemplate(type);
    }
    class ContentPresenter extends FrameworkElement {
        XamlNode: ContentPresenterNode;
        CreateNode(): ContentPresenterNode;
        static ContentProperty: DependencyProperty;
        static ContentTemplateProperty: DependencyProperty;
        Content: any;
        ContentTemplate: DataTemplate;
    }
}
declare module Fayde.Controls.Primitives {
    import PopupUpdater = minerva.controls.popup.PopupUpdater;
    class PopupNode extends FENode {
        LayoutUpdater: PopupUpdater;
        XObject: Popup;
        ClickedOutside: nullstone.Event<nullstone.IEventArgs>;
        OnIsAttachedChanged(newIsAttached: boolean): void;
        private _Overlay;
        private _Catcher;
        EnsureOverlay(): Canvas;
        EnsureCatcher(): Canvas;
        UpdateCatcher(): void;
        private _RaiseClickedOutside(sender, e);
        RegisterInitiator(initiator: UIElement): void;
    }
    class Popup extends FrameworkElement {
        XamlNode: PopupNode;
        CreateNode(): PopupNode;
        CreateLayoutUpdater(): PopupUpdater;
        static ChildProperty: DependencyProperty;
        static HorizontalOffsetProperty: DependencyProperty;
        static VerticalOffsetProperty: DependencyProperty;
        static IsOpenProperty: DependencyProperty;
        Child: UIElement;
        HorizontalOffset: number;
        VerticalOffset: number;
        IsOpen: boolean;
        Opened: nullstone.Event<nullstone.IEventArgs>;
        Closed: nullstone.Event<nullstone.IEventArgs>;
        WatchOutsideClick(callback: () => void, closure: any): void;
    }
}
declare module Fayde.Controls.Primitives {
    interface IScrollInfo {
        ScrollOwner: ScrollViewer;
        LineUp(): boolean;
        LineDown(): boolean;
        LineLeft(): boolean;
        LineRight(): boolean;
        MouseWheelUp(): boolean;
        MouseWheelDown(): boolean;
        MouseWheelLeft(): boolean;
        MouseWheelRight(): boolean;
        PageUp(): boolean;
        PageDown(): boolean;
        PageLeft(): boolean;
        PageRight(): boolean;
        MakeVisible(uie: UIElement, rectangle: minerva.Rect): minerva.Rect;
        SetHorizontalOffset(offset: number): boolean;
        SetVerticalOffset(offset: number): boolean;
        CanHorizontallyScroll: boolean;
        CanVerticallyScroll: boolean;
        ExtentHeight: number;
        ExtentWidth: number;
        HorizontalOffset: number;
        VerticalOffset: number;
        ViewportHeight: number;
        ViewportWidth: number;
    }
    var IScrollInfo_: nullstone.Interface<IScrollInfo>;
}
declare module Fayde.Controls {
    class ScrollContentPresenter extends ContentPresenter implements Primitives.IScrollInfo {
        CreateLayoutUpdater(): minerva.controls.scrollcontentpresenter.ScrollContentPresenterUpdater;
        private _ScrollData;
        private _IsClipPropertySet;
        private _ClippingRectangle;
        ScrollOwner: ScrollViewer;
        CanHorizontallyScroll: boolean;
        CanVerticallyScroll: boolean;
        ExtentWidth: number;
        ExtentHeight: number;
        ViewportWidth: number;
        ViewportHeight: number;
        HorizontalOffset: number;
        VerticalOffset: number;
        LineUp(): boolean;
        LineDown(): boolean;
        LineLeft(): boolean;
        LineRight(): boolean;
        MouseWheelUp(): boolean;
        MouseWheelDown(): boolean;
        MouseWheelLeft(): boolean;
        MouseWheelRight(): boolean;
        PageUp(): boolean;
        PageDown(): boolean;
        PageLeft(): boolean;
        PageRight(): boolean;
        MakeVisible(uie: UIElement, viewport: minerva.Rect): minerva.Rect;
        SetHorizontalOffset(offset: number): boolean;
        SetVerticalOffset(offset: number): boolean;
        OnApplyTemplate(): void;
    }
}
declare module Fayde.Controls.Primitives {
    class RangeBase extends Controls.Control {
        static MinimumProperty: DependencyProperty;
        static MaximumProperty: DependencyProperty;
        static LargeChangeProperty: DependencyProperty;
        static SmallChangeProperty: DependencyProperty;
        static ValueProperty: DependencyProperty;
        Minimum: number;
        Maximum: number;
        SmallChange: number;
        LargeChange: number;
        Value: number;
        OnMinimumChanged(oldMin: number, newMin: number): void;
        OnMaximumChanged(oldMax: number, newMax: number): void;
        OnValueChanged(oldVal: number, newVal: number): void;
        ValueChanged: RoutedPropertyChangedEvent<number>;
        private _Coercer;
        constructor();
    }
}
declare module Fayde.Controls.Primitives {
    class RepeatButton extends ButtonBase {
        static DelayProperty: DependencyProperty;
        static IntervalProperty: DependencyProperty;
        Delay: number;
        Interval: number;
        private _KeyboardCausingRepeat;
        private _MouseCausingRepeat;
        _MousePosition: Point;
        private _IntervalID;
        private _NewInterval;
        constructor();
        OnApplyTemplate(): void;
        OnDelayChanged(args: IDependencyPropertyChangedEventArgs): void;
        OnIntervalChanged(args: IDependencyPropertyChangedEventArgs): void;
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        OnKeyUp(e: Input.KeyEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        private _UpdateMousePosition(e);
        private _UpdateRepeatState();
        private _StartRepeatingAfterDelay();
        private _OnTimeout();
    }
}
declare module Fayde.Controls.Primitives {
    class Thumb extends Control {
        private _PreviousPosition;
        private _Origin;
        DragCompleted: RoutedEvent<DragCompletedEventArgs>;
        DragDelta: RoutedEvent<DragDeltaEventArgs>;
        DragStarted: RoutedEvent<DragStartedEventArgs>;
        static IsDraggingProperty: DependencyProperty;
        static IsFocusedProperty: DependencyProperty;
        IsDragging: boolean;
        IsFocused: boolean;
        constructor();
        OnApplyTemplate(): void;
        private OnDraggingChanged(args);
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        private _FocusChanged(hasFocus);
        OnLostMouseCapture(e: Input.MouseEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        OnLostTouchCapture(e: Input.TouchEventArgs): void;
        OnTouchEnter(e: Input.TouchEventArgs): void;
        OnTouchLeave(e: Input.TouchEventArgs): void;
        OnTouchDown(e: Input.TouchEventArgs): void;
        OnTouchUp(e: Input.TouchEventArgs): void;
        OnTouchMove(e: Input.TouchEventArgs): void;
        CancelDrag(): void;
        private _RaiseDragStarted();
        private _RaiseDragDelta(x, y);
        private _RaiseDragCompleted(canceled);
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean;
    }
}
declare module Fayde.Controls.Primitives {
    class ScrollBar extends RangeBase {
        private _DragValue;
        Scroll: RoutedEvent<ScrollEventArgs>;
        static OrientationProperty: DependencyProperty;
        static ViewportSizeProperty: DependencyProperty;
        Orientation: Orientation;
        ViewportSize: number;
        IsDragging: boolean;
        constructor();
        private $HorizontalTemplate;
        private $HorizontalSmallIncrease;
        private $HorizontalSmallDecrease;
        private $HorizontalLargeIncrease;
        private $HorizontalLargeDecrease;
        private $HorizontalThumb;
        private $VerticalTemplate;
        private $VerticalSmallIncrease;
        private $VerticalSmallDecrease;
        private $VerticalLargeIncrease;
        private $VerticalLargeDecrease;
        private $VerticalThumb;
        OnApplyTemplate(): void;
        OnMaximumChanged(oldMax: number, newMax: number): void;
        OnMinimumChanged(oldMin: number, newMin: number): void;
        OnValueChanged(oldValue: number, newValue: number): void;
        private _OnThumbDragStarted(sender, e);
        private _OnThumbDragDelta(sender, e);
        private _OnThumbDragCompleted(sender, e);
        private _SmallDecrement(sender, e);
        private _SmallIncrement(sender, e);
        private _LargeDecrement(sender, e);
        private _LargeIncrement(sender, e);
        private _HandleSizeChanged(sender, e);
        private _OnOrientationChanged();
        private _UpdateTrackLayout();
        private _UpdateThumbSize(trackLength);
        private _GetTrackLength();
        private _ConvertViewportSizeToDisplayUnits(trackLength);
        private _RaiseScroll(type);
    }
}
declare module Fayde.Controls {
    class ScrollViewer extends ContentControl {
        private static _ScrollBarVisibilityChanged(d, args);
        static HorizontalScrollBarVisibilityProperty: DependencyProperty;
        static GetHorizontalScrollBarVisibility(d: DependencyObject): ScrollBarVisibility;
        static SetHorizontalScrollBarVisibility(d: DependencyObject, value: ScrollBarVisibility): void;
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        static VerticalScrollBarVisibilityProperty: DependencyProperty;
        static GetVerticalScrollBarVisibility(d: DependencyObject): ScrollBarVisibility;
        static SetVerticalScrollBarVisibility(d: DependencyObject, value: ScrollBarVisibility): void;
        VerticalScrollBarVisibility: ScrollBarVisibility;
        static ComputedHorizontalScrollBarVisibilityProperty: DependencyProperty;
        static ComputedVerticalScrollBarVisibilityProperty: DependencyProperty;
        static HorizontalOffsetProperty: DependencyProperty;
        static VerticalOffsetProperty: DependencyProperty;
        static ScrollableWidthProperty: DependencyProperty;
        static ScrollableHeightProperty: DependencyProperty;
        static ViewportWidthProperty: DependencyProperty;
        static ViewportHeightProperty: DependencyProperty;
        static ExtentWidthProperty: DependencyProperty;
        static ExtentHeightProperty: DependencyProperty;
        ComputedHorizontalScrollBarVisibility: Visibility;
        ComputedVerticalScrollBarVisibility: Visibility;
        HorizontalOffset: number;
        VerticalOffset: number;
        ScrollableWidth: number;
        ScrollableHeight: number;
        ViewportWidth: number;
        ViewportHeight: number;
        ExtentWidth: number;
        ExtentHeight: number;
        $TemplatedParentHandlesScrolling: boolean;
        $ScrollContentPresenter: ScrollContentPresenter;
        private $HorizontalScrollBar;
        private $VerticalScrollBar;
        constructor();
        private _ScrollInfo;
        ScrollInfo: Primitives.IScrollInfo;
        InvalidateScrollInfo(): void;
        private _UpdateScrollBarVisibility();
        private _UpdateScrollBar(orientation, value);
        OnApplyTemplate(): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseWheel(e: Input.MouseWheelEventArgs): void;
        private _TouchOrigin;
        private _Delta;
        private _TouchInitialOffset;
        OnTouchDown(e: Input.TouchEventArgs): void;
        OnTouchUp(e: Input.TouchEventArgs): void;
        OnTouchMove(e: Input.TouchEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        ScrollInDirection(key: Input.Key): void;
        ScrollToHorizontalOffset(offset: number): void;
        ScrollToVerticalOffset(offset: number): void;
        LineUp(): void;
        LineDown(): void;
        LineLeft(): void;
        LineRight(): void;
        PageHome(): void;
        PageEnd(): void;
        PageUp(): void;
        PageDown(): void;
        PageLeft(): void;
        PageRight(): void;
        private _HandleScroll(orientation, e);
        private _HandleHorizontalScroll(e);
        private _HandleVerticalScroll(e);
    }
}
declare module Fayde.Controls {
    class ComboBox extends Primitives.Selector {
        DropDownOpened: nullstone.Event<{}>;
        DropDownClosed: nullstone.Event<{}>;
        static IsDropDownOpenProperty: DependencyProperty;
        static ItemContainerStyleProperty: DependencyProperty;
        static MaxDropDownHeightProperty: DependencyProperty;
        static IsSelectionActiveProperty: DependencyProperty;
        IsDropDownOpen: boolean;
        ItemContainerStyle: Style;
        MaxDropDownHeight: number;
        private $ContentPresenter;
        private $Popup;
        private $DropDownToggle;
        private $DisplayedItem;
        private $SelectionBoxItem;
        private $SelectionBoxItemTemplate;
        private _NullSelFallback;
        private _FocusedIndex;
        constructor();
        private _IsDropDownOpenChanged(args);
        private _MaxDropDownHeightChanged(args);
        private _GetChildOfType(name, type);
        OnApplyTemplate(): void;
        OnItemContainerStyleChanged(args: IDependencyPropertyChangedEventArgs): void;
        IsItemItsOwnContainer(item: any): boolean;
        GetContainerForItem(): UIElement;
        PrepareContainerForItem(container: UIElement, item: any): void;
        GoToStateFocus(gotoFunc: (state: string) => boolean): boolean;
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        private _OnChildKeyDown(sender, e);
        OnSelectionChanged(e: Primitives.SelectionChangedEventArgs): void;
        private _OnToggleChecked(sender, e);
        private _OnToggleUnchecked(sender, e);
        private _PopupClickedOutside();
        private _UpdateDisplayedItem(selectedItem);
        private _UpdatePopupSizeAndPosition(sender, e);
        private _UpdatePopupMaxHeight(height);
    }
}
declare module Fayde.Controls {
    class ListBoxItem extends ContentControl {
        private _ParentSelector;
        ParentSelector: Primitives.Selector;
        ParentSelectorChanged: nullstone.Event<{}>;
        static IsSelectedProperty: DependencyProperty;
        IsSelected: boolean;
        constructor();
        OnApplyTemplate(): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        GoToStateSelection(gotoFunc: (state: string) => boolean): boolean;
        private OnIsSelectedChanged(args);
    }
}
declare module Fayde.Controls {
    class ComboBoxItem extends ListBoxItem {
        constructor();
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
    }
}
declare module Fayde.Markup {
    class FrameworkTemplate extends DependencyObject {
        private $$markup;
        private $$resources;
        Validate(): string;
        GetVisualTree(bindingSource: DependencyObject): UIElement;
    }
    function LoadXaml<T extends XamlObject>(app: Application, xaml: string): T;
    function LoadXaml<T extends XamlObject>(app: Application, el: Element): T;
    function Load<T extends XamlObject>(app: Application, xm: nullstone.markup.Markup<any>): T;
}
declare module Fayde.Controls {
    class ControlTemplate extends Markup.FrameworkTemplate {
        static TargetTypeProperty: DependencyProperty;
        TargetType: Function;
        Validate(): string;
    }
}
declare module Fayde.Controls {
    class Dialog extends ContentControl {
        static DialogResultProperty: DependencyProperty;
        static ClickResultProperty: DependencyProperty;
        DialogResult: boolean;
        private _IgnoreResult;
        private OnDialogResultChanged(args);
        static GetClickResult(dobj: DependencyObject): boolean;
        static SetClickResult(dobj: DependencyObject, value: boolean): void;
        constructor();
    }
}
declare module Fayde.Controls {
    class UserControl extends Control {
        static ContentProperty: DependencyProperty;
        Content: UIElement;
        CreateLayoutUpdater(): minerva.controls.usercontrol.UserControlUpdater;
        InitializeComponent(): void;
        constructor();
    }
}
declare module Fayde.Controls {
    class Page extends UserControl {
        static TitleProperty: DependencyProperty;
        Title: string;
        constructor();
        static GetAsync(initiator: DependencyObject, url: string): nullstone.async.IAsyncRequest<Page>;
    }
}
declare module Fayde.Navigation {
    interface INavigate {
        Navigate(source: Uri): boolean;
    }
    var INavigate_: nullstone.Interface<INavigate>;
}
declare module Fayde.Controls {
    class Frame extends ContentControl implements Navigation.INavigate {
        static IsDeepLinkedProperty: DependencyProperty;
        static CurrentSourceProperty: DependencyProperty;
        static SourceProperty: DependencyProperty;
        static UriMapperProperty: DependencyProperty;
        static RouteMapperProperty: DependencyProperty;
        static IsLoadingProperty: DependencyProperty;
        IsDeepLinked: boolean;
        CurrentSource: Uri;
        Source: Uri;
        UriMapper: Navigation.UriMapper;
        RouteMapper: Navigation.RouteMapper;
        IsLoading: boolean;
        private _NavService;
        private _CurrentRoute;
        OnIsLoadingChanged(oldIsLoading: boolean, newIsLoading: boolean): void;
        constructor();
        GoToStates(gotoFunc: (state: string) => boolean): void;
        GoToStateLoading(gotoFunc: (state: string) => boolean): boolean;
        Navigate(uri: Uri): boolean;
        GoForward(): void;
        GoBackward(): void;
        StopLoading(): void;
        private _FrameLoaded(sender, e);
        private _HandleDeepLink();
        private _LoadContent(source);
        private _HandleSuccess(page);
        private _HandleError(error);
        private _SetPage(page);
        private SourcePropertyChanged(args);
    }
}
declare module Fayde.Controls {
    class GridNode extends PanelNode {
        LayoutUpdater: minerva.controls.grid.GridUpdater;
        ColumnDefinitionsChanged(coldef: ColumnDefinition, index: number, add: boolean): void;
        RowDefinitionsChanged(rowdef: RowDefinition, index: number, add: boolean): void;
    }
    class Grid extends Panel {
        XamlNode: GridNode;
        CreateNode(): GridNode;
        CreateLayoutUpdater(): minerva.controls.grid.GridUpdater;
        static ColumnProperty: DependencyProperty;
        static GetColumn(d: DependencyObject): number;
        static SetColumn(d: DependencyObject, value: number): void;
        static ColumnSpanProperty: DependencyProperty;
        static GetColumnSpan(d: DependencyObject): number;
        static SetColumnSpan(d: DependencyObject, value: number): void;
        static RowProperty: DependencyProperty;
        static GetRow(d: DependencyObject): number;
        static SetRow(d: DependencyObject, value: number): void;
        static RowSpanProperty: DependencyProperty;
        static GetRowSpan(d: DependencyObject): number;
        static SetRowSpan(d: DependencyObject, value: number): void;
        static ColumnDefinitionsProperty: ImmutableDependencyProperty<ColumnDefinitionCollection>;
        static RowDefinitionsProperty: ImmutableDependencyProperty<RowDefinitionCollection>;
        static ShowGridLinesProperty: DependencyProperty;
        ShowGridLines: boolean;
        ColumnDefinitions: ColumnDefinitionCollection;
        RowDefinitions: RowDefinitionCollection;
        constructor();
    }
}
declare module Fayde.Controls {
    import GridUnitType = minerva.controls.grid.GridUnitType;
    class GridLength implements minerva.controls.grid.IGridLength, ICloneable {
        Value: number;
        Type: GridUnitType;
        constructor(value?: number, unitType?: GridUnitType);
        static Equals(gl1: GridLength, gl2: GridLength): boolean;
        Clone(): GridLength;
    }
}
declare module Fayde.Controls {
    class HeaderedContentControl extends ContentControl {
        static HeaderProperty: DependencyProperty;
        Header: any;
        static HeaderTemplateProperty: DependencyProperty;
        HeaderTemplate: DataTemplate;
        constructor();
        OnHeaderChanged(oldHeader: any, newHeader: any): void;
        OnHeaderTemplateChanged(oldHeaderTemplate: DataTemplate, newHeaderTemplate: DataTemplate): void;
    }
}
declare module Fayde.Controls {
    class HyperlinkButton extends Primitives.ButtonBase {
        static NavigateUriProperty: DependencyProperty;
        static TargetNameProperty: DependencyProperty;
        NavigateUri: Uri;
        TargetName: string;
        constructor();
        OnApplyTemplate(): void;
        OnClick(): void;
    }
}
declare module Fayde.Media {
    enum BrushMappingMode {
        Absolute = 0,
        RelativeToBoundingBox = 1,
    }
    enum GradientSpreadMethod {
        Pad = 0,
        Reflect = 1,
        Repeat = 2,
    }
    enum Stretch {
        None = 0,
        Fill = 1,
        Uniform = 2,
        UniformToFill = 3,
    }
    enum AlignmentX {
        Left = 0,
        Center = 1,
        Right = 2,
    }
    enum AlignmentY {
        Top = 0,
        Center = 1,
        Bottom = 2,
    }
    enum TextHintingMode {
        Fixed = 0,
        Animated = 1,
    }
}
declare module Fayde.Controls {
    import ImageUpdater = minerva.controls.image.ImageUpdater;
    class Image extends FrameworkElement implements Media.Imaging.IImageChangedListener {
        CreateLayoutUpdater(): ImageUpdater;
        private static _SourceCoercer(d, propd, value);
        static SourceProperty: DependencyProperty;
        static StretchProperty: DependencyProperty;
        Source: Media.Imaging.ImageSource;
        Stretch: Media.Stretch;
        ImageOpened: nullstone.Event<{}>;
        ImageFailed: nullstone.Event<{}>;
        OnImageErrored(source: Media.Imaging.BitmapSource, e: Event): void;
        OnImageLoaded(source: Media.Imaging.BitmapSource, e: Event): void;
        ImageChanged(source: Media.Imaging.BitmapSource): void;
    }
}
declare module Fayde.Controls {
    interface IItemCollection extends nullstone.ICollection<any> {
        ItemsChanged: nullstone.Event<Collections.CollectionChangedEventArgs>;
        ToArray(): any[];
        GetRange(startIndex: number, endIndex: number): any[];
        Contains(value: any): boolean;
        IndexOf(value: any): number;
        AddRange(values: any[]): any;
    }
    class ItemCollection extends XamlObjectCollection<any> implements IItemCollection {
        ItemsChanged: nullstone.Event<Collections.CollectionChangedEventArgs>;
        ToArray(): any[];
        Count: number;
        IsReadOnly: boolean;
        GetValueAt(index: number): XamlObject;
        GetRange(startIndex: number, endIndex: number): XamlObject[];
        SetValueAt(index: number, value: XamlObject): boolean;
        SetValueAtImpl(index: number, value: any): void;
        Add(value: XamlObject): number;
        AddImpl(value: any): number;
        AddRange(values: any[]): void;
        AddRangeImpl(values: any[]): void;
        Insert(index: number, value: XamlObject): boolean;
        InsertImpl(index: number, value: XamlObject): void;
        IndexOf(value: XamlObject): number;
        Contains(value: XamlObject): boolean;
        Remove(value: XamlObject): boolean;
        RemoveImpl(value: XamlObject): void;
        RemoveAt(index: number): boolean;
        RemoveAtImpl(index: number): void;
        Clear(): boolean;
        ClearImpl(): void;
        private _ValidateReadOnly();
    }
}
declare module Fayde.Controls {
    class ItemsPanelTemplate extends Markup.FrameworkTemplate {
        GetVisualTree(bindingSource: DependencyObject): Panel;
    }
}
declare module Fayde.Controls {
    class ItemsPresenterNode extends FENode {
        XObject: ItemsPresenter;
        constructor(xobj: ItemsPresenter);
        private _ElementRoot;
        ElementRoot: Panel;
        DoApplyTemplateWithError(error: BError): boolean;
    }
    class ItemsPresenter extends FrameworkElement {
        TemplateOwner: ItemsControl;
        XamlNode: ItemsPresenterNode;
        CreateNode(): ItemsPresenterNode;
        ItemsControl: ItemsControl;
        Panel: Panel;
        static Get(panel: Panel): ItemsPresenter;
        OnItemsAdded(index: number, newItems: any[]): void;
        OnItemsRemoved(index: number, oldItems: any[]): void;
    }
}
declare module Fayde.Controls {
    class ListBox extends Primitives.Selector {
        private _FocusedIndex;
        static ItemContainerStyleProperty: DependencyProperty;
        static IsSelectionActiveProperty: DependencyProperty;
        ItemContainerStyle: Style;
        constructor();
        ScrollIntoView(item: any): void;
        private _NavigateByPage(forward);
        private _ScrollInDirection(key);
        private _IsOnCurrentPage(item, itemsHostRectOut?, listBoxItemsRectOut?);
        private _GetFirstItemOnCurrentPage(startingIndex, forward);
        OnItemContainerStyleChanged(args: IDependencyPropertyChangedEventArgs): void;
        OnKeyDown(args: Input.KeyEventArgs): void;
        private _GetIsVerticalOrientation();
        IsItemItsOwnContainer(item: any): boolean;
        GetContainerForItem(): UIElement;
        PrepareContainerForItem(element: UIElement, item: any): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        NotifyListItemGotFocus(lbi: ListBoxItem): void;
        NotifyListItemLostFocus(lbi: ListBoxItem): void;
    }
}
declare module Fayde.Controls {
    class MediaElement extends FrameworkElement {
    }
}
declare module Fayde {
    class RoutedEventArgs implements nullstone.IEventArgs {
        Handled: boolean;
        Source: any;
        OriginalSource: any;
    }
}
declare module Fayde.Input {
    enum Key {
        None = 0,
        Back = 1,
        Tab = 2,
        Enter = 3,
        Shift = 4,
        Ctrl = 5,
        Alt = 6,
        CapsLock = 7,
        Escape = 8,
        Space = 9,
        PageUp = 10,
        PageDown = 11,
        End = 12,
        Home = 13,
        Left = 14,
        Up = 15,
        Right = 16,
        Down = 17,
        Insert = 18,
        Delete = 19,
        D0 = 20,
        D1 = 21,
        D2 = 22,
        D3 = 23,
        D4 = 24,
        D5 = 25,
        D6 = 26,
        D7 = 27,
        D8 = 28,
        D9 = 29,
        A = 30,
        B = 31,
        C = 32,
        D = 33,
        E = 34,
        F = 35,
        G = 36,
        H = 37,
        I = 38,
        J = 39,
        K = 40,
        L = 41,
        M = 42,
        N = 43,
        O = 44,
        P = 45,
        Q = 46,
        R = 47,
        S = 48,
        T = 49,
        U = 50,
        V = 51,
        W = 52,
        X = 53,
        Y = 54,
        Z = 55,
        F1 = 56,
        F2 = 57,
        F3 = 58,
        F4 = 59,
        F5 = 60,
        F6 = 61,
        F7 = 62,
        F8 = 63,
        F9 = 64,
        F10 = 65,
        F11 = 66,
        F12 = 67,
        NumPad0 = 68,
        NumPad1 = 69,
        NumPad2 = 70,
        NumPad3 = 71,
        NumPad4 = 72,
        NumPad5 = 73,
        NumPad6 = 74,
        NumPad7 = 75,
        NumPad8 = 76,
        NumPad9 = 77,
        Multiply = 78,
        Add = 79,
        Subtract = 80,
        Decimal = 81,
        Divide = 82,
        Unknown = 255,
    }
    class KeyboardEventArgs extends RoutedEventArgs {
    }
    class KeyEventArgs extends KeyboardEventArgs {
        Modifiers: IModifiersOn;
        PlatformKeyCode: number;
        Key: Key;
        Char: string;
        constructor(modifiers: IModifiersOn, keyCode: number, key: Key, c?: string);
    }
}
declare module Fayde.Controls {
    class TextBoxBase extends Control {
        static CaretBrushProperty: DependencyProperty;
        static SelectionForegroundProperty: DependencyProperty;
        static SelectionBackgroundProperty: DependencyProperty;
        static SelectionLengthProperty: DependencyProperty;
        static SelectionStartProperty: DependencyProperty;
        static BaselineOffsetProperty: DependencyProperty;
        static MaxLengthProperty: DependencyProperty;
        CaretBrush: Media.Brush;
        SelectionForeground: Media.Brush;
        SelectionBackground: Media.Brush;
        SelectionLength: number;
        SelectionStart: number;
        BaselineOffset: number;
        MaxLength: number;
        private _Selecting;
        private _Captured;
        IsReadOnly: boolean;
        AcceptsReturn: boolean;
        $ContentProxy: Internal.TextBoxContentProxy;
        $Proxy: Text.Proxy;
        $Advancer: Internal.ICursorAdvancer;
        $View: Internal.TextBoxView;
        constructor(eventsMask: Text.EmitChangedType);
        private _SyncFont();
        CreateView(): Internal.TextBoxView;
        Cursor: CursorType;
        OnApplyTemplate(): void;
        OnLostFocus(e: RoutedEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs): void;
        OnMouseMove(e: Input.MouseEventArgs): void;
        OnTouchDown(e: Input.TouchEventArgs): void;
        OnTouchUp(e: Input.TouchEventArgs): void;
        OnTouchMove(e: Input.TouchEventArgs): void;
        OnKeyDown(args: Input.KeyEventArgs): void;
        PostOnKeyDown(args: Input.KeyEventArgs): void;
        private _KeyDownBackSpace(modifiers);
        private _KeyDownDelete(modifiers);
        private _KeyDownPageDown(modifiers);
        private _KeyDownPageUp(modifiers);
        private _KeyDownHome(modifiers);
        private _KeyDownEnd(modifiers);
        private _KeyDownLeft(modifiers);
        private _KeyDownRight(modifiers);
        private _KeyDownDown(modifiers);
        private _KeyDownUp(modifiers);
    }
}
declare module Fayde.Controls {
    class PasswordBox extends TextBoxBase {
        static PasswordCharProperty: DependencyProperty;
        static PasswordProperty: DependencyProperty;
        PasswordChar: string;
        Password: string;
        constructor();
        DisplayText: string;
    }
}
declare module Fayde.Controls {
    class ProgressBar extends Primitives.RangeBase {
        private _Track;
        private _Indicator;
        static IsIndeterminateProperty: DependencyProperty;
        IsIndeterminate: boolean;
        private OnIsIndeterminateChanged(args);
        OnMinimumChanged(oldMinimum: number, newMinimum: number): void;
        OnMaximumChanged(oldMaximum: number, newMaximum: number): void;
        OnValueChanged(oldValue: number, newValue: number): void;
        constructor();
        OnApplyTemplate(): void;
        GoToStates(gotoFunc: (state: string) => boolean): void;
        private _OnTrackSizeChanged(sender, e);
        private _UpdateIndicator();
    }
}
declare module Fayde.Controls {
    class RadioButton extends Primitives.ToggleButton {
        static GroupNameProperty: DependencyProperty;
        GroupName: string;
        OnGroupNameChanged(args: IDependencyPropertyChangedEventArgs): void;
        constructor();
        OnIsCheckedChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnToggle(): void;
        UpdateRadioButtonGroup(): void;
    }
}
declare module Fayde.Controls {
    class _RichTextBoxView {
    }
    class RichTextBox extends Control {
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        TextWrapping: TextWrapping;
        constructor();
    }
}
declare module Fayde.Controls {
    class RowDefinition extends DependencyObject implements minerva.controls.grid.IRowDefinition {
        static HeightProperty: DependencyProperty;
        static MaxHeightProperty: DependencyProperty;
        static MinHeightProperty: DependencyProperty;
        static ActualHeightProperty: DependencyProperty;
        Height: GridLength;
        MaxHeight: number;
        MinHeight: number;
        ActualHeight: number;
        setActualHeight(value: number): void;
    }
    class RowDefinitionCollection extends XamlObjectCollection<RowDefinition> {
        _RaiseItemAdded(value: RowDefinition, index: number): void;
        _RaiseItemRemoved(value: RowDefinition, index: number): void;
    }
}
declare module Fayde.Controls {
    class Slider extends Primitives.RangeBase {
        private _DragValue;
        static IsDirectionReversedProperty: DependencyProperty;
        static IsFocusedProperty: DependencyProperty;
        static OrientationProperty: DependencyProperty;
        IsDirectionReversed: boolean;
        IsFocused: boolean;
        Orientation: Orientation;
        constructor();
        private $HorizontalTemplate;
        private $HorizontalLargeIncrease;
        private $HorizontalLargeDecrease;
        private $HorizontalThumb;
        private $VerticalTemplate;
        private $VerticalLargeIncrease;
        private $VerticalLargeDecrease;
        private $VerticalThumb;
        OnApplyTemplate(): void;
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs): void;
        OnMinimumChanged(oldMin: number, newMin: number): void;
        OnMaximumChanged(oldMax: number, newMax: number): void;
        OnValueChanged(oldValue: number, newValue: number): void;
        private _HandleSizeChanged(sender, e);
        private _OnOrientationChanged();
        private _UpdateTrackLayout();
        private _OnThumbDragStarted(sender, e);
        private _OnThumbDragDelta(sender, e);
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs): void;
        OnLostMouseCapture(e: Input.MouseEventArgs): void;
        OnKeyDown(e: Input.KeyEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
    }
}
declare module Fayde.Controls {
    class StackPanel extends Panel {
        CreateLayoutUpdater(): minerva.controls.stackpanel.StackPanelUpdater;
        static OrientationProperty: DependencyProperty;
        Orientation: Orientation;
    }
}
declare module Fayde.Controls {
    import TextBlockUpdater = minerva.controls.textblock.TextBlockUpdater;
    class TextBlockNode extends FENode {
        XObject: TextBlock;
        LayoutUpdater: TextBlockUpdater;
        private _IsDocAuto;
        private _SettingText;
        private _SettingInlines;
        private _AutoRun;
        constructor(xobj: TextBlock);
        GetInheritedEnumerator(): nullstone.IEnumerator<DONode>;
        TextChanged(args: IDependencyPropertyChangedEventArgs): void;
        InlinesChanged(inline: Documents.Inline, index: number, isAdd: boolean): void;
        InlineChanged(obj?: any): void;
    }
    class TextBlock extends FrameworkElement {
        XamlNode: TextBlockNode;
        CreateNode(): TextBlockNode;
        CreateLayoutUpdater(): TextBlockUpdater;
        static PaddingProperty: DependencyProperty;
        static FontFamilyProperty: DependencyProperty;
        static FontSizeProperty: DependencyProperty;
        static FontStretchProperty: DependencyProperty;
        static FontStyleProperty: DependencyProperty;
        static FontWeightProperty: DependencyProperty;
        static ForegroundProperty: DependencyProperty;
        static TextDecorationsProperty: DependencyProperty;
        static TextProperty: DependencyProperty;
        static InlinesProperty: ImmutableDependencyProperty<Documents.InlineCollection>;
        static LineStackingStrategyProperty: DependencyProperty;
        static LineHeightProperty: DependencyProperty;
        static TextAlignmentProperty: DependencyProperty;
        static TextTrimmingProperty: DependencyProperty;
        static TextWrappingProperty: DependencyProperty;
        Padding: Thickness;
        Foreground: Media.Brush;
        FontFamily: string;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        FontSize: number;
        TextDecorations: TextDecorations;
        Text: string;
        Inlines: Documents.InlineCollection;
        LineStackingStrategy: LineStackingStrategy;
        LineHeight: number;
        TextAlignment: TextAlignment;
        TextTrimming: TextTrimming;
        TextWrapping: TextWrapping;
        constructor();
        IsInheritable(propd: DependencyProperty): boolean;
    }
}
declare module Fayde.Controls {
    class TextBox extends TextBoxBase {
        static AcceptsReturnProperty: DependencyProperty;
        static IsReadOnlyProperty: DependencyProperty;
        static TextProperty: DependencyProperty;
        static TextAlignmentProperty: DependencyProperty;
        static TextWrappingProperty: DependencyProperty;
        static HorizontalScrollBarVisibilityProperty: DependencyProperty;
        static VerticalScrollBarVisibilityProperty: DependencyProperty;
        AcceptsReturn: boolean;
        IsReadOnly: boolean;
        Text: string;
        TextAlignment: TextAlignment;
        TextWrapping: TextWrapping;
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        VerticalScrollBarVisibility: ScrollBarVisibility;
        TextChanged: RoutedEvent<RoutedEventArgs>;
        constructor();
        OnApplyTemplate(): void;
        DisplayText: string;
        OnMouseEnter(e: Input.MouseEventArgs): void;
        OnMouseLeave(e: Input.MouseEventArgs): void;
        OnGotFocus(e: RoutedEventArgs): void;
        OnLostFocus(e: RoutedEventArgs): void;
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean;
        SelectAll(): void;
        Select(start: number, length: number): void;
    }
}
declare module Fayde.Controls {
    class ToolTip extends ContentControl {
        static HorizontalOffsetProperty: DependencyProperty;
        static VerticalOffsetProperty: DependencyProperty;
        static IsOpenProperty: DependencyProperty;
        static PlacementProperty: DependencyProperty;
        static PlacementTargetProperty: DependencyProperty;
        HorizontalOffset: number;
        VerticalOffset: number;
        IsOpen: boolean;
        Placement: PlacementMode;
        PlacementTarget: UIElement;
        private _TooltipParent;
        private _TooltipParentDCListener;
        TooltipParent: FrameworkElement;
        PlacementOverride: PlacementMode;
        PlacementTargetOverride: UIElement;
        Opened: RoutedEvent<RoutedEventArgs>;
        Closed: RoutedEvent<RoutedEventArgs>;
        private _ParentPopup;
        constructor();
        OnApplyTemplate(): void;
        private OnHorizontalOffsetChanged(args);
        private OnVerticalOffsetChanged(args);
        private OnIsOpenChanged(args);
        private OnOffsetChanged(horizontalOffset, verticalOffset);
        private OnLayoutUpdated(sender, e);
        private OnTooltipParentDataContextChanged(sender, args);
        private HookupParentPopup();
        private OnPopupOpened(sender, e);
        private OnPopupClosed(sender, e);
        private PerformPlacement(horizontalOffset, verticalOffset);
        GoToStates(gotoFunc: (state: string) => boolean): void;
    }
}
declare class Point extends minerva.Point {
    Clone(): Point;
    static LERP(start: Point, end: Point, p: number): Point;
}
declare module Fayde.Controls {
    class ToolTipService {
        static ToolTipProperty: DependencyProperty;
        static GetToolTip(dobj: DependencyObject): ToolTip;
        static SetToolTip(dobj: DependencyObject, value: ToolTip): void;
        static PlacementProperty: DependencyProperty;
        static GetPlacement(dobj: DependencyObject): PlacementMode;
        static SetPlacement(dobj: DependencyObject, value: PlacementMode): void;
        static PlacementTargetProperty: DependencyProperty;
        static GetPlacementTarget(dobj: DependencyObject): UIElement;
        static SetPlacementTarget(dobj: DependencyObject, value: UIElement): void;
        static MousePosition: Point;
    }
}
declare module Fayde.Controls {
    enum VirtualizationMode {
        Standard = 0,
        Recycling = 1,
    }
    class VirtualizingPanel extends Panel {
        static VirtualizationModeProperty: DependencyProperty;
        static GetVirtualizationMode(d: DependencyObject): VirtualizationMode;
        static SetVirtualizationMode(d: DependencyObject, value: VirtualizationMode): void;
        static IsVirtualizingProperty: DependencyProperty;
        static GetIsVirtualizing(d: DependencyObject): boolean;
        static SetIsVirtualizing(d: DependencyObject, value: boolean): void;
        ItemsControl: ItemsControl;
        OnItemsAdded(index: number, newItems: any[]): void;
        OnItemsRemoved(index: number, oldItems: any[]): void;
    }
}
declare module Fayde.Controls {
    import VirtualizingStackPanelUpdater = minerva.controls.virtualizingstackpanel.VirtualizingStackPanelUpdater;
    class VirtualizingStackPanel extends VirtualizingPanel implements Primitives.IScrollInfo {
        CreateLayoutUpdater(): VirtualizingStackPanelUpdater;
        private _ScrollData;
        ScrollOwner: ScrollViewer;
        CanHorizontallyScroll: boolean;
        CanVerticallyScroll: boolean;
        ExtentWidth: number;
        ExtentHeight: number;
        ViewportWidth: number;
        ViewportHeight: number;
        HorizontalOffset: number;
        VerticalOffset: number;
        LineUp(): boolean;
        LineDown(): boolean;
        LineLeft(): boolean;
        LineRight(): boolean;
        MouseWheelUp(): boolean;
        MouseWheelDown(): boolean;
        MouseWheelLeft(): boolean;
        MouseWheelRight(): boolean;
        PageUp(): boolean;
        PageDown(): boolean;
        PageLeft(): boolean;
        PageRight(): boolean;
        MakeVisible(uie: UIElement, rectangle: minerva.Rect): minerva.Rect;
        SetHorizontalOffset(offset: number): boolean;
        SetVerticalOffset(offset: number): boolean;
        static OrientationProperty: DependencyProperty;
        Orientation: Orientation;
        OnItemsAdded(index: number, newItems: any[]): void;
        OnItemsRemoved(index: number, oldItems: any[]): void;
    }
}
interface ICloneable {
    Clone(): any;
}
declare module Fayde {
    function Clone(value: any): any;
}
declare module Fayde {
    class DataTemplate extends Markup.FrameworkTemplate {
        static DataTypeProperty: DependencyProperty;
        DataType: Function;
    }
}
interface IDependencyPropertyChangedEventArgs {
    Property: DependencyProperty;
    OldValue: any;
    NewValue: any;
}
declare class DependencyPropertyChangedEventArgs implements nullstone.IEventArgs, IDependencyPropertyChangedEventArgs {
    Property: DependencyProperty;
    OldValue: any;
    NewValue: any;
}
declare module Fayde {
    class HierarchicalDataTemplate extends DataTemplate {
        static ItemsSourceProperty: DependencyProperty;
        static ItemTemplateProperty: DependencyProperty;
        static ItemContainerStyleProperty: DependencyProperty;
        ItemsSource: nullstone.IEnumerable<any>;
        ItemTemplate: DataTemplate;
        ItemContainerStyle: Style;
    }
}
declare module Fayde {
    class LayoutInformation {
        static GetLayoutClip(uie: UIElement): Media.Geometry;
        static GetLayoutSlot(uie: UIElement): minerva.Rect;
    }
}
declare module Fayde {
    class NameScope {
        IsRoot: boolean;
        private XNodes;
        constructor(isRoot?: boolean);
        FindName(name: string): XamlNode;
        RegisterName(name: string, xnode: XamlNode): void;
        UnregisterName(name: string): void;
        Absorb(otherNs: NameScope): void;
    }
}
declare module Fayde {
    interface IResourcable {
        Resources: Fayde.ResourceDictionary;
    }
    class ResourceDictionaryCollection extends XamlObjectCollection<ResourceDictionary> {
        Get(key: any): any;
        AddingToCollection(value: ResourceDictionary, error: BError): boolean;
        private _AssertNoCycles(subtreeRoot, firstAncestorNode, error);
    }
    class ResourceDictionary extends XamlObject implements nullstone.IEnumerable<any> {
        private _Keys;
        private _Values;
        private _IsSourceLoaded;
        private _SourceBacking;
        private _MergedDictionaries;
        MergedDictionaries: ResourceDictionaryCollection;
        Source: Uri;
        App: Application;
        Count: number;
        AttachTo(xobj: XamlObject): void;
        Contains(key: any): boolean;
        Get(key: any): any;
        Set(key: any, value: any): boolean;
        Remove(key: any): boolean;
        getEnumerator(reverse?: boolean): nullstone.IEnumerator<any>;
        GetNodeEnumerator<U extends XamlNode>(reverse?: boolean): nullstone.IEnumerator<U>;
        private _GetFromSource(key);
    }
}
declare module Fayde {
    class RoutedEvent<T extends RoutedEventArgs> extends nullstone.Event<T> {
    }
}
declare module Fayde {
    class RoutedPropertyChangedEvent<T> extends RoutedEvent<RoutedPropertyChangedEventArgs<T>> {
    }
    class RoutedPropertyChangedEventArgs<T> extends RoutedEventArgs {
        OldValue: T;
        NewValue: T;
        constructor(oldValue: T, newValue: T);
    }
}
declare module Fayde {
    class RoutedPropertyChangingEvent<T> extends RoutedEvent<RoutedPropertyChangingEventArgs<T>> {
    }
    class RoutedPropertyChangingEventArgs<T> extends RoutedEventArgs {
        Property: DependencyProperty;
        OldValue: T;
        NewValue: T;
        private _IsCancelable;
        IsCancellable: boolean;
        private _Cancel;
        Cancel: boolean;
        InCoercion: boolean;
        constructor(propd: DependencyProperty, oldValue: T, newValue: T, isCancelable: boolean);
    }
}
declare module Fayde {
    class SetterCollection extends XamlObjectCollection<Setter> {
        private _IsSealed;
        XamlNode: XamlNode;
        Seal(): void;
        AddingToCollection(value: Setter, error: BError): boolean;
        private _ValidateSetter(setter, error);
    }
    class Setter extends DependencyObject {
        private _IsSealed;
        static PropertyProperty: DependencyProperty;
        static ValueProperty: DependencyProperty;
        static ConvertedValueProperty: DependencyProperty;
        Property: DependencyProperty;
        Value: any;
        ConvertedValue: any;
        Seal(): void;
        static Compare(setter1: Setter, setter2: Setter): number;
    }
}
declare module Fayde {
    class SizeChangedEventArgs extends RoutedEventArgs {
        PreviousSize: minerva.Size;
        NewSize: minerva.Size;
        constructor(previousSize: minerva.Size, newSize: minerva.Size);
    }
}
declare module Fayde {
    class Style extends DependencyObject {
        private _IsSealed;
        static SettersProperty: ImmutableDependencyProperty<SetterCollection>;
        static BasedOnProperty: DependencyProperty;
        static TargetTypeProperty: DependencyProperty;
        Setters: SetterCollection;
        BasedOn: Style;
        TargetType: Function;
        constructor();
        Seal(): void;
        Validate(instance: DependencyObject, error: BError): boolean;
    }
}
declare module Fayde {
    class TemplateBinding implements nullstone.markup.IMarkupExtension {
        SourceProperty: string;
        init(val: string): void;
        transmute(os: any[]): any;
    }
}
declare module Fayde {
    class TriggerAction extends DependencyObject {
        Fire(): void;
    }
    class TriggerActionCollection extends XamlObjectCollection<TriggerAction> {
        Fire(): void;
    }
    class TriggerBase extends DependencyObject {
        Attach(target: XamlObject): void;
        Detach(target: XamlObject): void;
    }
    class EventTrigger extends TriggerBase {
        static ActionsProperty: ImmutableDependencyProperty<TriggerActionCollection>;
        static RoutedEventProperty: DependencyProperty;
        Actions: TriggerActionCollection;
        RoutedEvent: string;
        private _IsAttached;
        constructor();
        Attach(target: XamlObject): void;
        Detach(target: XamlObject): void;
        private _FireActions(sender, e);
        private _ParseEventName(target);
    }
    class TriggerCollection extends XamlObjectCollection<TriggerBase> {
        XamlNode: XamlNode;
        private ParentXamlObject;
        AddingToCollection(value: TriggerBase, error: BError): boolean;
        RemovedFromCollection(value: TriggerBase, isValueSafe: boolean): void;
        AttachTarget(target: XamlObject): void;
        DetachTarget(target: XamlObject): void;
    }
}
declare module Fayde {
    class VisualTreeEnum {
        static GetAncestors(uie: UIElement): nullstone.IEnumerable<UIElement>;
    }
}
declare module Fayde {
    class VisualTreeHelper {
        static GetParent(d: DependencyObject): DependencyObject;
        static GetParentOfType<T extends DependencyObject>(d: DependencyObject, type: any): T;
        static GetRoot(d: DependencyObject): DependencyObject;
        static GetChild(d: DependencyObject, childIndex: number): DependencyObject;
        static GetChildrenCount(d: DependencyObject): number;
        static FindElementsInHostCoordinates(pos: Point, uie: UIElement): UIElement[];
        static __Debug(ui: any, func?: (uin: UINode, tabIndex: number) => string): string;
        private static __DebugTree(curNode, matchNode, tabIndex, func);
        private static __DebugUIElement(uin, tabIndex);
        private static __DebugGrid(uin, tabIndex);
        private static __DebugUIElementLayout(uin, tabIndex);
        static __DebugLayout(ui: any): string;
        private static __GetById(id);
    }
}
declare module Fayde {
    enum VisualTreeDirection {
        Logical = 0,
        Reverse = 1,
        ZForward = 2,
        ZReverse = 3,
    }
    interface IWalker {
        Step(): any;
    }
    interface IStyleWalker extends IWalker {
        Step(): Setter;
    }
    interface IDeepTreeWalker extends IWalker {
        Step(): UINode;
        SkipBranch(): any;
    }
    interface ITabNavigationWalker {
        FocusChild(): boolean;
    }
    function SingleStyleWalker(style: Style): IStyleWalker;
    function MultipleStylesWalker(styles: Style[]): IStyleWalker;
    function DeepTreeWalker(topNode: UINode, direction?: VisualTreeDirection): IDeepTreeWalker;
    class TabNavigationWalker implements ITabNavigationWalker {
        private _Root;
        private _Current;
        private _Forwards;
        private _TabSorted;
        constructor(root: UINode, cur: UINode, forwards: boolean);
        FocusChild(): boolean;
        static Focus(uin: UINode, forwards?: boolean): boolean;
    }
}
declare module Fayde.Data {
    var WarnBrokenPath: boolean;
    class Binding implements nullstone.markup.IMarkupExtension, ICloneable {
        StringFormat: string;
        FallbackValue: any;
        TargetNullValue: any;
        BindsDirectlyToSource: boolean;
        Converter: IValueConverter;
        ConverterParameter: any;
        ConverterCulture: any;
        ElementName: string;
        Mode: BindingMode;
        NotifyOnValidationError: boolean;
        RelativeSource: RelativeSource;
        Path: Data.PropertyPath;
        Source: any;
        UpdateSourceTrigger: UpdateSourceTrigger;
        ValidatesOnExceptions: boolean;
        ValidatesOnDataErrors: boolean;
        ValidatesOnNotifyDataErrors: boolean;
        constructor();
        constructor(path: string | Data.PropertyPath);
        constructor(binding: Binding);
        init(val: string): void;
        transmute(os: any[]): any;
        private $$coerce();
        Clone(): Binding;
        static fromData(data: IBindingData): Binding;
    }
}
declare module Fayde.Data {
    class CollectionViewSource extends DependencyObject {
        static SourceProperty: DependencyProperty;
        static ViewProperty: DependencyProperty;
        Source: any;
        View: ICollectionView;
    }
}
declare module Fayde.Data {
    class DataErrorsChangedEventArgs implements nullstone.IEventArgs {
        PropertyName: string;
        constructor(propertyName: string);
    }
}
declare module Fayde.Data {
    enum RelativeSourceMode {
        TemplatedParent = 0,
        Self = 1,
        FindAncestor = 2,
        ItemsControlParent = 3,
    }
    enum BindingMode {
        OneWay = 0,
        TwoWay = 1,
        OneTime = 2,
        OneWayToSource = 3,
    }
    enum UpdateSourceTrigger {
        Default = 0,
        PropertyChanged = 1,
        Explicit = 3,
    }
}
declare module Fayde.Data {
    interface IBindingData {
        Path: string | Data.PropertyPath;
        StringFormat?: string;
        FallbackValue?: any;
        TargetNullValue?: any;
        BindsDirectlyToSource?: boolean;
        Converter?: IValueConverter;
        ConverterParameter?: any;
        ConverterCulture?: any;
        ElementName?: string;
        Mode?: BindingMode;
        NotifyOnValidationError?: boolean;
        RelativeSource?: RelativeSource;
        Source?: any;
        UpdateSourceTrigger?: UpdateSourceTrigger;
        ValidatesOnExceptions?: boolean;
        ValidatesOnDataErrors?: boolean;
        ValidatesOnNotifyDataErrors?: boolean;
    }
}
declare module Fayde.Data {
    interface ICollectionView extends nullstone.IEnumerable<any> {
        CurrentChanged: nullstone.Event<nullstone.IEventArgs>;
        CurrentItem: any;
        MoveCurrentTo(item: any): boolean;
    }
    var ICollectionView_: nullstone.Interface<ICollectionView>;
}
declare module Fayde.Data {
    interface IDataErrorInfo {
        Error: string;
        GetError(propertyName: string): string;
    }
    var IDataErrorInfo_: nullstone.Interface<IDataErrorInfo>;
}
declare module Fayde.Data {
    interface INotifyDataErrorInfo {
        ErrorsChanged: nullstone.Event<DataErrorsChangedEventArgs>;
        GetErrors(propertyName: string): nullstone.IEnumerable<any>;
        HasErrors: boolean;
    }
    var INotifyDataErrorInfo_: nullstone.Interface<INotifyDataErrorInfo>;
}
declare module Fayde.Data {
    interface IValueConverter {
        Convert(value: any, targetType: IType, parameter: any, culture: any): any;
        ConvertBack(value: any, targetType: IType, parameter: any, culture: any): any;
    }
    var IValueConverter_: nullstone.Interface<IValueConverter>;
}
declare module Fayde.Data {
    class RelativeSource implements nullstone.markup.IMarkupExtension, ICloneable {
        Mode: RelativeSourceMode;
        AncestorLevel: number;
        AncestorType: Function;
        constructor();
        constructor(rs: RelativeSource);
        init(val: string): void;
        resolveTypeFields(resolver: (full: string) => any): void;
        transmute(os: any[]): any;
        Clone(): RelativeSource;
        Find(target: XamlObject): XamlObject;
    }
}
declare module Fayde.Documents {
    interface ITextReactionCallback<T> {
        (updater: minerva.text.TextUpdater, ov: T, nv: T, te?: TextElement): void;
    }
    function TextReaction<TValue>(propd: DependencyProperty, callback?: ITextReactionCallback<TValue>, listen?: boolean, sync?: any, instance?: any): void;
}
declare module Fayde.Documents {
    class TextElementNode extends DONode {
        XObject: TextElement;
        constructor(xobj: TextElement, inheritedWalkProperty: string);
        InheritedWalkProperty: string;
        GetInheritedEnumerator(): nullstone.IEnumerator<DONode>;
    }
    class TextElement extends DependencyObject implements Providers.IIsPropertyInheritable {
        XamlNode: TextElementNode;
        TextUpdater: minerva.text.TextUpdater;
        CreateNode(): TextElementNode;
        constructor();
        static FontFamilyProperty: DependencyProperty;
        static FontSizeProperty: DependencyProperty;
        static FontStretchProperty: DependencyProperty;
        static FontStyleProperty: DependencyProperty;
        static FontWeightProperty: DependencyProperty;
        static ForegroundProperty: DependencyProperty;
        static LanguageProperty: DependencyProperty;
        Foreground: Media.Brush;
        FontFamily: string;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        FontSize: number;
        Language: string;
        IsInheritable(propd: DependencyProperty): boolean;
        _SerializeText(): string;
        Start: number;
        Equals(te: TextElement): boolean;
    }
}
declare module Fayde.Documents {
    class Block extends TextElement {
    }
}
declare module Fayde.Documents {
    class BlockCollection extends XamlObjectCollection<Block> {
        _RaiseItemAdded(value: Block, index: number): void;
        _RaiseItemRemoved(value: Block, index: number): void;
    }
}
declare module Fayde.Documents {
    class Inline extends TextElement {
        static TextDecorationsProperty: DependencyProperty;
        TextDecorations: TextDecorations;
        constructor();
        Equals(inline: Inline): boolean;
        IsInheritable(propd: DependencyProperty): boolean;
    }
}
declare module Fayde.Documents {
    class InlineCollection extends XamlObjectCollection<Inline> {
        _RaiseItemAdded(value: Inline, index: number): void;
        _RaiseItemRemoved(value: Inline, index: number): void;
    }
}
declare module Fayde.Documents {
    class LineBreak extends Inline {
    }
}
declare module Fayde.Documents {
    class Paragraph extends Block {
        CreateNode(): TextElementNode;
        static InlinesProperty: ImmutableDependencyProperty<InlineCollection>;
        Inlines: InlineCollection;
        constructor();
        InlinesChanged(inline: Inline, isAdd: boolean): void;
    }
}
declare module Fayde.Documents {
    class Run extends Inline implements Providers.IIsPropertyInheritable {
        static FlowDirectionProperty: DependencyProperty;
        static TextProperty: DependencyProperty;
        FlowDirection: FlowDirection;
        Text: string;
        _SerializeText(): string;
        IsInheritable(propd: DependencyProperty): boolean;
    }
}
declare module Fayde.Documents {
    class Section extends TextElement {
        CreateNode(): TextElementNode;
        static BlocksProperty: ImmutableDependencyProperty<BlockCollection>;
        Blocks: BlockCollection;
        constructor();
        BlocksChanged(block: Block, isAdd: boolean): void;
    }
}
declare module Fayde.Documents {
    class Span extends Inline {
        CreateNode(): TextElementNode;
        static InlinesProperty: ImmutableDependencyProperty<InlineCollection>;
        Inlines: InlineCollection;
        constructor();
        _SerializeText(): string;
        InlinesChanged(inline: Inline, isAdd: boolean): void;
    }
}
declare module Fayde.Documents {
    class Underline extends Span {
    }
}
interface ITimeline {
    Update(nowTime: number): any;
}
declare module Fayde {
    class Application extends DependencyObject implements IResourcable, ITimerListener {
        static Current: Application;
        MainSurface: Surface;
        Loaded: nullstone.Event<{}>;
        Address: Uri;
        AllowNavigation: boolean;
        private _IsRunning;
        private _IsLoaded;
        private _Storyboards;
        private _ClockTimer;
        private _RootVisual;
        static ResourcesProperty: ImmutableDependencyProperty<ResourceDictionary>;
        static ThemeNameProperty: DependencyProperty;
        Resources: ResourceDictionary;
        ThemeName: string;
        private OnThemeNameChanged(args);
        private _ApplyTheme();
        Resized: RoutedEvent<SizeChangedEventArgs>;
        OnResized(oldSize: minerva.Size, newSize: minerva.Size): void;
        constructor();
        RootVisual: UIElement;
        $$SetRootVisual(value: UIElement): void;
        Attach(canvas: HTMLCanvasElement): void;
        Start(): void;
        OnTicked(lastTime: number, nowTime: number): void;
        private StopEngine();
        private ProcessStoryboards(lastTime, nowTime);
        private Update();
        private Render();
        RegisterStoryboard(storyboard: ITimeline): void;
        UnregisterStoryboard(storyboard: ITimeline): void;
        static GetAsync(url: string): nullstone.async.IAsyncRequest<Application>;
        Resolve(): nullstone.async.IAsyncRequest<Application>;
    }
}
declare module Fayde {
    interface ITimerListener {
        OnTicked(lastTime: number, nowTime: number): any;
    }
    class ClockTimer {
        private _Listeners;
        private _LastTime;
        RegisterTimer(listener: Fayde.ITimerListener): void;
        UnregisterTimer(listener: Fayde.ITimerListener): void;
        private _DoTick();
        private _RequestAnimationTick();
    }
}
declare class Exception {
    Message: string;
    constructor(message: string);
    toString(): string;
}
declare class ArgumentException extends Exception {
    constructor(message: string);
}
declare class ArgumentNullException extends Exception {
    constructor(message: string);
}
declare class InvalidOperationException extends Exception {
    constructor(message: string);
}
declare class XamlParseException extends Exception {
    constructor(message: string);
}
declare class XamlMarkupParseException extends Exception {
    constructor(message: string);
}
declare class NotSupportedException extends Exception {
    constructor(message: string);
}
declare class IndexOutOfRangeException extends Exception {
    constructor(index: number);
}
declare class ArgumentOutOfRangeException extends Exception {
    constructor(msg: string);
}
declare class AttachException extends Exception {
    Data: any;
    constructor(message: string, data: any);
}
declare class InvalidJsonException extends Exception {
    JsonText: string;
    InnerException: Error;
    constructor(jsonText: string, innerException: Error);
}
declare class TargetInvocationException extends Exception {
    InnerException: Exception;
    constructor(message: string, innerException: Exception);
}
declare class UnknownTypeException extends Exception {
    FullTypeName: string;
    constructor(fullTypeName: string);
}
declare class FormatException extends Exception {
    constructor(message: string);
}
declare module Fayde.Engine {
    class FocusManager {
        private _State;
        private _ChangedEvents;
        Node: UINode;
        constructor(state: IInputState);
        GetFocusToRoot(): UINode[];
        OnNodeDetached(node: UINode): void;
        TabFocus(isShift: boolean): boolean;
        Focus(ctrlNode: Fayde.Controls.ControlNode, recurse?: boolean): boolean;
        private _FocusNode(uin?);
        EmitChanges(): void;
        EmitChangesAsync(): void;
        private _EmitFocusList(type, list);
        FocusAnyLayer(walker: minerva.IWalker<minerva.core.Updater>): void;
    }
}
declare module Fayde.Engine {
    interface IInputState {
        IsUserInitiated: boolean;
        IsFirstUserInitiated: boolean;
    }
    class InputManager {
        private _Surface;
        private _KeyInterop;
        private _MouseInterop;
        private _TouchInterop;
        private _Focus;
        private _State;
        private _Cursor;
        SetCursor: (cursor: CursorType) => void;
        private _CurrentPos;
        private _EmittingMouseEvent;
        private _InputList;
        private _Captured;
        private _PendingCapture;
        private _PendingReleaseCapture;
        private _CapturedInputList;
        FocusedNode: UINode;
        Focus(node: Controls.ControlNode, recurse?: boolean): boolean;
        constructor(surface: Surface);
        Register(canvas: HTMLCanvasElement): void;
        OnNodeDetached(node: UINode): void;
        SetIsUserInitiatedEvent(value: boolean): void;
        HandleKeyDown(args: Input.KeyEventArgs): void;
        private _EmitKeyDown(list, args, endIndex?);
        HandleMousePress(button: number, pos: Point): boolean;
        HandleMouseRelease(button: number, pos: Point): void;
        HandleMouseEvent(type: Input.MouseInputType, button: number, pos: Point, delta?: number, emitLeave?: boolean, emitEnter?: boolean): boolean;
        private _EmitMouseList(type, button, pos, delta, list, endIndex?);
        HitTestPoint(pos: Point): UINode[];
        UpdateCursorFromInputList(): void;
        SetMouseCapture(uin: Fayde.UINode): boolean;
        ReleaseMouseCapture(uin: Fayde.UINode): void;
        private _PerformCapture(uin);
        private _PerformReleaseCapture();
    }
}
declare module Fayde.Engine {
    class Inspection {
        static TryHandle(type: Input.MouseInputType, isLeftButton: boolean, isRightButton: boolean, args: Input.MouseEventArgs, htlist: UINode[]): boolean;
        static Kill(): void;
    }
}
declare var resizeTimeout: number;
declare module Fayde {
    class Surface extends minerva.engine.Surface {
        App: Application;
        private $$root;
        private $$inputMgr;
        HitTestCallback: (inputList: Fayde.UINode[]) => void;
        constructor(app: Application);
        init(canvas: HTMLCanvasElement): void;
        Attach(uie: UIElement, root?: boolean): void;
        attachLayer(layer: minerva.core.Updater, root?: boolean): void;
        Detach(uie: UIElement): void;
        detachLayer(layer: minerva.core.Updater): void;
        updateLayout(): boolean;
        private $$onLayoutUpdated();
        Focus(node: Controls.ControlNode, recurse?: boolean): boolean;
        static HasFocus(uie: UIElement): boolean;
        static Focus(uie: Controls.Control, recurse?: boolean): boolean;
        static GetFocusedElement(uie: UIElement): UIElement;
        static RemoveFocusFrom(uie: UIElement): boolean;
        static SetMouseCapture(uin: Fayde.UINode): boolean;
        static ReleaseMouseCapture(uin: Fayde.UINode): void;
        private $$handleResize(evt);
        private $$stretchCanvas();
    }
}
declare module Fayde {
    class Theme {
        Name: string;
        LibraryUri: Uri;
        Resources: ResourceDictionary;
        static WarnMissing: boolean;
        constructor(name: string, libUri: Uri);
        LoadAsync(): nullstone.async.IAsyncRequest<Theme>;
        GetImplicitStyle(type: any): Style;
    }
}
declare module Fayde {
    module ThemeConfig {
        function GetRequestUri(uri: Uri, name: string): string;
        function OverrideRequestUri(uri: Uri, templateUri: string): void;
        function Set(libName: string, path: string): void;
    }
}
declare module Fayde {
    interface IThemeManager {
        LoadAsync(themeName: string): nullstone.async.IAsyncRequest<any>;
        FindStyle(defaultStyleKey: any): Style;
    }
    var ThemeManager: IThemeManager;
}
declare module Fayde {
    class Expression {
        IsUpdating: boolean;
        IsAttached: boolean;
        Seal(owner: DependencyObject, prop: any): void;
        OnAttached(target: XamlObject): void;
        OnDetached(target: XamlObject): void;
        GetValue(propd: DependencyProperty): any;
        OnDataContextChanged(newDataContext: any): void;
    }
}
declare module Fayde.Data {
    class BindingExpressionBase extends Expression implements IPropertyPathWalkerListener {
        ParentBinding: Data.Binding;
        Target: DependencyObject;
        Property: DependencyProperty;
        private PropertyPathWalker;
        private _PropertyListener;
        private _SourceAvailableMonitor;
        private _IsDataContextBound;
        private _DataContext;
        private _TwoWayLostFocusElement;
        private _CurrentNotifyError;
        private _CurrentError;
        DataItem: any;
        private _Cached;
        private _CachedValue;
        constructor(binding: Data.Binding);
        private _IsSealed;
        Seal(owner: DependencyObject, prop: any): void;
        OnAttached(element: DependencyObject): void;
        GetValue(propd: DependencyProperty): any;
        private _OnSourceAvailable();
        private _FindSource();
        private _FindSourceByElementName();
        OnDetached(element: DependencyObject): void;
        IsBrokenChanged(): void;
        ValueChanged(): void;
        UpdateSource(): void;
        _TryUpdateSourceObject(value: any): void;
        private _UpdateSourceCallback(sender, args);
        private _TargetLostFocus(sender, e);
        private _ShouldUpdateSource();
        private _UpdateSourceObject(value?);
        OnDataContextChanged(newDataContext: any): void;
        private _Invalidate();
        Refresh(): void;
        private _ConvertFromTargetToSource(binding, node, value);
        private _ConvertToType(propd, value);
        private _MaybeEmitError(message, exception);
        private _AttachToNotifyError(element);
        private _NotifyErrorsChanged(sender, e);
    }
}
declare module Fayde.Data {
    class BindingExpression extends BindingExpressionBase {
        constructor(binding: Data.Binding);
    }
}
declare module Fayde {
    class DeferredValueExpression extends Expression {
        GetValue(propd: DependencyProperty): any;
        toString(): string;
    }
}
declare module Fayde {
    interface IEventBindingArgs<T extends nullstone.IEventArgs> {
        sender: any;
        args: T;
        parameter: any;
    }
    class EventBindingExpression extends Expression {
        IsUpdating: boolean;
        IsAttached: boolean;
        private _EventBinding;
        private _CommandWalker;
        private _CommandParameterWalker;
        private _Target;
        private _Event;
        private _EventName;
        constructor(eventBinding: Markup.EventBinding);
        Seal(owner: DependencyObject, prop: any): void;
        Init(eventName: string): void;
        GetValue(propd: DependencyProperty): any;
        OnAttached(target: XamlObject): void;
        OnDetached(target: XamlObject): void;
        OnDataContextChanged(newDataContext: any): void;
        private _Callback(sender, e);
    }
}
declare module Fayde {
    class TemplateBindingExpression extends Expression {
        private _Target;
        private _Listener;
        private _SourcePropertyName;
        private _IsSealed;
        SourceProperty: DependencyProperty;
        TargetProperty: DependencyProperty;
        constructor(sourceProperty: string);
        Seal(owner: DependencyObject, prop: any): void;
        GetValue(propd: DependencyProperty): any;
        OnAttached(dobj: DependencyObject): void;
        OnDetached(dobj: DependencyObject): void;
        OnSourcePropertyChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs): void;
        private _AttachListener();
        private _DetachListener();
    }
}
declare module Fayde.Input {
    interface ICommand {
        Execute(parameter: any): any;
        CanExecute(parameter: any): boolean;
        CanExecuteChanged: nullstone.Event<nullstone.IEventArgs>;
    }
    var ICommand_: nullstone.Interface<ICommand>;
}
declare module Fayde.Input {
    module InteractionHelper {
        function GetLogicalKey(flowDirection: FlowDirection, key: Key): Key;
    }
}
declare module Fayde.Input {
    interface IKeyInterop {
        RegisterEvents(inputHandler: Engine.InputManager): any;
    }
    function CreateKeyInterop(): IKeyInterop;
}
declare module Fayde.Input {
    class KeyboardNavigation {
        static AcceptsReturnProperty: DependencyProperty;
        static GetAcceptsReturn(d: DependencyObject): boolean;
        static SetAcceptsReturn(d: DependencyObject, value: boolean): void;
        static ControlTabNavigationProperty: DependencyProperty;
        static GetControlTabNavigation(d: DependencyObject): KeyboardNavigationMode;
        static SetControlTabNavigation(d: DependencyObject, value: KeyboardNavigationMode): void;
        static DirectionalNavigationProperty: DependencyProperty;
        static GetDirectionalNavigation(d: DependencyObject): KeyboardNavigationMode;
        static SetDirectionalNavigation(d: DependencyObject, value: KeyboardNavigationMode): void;
        static IsTabStopProperty: DependencyProperty;
        static GetIsTabStop(d: DependencyObject): boolean;
        static SetIsTabStop(d: DependencyObject, value: boolean): void;
        static TabIndexProperty: DependencyProperty;
        static GetTabIndex(d: DependencyObject): number;
        static SetTabIndex(d: DependencyObject, value: number): void;
        static TabNavigationProperty: DependencyProperty;
        static GetTabNavigation(d: DependencyObject): KeyboardNavigationMode;
        static SetTabNavigation(d: DependencyObject, value: KeyboardNavigationMode): void;
    }
}
declare module Fayde.Input {
    class MouseEventArgs extends RoutedEventArgs {
        AbsolutePos: Point;
        constructor(absolutePos: Point);
        GetPosition(relativeTo: UIElement): Point;
    }
    class MouseButtonEventArgs extends MouseEventArgs {
        constructor(absolutePos: Point);
    }
    class MouseWheelEventArgs extends MouseEventArgs {
        Delta: number;
        constructor(absolutePos: Point, delta: number);
    }
}
declare module Fayde.Input {
    enum MouseInputType {
        NoOp = 0,
        MouseUp = 1,
        MouseDown = 2,
        MouseLeave = 3,
        MouseEnter = 4,
        MouseMove = 5,
        MouseWheel = 6,
    }
    interface IMouseInterop {
        RegisterEvents(input: Engine.InputManager, canvas: HTMLCanvasElement): any;
        CreateEventArgs(type: MouseInputType, pos: Point, delta: number): Fayde.Input.MouseEventArgs;
        IsLeftButton(button: number): boolean;
        IsRightButton(button: number): boolean;
    }
    function CreateMouseInterop(): IMouseInterop;
}
declare module Fayde.Input {
    class TouchEventArgs extends RoutedEventArgs {
        Device: ITouchDevice;
        constructor(device: ITouchDevice);
        GetTouchPoint(relativeTo: UIElement): TouchPoint;
    }
}
interface Touch {
    radiusX: number;
    radiusY: number;
    rotationAngle: number;
    force: number;
}
interface TouchList {
    identifiedTouch(identifier: number): Touch;
}
interface TouchEvent extends UIEvent {
    initTouchEvent(type: string, canBubble: boolean, cancelable: boolean, view: any, detail: number, ctrlKey: boolean, altKey: boolean, shiftKey: boolean, metaKey: boolean, touches: TouchList, targetTouches: TouchList, changedTouches: TouchList): any;
}
declare module Fayde.Input {
    interface ITouchDevice {
        Identifier: number;
        Captured: UIElement;
        Capture(uie: UIElement): boolean;
        ReleaseCapture(uie: UIElement): any;
        GetTouchPoint(relativeTo: UIElement): TouchPoint;
    }
    enum TouchInputType {
        NoOp = 0,
        TouchDown = 1,
        TouchUp = 2,
        TouchMove = 3,
        TouchEnter = 4,
        TouchLeave = 5,
    }
    interface ITouchInterop {
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement): any;
    }
    function CreateTouchInterop(): ITouchInterop;
}
declare module Fayde.Input {
    class TouchPoint {
        Position: Point;
        Force: number;
        constructor(position: Point, force: number);
    }
}
declare module Fayde.Input {
    class VirtualKeyboard {
        static Init(): void;
        static Launch(): void;
    }
}
declare class TimeSpan {
    static _TicksPerMillisecond: number;
    static _TicksPerSecond: number;
    static _TicksPerMinute: number;
    static _TicksPerHour: number;
    static _TicksPerDay: number;
    private _Ticks;
    static Zero: TimeSpan;
    static MinValue: TimeSpan;
    static MaxValue: TimeSpan;
    static FromDays(value: number): TimeSpan;
    static FromHours(value: number): TimeSpan;
    static FromMinutes(value: number): TimeSpan;
    static FromSeconds(value: number): TimeSpan;
    static FromMilliseconds(value: number): TimeSpan;
    constructor();
    constructor(ticks: number);
    constructor(hours: number, minutes: number, seconds: number);
    constructor(days: number, hours: number, minutes: number, seconds: number, milliseconds?: number);
    Days: number;
    Hours: number;
    Minutes: number;
    Seconds: number;
    Milliseconds: number;
    Ticks: number;
    TotalDays: number;
    TotalHours: number;
    TotalMinutes: number;
    TotalSeconds: number;
    TotalMilliseconds: number;
    AddTicks(ticks: number): void;
    AddMilliseconds(milliseconds: number): void;
    Add(ts2: TimeSpan): TimeSpan;
    Subtract(ts2: TimeSpan): TimeSpan;
    Multiply(v: number): TimeSpan;
    Divide(ts2: TimeSpan): TimeSpan;
    CompareTo(ts2: TimeSpan): number;
    IsZero(): boolean;
    GetJsDelay(): number;
    toString(format?: string): string;
    valueOf(): Object;
}
declare enum DayOfWeek {
    Sunday = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 3,
    Thursday = 4,
    Friday = 5,
    Saturday = 6,
}
declare enum DateTimeKind {
    Unspecified = 0,
    Local = 1,
    Utc = 2,
}
declare class DateTime {
    private static MAX_TICKS;
    private static MIN_TICKS;
    static MinValue: DateTime;
    static MaxValue: DateTime;
    static Now: DateTime;
    static Today: DateTime;
    static Compare(dt1: DateTime, dt2: DateTime): number;
    static DaysInMonth(year: number, month: number): number;
    private _InternalDate;
    private _Kind;
    constructor();
    constructor(dt: Date);
    constructor(dt: Date, kind: DateTimeKind);
    constructor(ticks: number);
    constructor(ticks: number, kind: DateTimeKind);
    constructor(year: number, month: number, day: number);
    constructor(year: number, month: number, day: number, hour: number, minute: number, second: number);
    constructor(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number);
    constructor(year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number, kind: DateTimeKind);
    Ticks: number;
    Kind: DateTimeKind;
    Date: DateTime;
    Day: number;
    DayOfWeek: DayOfWeek;
    DayOfYear: number;
    Hour: number;
    Millisecond: number;
    Minute: number;
    Month: number;
    Second: number;
    TimeOfDay: TimeSpan;
    Year: number;
    AddYears(years: number): DateTime;
    AddMonths(months: number): DateTime;
    AddDays(value: number): DateTime;
    AddHours(value: number): DateTime;
    AddMinutes(value: number): DateTime;
    AddSeconds(value: number): DateTime;
    AddMilliseconds(value: number): DateTime;
    Add(value: TimeSpan): DateTime;
    AddTicks(value: number): DateTime;
    Subtract(value: DateTime): TimeSpan;
    Subtract(value: TimeSpan): DateTime;
    ToUniversalTime(): DateTime;
    toString(format?: string): string;
    valueOf(): Object;
}
declare module Fayde.Localization {
    class Calendar {
        ID: number;
        Eras: number[];
        EraNames: string[];
        CurrentEraValue: number;
        TwoDigitYearMax: number;
        MaxSupportedDateTime: DateTime;
        MinSupportedDateTime: DateTime;
    }
}
declare module Fayde.Localization {
    enum CalendarWeekRule {
        FirstDay = 0,
        FirstFullWeek = 1,
        FirstFourDayWeek = 2,
    }
    class DateTimeFormatInfo {
        AbbreviatedDayNames: string[];
        AbbreviatedMonthGenitiveNames: string[];
        AbbreviatedMonthNames: string[];
        AMDesignator: string;
        Calendar: Calendar;
        CalendarWeekRule: CalendarWeekRule;
        DateSeparator: string;
        DayNames: string[];
        FirstDayOfWeek: DayOfWeek;
        FullDateTimePattern: string;
        LongDatePattern: string;
        LongTimePattern: string;
        MonthDayPattern: string;
        MonthGenitiveNames: string[];
        MonthNames: string[];
        PMDesignator: string;
        RFC1123Pattern: string;
        ShortDatePattern: string;
        ShortestDayNames: string[];
        ShortTimePattern: string;
        SortableDateTimePattern: string;
        TimeSeparator: string;
        UniversalSortableDateTimePattern: string;
        YearMonthPattern: string;
        HasForceTwoDigitYears: boolean;
        GetEraName(era: number): string;
        static Instance: DateTimeFormatInfo;
        static ParseRepeatPattern(format: string, pos: number, patternChar: string): number;
        static ParseNextChar(format: string, pos: number): number;
        static ParseQuoteString(format: string, pos: number, result: string[]): number;
        static FormatDigits(sb: string[], value: number, len: number, overrideLenLimit?: boolean): void;
        static FormatMonth(month: number, repeat: number, info: DateTimeFormatInfo): string;
        static FormatDayOfWeek(dayOfWeek: DayOfWeek, repeat: number, info: DateTimeFormatInfo): string;
        static HebrewFormatDigits(sb: string[], digits: number): string;
        static FormatHebrewMonthName(obj: DateTime, month: number, repeat: number, info: DateTimeFormatInfo): string;
    }
}
declare module Fayde.Localization {
    function Format(format: string, ...items: any[]): string;
    function FormatSingle(obj: any, format: string): string;
    interface IFormattable {
        (obj: any, format: string, provider?: any): string;
    }
    function RegisterFormattable(type: Function, formatter: IFormattable): void;
}
declare module Fayde.Localization {
}
declare module Fayde.Localization {
    class NumberFormatInfo {
        CurrencyDecimalDigits: number;
        CurrencyDecimalSeparator: string;
        CurrencyGroupSeparator: string;
        CurrencyGroupSizes: number[];
        CurrencyNegativePattern: number;
        CurrencyPositivePattern: number;
        CurrencySymbol: string;
        NaNSymbol: string;
        NegativeInfinitySymbol: string;
        PositiveInfinitySymbol: string;
        NegativeSign: string;
        PositiveSign: string;
        NumberDecimalDigits: number;
        NumberDecimalSeparator: string;
        NumberGroupSeparator: string;
        NumberGroupSizes: number[];
        NumberNegativePattern: number;
        PercentDecimalDigits: number;
        PercentDecimalSeparator: string;
        PercentGroupSeparator: string;
        PercentGroupSizes: number[];
        PercentNegativePattern: number;
        PercentPositivePattern: number;
        PercentSymbol: string;
        PerMilleSymbol: string;
        static Instance: NumberFormatInfo;
        FormatCurrency(num: number, precision: number): string;
        FormatNumber(num: number, precision: number, ignoreGroupSep?: boolean): string;
        FormatPercent(num: number, precision: number): string;
        FormatGeneral(num: number, precision: number): string;
        FormatDecimal(num: number, precision: number): string;
        FormatExponential(num: number, precision: number): string;
        FormatHexadecimal(num: number, precision: number): string;
        FormatRawNumber(num: number, precision: number, decSep: string, groupSep: string, groupSizes: number[]): string;
    }
}
declare module Fayde.Localization {
}
declare module Fayde.Localization {
}
declare module Fayde.MVVM {
    interface IValidationFunc {
        (value: any, propertyName: string, entity: any): any[];
    }
    interface IAutoApplier<T> {
        Notify(...properties: string[]): IAutoApplier<T>;
        Notify(properties: string[]): IAutoApplier<T>;
        Validate(propertyName: string, ...validators: IValidationFunc[]): IAutoApplier<T>;
        Finish(): T;
    }
    function AutoModel<T>(typeOrModel: any): IAutoApplier<T>;
}
declare module Fayde.MVVM {
    function NotifyProperties(type: any, propNames: string[]): void;
    class ObservableObject implements INotifyPropertyChanged {
        PropertyChanged: nullstone.Event<PropertyChangedEventArgs>;
        OnPropertyChanged(propertyName: string): void;
    }
}
declare module Fayde.MVVM {
    class ViewModelBase extends ObservableObject {
    }
}
declare module Fayde.MVVM {
    interface IDialogViewModelSettings<TAccept, TBuilder> {
        AcceptAction?: (data: TAccept) => any;
        CompleteAction?: (pars: IOverlayCompleteParameters) => any;
        ViewModelBuilder?: (builder: TBuilder) => any;
        CanOpen?: (builder: TBuilder) => boolean;
    }
    class DialogViewModel<TBuilder, TAccept> extends ViewModelBase {
        IsOpen: boolean;
        OverlayDataContext: any;
        RequestOpenCommand: RelayCommand;
        ClosedCommand: RelayCommand;
        AcceptAction: (data: TAccept) => any;
        CompleteAction: (pars: IOverlayCompleteParameters) => any;
        ViewModelBuilder: (builder: TBuilder) => any;
        CanOpen: (builder: TBuilder) => boolean;
        constructor(settings?: IDialogViewModelSettings<TAccept, TBuilder>);
        private Closed_Execute(parameter);
        private RequestOpen_Execute(parameter);
        private RequestOpen_CanExecute(parameter);
    }
}
declare module Fayde.MVVM {
    interface IEntity extends INotifyPropertyChanged, Data.INotifyDataErrorInfo {
        OnPropertyChanged(propertyName: string): any;
        AddError(propertyName: string, errorMessage: string): any;
        RemoveError(propertyName: string, errorMessage: string): any;
        ClearErrors(propertyName: string): any;
    }
    class Entity implements IEntity {
        PropertyChanged: nullstone.Event<PropertyChangedEventArgs>;
        OnPropertyChanged(propertyName: string): void;
        private _Errors;
        ErrorsChanged: nullstone.Event<Data.DataErrorsChangedEventArgs>;
        HasErrors: boolean;
        AddError(propertyName: string, errorMessage: string): void;
        RemoveError(propertyName: string, errorMessage: string): void;
        ClearErrors(propertyName: string): void;
        GetErrors(propertyName: string): nullstone.IEnumerable<string>;
        static ApplyTo<TIn, TOut extends IEntity>(model: TIn): TOut;
    }
}
declare module Fayde.MVVM {
    interface IOverlayCompleteParameters {
        Result: boolean;
        Data: any;
    }
}
declare module Fayde.Navigation {
    class Route {
        View: Uri;
        HashParams: {
            [key: string]: string;
        };
        DataContext: any;
        constructor(view: Uri, hashParams: {
            [key: string]: string;
        }, dataContext: any);
    }
}
declare module Fayde.MVVM {
    interface IViewModelProvider {
        ResolveViewModel(route: Fayde.Navigation.Route): any;
    }
    var IViewModelProvider_: nullstone.Interface<IViewModelProvider>;
}
declare module Fayde.MVVM {
    class RelayCommand implements Input.ICommand {
        constructor(execute?: (parameter: any) => void, canExecute?: (parameter: any) => boolean);
        Execute(parameter: any): void;
        CanExecute(parameter: any): boolean;
        CanExecuteChanged: nullstone.Event<{}>;
        ForceCanExecuteChanged(): void;
    }
}
declare module Fayde.Markup {
    interface IEventFilter {
        Filter(sender: any, e: nullstone.IEventArgs, parameter: any): boolean;
    }
    var IEventFilter_: nullstone.Interface<IEventFilter>;
    class EventBinding implements nullstone.markup.IMarkupExtension {
        CommandPath: string;
        Command: Data.BindingExpressionBase;
        CommandParameter: Data.BindingExpressionBase;
        CommandBinding: Data.Binding;
        CommandParameterBinding: Data.Binding;
        Filter: IEventFilter;
        init(val: string): void;
        transmute(os: any[]): any;
        private $$coerce();
    }
}
declare module Fayde.Markup {
    function Resolve(uri: string): any;
    function Resolve(uri: Uri): any;
}
declare module Fayde.Markup {
    class StaticResource implements nullstone.markup.IMarkupExtension {
        ResourceKey: string;
        private $$app;
        private $$resources;
        init(val: string): void;
        transmute(os: any[]): any;
        setContext(app: Application, resources: ResourceDictionary[]): void;
    }
}
declare module Fayde.Media {
    class Brush extends DependencyObject implements minerva.IBrush {
        static TransformProperty: DependencyProperty;
        Transform: Media.Transform;
        private _CachedBounds;
        private _CachedBrush;
        constructor();
        isTransparent(): boolean;
        setupBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
        toHtml5Object(): any;
        CreateBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): any;
        InvalidateBrush(): void;
    }
}
declare module Fayde.Media {
    class Geometry extends DependencyObject implements minerva.IGeometry {
        private _Path;
        private _LocalBounds;
        static TransformProperty: DependencyProperty;
        Transform: Transform;
        constructor();
        GetBounds(pars?: minerva.path.IStrokeParameters): minerva.Rect;
        Draw(ctx: minerva.core.render.RenderContext): void;
        ComputePathBounds(pars: minerva.path.IStrokeParameters): minerva.Rect;
        InvalidateGeometry(): void;
        _Build(): minerva.path.Path;
        Serialize(): string;
    }
    class GeometryCollection extends XamlObjectCollection<Geometry> {
        AddingToCollection(value: Geometry, error: BError): boolean;
        RemovedFromCollection(value: Geometry, isValueSafe: boolean): void;
    }
}
declare module Fayde.Media {
    class EllipseGeometry extends Geometry {
        static CenterProperty: DependencyProperty;
        static RadiusXProperty: DependencyProperty;
        static RadiusYProperty: DependencyProperty;
        Center: Point;
        RadiusX: number;
        RadiusY: number;
        _Build(): minerva.path.Path;
    }
}
declare module Fayde.Media {
    class GeneralTransform extends DependencyObject {
        Inverse: GeneralTransform;
        Transform(p: minerva.IPoint): Point;
        TransformBounds(r: minerva.Rect): minerva.Rect;
        TryTransform(inPoint: minerva.IPoint, outPoint: minerva.IPoint): boolean;
    }
    class InternalTransform extends GeneralTransform implements minerva.ITransform {
        private _Raw;
        constructor(raw: number[]);
        Inverse: InternalTransform;
        Value: Matrix3D;
        getRaw(): number[];
        Transform(p: minerva.IPoint): Point;
        TransformBounds(r: minerva.Rect): minerva.Rect;
        CreateMatrix3DProjection(): Matrix3DProjection;
    }
}
declare module Fayde.Shapes {
    enum ShapeFlags {
        None = 0,
        Empty = 1,
        Normal = 2,
        Degenerate = 4,
        Radii = 8,
    }
    enum PenLineCap {
        Flat = 0,
        Square = 1,
        Round = 2,
        Triangle = 3,
    }
    enum PenLineJoin {
        Miter = 0,
        Bevel = 1,
        Round = 2,
    }
    enum FillRule {
        EvenOdd = 0,
        NonZero = 1,
    }
    enum SweepDirection {
        Counterclockwise = 0,
        Clockwise = 1,
    }
}
declare module Fayde.Media {
    class GeometryGroup extends Geometry {
        static FillRulleProperty: DependencyProperty;
        static ChildrenProperty: ImmutableDependencyProperty<GeometryCollection>;
        FillRule: Shapes.FillRule;
        Children: GeometryCollection;
        constructor();
        ComputePathBounds(pars: minerva.path.IStrokeParameters): minerva.Rect;
        Draw(ctx: minerva.core.render.RenderContext): void;
    }
}
declare module Fayde.Media {
    class GradientBrush extends Brush {
        static GradientStopsProperty: ImmutableDependencyProperty<GradientStopCollection>;
        static MappingModeProperty: DependencyProperty;
        static SpreadMethodProperty: DependencyProperty;
        GradientStops: GradientStopCollection;
        MappingMode: BrushMappingMode;
        SpreadMethod: GradientSpreadMethod;
        constructor();
        CreateBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): any;
        CreatePad(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
        CreateRepeat(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
        CreateReflect(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
    }
}
declare module Fayde.Media {
    interface IGradientStop {
        Color: Color;
        Offset: number;
    }
    class GradientStop extends DependencyObject implements IGradientStop {
        static ColorProperty: DependencyProperty;
        static OffsetProperty: DependencyProperty;
        Color: Color;
        Offset: number;
        toString(): string;
    }
    class GradientStopCollection extends XamlObjectCollection<GradientStop> {
        AddingToCollection(value: GradientStop, error: BError): boolean;
        RemovedFromCollection(value: GradientStop, isValueSafe: boolean): boolean;
        getPaddedEnumerable(): nullstone.IEnumerable<IGradientStop>;
    }
}
declare module Fayde.Media {
    class LineGeometry extends Geometry {
        static StartPointProperty: DependencyProperty;
        static EndPointProperty: DependencyProperty;
        StartPoint: Point;
        EndPoint: Point;
        _Build(): minerva.path.Path;
    }
}
declare module Fayde.Media {
    class LinearGradientBrush extends GradientBrush {
        static StartPointProperty: DependencyProperty;
        static EndPointProperty: DependencyProperty;
        StartPoint: Point;
        EndPoint: Point;
        CreatePad(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): CanvasGradient;
        CreateRepeat(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): CanvasGradient;
        CreateReflect(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): CanvasGradient;
        private CreateInterpolated(ctx, interpolator);
        private _GetPointData(bounds);
        toString(): string;
    }
}
declare module Fayde.Media {
    class Matrix {
        _Raw: number[];
        private _Inverse;
        constructor(raw?: number[]);
        static Identity: Matrix;
        M11: number;
        M12: number;
        M21: number;
        M22: number;
        OffsetX: number;
        OffsetY: number;
        Inverse: Matrix;
        private _OnChanged();
        Clone(): Matrix;
    }
}
declare module Fayde.Media {
    interface IMatrix3DChangedListener {
        Callback: (newMatrix3D: Matrix3D) => void;
        Detach(): any;
    }
    class Matrix3D {
        _Raw: number[];
        private _Inverse;
        static FromRaw(raw: number[]): Matrix3D;
        M11: number;
        M12: number;
        M13: number;
        M14: number;
        M21: number;
        M22: number;
        M23: number;
        M24: number;
        M31: number;
        M32: number;
        M33: number;
        M34: number;
        OffsetX: number;
        OffsetY: number;
        OffsetZ: number;
        M44: number;
        Inverse: Matrix3D;
        private _Listeners;
        Listen(func: (newMatrix: Matrix3D) => void): IMatrix3DChangedListener;
        private _OnChanged();
    }
}
declare module Fayde.Media {
    class Projection extends DependencyObject implements minerva.IProjection {
        private _ProjectionMatrix;
        private _ObjectWidth;
        ObjectWidth: number;
        private _ObjectHeight;
        ObjectHeight: number;
        setObjectSize(objectWidth: number, objectHeight: number): void;
        getDistanceFromXYPlane(): number;
        getTransform(): number[];
        CreateProjectionMatrix(): Matrix3D;
        InvalidateProjection(): void;
    }
}
declare module Fayde.Media {
    class Matrix3DProjection extends Projection {
        static ProjectionMatrixProperty: DependencyProperty;
        ProjectionMatrix: Matrix3D;
        CreateProjectionMatrix(): Matrix3D;
    }
}
declare module Fayde.Media {
    function ParseGeometry(val: string): Geometry;
    function ParseShapePoints(val: string): Point[];
}
declare module Fayde.Media {
    class PathFigure extends DependencyObject {
        static IsClosedProperty: DependencyProperty;
        static StartPointProperty: DependencyProperty;
        static IsFilledProperty: DependencyProperty;
        static SegmentsProperty: ImmutableDependencyProperty<PathSegmentCollection>;
        static SegmentsSourceProperty: DependencyProperty;
        IsClosed: boolean;
        Segments: PathSegmentCollection;
        SegmentsSource: nullstone.IEnumerable<PathSegment>;
        StartPoint: Point;
        IsFilled: boolean;
        private _OnSegmentsSourceChanged(args);
        private _Path;
        constructor();
        private _Build();
        private InvalidatePathFigure();
        MergeInto(rp: minerva.path.Path): void;
    }
    class PathFigureCollection extends XamlObjectCollection<PathFigure> {
        AddingToCollection(value: PathFigure, error: BError): boolean;
        RemovedFromCollection(value: PathFigure, isValueSafe: boolean): void;
    }
}
declare module Fayde.Media {
    class PathGeometry extends Geometry implements minerva.shapes.path.IPathGeometry {
        private _OverridePath;
        static FillRuleProperty: DependencyProperty;
        static FiguresProperty: ImmutableDependencyProperty<PathFigureCollection>;
        FillRule: Shapes.FillRule;
        Figures: PathFigureCollection;
        fillRule: minerva.FillRule;
        constructor();
        OverridePath(path: minerva.path.Path): void;
        _Build(): minerva.path.Path;
        InvalidateFigures(): void;
    }
}
declare module Fayde.Media {
    class PathSegment extends DependencyObject {
        _Append(path: minerva.path.Path): void;
    }
    class PathSegmentCollection extends XamlObjectCollection<PathSegment> {
        private _Modifying;
        AddingToCollection(value: PathSegment, error: BError): boolean;
        RemovedFromCollection(value: PathSegment, isValueSafe: boolean): void;
        private _Source;
        SetSource(source: nullstone.IEnumerable<PathSegment>): void;
        private _OnSegmentsCollectionChanged(sender, args);
    }
}
declare module Fayde.Media {
    class ArcSegment extends PathSegment {
        static IsLargeArcProperty: DependencyProperty;
        static PointProperty: DependencyProperty;
        static RotationAngleProperty: DependencyProperty;
        static SizeProperty: DependencyProperty;
        static SweepDirectionProperty: DependencyProperty;
        IsLargeArc: boolean;
        Point: Point;
        RotationAngle: number;
        Size: minerva.Size;
        SweepDirection: Shapes.SweepDirection;
        _Append(path: minerva.path.Path): void;
    }
    class BezierSegment extends PathSegment {
        static Point1Property: DependencyProperty;
        static Point2Property: DependencyProperty;
        static Point3Property: DependencyProperty;
        Point1: Point;
        Point2: Point;
        Point3: Point;
        _Append(path: minerva.path.Path): void;
    }
    class LineSegment extends PathSegment {
        static PointProperty: DependencyProperty;
        Point: Point;
        _Append(path: minerva.path.Path): void;
    }
    class PolyBezierSegment extends PathSegment {
        static PointsProperty: ImmutableDependencyProperty<Shapes.PointCollection>;
        Points: Shapes.PointCollection;
        constructor();
        _Append(path: minerva.path.Path): void;
    }
    class PolyLineSegment extends PathSegment {
        static PointsProperty: ImmutableDependencyProperty<Shapes.PointCollection>;
        Points: Shapes.PointCollection;
        constructor();
        _Append(path: minerva.path.Path): void;
    }
    class PolyQuadraticBezierSegment extends PathSegment {
        static PointsProperty: ImmutableDependencyProperty<Shapes.PointCollection>;
        Points: Shapes.PointCollection;
        constructor();
        _Append(path: minerva.path.Path): void;
    }
    class QuadraticBezierSegment extends PathSegment {
        static Point1Property: DependencyProperty;
        static Point2Property: DependencyProperty;
        Point1: Point;
        Point2: Point;
        _Append(path: minerva.path.Path): void;
    }
}
declare module Fayde.Media {
    class PlaneProjection extends Projection {
        static CenterOfRotationXProperty: DependencyProperty;
        static CenterOfRotationYProperty: DependencyProperty;
        static CenterOfRotationZProperty: DependencyProperty;
        static GlobalOffsetXProperty: DependencyProperty;
        static GlobalOffsetYProperty: DependencyProperty;
        static GlobalOffsetZProperty: DependencyProperty;
        static LocalOffsetXProperty: DependencyProperty;
        static LocalOffsetYProperty: DependencyProperty;
        static LocalOffsetZProperty: DependencyProperty;
        static RotationXProperty: DependencyProperty;
        static RotationYProperty: DependencyProperty;
        static RotationZProperty: DependencyProperty;
        CenterOfRotationX: number;
        CenterOfRotationY: number;
        CenterOfRotationZ: number;
        GlobalOffsetX: number;
        GlobalOffsetY: number;
        GlobalOffsetZ: number;
        LocalOffsetX: number;
        LocalOffsetY: number;
        LocalOffsetZ: number;
        RotationX: number;
        RotationY: number;
        RotationZ: number;
        getDistanceFromXYPlane(): number;
        CreateProjectionMatrix3D(): Matrix3D;
    }
}
declare module Fayde.Media {
    class RadialGradientBrush extends GradientBrush {
        static CenterProperty: DependencyProperty;
        static GradientOriginProperty: DependencyProperty;
        static RadiusXProperty: DependencyProperty;
        static RadiusYProperty: DependencyProperty;
        Center: Point;
        GradientOrigin: Point;
        RadiusX: number;
        RadiusY: number;
        CreatePad(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): any;
        CreateRepeat(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): CanvasPattern;
        CreateReflect(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): CanvasPattern;
        private CreateInterpolated(data, bounds, reflect);
        private FitPattern(ctx, fill, data, bounds);
        private _GetPointData(bounds);
    }
}
declare module Fayde.Media {
    class RectangleGeometry extends Geometry {
        static RectProperty: DependencyProperty;
        static RadiusXProperty: DependencyProperty;
        static RadiusYProperty: DependencyProperty;
        Rect: minerva.Rect;
        RadiusX: number;
        RadiusY: number;
        _Build(): minerva.path.Path;
    }
}
declare module Fayde.Media {
    class SolidColorBrush extends Brush {
        static ColorProperty: DependencyProperty;
        Color: Color;
        constructor(...args: any[]);
        isTransparent(): boolean;
        static FromColor(color: Color): SolidColorBrush;
        setupBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
        CreateBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): any;
    }
}
declare module Fayde.Media {
    class TextOptions {
        static TextHintingModeProperty: DependencyProperty;
        static GetTextHintingMode(d: DependencyObject): TextHintingMode;
        static SetTextHintingMode(d: DependencyObject, value: TextHintingMode): void;
    }
}
declare module Fayde.Media {
    class TileBrush extends Brush {
        static AlignmentXProperty: DependencyProperty;
        static AlignmentYProperty: DependencyProperty;
        static StretchProperty: DependencyProperty;
        AlignmentX: AlignmentX;
        AlignmentY: AlignmentY;
        Stretch: Stretch;
        CreateBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): CanvasPattern;
        GetTileExtents(): minerva.Rect;
        DrawTile(canvasCtx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
    }
}
declare module Fayde.Media {
    class Transform extends GeneralTransform implements minerva.ITransform {
        private _Value;
        constructor();
        Value: Matrix;
        getRaw(): number[];
        Inverse: Transform;
        Transform(p: minerva.IPoint): Point;
        TransformBounds(r: minerva.Rect): minerva.Rect;
        TryTransform(inPoint: minerva.IPoint, outPoint: minerva.IPoint): boolean;
        InvalidateValue(): void;
        _BuildValue(): number[];
        static copyMatTo(t: Transform, mat: number[]): void;
    }
    class MatrixTransform extends Transform {
        static MatrixProperty: DependencyProperty;
        Matrix: Matrix;
        _BuildValue(): number[];
        Clone(): MatrixTransform;
    }
}
declare module Fayde.Media {
    class RotateTransform extends Transform {
        static AngleProperty: DependencyProperty;
        static CenterXProperty: DependencyProperty;
        static CenterYProperty: DependencyProperty;
        Angle: number;
        CenterX: number;
        CenterY: number;
        _BuildValue(): number[];
    }
    class ScaleTransform extends Transform {
        static CenterXProperty: DependencyProperty;
        static CenterYProperty: DependencyProperty;
        static ScaleXProperty: DependencyProperty;
        static ScaleYProperty: DependencyProperty;
        CenterX: number;
        CenterY: number;
        ScaleX: number;
        ScaleY: number;
        _BuildValue(): number[];
    }
    class SkewTransform extends Transform {
        static AngleXProperty: DependencyProperty;
        static AngleYProperty: DependencyProperty;
        static CenterXProperty: DependencyProperty;
        static CenterYProperty: DependencyProperty;
        AngleX: number;
        AngleY: number;
        CenterX: number;
        CenterY: number;
        _BuildValue(): number[];
    }
    class TranslateTransform extends Transform {
        static XProperty: DependencyProperty;
        static YProperty: DependencyProperty;
        X: number;
        Y: number;
        _BuildValue(): number[];
    }
    class TransformCollection extends XamlObjectCollection<Transform> {
        AddingToCollection(value: Transform, error: BError): boolean;
        RemovedFromCollection(value: Transform, isValueSafe: boolean): boolean;
    }
    class TransformGroup extends Transform {
        static ChildrenProperty: ImmutableDependencyProperty<TransformCollection>;
        Children: TransformCollection;
        constructor();
        _BuildValue(): number[];
    }
}
declare module Fayde.Navigation {
    function Navigate(source: DependencyObject, targetName: string, navigateUri: Uri): void;
}
declare module Fayde.Navigation {
    class NavigationService {
        Href: string;
        Hash: string;
        LocationChanged: nullstone.Event<{}>;
        constructor();
        CurrentUri: Uri;
        Navigate(uri: Uri): boolean;
        private _HandleFragmentChange();
    }
}
declare module Fayde.Navigation {
    class RouteMapper extends DependencyObject {
        static RouteMappingsProperty: ImmutableDependencyProperty<XamlObjectCollection<RouteMapping>>;
        static ViewModelProviderProperty: DependencyProperty;
        RouteMappings: XamlObjectCollection<RouteMapping>;
        ViewModelProvider: Fayde.MVVM.IViewModelProvider;
        constructor();
        MapUri(uri: Uri): Route;
    }
}
declare module Fayde.Navigation {
    class RouteMapping extends DependencyObject {
        static ViewProperty: DependencyProperty;
        static UriProperty: DependencyProperty;
        View: Uri;
        Uri: Uri;
        MapUri(uri: Uri): Route;
    }
}
declare module Fayde.Navigation {
    class UriMapper extends DependencyObject {
        static UriMappingsProperty: ImmutableDependencyProperty<XamlObjectCollection<UriMapping>>;
        UriMappings: XamlObjectCollection<UriMapping>;
        constructor();
        MapUri(uri: Uri): Uri;
    }
}
declare module Fayde.Navigation {
    class UriMapping extends DependencyObject {
        static MappedUriProperty: DependencyProperty;
        static UriProperty: DependencyProperty;
        MappedUri: Uri;
        Uri: Uri;
        MapUri(uri: Uri): Uri;
    }
}
declare class Color implements ICloneable {
    private static __NoAlphaRegex;
    private static __AlphaRegex;
    R: number;
    G: number;
    B: number;
    A: number;
    Add(color2: Color): Color;
    Subtract(color2: Color): Color;
    Multiply(factor: number): Color;
    Equals(other: Color): boolean;
    toString(): string;
    ToHexStringNoAlpha(): string;
    Clone(): Color;
    static LERP(start: Color, end: Color, p: number): Color;
    static FromRgba(r: number, g: number, b: number, a: number): Color;
    static FromHex(hex: string): Color;
    static KnownColors: {
        AliceBlue: Color;
        AntiqueWhite: Color;
        Aqua: Color;
        Aquamarine: Color;
        Azure: Color;
        Beige: Color;
        Bisque: Color;
        Black: Color;
        BlanchedAlmond: Color;
        Blue: Color;
        BlueViolet: Color;
        Brown: Color;
        BurlyWood: Color;
        CadetBlue: Color;
        Chartreuse: Color;
        Chocolate: Color;
        Coral: Color;
        CornflowerBlue: Color;
        Cornsilk: Color;
        Crimson: Color;
        Cyan: Color;
        DarkBlue: Color;
        DarkCyan: Color;
        DarkGoldenrod: Color;
        DarkGray: Color;
        DarkGreen: Color;
        DarkKhaki: Color;
        DarkMagenta: Color;
        DarkOliveGreen: Color;
        DarkOrange: Color;
        DarkOrchid: Color;
        DarkRed: Color;
        DarkSalmon: Color;
        DarkSeaGreen: Color;
        DarkSlateBlue: Color;
        DarkSlateGray: Color;
        DarkTurquoise: Color;
        DarkViolet: Color;
        DeepPink: Color;
        DeepSkyBlue: Color;
        DimGray: Color;
        DodgerBlue: Color;
        Firebrick: Color;
        FloralWhite: Color;
        ForestGreen: Color;
        Fuchsia: Color;
        Gainsboro: Color;
        GhostWhite: Color;
        Gold: Color;
        Goldenrod: Color;
        Gray: Color;
        Green: Color;
        GreenYellow: Color;
        Honeydew: Color;
        HotPink: Color;
        IndianRed: Color;
        Indigo: Color;
        Ivory: Color;
        Khaki: Color;
        Lavender: Color;
        LavenderBlush: Color;
        LawnGreen: Color;
        LemonChiffon: Color;
        LightBlue: Color;
        LightCoral: Color;
        LightCyan: Color;
        LightGoldenrodYellow: Color;
        LightGray: Color;
        LightGreen: Color;
        LightPink: Color;
        LightSalmon: Color;
        LightSeaGreen: Color;
        LightSkyBlue: Color;
        LightSlateGray: Color;
        LightSteelBlue: Color;
        LightYellow: Color;
        Lime: Color;
        LimeGreen: Color;
        Linen: Color;
        Magenta: Color;
        Maroon: Color;
        MediumAquamarine: Color;
        MediumBlue: Color;
        MediumOrchid: Color;
        MediumPurple: Color;
        MediumSeaGreen: Color;
        MediumSlateBlue: Color;
        MediumSpringGreen: Color;
        MediumTurquoise: Color;
        MediumVioletRed: Color;
        MidnightBlue: Color;
        MintCream: Color;
        MistyRose: Color;
        Moccasin: Color;
        NavajoWhite: Color;
        Navy: Color;
        OldLace: Color;
        Olive: Color;
        OliveDrab: Color;
        Orange: Color;
        OrangeRed: Color;
        Orchid: Color;
        PaleGoldenrod: Color;
        PaleGreen: Color;
        PaleTurquoise: Color;
        PaleVioletRed: Color;
        PapayaWhip: Color;
        PeachPuff: Color;
        Peru: Color;
        Pink: Color;
        Plum: Color;
        PowderBlue: Color;
        Purple: Color;
        Red: Color;
        RosyBrown: Color;
        RoyalBlue: Color;
        SaddleBrown: Color;
        Salmon: Color;
        SandyBrown: Color;
        SeaGreen: Color;
        SeaShell: Color;
        Sienna: Color;
        Silver: Color;
        SkyBlue: Color;
        SlateBlue: Color;
        SlateGray: Color;
        Snow: Color;
        SpringGreen: Color;
        SteelBlue: Color;
        Tan: Color;
        Teal: Color;
        Thistle: Color;
        Tomato: Color;
        Transparent: Color;
        Turquoise: Color;
        Violet: Color;
        Wheat: Color;
        White: Color;
        WhiteSmoke: Color;
        Yellow: Color;
        YellowGreen: Color;
    };
}
declare class CornerRadius extends minerva.CornerRadius implements ICloneable {
    Clone(): CornerRadius;
}
declare enum DurationType {
    Automatic = 0,
    Forever = 1,
    TimeSpan = 2,
}
declare class Duration implements ICloneable {
    private _Type;
    private _TimeSpan;
    constructor(ts?: TimeSpan);
    Clone(): Duration;
    Type: DurationType;
    TimeSpan: TimeSpan;
    HasTimeSpan: boolean;
    IsForever: boolean;
    IsAutomatic: boolean;
    IsZero: boolean;
    static Automatic: Duration;
    static Forever: Duration;
}
declare class FontFamily implements ICloneable {
    FamilyNames: string;
    constructor(FamilyNames: string);
    toString(): string;
    Clone(): FontFamily;
}
declare class KeyTime implements ICloneable {
    private _IsPaced;
    private _IsUniform;
    private _TimeSpan;
    private _Percent;
    IsValid: boolean;
    static CreateUniform(): KeyTime;
    static CreateTimeSpan(ts: TimeSpan): KeyTime;
    Clone(): KeyTime;
    IsPaced: boolean;
    IsUniform: boolean;
    HasTimeSpan: boolean;
    TimeSpan: TimeSpan;
    HasPercent: boolean;
    Percent: number;
}
declare class Length {
}
declare class Rect extends minerva.Rect {
    Clone(): Rect;
}
declare class Size extends minerva.Size {
    Clone(): Size;
}
declare class Thickness extends minerva.Thickness {
    Clone(): Thickness;
    toString(): string;
}
declare module Fayde {
    function splitCommaList(str: string): string[];
}
declare class BError {
    static Argument: number;
    static InvalidOperation: number;
    static XamlParse: number;
    static Attach: number;
    Message: string;
    Number: number;
    Data: any;
    ThrowException(): void;
}
declare module Fayde {
    function Bootstrap(onLoaded?: (app: Application) => any): void;
}
declare module Fayde {
    function LoadConfigJson(onComplete: (config: any, err?: any) => void): void;
}
declare module Fayde {
    module Render {
        var Debug: boolean;
        var DebugIndent: number;
    }
    module Layout {
        var Debug: boolean;
        var DebugIndent: number;
    }
    module Media {
        module Animation {
            var Log: boolean;
            var LogApply: boolean;
        }
        module VSM {
            var Debug: boolean;
        }
    }
    module Data {
        var Debug: boolean;
        var IsCounterEnabled: boolean;
        var DataContextCounter: number;
    }
    var IsInspectionOn: boolean;
}
declare module NumberEx {
    function AreClose(val1: number, val2: number): boolean;
    function IsLessThanClose(val1: number, val2: number): boolean;
    function IsGreaterThanClose(val1: number, val2: number): boolean;
}
declare module StringEx {
    function Format(format: string, ...items: any[]): string;
}
interface ITimelineEvent {
    Type: string;
    Name: string;
    Time: number;
}
interface ITimelineGroup {
    Type: string;
    Data: string;
    Start: number;
    Length: number;
}
declare class TimelineProfile {
    private static _Events;
    static Groups: ITimelineGroup[];
    static TimelineStart: number;
    static IsNextLayoutPassProfiled: boolean;
    static Parse(isStart: boolean, name: string): void;
    static Navigate(isStart: boolean, name?: string): void;
    static LayoutPass(isStart: boolean): void;
    private static _FinishEvent(type, name?);
}
declare module Fayde.Shapes {
    class DoubleCollection extends XamlObjectCollection<XamlObject> {
    }
}
declare module Fayde.Shapes {
    import ShapeUpdater = minerva.shapes.shape.ShapeUpdater;
    class Shape extends FrameworkElement {
        CreateLayoutUpdater(): ShapeUpdater;
        static FillProperty: DependencyProperty;
        static StretchProperty: DependencyProperty;
        static StrokeProperty: DependencyProperty;
        static StrokeThicknessProperty: DependencyProperty;
        static StrokeDashArrayProperty: DependencyProperty;
        static StrokeDashCapProperty: DependencyProperty;
        static StrokeDashOffsetProperty: DependencyProperty;
        static StrokeEndLineCapProperty: DependencyProperty;
        static StrokeLineJoinProperty: DependencyProperty;
        static StrokeMiterLimitProperty: DependencyProperty;
        static StrokeStartLineCapProperty: DependencyProperty;
        Fill: Media.Brush;
        Stretch: Media.Stretch;
        Stroke: Media.Brush;
        StrokeThickness: number;
        StrokeDashArray: DoubleCollection;
        StrokeDashCap: PenLineCap;
        StrokeDashOffset: number;
        StrokeEndLineCap: PenLineCap;
        StrokeLineJoin: PenLineJoin;
        StrokeMiterLimit: number;
        StrokeStartLineCap: PenLineCap;
        constructor();
    }
}
declare module Fayde.Shapes {
    import EllipseUpdater = minerva.shapes.ellipse.EllipseUpdater;
    class Ellipse extends Shape {
        CreateLayoutUpdater(): EllipseUpdater;
        constructor();
    }
}
declare module Fayde.Shapes {
    import LineUpdater = minerva.shapes.line.LineUpdater;
    class Line extends Shape {
        CreateLayoutUpdater(): LineUpdater;
        static X1Property: DependencyProperty;
        static Y1Property: DependencyProperty;
        static X2Property: DependencyProperty;
        static Y2Property: DependencyProperty;
        X1: number;
        Y1: number;
        X2: number;
        Y2: number;
    }
}
declare module Fayde.Shapes {
    import PathUpdater = minerva.shapes.path.PathUpdater;
    class Path extends Shape {
        CreateLayoutUpdater(): PathUpdater;
        private static _DataCoercer(dobj, propd, value);
        static DataProperty: DependencyProperty;
        Data: Media.Geometry;
    }
}
declare module Fayde.Shapes {
    class PointCollection implements nullstone.ICollection<Point> {
        private _ht;
        Count: number;
        static FromData(data: string): PointCollection;
        static FromArray(data: Point[]): PointCollection;
        GetValueAt(index: number): Point;
        SetValueAt(index: number, value: Point): boolean;
        Add(value: Point): void;
        AddRange(points: Point[]): void;
        Insert(index: number, value: Point): void;
        Remove(value: Point): boolean;
        RemoveAt(index: number): void;
        Clear(): void;
        IndexOf(value: Point): number;
        Contains(value: Point): boolean;
        getEnumerator(reverse?: boolean): nullstone.IEnumerator<Point>;
    }
}
declare module Fayde.Shapes {
    import PolygonUpdater = minerva.shapes.polygon.PolygonUpdater;
    class Polygon extends Shape {
        CreateLayoutUpdater(): PolygonUpdater;
        private static _PointsCoercer(dobj, propd, value);
        static FillRuleProperty: DependencyProperty;
        static PointsProperty: DependencyProperty;
        FillRule: FillRule;
        Points: PointCollection;
        constructor();
    }
}
declare module Fayde.Shapes {
    import PolylineUpdater = minerva.shapes.polyline.PolylineUpdater;
    class Polyline extends Shape {
        CreateLayoutUpdater(): PolylineUpdater;
        private static _PointsCoercer(d, propd, value);
        static FillRuleProperty: DependencyProperty;
        static PointsProperty: DependencyProperty;
        FillRule: FillRule;
        Points: PointCollection;
        constructor();
    }
}
declare module Fayde.Shapes {
    import RectangleUpdater = minerva.shapes.rectangle.RectangleUpdater;
    class Rectangle extends Shape {
        CreateLayoutUpdater(): RectangleUpdater;
        static RadiusXProperty: DependencyProperty;
        static RadiusYProperty: DependencyProperty;
        RadiusX: number;
        RadiusY: number;
        constructor();
    }
}
declare module Fayde.Text.Buffer {
    function cut(text: string, start: number, len: number): string;
    function insert(text: string, index: number, str: string): string;
    function replace(text: string, start: number, len: number, str: string): string;
}
declare module Fayde.Text {
    interface ITextOwner {
        text: string;
    }
}
declare module Fayde.Text {
    enum EmitChangedType {
        NOTHING = 0,
        SELECTION = 1,
        TEXT = 2,
    }
    class Proxy implements ITextOwner {
        selAnchor: number;
        selCursor: number;
        selText: string;
        text: string;
        maxLength: number;
        acceptsReturn: boolean;
        private $$batch;
        private $$emit;
        private $$syncing;
        private $$eventsMask;
        private $$history;
        SyncSelectionStart: (value: number) => void;
        SyncSelectionLength: (value: number) => void;
        SyncText: (value: string) => void;
        constructor(eventsMask: EmitChangedType, maxUndoCount: number);
        setAnchorCursor(anchor: number, cursor: number): boolean;
        enterText(newText: string): boolean;
        removeText(start: number, length: number): boolean;
        undo(): void;
        redo(): void;
        begin(): void;
        end(): void;
        beginSelect(cursor: number): void;
        adjustSelection(cursor: number): void;
        selectAll(): void;
        clearSelection(start: number): void;
        select(start: number, length: number): boolean;
        setSelectionStart(value: number): void;
        setSelectionLength(value: number): void;
        setText(value: string): void;
        private $syncEmit(syncText?);
        private $syncText();
    }
}
declare module Fayde.Validation {
    function Emit(fe: FrameworkElement, binding: Data.Binding, oldError: ValidationError, error: ValidationError): void;
}
declare module Fayde.Validation {
    import ReadOnlyObservableCollection = Collections.ReadOnlyObservableCollection;
    var HasErrorProperty: DependencyProperty;
    var ErrorsProperty: DependencyProperty;
    function GetErrors(dobj: DependencyObject): ReadOnlyObservableCollection<ValidationError>;
    function GetHasError(dobj: DependencyObject): boolean;
    function AddError(element: FrameworkElement, error: ValidationError): void;
    function RemoveError(element: FrameworkElement, error: ValidationError): void;
}
declare module Fayde.Validation {
    class ValidationError {
        ErrorContent: any;
        Exception: Exception;
        PropertyName: string;
        constructor(content: any, exception: Exception, propertyName: string);
        constructor(content: any, exception: Error, propertyName: string);
    }
}
declare module Fayde.Validation {
    enum ValidationErrorEventAction {
        Added = 0,
        Removed = 1,
    }
}
declare module Fayde.Validation {
    class ValidationErrorEventArgs extends RoutedEventArgs {
        Action: ValidationErrorEventAction;
        Error: ValidationError;
        constructor(action: ValidationErrorEventAction, error: ValidationError);
    }
}
declare module Fayde.Controls.Internal {
    interface ICursorAdvancer {
        CursorDown(cursor: number, isPage: boolean): number;
        CursorUp(cursor: number, isPage: boolean): number;
        CursorNextWord(cursor: number): number;
        CursorPrevWord(cursor: number): number;
        CursorNextChar(cursor: number): number;
        CursorPrevChar(cursor: number): number;
        CursorLineBegin(cursor: number): number;
        CursorLineEnd(cursor: number): number;
        CursorBegin(cursor: number): number;
        CursorEnd(cursor: number): number;
    }
    class TextBoxCursorAdvancer implements ICursorAdvancer {
        private $textOwner;
        constructor($textOwner: Text.ITextOwner);
        CursorDown(cursor: number, isPage: boolean): number;
        CursorUp(cursor: number, isPage: boolean): number;
        CursorNextWord(cursor: number): number;
        CursorPrevWord(cursor: number): number;
        CursorNextChar(cursor: number): number;
        CursorPrevChar(cursor: number): number;
        CursorLineBegin(cursor: number): number;
        CursorLineEnd(cursor: number): number;
        CursorBegin(cursor: number): number;
        CursorEnd(cursor: number): number;
    }
    class PasswordBoxCursorAdvancer implements ICursorAdvancer {
        private $textOwner;
        constructor($textOwner: Text.ITextOwner);
        CursorDown(cursor: number, isPage: boolean): number;
        CursorUp(cursor: number, isPage: boolean): number;
        CursorNextWord(cursor: number): number;
        CursorPrevWord(cursor: number): number;
        CursorNextChar(cursor: number): number;
        CursorPrevChar(cursor: number): number;
        CursorLineBegin(cursor: number): number;
        CursorLineEnd(cursor: number): number;
        CursorBegin(cursor: number): number;
        CursorEnd(cursor: number): number;
    }
}
declare module Fayde.Controls.Internal {
    interface IItemContainersOwner {
        PrepareContainerForItem(container: UIElement, item: any): any;
        ClearContainerForItem(container: UIElement, item: any): any;
        GetContainerForItem(): UIElement;
        IsItemItsOwnContainer(item: any): boolean;
    }
    interface IItemContainersManager {
        IsRecycling: boolean;
        IndexFromContainer(container: UIElement): number;
        ContainerFromIndex(index: number): UIElement;
        ItemFromContainer(container: UIElement): any;
        ContainerFromItem(item: any): UIElement;
        OnItemsAdded(index: number, newItems: any[]): any;
        OnItemsRemoved(index: number, oldItems: any[]): any;
        DisposeContainers(index?: number, count?: number): UIElement[];
        CreateGenerator(index: number, count: number): IContainerGenerator;
        GetEnumerator(index?: number, count?: number): IContainerEnumerator;
    }
    class ItemContainersManager implements IItemContainersManager {
        Owner: IItemContainersOwner;
        private _Items;
        private _Containers;
        private _Cache;
        IsRecycling: boolean;
        constructor(Owner: IItemContainersOwner);
        IndexFromContainer(container: UIElement): number;
        ContainerFromIndex(index: number): UIElement;
        ItemFromContainer(container: UIElement): any;
        ContainerFromItem(item: any): UIElement;
        OnItemsAdded(index: number, newItems: any[]): void;
        OnItemsRemoved(index: number, oldItems: any[]): void;
        DisposeContainers(index?: number, count?: number): UIElement[];
        CreateGenerator(index: number, count: number): IContainerGenerator;
        GetEnumerator(start?: number, count?: number): IContainerEnumerator;
    }
    interface IContainerGenerator {
        IsCurrentNew: boolean;
        Current: UIElement;
        CurrentItem: any;
        CurrentIndex: number;
        GenerateIndex: number;
        Generate(): boolean;
    }
    interface IContainerEnumerator extends nullstone.IEnumerator<UIElement> {
        CurrentItem: any;
        CurrentIndex: number;
    }
}
declare module Fayde.Controls.Internal {
    interface IRange {
        Minimum: number;
        Maximum: number;
        Value: number;
        OnMinimumChanged(oldMin: number, newMin: number): any;
        OnMaximumChanged(oldMax: number, newMax: number): any;
        OnValueChanged(oldVal: number, newVal: number): any;
    }
    interface IRangeCoercer {
        OnMinimumChanged(oldMinimum: number, newMinimum: number): any;
        OnMaximumChanged(oldMaximum: number, newMaximum: number): any;
        OnValueChanged(oldValue: number, newValue: number): any;
    }
    class RangeCoercer implements IRangeCoercer {
        Range: IRange;
        OnCoerceMaximum: (val: any) => void;
        OnCoerceValue: (val: any) => void;
        InitialMax: number;
        InitialVal: number;
        RequestedMax: number;
        RequestedVal: number;
        PreCoercedMax: number;
        PreCoercedVal: number;
        CoerceDepth: number;
        Minimum: number;
        Maximum: number;
        Value: number;
        constructor(Range: IRange, OnCoerceMaximum: (val: any) => void, OnCoerceValue: (val: any) => void);
        OnMinimumChanged(oldMinimum: number, newMinimum: number): void;
        OnMaximumChanged(oldMaximum: number, newMaximum: number): void;
        OnValueChanged(oldValue: number, newValue: number): void;
        CoerceMaximum(): void;
        CoerceValue(): void;
    }
}
declare module Fayde.Controls.Internal {
    class TextBoxContentProxy {
        private $$element;
        setElement(fe: FrameworkElement, view: TextBoxView): void;
        setHorizontalScrollBar(sbvis: ScrollBarVisibility): void;
        setVerticalScrollBar(sbvis: ScrollBarVisibility): void;
    }
}
declare module Fayde.Controls.Internal {
    import TextBoxViewUpdater = minerva.controls.textboxview.TextBoxViewUpdater;
    class TextBoxViewNode extends FENode {
        LayoutUpdater: TextBoxViewUpdater;
    }
    class TextBoxView extends FrameworkElement {
        XamlNode: TextBoxViewNode;
        CreateLayoutUpdater(): TextBoxViewUpdater;
        private _AutoRun;
        constructor();
        private _InlineChanged(obj?);
        setFontProperty(propd: DependencyProperty, value: any): void;
        setFontAttr(attrName: string, value: any): void;
        setCaretBrush(value: Media.Brush): void;
        setIsFocused(isFocused: boolean): void;
        setIsReadOnly(isReadOnly: boolean): void;
        setTextAlignment(textAlignment: TextAlignment): void;
        setTextWrapping(textWrapping: TextWrapping): void;
        setSelectionStart(selectionStart: number): void;
        setSelectionLength(selectionLength: number): void;
        setText(text: string): void;
        GetCursorFromPoint(point: Point): number;
    }
}
declare module Fayde.Controls.Internal {
    class VirtualizingPanelContainerOwner implements minerva.IVirtualizingContainerOwner {
        private $$panel;
        constructor($$panel: VirtualizingPanel);
        itemCount: number;
        createGenerator(index: number, count: number): minerva.IVirtualizingGenerator;
        remove(index: number, count: number): void;
    }
}
declare module Fayde.Controls.Primitives {
    class DragCompletedEventArgs extends RoutedEventArgs {
        HorizontalChange: number;
        VerticalChange: number;
        Canceled: boolean;
        constructor(horizontal: number, vertical: number, canceled: boolean);
    }
    class DragDeltaEventArgs extends RoutedEventArgs {
        HorizontalChange: number;
        VerticalChange: number;
        constructor(horizontal: number, vertical: number);
    }
    class DragStartedEventArgs extends RoutedEventArgs {
        HorizontalOffset: number;
        VerticalOffset: number;
        constructor(horizontal: number, vertical: number);
    }
}
declare module Fayde.Controls.Primitives {
    import OverlayUpdater = minerva.controls.overlay.OverlayUpdater;
    class OverlayNode extends FENode {
        LayoutUpdater: OverlayUpdater;
        XObject: Overlay;
        private _Layer;
        private _Mask;
        EnsureLayer(): Panel;
        EnsureMask(): Border;
        private _OnMaskMouseDown(sender, args);
        UpdateMask(): void;
        OnIsAttachedChanged(newIsAttached: boolean): void;
        RegisterInitiator(initiator: UIElement): void;
    }
    class Overlay extends FrameworkElement {
        XamlNode: OverlayNode;
        CreateNode(): OverlayNode;
        CreateLayoutUpdater(): OverlayUpdater;
        static VisualProperty: DependencyProperty;
        static VisualUriProperty: DependencyProperty;
        static VisualViewModelProperty: DependencyProperty;
        static IsOpenProperty: DependencyProperty;
        static MaskBrushProperty: DependencyProperty;
        static ClosedCommandProperty: DependencyProperty;
        Visual: UIElement;
        VisualUri: Uri;
        VisualViewModel: any;
        IsOpen: boolean;
        MaskBrush: Media.Brush;
        ClosedCommand: Input.ICommand;
        Opened: nullstone.Event<nullstone.IEventArgs>;
        Closed: nullstone.Event<OverlayClosedEventArgs>;
        constructor();
        InitBindings(): void;
        private _ContentControlForUri;
        private _IgnoreClose;
        private _OnVisualChanged(args);
        private _OnVisualUriChanged(args);
        private _OnVisualViewModelChanged(args);
        private _SetVisualUri(uri);
        private _ClearVisualUri();
        private _OnIsOpenChanged(args);
        private _DoOpen();
        private _DoClose(result?);
        Open(): void;
        Close(result?: boolean): void;
        private _GetDialogResult();
        static FindOverlay(visual: UIElement): Overlay;
    }
}
declare module Fayde.Controls.Primitives {
    class OverlayClosedEventArgs implements nullstone.IEventArgs {
        Result: boolean;
        Data: any;
        constructor(result: boolean, data: any);
    }
}
declare module Fayde.Controls.Primitives {
    class ScrollData implements minerva.IScrollData {
        canHorizontallyScroll: boolean;
        canVerticallyScroll: boolean;
        offsetX: number;
        offsetY: number;
        cachedOffsetX: number;
        cachedOffsetY: number;
        viewportWidth: number;
        viewportHeight: number;
        extentWidth: number;
        extentHeight: number;
        maxDesiredWidth: number;
        maxDesiredHeight: number;
        scrollOwner: ScrollViewer;
        invalidate(): void;
    }
}
declare module Fayde.Controls.Primitives {
    enum ScrollEventType {
        SmallDecrement = 0,
        SmallIncrement = 1,
        LargeDecrement = 2,
        LargeIncrement = 3,
        ThumbPosition = 4,
        ThumbTrack = 5,
        First = 6,
        Last = 7,
        EndScroll = 8,
    }
    class ScrollEventArgs extends RoutedEventArgs {
        ScrollEventType: ScrollEventType;
        Value: number;
        constructor(scrollEventType: ScrollEventType, value: number);
    }
}
declare module Fayde.Controls.Primitives {
    class SelectionChangedEventArgs extends RoutedEventArgs {
        OldValues: any[];
        NewValues: any[];
        constructor(oldValues: any[], newValues: any[]);
    }
}
declare module Fayde.Controls.Primitives {
    class SelectorSelection {
        private _Owner;
        private _SelectedItems;
        private _SelectedItem;
        private _IsUpdating;
        private _AnchorIndex;
        Mode: SelectionMode;
        IsUpdating: boolean;
        constructor(owner: Selector);
        private _HandleOwnerSelectionChanged(sender, e);
        RepopulateSelectedItems(): void;
        ClearSelection(ignoreSelectedValue?: boolean): void;
        Select(item: any): void;
        private _SelectSingle(item, selIndex);
        private _SelectExtended(item, selIndex);
        private _SelectMultiple(item, selIndex);
        SelectRange(startIndex: number, endIndex: number): void;
        SelectAll(items: any[]): void;
        SelectOnly(item: any): void;
        Unselect(item: any): void;
        AddToSelected(item: any): void;
        RemoveFromSelected(item: any): void;
        ReplaceSelection(item: any): void;
        UpdateSelectorProperties(item: any, index: number, value: any): void;
        UpdateCollectionView(item: any): boolean;
    }
}
declare module Fayde.Providers {
    enum StyleIndex {
        VisualTree = 0,
        ApplicationResources = 1,
        Theme = 2,
        Count = 3,
    }
    enum StyleMask {
        None = 0,
        VisualTree = 1,
        ApplicationResources = 2,
        Theme = 4,
        All = 7,
    }
    interface IImplicitStyleHolder {
        _ImplicitStyles: Style[];
        _StyleMask: number;
    }
    class ImplicitStyleBroker {
        static Set(fe: FrameworkElement, mask: StyleMask, styles?: Style[]): void;
        private static SetImpl(fe, mask, styles);
        static Clear(fe: FrameworkElement, mask: StyleMask): void;
        private static ApplyStyles(fe, mask, styles);
    }
}
declare module Fayde.Providers {
    interface IStyleHolder {
        _LocalStyle: Style;
    }
    class LocalStyleBroker {
        static Set(fe: FrameworkElement, newStyle: Style): void;
    }
}
declare module Fayde.Providers {
    function SwapStyles(fe: FrameworkElement, oldWalker: IStyleWalker, newWalker: IStyleWalker, isImplicit: boolean): void;
}
declare module Fayde.Data {
    interface IOutValue {
        Value: any;
    }
    class PropertyPath implements ICloneable {
        private _Path;
        private _ExpandedPath;
        private _Propd;
        constructor(path?: string, expandedPath?: string);
        static CreateFromParameter(parameter: any): PropertyPath;
        TryResolveDependencyProperty(refobj: IOutValue, promotedValues: any[]): DependencyProperty;
        Path: string;
        ExpandedPath: string;
        ParsePath: string;
        HasDependencyProperty: boolean;
        DependencyProperty: DependencyProperty;
        static ResolvePropertyPath(refobj: IOutValue, propertyPath: PropertyPath, promotedValues: any[]): DependencyProperty;
        Clone(): PropertyPath;
    }
}
declare module Fayde.Data {
    interface IPropertyPathParserData {
        typeName: string;
        propertyName: string;
        index: number;
    }
    enum PropertyNodeType {
        None = 0,
        AttachedProperty = 1,
        Indexed = 2,
        Property = 3,
    }
    class PropertyPathParser {
        Path: string;
        constructor(path: string);
        Step(data: IPropertyPathParserData): PropertyNodeType;
    }
}
declare module Fayde.Data {
    interface IPropertyPathWalkerListener {
        IsBrokenChanged(): any;
        ValueChanged(): any;
    }
    interface IPropertyPathNode {
        Next: IPropertyPathNode;
        Value: any;
        IsBroken: boolean;
        ValueType: IType;
        GetSource(): any;
        SetSource(source: any): any;
        SetValue(value: any): any;
        Listen(listener: IPropertyPathNodeListener): any;
        Unlisten(listener: IPropertyPathNodeListener): any;
    }
    interface ICollectionViewNode extends IPropertyPathNode {
        BindToView: boolean;
    }
    interface IPropertyPathNodeListener {
        IsBrokenChanged(node: IPropertyPathNode): any;
        ValueChanged(node: IPropertyPathNode): any;
    }
    class PropertyPathWalker implements IPropertyPathNodeListener {
        Path: string;
        IsDataContextBound: boolean;
        Source: any;
        ValueInternal: any;
        Node: IPropertyPathNode;
        FinalNode: IPropertyPathNode;
        private _Listener;
        IsPathBroken: boolean;
        FinalPropertyName: string;
        constructor(path: string, bindDirectlyToSource?: boolean, bindsToView?: boolean, isDataContextBound?: boolean);
        GetValue(item: any): any;
        Update(source: any): void;
        Listen(listener: IPropertyPathWalkerListener): void;
        Unlisten(listener: IPropertyPathWalkerListener): void;
        IsBrokenChanged(node: IPropertyPathNode): void;
        ValueChanged(node: IPropertyPathNode): void;
        GetContext(): any;
    }
}
declare module Fayde.Input.TouchInternal {
    interface ITouchHandler {
        HandleTouches(type: Input.TouchInputType, touches: ActiveTouchBase[], emitLeave?: boolean, emitEnter?: boolean): boolean;
    }
    class ActiveTouchBase {
        Identifier: number;
        Position: Point;
        Device: Input.ITouchDevice;
        InputList: UINode[];
        private _IsEmitting;
        private _PendingCapture;
        private _PendingReleaseCapture;
        private _Captured;
        private _CapturedInputList;
        private _FinishReleaseCaptureFunc;
        constructor(touchHandler: ITouchHandler);
        Capture(uie: UIElement): boolean;
        ReleaseCapture(uie: UIElement): void;
        private _PerformCapture(uin);
        private _PerformReleaseCapture();
        Emit(type: Input.TouchInputType, newInputList: UINode[], emitLeave?: boolean, emitEnter?: boolean): boolean;
        private _EmitList(type, list, endIndex?);
        GetTouchPoint(relativeTo: UIElement): TouchPoint;
        CreateTouchPoint(p: Point): TouchPoint;
        private CreateTouchDevice();
    }
}
declare module Fayde.Input.TouchInternal {
    interface IOffset {
        left: number;
        top: number;
    }
    class TouchInteropBase implements Fayde.Input.ITouchInterop, ITouchHandler {
        Input: Engine.InputManager;
        CanvasOffset: IOffset;
        ActiveTouches: ActiveTouchBase[];
        CoordinateOffset: IOffset;
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement): void;
        private _CalcOffset(canvas);
        HandleTouches(type: Input.TouchInputType, touches: ActiveTouchBase[], emitLeave?: boolean, emitEnter?: boolean): boolean;
    }
}
declare module Fayde.Input.TouchInternal {
    class NonPointerTouchInterop extends TouchInteropBase {
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement): void;
        private _HandleTouchStart(e);
        private _HandleTouchEnd(e);
        private _HandleTouchMove(e);
        private _HandleTouchEnter(e);
        private _HandleTouchLeave(e);
        private TouchArrayFromList(list);
        private FindTouchInList(identifier);
    }
}
declare module Fayde.Input.TouchInternal {
    class PointerTouchInterop extends TouchInteropBase {
        Register(input: Engine.InputManager, canvas: HTMLCanvasElement): void;
        private _HandlePointerDown(e);
        private _HandlePointerUp(e);
        private _HandlePointerMove(e);
        private _HandlePointerEnter(e);
        private _HandlePointerLeave(e);
        private GetActiveTouch(e);
        private FindTouchInList(identifier);
    }
}
declare module Fayde.Markup.Internal {
    interface IActiveObject {
        obj: any;
        xo: XamlObject;
        dobj: DependencyObject;
        rd: ResourceDictionary;
        coll: nullstone.ICollection<any>;
        arr: any[];
        type: any;
        set(obj: any): any;
        setName(name: string): any;
        getApp(): Application;
    }
    function createActiveObject(app: Application, namescope: NameScope, bindingSource: any): IActiveObject;
}
declare module Fayde.Markup.Internal {
    interface IObjectActor {
        start(): any;
        end(): any;
    }
    function createObjectActor(pactor: IPropertyActor): IObjectActor;
}
declare module Fayde.Markup.Internal {
    interface IPropertyActor {
        init(nstate: any): any;
        start(ownerType: any, name: string): any;
        startContent(): any;
        end(): any;
        addObject(obj: any, key?: any): any;
        setContentText(text: string): any;
        setObject(ownerType: any, name: string, obj: any): any;
        isNewResources(): boolean;
    }
    function createPropertyActor(cur: IActiveObject, extractType: (text: string) => any, extractDP: (text: string) => any): IPropertyActor;
}
declare module Fayde.Markup.Internal {
    interface IResourcesActor {
        start(): any;
        end(): any;
        get(): ResourceDictionary[];
    }
    function createResourcesActor(cur: IActiveObject, resources: ResourceDictionary[]): IResourcesActor;
}
declare module Fayde.Media.Animation {
    enum EasingMode {
        EaseOut = 0,
        EaseIn = 1,
        EaseInOut = 2,
    }
    enum FillBehavior {
        HoldEnd = 0,
        Stop = 1,
    }
}
declare module Fayde.Media.Animation {
    class RepeatBehavior {
        private _Duration;
        private _Count;
        IsForever: boolean;
        static FromRepeatDuration(duration: Duration): RepeatBehavior;
        static FromIterationCount(count: number): RepeatBehavior;
        HasCount: boolean;
        Count: number;
        HasDuration: boolean;
        Duration: Duration;
        Clone(): RepeatBehavior;
        static Forever: RepeatBehavior;
    }
}
declare module Fayde.Media.Animation {
    interface IClockData {
        CurrentTime: TimeSpan;
        Progress: number;
        Completed: boolean;
    }
    class Timeline extends DependencyObject implements ITimeline {
        static DEFAULT_REPEAT_BEHAVIOR: RepeatBehavior;
        static AutoReverseProperty: DependencyProperty;
        static BeginTimeProperty: DependencyProperty;
        static DurationProperty: DependencyProperty;
        static RepeatBehaviorProperty: DependencyProperty;
        static SpeedRatioProperty: DependencyProperty;
        static FillBehaviorProperty: DependencyProperty;
        AutoReverse: boolean;
        BeginTime: TimeSpan;
        Duration: Duration;
        RepeatBehavior: RepeatBehavior;
        SpeedRatio: number;
        FillBehavior: FillBehavior;
        Completed: nullstone.Event<{}>;
        private _IsPaused;
        private _BeginPauseTime;
        private _TicksPaused;
        private _IsFirstUpdate;
        private _HasBegun;
        private _BeginTicks;
        private _InitialStep;
        private _HasCompleted;
        ManualTarget: DependencyObject;
        HasManualTarget: boolean;
        Reset(): void;
        Pause(): void;
        Resume(): void;
        Stop(): void;
        OnCompleted(): void;
        Update(nowTime: number): void;
        UpdateInternal(clockData: IClockData): void;
        HoldEnd(): void;
        private CreateClockData(nowTime);
        private IsAfterBeginTime(nowTime);
        GetNaturalDuration(): Duration;
        GetNaturalDurationCore(): Duration;
        GenerateFrom(): AnimationBase;
        GenerateTo(isEntering: boolean): AnimationBase;
    }
    class TimelineCollection extends XamlObjectCollection<Timeline> {
    }
}
declare module Fayde.Media.Animation {
    class AnimationBase extends Timeline {
        private _AnimStorage;
        private _IsHolding;
        constructor();
        Resolve(target: DependencyObject, propd: DependencyProperty): boolean;
        HoldEnd(): void;
        Stop(): void;
        UpdateInternal(clockData: IClockData): void;
        GetNaturalDurationCore(): Duration;
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): any;
        _Hookup(promotedValues: any[], error: BError): boolean;
    }
}
declare module Fayde.Media.Animation {
    interface IAnimationStorage {
        ID: number;
        Animation: AnimationBase;
        PropStorage: Providers.IPropertyStorage;
        IsDisabled: boolean;
        BaseValue: any;
        CurrentValue: any;
        StopValue: any;
    }
    class AnimationStore {
        static Create(target: DependencyObject, propd: DependencyProperty): IAnimationStorage;
        static Attach(animStorage: IAnimationStorage): void;
        static Detach(animStorage: IAnimationStorage): boolean;
        static ApplyCurrent(animStorage: IAnimationStorage): void;
        static ApplyStop(animStorage: IAnimationStorage): void;
    }
}
declare module Fayde.Media.Animation {
    class AnimationUsingKeyFrames extends AnimationBase {
        static KeyFramesProperty: ImmutableDependencyProperty<KeyFrameCollection>;
        KeyFrames: KeyFrameCollection;
        constructor();
        Resolve(target: DependencyObject, propd: DependencyProperty): boolean;
        GetCurrentValue(defaultOriginValue: any, defaultDestinationValue: any, clockData: IClockData): any;
        GetNaturalDurationCore(): Duration;
        AddKeyFrame(kf: KeyFrame): void;
        RemoveKeyFrame(kf: KeyFrame): void;
    }
}
declare module Fayde.Media.Animation {
    class BeginStoryboard extends TriggerAction {
        static StoryboardProperty: DependencyProperty;
        Storyboard: Animation.Storyboard;
        Fire(): void;
    }
}
declare module Fayde.Media.Animation {
    class ColorAnimation extends AnimationBase {
        static ByProperty: DependencyProperty;
        static EasingFunctionProperty: DependencyProperty;
        static FromProperty: DependencyProperty;
        static ToProperty: DependencyProperty;
        By: Color;
        EasingFunction: IEasingFunction;
        From: Color;
        To: Color;
        private _FromCached;
        private _ToCached;
        private _ByCached;
        private _EasingCached;
        constructor();
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): Color;
        private _FromChanged(args);
        private _ToChanged(args);
        private _ByChanged(args);
        private _EasingChanged(args);
        GenerateFrom(): AnimationBase;
        GenerateTo(isEntering: boolean): AnimationBase;
    }
}
declare module Fayde.Media.Animation {
    class ColorAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        GenerateFrom(): AnimationBase;
        GenerateTo(isEntering: boolean): AnimationBase;
    }
}
declare module Fayde.Media.Animation {
    interface IOutValue {
        Value: any;
    }
    interface IKeyFrameListener {
        KeyFrameChanged(source: KeyFrame): any;
    }
    interface IKeyFrame {
        _ResolvedKeyTime: TimeSpan;
        _Resolved: boolean;
        Value: any;
        InterpolateValue(baseValue: any, keyFrameProgress: number): any;
    }
    class KeyFrame extends DependencyObject implements IKeyFrame {
        _ResolvedKeyTime: TimeSpan;
        _Resolved: boolean;
        private _Listener;
        static KeyTimeProperty: DependencyProperty;
        KeyTime: KeyTime;
        Value: any;
        CoerceKeyTime(dobj: DependencyObject, propd: DependencyProperty, value: any, coerced: IOutValue, error: BError): boolean;
        InterpolateValue(baseValue: any, keyFrameProgress: number): any;
        CompareToTimeSpan(otherTs: TimeSpan): number;
        Listen(listener: IKeyFrameListener): void;
        Unlisten(listener: IKeyFrameListener): void;
        InvalidateKeyFrame(): void;
        static Comparer(kf1: KeyFrame, kf2: KeyFrame): number;
        static ResolveKeyFrames(animation: AnimationBase, arr: KeyFrame[]): KeyFrame[];
    }
    class KeyFrameCollection extends XamlObjectCollection<KeyFrame> {
        private _Resolved;
        private _SortedList;
        GetKeyFrameForTime(t: TimeSpan, prevFrameRef: IOutValue): KeyFrame;
        Clear(): boolean;
        AddingToCollection(value: KeyFrame, error: BError): boolean;
        RemovedFromCollection(value: KeyFrame, isValueSafe: boolean): void;
        KeyFrameChanged(source: KeyFrame): void;
        static ResolveKeyFrames(animation: AnimationBase, coll: KeyFrameCollection): KeyFrame[];
    }
}
declare module Fayde.Media.Animation {
    class ColorKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty;
        Value: Color;
    }
    class DiscreteColorKeyFrame extends ColorKeyFrame {
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color;
    }
    class EasingColorKeyFrame extends ColorKeyFrame {
        static EasingFunctionProperty: DependencyProperty;
        EasingFunction: EasingFunctionBase;
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color;
    }
    class LinearColorKeyFrame extends ColorKeyFrame {
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color;
    }
    class SplineColorKeyFrame extends ColorKeyFrame {
        static KeySplineProperty: DependencyProperty;
        KeySpline: KeySpline;
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color;
    }
}
declare module Fayde.Media.Animation {
    interface ICurvePoint {
        x: number;
        y: number;
    }
    interface IQuadraticCurve {
        c0: ICurvePoint;
        c1: ICurvePoint;
        c2: ICurvePoint;
    }
    interface ICubicCurve {
        c0: ICurvePoint;
        c1: ICurvePoint;
        c2: ICurvePoint;
        c3: ICurvePoint;
    }
    interface ISubdiviedCubicCurve {
        b1: ICubicCurve;
        b2: ICubicCurve;
    }
    class Curves {
        static QuadraticArrayYForX(arr: IQuadraticCurve[], x: number, count: number): number;
        static QuadraticYForX(x: number, src: IQuadraticCurve): number;
        static SubdivideCubicAtLevel(b: ICubicCurve[], lvl: number, src: ICubicCurve): void;
        static RecursiveSubdivide(b: ICubicCurve[], lvl: number, currentlvl: number, pos: number, src: ICubicCurve): number;
        static SubdivideCubic(data: ISubdiviedCubicCurve, src: ICubicCurve): void;
        static HalfLerpPoint(p: ICurvePoint, p1: ICurvePoint, p2: ICurvePoint): void;
        static ConvertCubicsToQuadratics(srcArray: ICubicCurve[], count: number): IQuadraticCurve[];
        static QuadraticFromCubic(src: ICubicCurve): IQuadraticCurve;
    }
}
declare module Fayde.Media.Animation {
    class DoubleAnimation extends AnimationBase {
        static ByProperty: DependencyProperty;
        static EasingFunctionProperty: DependencyProperty;
        static FromProperty: DependencyProperty;
        static ToProperty: DependencyProperty;
        By: number;
        EasingFunction: IEasingFunction;
        From: number;
        To: number;
        private _FromCached;
        private _ToCached;
        private _ByCached;
        private _EasingCached;
        constructor();
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): number;
        private _FromChanged(args);
        private _ToChanged(args);
        private _ByChanged(args);
        private _EasingChanged(args);
        GenerateFrom(): AnimationBase;
        GenerateTo(isEntering: boolean): AnimationBase;
    }
}
declare module Fayde.Media.Animation {
    class DoubleAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        GenerateFrom(): AnimationBase;
        GenerateTo(isEntering: boolean): AnimationBase;
    }
}
declare module Fayde.Media.Animation {
    class DoubleKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty;
        Value: number;
    }
    class DiscreteDoubleKeyFrame extends DoubleKeyFrame {
        InterpolateValue(baseValue: number, keyFrameProgress: number): number;
    }
    class EasingDoubleKeyFrame extends DoubleKeyFrame {
        static EasingFunctionProperty: DependencyProperty;
        EasingFunction: EasingFunctionBase;
        InterpolateValue(baseValue: number, keyFrameProgress: number): number;
    }
    class LinearDoubleKeyFrame extends DoubleKeyFrame {
        InterpolateValue(baseValue: number, keyFrameProgress: number): number;
    }
    class SplineDoubleKeyFrame extends DoubleKeyFrame {
        static KeySplineProperty: DependencyProperty;
        KeySpline: KeySpline;
        InterpolateValue(baseValue: number, keyFrameProgress: number): number;
    }
}
declare module Fayde.Media.Animation {
    interface IEasingFunction {
        Ease(normalizedTime: number): number;
    }
    class EasingFunctionBase extends DependencyObject implements IEasingFunction {
        static EasingModeProperty: DependencyProperty;
        EasingMode: EasingMode;
        Ease(normalizedTime: number): number;
        EaseInCore(t: number): number;
    }
}
declare module Fayde.Media.Animation {
    class BackEase extends EasingFunctionBase {
        static AmplitudeProperty: DependencyProperty;
        Amplitude: number;
        EaseInCore(t: number): number;
    }
    class BounceEase extends EasingFunctionBase {
        static BouncesProperty: DependencyProperty;
        static BouncinessProperty: DependencyProperty;
        Bounces: number;
        Bounciness: number;
        EaseInCore(t: number): number;
    }
    class CircleEase extends EasingFunctionBase {
        EaseInCore(t: number): number;
    }
    class CubicEase extends EasingFunctionBase {
        EaseInCore(t: number): number;
    }
    class ElasticEase extends EasingFunctionBase {
        static OscillationsProperty: DependencyProperty;
        static SpringinessProperty: DependencyProperty;
        Oscillations: number;
        Springiness: number;
        EaseInCore(t: number): number;
    }
    class ExponentialEase extends EasingFunctionBase {
        static ExponentProperty: DependencyProperty;
        Exponent: number;
        EaseInCore(t: number): number;
    }
    class PowerEase extends EasingFunctionBase {
        static PowerProperty: DependencyProperty;
        Power: number;
        EaseInCore(t: number): number;
    }
    class QuadraticEase extends EasingFunctionBase {
        EaseInCore(t: number): number;
    }
    class QuarticEase extends EasingFunctionBase {
        EaseInCore(t: number): number;
    }
    class QuinticEase extends EasingFunctionBase {
        EaseInCore(t: number): number;
    }
    class SineEase extends EasingFunctionBase {
        EaseInCore(t: number): number;
    }
}
declare module Fayde.Media.Animation {
    class KeySpline extends DependencyObject {
        static PRECISION_LEVEL: number;
        static TOTAL_COUNT: number;
        static ControlPoint1Property: DependencyProperty;
        static ControlPoint2Property: DependencyProperty;
        ControlPoint1: Point;
        ControlPoint2: Point;
        private _QuadraticsArray;
        GetSplineProgress(linearProgress: number): number;
        private InvalidateControlPoints();
        private _RegenerateQuadratics();
    }
}
declare module Fayde.Media.Animation {
    class ObjectAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        Resolve(target: DependencyObject, propd: DependencyProperty): boolean;
    }
}
declare module Fayde.Media.Animation {
    class ObjectKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty;
        Value: any;
        ConvertedValue: any;
    }
    class DiscreteObjectKeyFrame extends ObjectKeyFrame {
        InterpolateValue(baseValue: any, keyFrameProgress: number): any;
    }
}
declare module Fayde.Media.Animation {
    class PointAnimation extends AnimationBase {
        static ByProperty: DependencyProperty;
        static EasingFunctionProperty: DependencyProperty;
        static FromProperty: DependencyProperty;
        static ToProperty: DependencyProperty;
        By: Point;
        EasingFunction: IEasingFunction;
        From: Point;
        To: Point;
        private _FromCached;
        private _ToCached;
        private _ByCached;
        private _EasingCached;
        constructor();
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): Point;
        private _FromChanged(args);
        private _ToChanged(args);
        private _ByChanged(args);
        private _EasingChanged(args);
        GenerateFrom(): AnimationBase;
        GenerateTo(isEntering: boolean): AnimationBase;
    }
}
declare module Fayde.Media.Animation {
    class PointAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        GenerateFrom(): AnimationBase;
        GenerateTo(isEntering: boolean): AnimationBase;
    }
}
declare module Fayde.Media.Animation {
    class PointKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty;
        Value: Point;
    }
    class DiscretePointKeyFrame extends PointKeyFrame {
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point;
    }
    class EasingPointKeyFrame extends PointKeyFrame {
        static EasingFunctionProperty: DependencyProperty;
        EasingFunction: EasingFunctionBase;
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point;
    }
    class LinearPointKeyFrame extends PointKeyFrame {
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point;
    }
    class SplinePointKeyFrame extends PointKeyFrame {
        static KeySplineProperty: DependencyProperty;
        KeySpline: KeySpline;
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point;
    }
}
declare module Fayde.Media.Animation {
    interface IStoryboadResolution {
        Target: DependencyObject;
        Property: Data.PropertyPath;
    }
    class Storyboard extends Timeline {
        static TargetNameProperty: DependencyProperty;
        static GetTargetName(d: DependencyObject): string;
        static SetTargetName(d: DependencyObject, value: string): void;
        TargetName: string;
        static TargetPropertyProperty: DependencyProperty;
        static GetTargetProperty(d: DependencyObject): Data.PropertyPath;
        static SetTargetProperty(d: DependencyObject, value: Data.PropertyPath): void;
        TargetProperty: Data.PropertyPath;
        static ResolveTarget(timeline: Timeline): IStoryboadResolution;
        static ChildrenProperty: ImmutableDependencyProperty<TimelineCollection>;
        Children: TimelineCollection;
        constructor();
        static SetTarget(timeline: Timeline, target: DependencyObject): void;
        Begin(): void;
        Pause(): void;
        Resume(): void;
        Stop(): void;
        UpdateInternal(clockData: IClockData): void;
        GetNaturalDurationCore(): Duration;
    }
}
declare module Fayde.Media.Effects {
    class Effect extends DependencyObject implements minerva.IEffect {
        static EffectMappingProperty: DependencyProperty;
        EffectMapping: GeneralTransform;
        PreRender(ctx: minerva.core.render.RenderContext): void;
        PostRender(ctx: minerva.core.render.RenderContext): void;
        GetPadding(thickness: Thickness): boolean;
    }
}
declare module Fayde.Media.Effects {
    class BlurEffect extends Effect {
        static RadiusProperty: DependencyProperty;
        Radius: number;
    }
}
declare module Fayde.Media.Effects {
    class DropShadowEffect extends Effect {
        static MAX_BLUR_RADIUS: number;
        static MAX_SHADOW_DEPTH: number;
        static BlurRadiusProperty: DependencyProperty;
        static ColorProperty: DependencyProperty;
        static DirectionProperty: DependencyProperty;
        static OpacityProperty: DependencyProperty;
        static ShadowDepthProperty: DependencyProperty;
        BlurRadius: number;
        Color: Color;
        Direction: number;
        Opacity: number;
        ShadowDepth: number;
        GetPadding(thickness: Thickness): boolean;
        PreRender(ctx: minerva.core.render.RenderContext): void;
    }
}
declare module Fayde.Media.Imaging {
    class ImageSource extends DependencyObject implements minerva.controls.image.IImageSource {
        pixelWidth: number;
        pixelHeight: number;
        lock(): void;
        unlock(): void;
        image: HTMLImageElement;
    }
}
declare module Fayde.Media.Imaging {
    interface IImageChangedListener {
        OnImageErrored(source: BitmapSource, e: Event): any;
        OnImageLoaded(source: BitmapSource, e: Event): any;
        ImageChanged(source: BitmapSource): any;
    }
    class BitmapSource extends ImageSource {
        static PixelWidthProperty: DependencyProperty;
        static PixelHeightProperty: DependencyProperty;
        PixelWidth: number;
        PixelHeight: number;
        private _Listener;
        private _Image;
        pixelWidth: number;
        pixelHeight: number;
        image: HTMLImageElement;
        ResetImage(): void;
        UriSourceChanged(oldValue: Uri, newValue: Uri): void;
        Listen(listener: IImageChangedListener): void;
        Unlisten(listener: IImageChangedListener): void;
        _OnErrored(e: Event): void;
        _OnLoad(e: Event): void;
    }
}
declare module Fayde.Media.Imaging {
    class BitmapImage extends BitmapSource {
        static UriSourceProperty: DependencyProperty;
        UriSource: Uri;
        ImageFailed: nullstone.Event<{}>;
        ImageOpened: nullstone.Event<{}>;
        private _BackingBuffer;
        constructor(uri?: Uri);
        private _UriSourceChanged(args);
        _OnErrored(e: Event): void;
        _OnLoad(e: Event): void;
        SetSource(buffer: ArrayBuffer): void;
    }
}
declare module Fayde.Media.Imaging {
    class ImageBrush extends TileBrush implements IImageChangedListener {
        private static _SourceCoercer(d, propd, value);
        static ImageSourceProperty: DependencyProperty;
        ImageSource: ImageSource;
        ImageFailed: nullstone.Event<{}>;
        ImageOpened: nullstone.Event<{}>;
        setupBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
        GetTileExtents(): minerva.Rect;
        DrawTile(canvasCtx: CanvasRenderingContext2D, bounds: minerva.Rect): void;
        private _ImageSourceChanged(args);
        OnImageErrored(source: BitmapSource, e: Event): void;
        OnImageLoaded(source: BitmapSource, e: Event): void;
        ImageChanged(source: BitmapSource): void;
    }
}
declare module Fayde.Media.Imaging {
    function encodeImage(buffer: ArrayBuffer): Uri;
}
declare module Fayde.Media.LinearGradient {
    interface IInterpolator {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        step(): boolean;
        interpolate(offset: number): number;
    }
    function createRepeatInterpolator(start: Point, end: Point, bounds: minerva.Rect): IInterpolator;
    function createReflectInterpolator(start: Point, end: Point, bounds: minerva.Rect): IInterpolator;
}
declare module Fayde.Media.LinearGradient {
    interface ICoordinates {
        x: number;
        y: number;
    }
    function calcMetrics(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: minerva.Rect): void;
}
declare module Fayde.Media.RadialGradient {
    interface IExtender {
        x0: number;
        y0: number;
        r0: number;
        x1: number;
        y1: number;
        r1: number;
        step(): boolean;
        createGradient(ctx: CanvasRenderingContext2D): CanvasGradient;
    }
    interface IRadialPointData {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        r1: number;
        sx: number;
        sy: number;
        side: number;
        balanced: boolean;
    }
    function createExtender(data: IRadialPointData, bounds: minerva.Rect): IExtender;
}
declare module Fayde.Media.VSM {
    class VisualState extends DependencyObject {
        static StoryboardProperty: DependencyProperty;
        Storyboard: Animation.Storyboard;
    }
    class VisualStateCollection extends XamlObjectCollection<VisualState> {
    }
}
declare module Fayde.Media.VSM {
    class VisualStateChangedEventArgs implements nullstone.IEventArgs {
        OldState: VisualState;
        NewState: VisualState;
        Control: Controls.Control;
        constructor(oldState: VisualState, newState: VisualState, control: Controls.Control);
    }
    class VisualStateGroup extends DependencyObject {
        static StatesProperty: ImmutableDependencyProperty<VisualStateCollection>;
        States: VisualStateCollection;
        static TransitionsProperty: ImmutableDependencyProperty<XamlObjectCollection<VisualTransition>>;
        Transitions: XamlObjectCollection<VisualTransition>;
        private _CurrentStoryboards;
        CurrentStoryboards: Animation.Storyboard[];
        CurrentStateChanging: nullstone.Event<VisualStateChangedEventArgs>;
        CurrentStateChanged: nullstone.Event<VisualStateChangedEventArgs>;
        CurrentState: VisualState;
        constructor();
        GetState(stateName: string): VisualState;
        StartNewThenStopOld(element: FrameworkElement, newStoryboards: Animation.Storyboard[]): void;
        StopCurrentStoryboards(element: FrameworkElement): void;
        Deactivate(): void;
        Activate(): void;
        RaiseCurrentStateChanging(element: FrameworkElement, oldState: VisualState, newState: VisualState, control: Controls.Control): void;
        RaiseCurrentStateChanged(element: FrameworkElement, oldState: VisualState, newState: VisualState, control: Controls.Control): void;
    }
    class VisualStateGroupCollection extends XamlObjectCollection<VisualStateGroup> {
    }
}
declare module Fayde.Media.VSM {
    interface IOutValue {
        Value: any;
    }
    interface IStateData {
        state: VisualState;
        group: VisualStateGroup;
    }
    class VisualStateManager extends DependencyObject {
        static VisualStateGroupsProperty: DependencyProperty;
        static GetVisualStateGroups(d: DependencyObject): VisualStateGroupCollection;
        static SetVisualStateGroups(d: DependencyObject, value: VisualStateGroupCollection): void;
        static CustomVisualStateManagerProperty: DependencyProperty;
        static GetCustomVisualStateManager(d: DependencyObject): VisualStateManager;
        static SetCustomVisualStateManager(d: DependencyObject, value: VisualStateManager): void;
        static GoToState(control: Controls.Control, stateName: string, useTransitions: boolean): boolean;
        GoToStateCore(control: Controls.Control, element: FrameworkElement, stateName: string, group: VisualStateGroup, state: VisualState, useTransitions: boolean): boolean;
        private static GoToStateInternal(control, element, group, state, useTransitions);
        static DestroyStoryboards(control: Controls.Control, root: FrameworkElement): boolean;
        static Deactivate(control: Controls.Control, root: FrameworkElement): boolean;
        static Activate(control: Controls.Control, root: FrameworkElement): boolean;
        private static _GetTemplateRoot(control);
        static GetGroup(control: Controls.Control, name: string): VisualStateGroup;
        private static _TryGetState(groups, stateName, data);
        private static _GetTransition(element, group, from, to);
    }
}
declare module Fayde.Media.VSM {
    class VisualTransition extends DependencyObject {
        From: string;
        To: string;
        static StoryboardProperty: DependencyProperty;
        Storyboard: Animation.Storyboard;
        private _GeneratedDuration;
        GeneratedDuration: Duration;
        DynamicStoryboardCompleted: boolean;
        ExplicitStoryboardCompleted: boolean;
        GeneratedEasingFunction: Animation.EasingFunctionBase;
        IsDefault: boolean;
    }
}
declare module Fayde.Text.History {
    class DeleteAction implements IAction {
        SelectionAnchor: number;
        SelectionCursor: number;
        Start: number;
        Text: string;
        constructor(selectionAnchor: number, selectionCursor: number, buffer: string, start: number, length: number);
        Undo(bo: ITextOwner): void;
        Redo(bo: ITextOwner): number;
    }
}
declare module Fayde.Text.History {
    interface IAction {
        SelectionAnchor: number;
        SelectionCursor: number;
        Undo(bufferholder: ITextOwner): any;
        Redo(bufferholder: ITextOwner): number;
    }
}
declare module Fayde.Text.History {
    class InsertAction implements IAction {
        SelectionAnchor: number;
        SelectionCursor: number;
        Start: number;
        Text: string;
        IsGrowable: boolean;
        constructor(selectionAnchor: number, selectionCursor: number, start: number, inserted: string, isAtomic?: boolean);
        Undo(bo: ITextOwner): void;
        Redo(bo: ITextOwner): number;
        Insert(start: number, text: string): boolean;
    }
}
declare module Fayde.Text.History {
    class ReplaceAction implements IAction {
        SelectionAnchor: number;
        SelectionCursor: number;
        Start: number;
        Length: number;
        Deleted: string;
        Inserted: string;
        constructor(selectionAnchor: number, selectionCursor: number, buffer: string, start: number, length: number, inserted: string);
        Undo(bo: ITextOwner): void;
        Redo(bo: ITextOwner): number;
    }
}
declare module Fayde.Text.History {
    class Tracker {
        private $$undo;
        private $$redo;
        private $$maxUndoCount;
        constructor(maxUndoCount: number);
        canUndo: boolean;
        canRedo: boolean;
        undo(bufferholder: ITextOwner): IAction;
        redo(bufferholder: ITextOwner): number;
        enter(anchor: number, cursor: number, start: number, newText: string): void;
        insert(anchor: number, cursor: number, start: number, newText: string): void;
        replace(anchor: number, cursor: number, text: string, start: number, length: number, newText: string): void;
        delete(anchor: number, cursor: number, text: string, start: number, length: number): void;
        private $doAction(action);
    }
}
declare module Fayde {
    function debugLayers(): any[];
    function sexify(updater: minerva.core.Updater): any;
    function debugLayersRaw(): string;
    function getById(id: number): {
        obj: any;
        node: any;
        updater: minerva.core.Updater;
        flags: string;
        uiflags: string;
    };
    function debugLayersFlatten(): any[];
}

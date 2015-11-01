import ITimerListener = etch.engine.ITimerListener;
declare var requestAnimFrame: any;
declare namespace etch.engine {
    class ClockTimer {
        private _Listeners;
        private _LastTime;
        RegisterTimer(listener: ITimerListener): void;
        UnregisterTimer(listener: ITimerListener): void;
        private _DoTick();
        private _RequestAnimationTick();
    }
}

declare namespace etch.primitives {
    class Vector {
        x: number;
        y: number;
        constructor(x: number, y: number);
        Get(): Vector;
        Set(x: number, y: number): void;
        Add(v: Vector): void;
        static Add(v1: Vector, v2: Vector): Vector;
        Clone(): Vector;
        static LERP(start: Vector, end: Vector, p: number): Vector;
        Sub(v: Vector): void;
        static Sub(v1: Vector, v2: Vector): Vector;
        Mult(n: number): void;
        static Mult(v1: Vector, v2: Vector): Vector;
        static MultN(v1: Vector, n: number): Vector;
        Div(n: number): void;
        static Div(v1: Vector, v2: Vector): Vector;
        static DivN(v1: Vector, n: number): Vector;
        Mag(): number;
        MagSq(): number;
        Normalize(): void;
        Limit(max: number): void;
        Heading(): number;
        static Random2D(): Vector;
        static FromAngle(angle: number): Vector;
    }
}

declare namespace etch.exceptions {
    class Exception {
        Message: string;
        constructor(message: string);
        toString(): string;
    }
    class ArgumentException extends Exception {
        constructor(message: string);
    }
    class ArgumentNullException extends Exception {
        constructor(message: string);
    }
    class InvalidOperationException extends Exception {
        constructor(message: string);
    }
    class NotSupportedException extends Exception {
        constructor(message: string);
    }
    class IndexOutOfRangeException extends Exception {
        constructor(index: number);
    }
    class ArgumentOutOfRangeException extends Exception {
        constructor(msg: string);
    }
    class AttachException extends Exception {
        Data: any;
        constructor(message: string, data: any);
    }
    class InvalidJsonException extends Exception {
        JsonText: string;
        InnerException: Error;
        constructor(jsonText: string, innerException: Error);
    }
    class TargetInvocationException extends Exception {
        InnerException: Exception;
        constructor(message: string, innerException: Exception);
    }
    class UnknownTypeException extends Exception {
        FullTypeName: string;
        constructor(fullTypeName: string);
    }
    class FormatException extends Exception {
        constructor(message: string);
    }
}

import IndexOutOfRangeException = etch.exceptions.IndexOutOfRangeException;
import INotifyCollectionChanged = etch.events.INotifyCollectionChanged;
declare namespace etch.collections {
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

/// <reference path="Engine/ClockTimer.d.ts" />
/// <reference path="Primitives/Vector.d.ts" />
/// <reference path="Exceptions/Exceptions.d.ts" />
/// <reference path="Collections/ObservableCollection.d.ts" />

declare namespace etch.collections {
    class PropertyChangedEventArgs implements nullstone.IEventArgs {
        PropertyName: string;
        constructor(propertyName: string);
    }
    interface INotifyPropertyChanged {
        PropertyChanged: nullstone.Event<PropertyChangedEventArgs>;
    }
    var INotifyPropertyChanged_: nullstone.Interface<INotifyPropertyChanged>;
}

import Size = minerva.Size;
declare namespace etch.drawing {
    class Canvas implements IDisplayContext {
        HTMLElement: HTMLCanvasElement;
        IsCached: boolean;
        constructor();
        Ctx: CanvasRenderingContext2D;
        Width: number;
        Height: number;
        Size: Size;
        Style: any;
    }
}

declare namespace etch.drawing {
    class DisplayObject implements IDisplayObject {
        private _DisplayList;
        FrameCount: number;
        Height: number;
        IsCached: boolean;
        IsInitialised: boolean;
        IsPaused: boolean;
        IsVisible: boolean;
        Position: Vector;
        DrawFrom: IDisplayContext;
        DrawTo: IDisplayContext;
        Width: number;
        ZIndex: number;
        Init(drawTo: IDisplayContext, drawFrom?: IDisplayContext): void;
        Ctx: CanvasRenderingContext2D;
        CanvasWidth: number;
        CanvasHeight: number;
        DisplayList: DisplayObjectCollection<IDisplayObject>;
        Setup(): void;
        Update(): void;
        Draw(): void;
        IsFirstFrame(): boolean;
        Dispose(): void;
        Play(): void;
        Pause(): void;
        Show(): void;
        Hide(): void;
    }
}

import ObservableCollection = etch.collections.ObservableCollection;
import Exception = etch.exceptions.Exception;
declare namespace etch.drawing {
    class DisplayObjectCollection<T extends IDisplayObject> extends ObservableCollection<T> {
        constructor();
        Swap(obj1: T, obj2: T): void;
        ToFront(obj: T): void;
        ToBack(obj: T): void;
        SetIndex(obj: T, index: number): void;
        Bottom: T;
        Top: T;
    }
}

declare namespace etch.drawing {
    interface IDisplayContext {
        Ctx: CanvasRenderingContext2D;
        Width: number;
        Height: number;
        IsCached: boolean;
    }
}

import DisplayObjectCollection = etch.drawing.DisplayObjectCollection;
import IDisplayContext = etch.drawing.IDisplayContext;
import Vector = etch.primitives.Vector;
declare namespace etch.drawing {
    interface IDisplayObject extends IDisplayContext {
        CanvasHeight: number;
        CanvasWidth: number;
        Ctx: CanvasRenderingContext2D;
        DisplayList: DisplayObjectCollection<IDisplayObject>;
        Draw(): void;
        DrawFrom: IDisplayContext;
        DrawTo: IDisplayContext;
        Height: number;
        Hide(): void;
        Init(drawTo: IDisplayContext, drawFrom?: IDisplayContext): void;
        IsInitialised: boolean;
        IsPaused: boolean;
        IsVisible: boolean;
        Pause(): void;
        Play(): void;
        Position: Vector;
        Setup(): void;
        Show(): void;
        Update(): void;
        Width: number;
        ZIndex: number;
    }
}

import ClockTimer = etch.engine.ClockTimer;
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayObject = etch.drawing.IDisplayObject;
declare var MAX_FPS: number;
declare var MAX_MSPF: number;
declare namespace etch.drawing {
    class Stage extends DisplayObject implements ITimerListener {
        FrameCount: number;
        LastVisualTick: number;
        Timer: ClockTimer;
        Init(sketch: IDisplayContext): void;
        OnTicked(lastTime: number, nowTime: number): void;
        UpdateDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void;
        DrawDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void;
    }
}

declare namespace etch.engine {
    interface ITimerListener {
        OnTicked(lastTime: number, nowTime: number): any;
    }
}

declare namespace etch.events {
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

import CollectionChangedEventArgs = etch.events.CollectionChangedEventArgs;
declare namespace etch.events {
    interface INotifyCollectionChanged {
        CollectionChanged: nullstone.Event<CollectionChangedEventArgs>;
    }
    var INotifyCollectionChanged_: nullstone.Interface<INotifyCollectionChanged>;
}

declare namespace etch.events {
    class PropertyChangedEventArgs implements nullstone.IEventArgs {
        PropertyName: string;
        constructor(propertyName: string);
    }
    interface INotifyPropertyChanged {
        PropertyChanged: nullstone.Event<PropertyChangedEventArgs>;
    }
    var INotifyPropertyChanged_: nullstone.Interface<INotifyPropertyChanged>;
}

import RoutedEventArgs = etch.events.RoutedEventArgs;
declare namespace etch.events {
    class RoutedEvent<T extends RoutedEventArgs> extends nullstone.Event<T> {
    }
}

declare namespace etch.events {
    class RoutedEventArgs implements nullstone.IEventArgs {
        Handled: boolean;
        Source: any;
        OriginalSource: any;
    }
}

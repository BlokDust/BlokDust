// etch v0.1.1 https://github.com/edsilv/etch#readme
import ITimerListener = etch.engine.ITimerListener;
declare var requestAnimFrame: any;
declare module etch.engine {
    class ClockTimer {
        private _listeners;
        private _lastTime;
        registerTimer(listener: ITimerListener): void;
        unregisterTimer(listener: ITimerListener): void;
        private _doTick();
        private _requestAnimationTick();
    }
}

declare module etch.primitives {
    class Vector {
        x: number;
        y: number;
        constructor(x: number, y: number);
        get(): Vector;
        set(x: number, y: number): void;
        add(v: Vector): Vector;
        static add(v1: Vector, v2: Vector): Vector;
        clone(): Vector;
        static LERP(start: Vector, end: Vector, p: number): Vector;
        sub(v: Vector): Vector;
        static sub(v1: Vector, v2: Vector): Vector;
        mult(n: number): Vector;
        static mult(v1: Vector, v2: Vector): Vector;
        static multN(v1: Vector, n: number): Vector;
        div(n: number): Vector;
        static div(v1: Vector, v2: Vector): Vector;
        static divN(v1: Vector, n: number): Vector;
        mag(): number;
        magSq(): number;
        normalize(): Vector;
        limit(max: number): Vector;
        heading(): number;
        static random2D(): Vector;
        static fromAngle(angle: number): Vector;
        toPoint(): Point;
    }
}

declare module etch.exceptions {
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

import INotifyCollectionChanged = etch.events.INotifyCollectionChanged;
declare module etch.collections {
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

/// <reference path="engine/ClockTimer.d.ts" />
/// <reference path="primitives/Vector.d.ts" />
/// <reference path="exceptions/Exceptions.d.ts" />
/// <reference path="collections/ObservableCollection.d.ts" />

declare module etch.collections {
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
declare module etch.drawing {
    class Canvas implements IDisplayContext {
        htmlElement: HTMLCanvasElement;
        isCached: boolean;
        stage: etch.drawing.Stage;
        constructor(parentElement?: HTMLElement);
        ctx: CanvasRenderingContext2D;
        width: number;
        height: number;
        size: Size;
        style: any;
        hide(): void;
        show(): void;
    }
}

declare module etch.drawing {
    class DisplayObject implements IDisplayObject {
        private _displayList;
        deltaTime: number;
        frameCount: number;
        height: number;
        isCached: boolean;
        isInitialised: boolean;
        isPaused: boolean;
        isVisible: boolean;
        lastVisualTick: number;
        position: Point;
        drawFrom: IDisplayContext;
        drawTo: IDisplayContext;
        width: number;
        zIndex: number;
        init(drawTo: IDisplayContext, drawFrom?: IDisplayContext): void;
        ctx: CanvasRenderingContext2D;
        canvasWidth: number;
        canvasHeight: number;
        stage: etch.drawing.Stage;
        displayList: DisplayObjectCollection<IDisplayObject>;
        setup(): void;
        update(): void;
        draw(): void;
        isFirstFrame(): boolean;
        dispose(): void;
        play(): void;
        pause(): void;
        resize(): void;
        show(): void;
        hide(): void;
    }
}

import ObservableCollection = etch.collections.ObservableCollection;
declare module etch.drawing {
    class DisplayObjectCollection<T extends IDisplayObject> extends ObservableCollection<T> {
        constructor();
        add(value: T): void;
        addRange(values: T[]): void;
        remove(value: T): boolean;
        swap(obj1: T, obj2: T): void;
        toFront(obj: T): void;
        toBack(obj: T): void;
        setIndex(obj: T, index: number): void;
        bottom: T;
        top: T;
    }
}

declare module etch.drawing {
    interface IDisplayContext {
        ctx: CanvasRenderingContext2D;
        width: number;
        height: number;
        isCached: boolean;
    }
}

import DisplayObjectCollection = etch.drawing.DisplayObjectCollection;
import IDisplayContext = etch.drawing.IDisplayContext;
import Point = etch.primitives.Point;
import Stage = etch.drawing.Stage;
declare module etch.drawing {
    interface IDisplayObject extends IDisplayContext {
        canvasWidth: number;
        canvasHeight: number;
        deltaTime: number;
        displayList: DisplayObjectCollection<IDisplayObject>;
        draw(): void;
        drawFrom: IDisplayContext;
        drawTo: IDisplayContext;
        frameCount: number;
        height: number;
        hide(): void;
        init(drawTo: IDisplayContext, drawFrom?: IDisplayContext): void;
        isInitialised: boolean;
        isPaused: boolean;
        isVisible: boolean;
        lastVisualTick: number;
        pause(): void;
        play(): void;
        position: Point;
        resize(): void;
        setup(): void;
        show(): void;
        update(): void;
        width: number;
        zIndex: number;
    }
}

import ClockTimer = etch.engine.ClockTimer;
import Canvas = etch.drawing.Canvas;
import DisplayObject = etch.drawing.DisplayObject;
import IDisplayObject = etch.drawing.IDisplayObject;
declare module etch.drawing {
    class Stage extends DisplayObject implements ITimerListener {
        private _maxDelta;
        deltaTime: number;
        lastVisualTick: number;
        mousePos: etch.primitives.Point;
        timer: ClockTimer;
        updated: nullstone.Event<number>;
        drawn: nullstone.Event<number>;
        constructor(maxDelta?: number);
        init(drawTo: IDisplayContext): void;
        canvas: Canvas;
        width: number;
        height: number;
        private _getMousePos(canvas, e);
        onTicked(lastTime: number, nowTime: number): void;
        update(): void;
        updateDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void;
        draw(): void;
        drawDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void;
        resizeDisplayList(displayList: DisplayObjectCollection<IDisplayObject>): void;
        resize(): void;
    }
}

declare module etch.engine {
    interface ITimerListener {
        onTicked(lastTime: number, nowTime: number): any;
    }
}

declare module etch.events {
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
declare module etch.events {
    interface INotifyCollectionChanged {
        CollectionChanged: nullstone.Event<CollectionChangedEventArgs>;
    }
    var INotifyCollectionChanged_: nullstone.Interface<INotifyCollectionChanged>;
}

declare module etch.events {
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
declare module etch.events {
    class RoutedEvent<T extends RoutedEventArgs> extends nullstone.Event<T> {
    }
}

declare module etch.events {
    class RoutedEventArgs implements nullstone.IEventArgs {
        Handled: boolean;
        Source: any;
        OriginalSource: any;
    }
}

declare module etch.primitives {
    class Point extends minerva.Point {
        clone(): Point;
        toVector(): Vector;
    }
}

var requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 200);
        };
})();
var etch;
(function (etch) {
    var engine;
    (function (engine) {
        var ClockTimer = (function () {
            function ClockTimer() {
                this._Listeners = [];
                this._LastTime = 0;
            }
            ClockTimer.prototype.RegisterTimer = function (listener) {
                var ls = this._Listeners;
                var index = ls.indexOf(listener);
                if (index > -1)
                    return;
                ls.push(listener);
                if (ls.length === 1)
                    this._RequestAnimationTick();
            };
            ClockTimer.prototype.UnregisterTimer = function (listener) {
                var ls = this._Listeners;
                var index = ls.indexOf(listener);
                if (index > -1)
                    ls.splice(index, 1);
            };
            ClockTimer.prototype._DoTick = function () {
                var nowTime = new Date().getTime();
                var lastTime = this._LastTime;
                this._LastTime = nowTime;
                var ls = this._Listeners;
                var len = ls.length;
                if (len === 0)
                    return;
                for (var i = 0; i < len; i++) {
                    ls[i].OnTicked(lastTime, nowTime);
                }
                this._RequestAnimationTick();
            };
            ClockTimer.prototype._RequestAnimationTick = function () {
                var _this = this;
                requestAnimFrame(function () { return _this._DoTick(); });
            };
            return ClockTimer;
        })();
        engine.ClockTimer = ClockTimer;
    })(engine = etch.engine || (etch.engine = {}));
})(etch || (etch = {}));

var etch;
(function (etch) {
    var primitives;
    (function (primitives) {
        // todo: use utils.Maths.Vector
        var Vector = (function () {
            function Vector(x, y) {
                this.x = x;
                this.y = y;
            }
            Vector.prototype.Get = function () {
                return new Vector(this.x, this.y);
            };
            Vector.prototype.Set = function (x, y) {
                this.x = x;
                this.y = y;
            };
            Vector.prototype.Add = function (v) {
                this.x += v.x;
                this.y += v.y;
            };
            Vector.Add = function (v1, v2) {
                return new Vector(v1.x + v2.x, v1.y + v2.y);
            };
            Vector.prototype.Clone = function () {
                return new Vector(this.x, this.y);
            };
            Vector.LERP = function (start, end, p) {
                var x = start.x + (end.x - start.x) * p;
                var y = start.y + (end.y - start.y) * p;
                return new Vector(x, y);
            };
            Vector.prototype.Sub = function (v) {
                this.x -= v.x;
                this.y -= v.y;
            };
            Vector.Sub = function (v1, v2) {
                return new Vector(v1.x - v2.x, v1.y - v2.y);
            };
            Vector.prototype.Mult = function (n) {
                this.x = this.x * n;
                this.y = this.y * n;
            };
            Vector.Mult = function (v1, v2) {
                return new Vector(v1.x * v2.x, v1.y * v2.y);
            };
            Vector.MultN = function (v1, n) {
                return new Vector(v1.x * n, v1.y * n);
            };
            Vector.prototype.Div = function (n) {
                this.x = this.x / n;
                this.y = this.y / n;
            };
            Vector.Div = function (v1, v2) {
                return new Vector(v1.x / v2.x, v1.y / v2.y);
            };
            Vector.DivN = function (v1, n) {
                return new Vector(v1.x / n, v1.y / n);
            };
            Vector.prototype.Mag = function () {
                return Math.sqrt(this.x * this.x + this.y * this.y);
            };
            Vector.prototype.MagSq = function () {
                return (this.x * this.x + this.y * this.y);
            };
            Vector.prototype.Normalize = function () {
                var m = this.Mag();
                if (m != 0 && m != 1) {
                    this.Div(m);
                }
            };
            Vector.prototype.Limit = function (max) {
                if (this.MagSq() > max * max) {
                    this.Normalize();
                    this.Mult(max);
                }
            };
            Vector.prototype.Heading = function () {
                var angle = Math.atan2(-this.y, this.x);
                return -1 * angle;
            };
            Vector.Random2D = function () {
                return Vector.FromAngle((Math.random() * Math.TAU));
            };
            Vector.FromAngle = function (angle) {
                return new Vector(Math.cos(angle), Math.sin(angle));
            };
            Vector.prototype.ToPoint = function () {
                return new primitives.Point(this.x, this.y);
            };
            return Vector;
        })();
        primitives.Vector = Vector;
    })(primitives = etch.primitives || (etch.primitives = {}));
})(etch || (etch = {}));

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var etch;
(function (etch) {
    var exceptions;
    (function (exceptions) {
        var Exception = (function () {
            function Exception(message) {
                this.Message = message;
            }
            Exception.prototype.toString = function () {
                var typeName = this.constructor.name;
                if (typeName)
                    return typeName + ": " + this.Message;
                return this.Message;
            };
            return Exception;
        })();
        exceptions.Exception = Exception;
        var ArgumentException = (function (_super) {
            __extends(ArgumentException, _super);
            function ArgumentException(message) {
                _super.call(this, message);
            }
            return ArgumentException;
        })(Exception);
        exceptions.ArgumentException = ArgumentException;
        var ArgumentNullException = (function (_super) {
            __extends(ArgumentNullException, _super);
            function ArgumentNullException(message) {
                _super.call(this, message);
            }
            return ArgumentNullException;
        })(Exception);
        exceptions.ArgumentNullException = ArgumentNullException;
        var InvalidOperationException = (function (_super) {
            __extends(InvalidOperationException, _super);
            function InvalidOperationException(message) {
                _super.call(this, message);
            }
            return InvalidOperationException;
        })(Exception);
        exceptions.InvalidOperationException = InvalidOperationException;
        var NotSupportedException = (function (_super) {
            __extends(NotSupportedException, _super);
            function NotSupportedException(message) {
                _super.call(this, message);
            }
            return NotSupportedException;
        })(Exception);
        exceptions.NotSupportedException = NotSupportedException;
        var IndexOutOfRangeException = (function (_super) {
            __extends(IndexOutOfRangeException, _super);
            function IndexOutOfRangeException(index) {
                _super.call(this, index.toString());
            }
            return IndexOutOfRangeException;
        })(Exception);
        exceptions.IndexOutOfRangeException = IndexOutOfRangeException;
        var ArgumentOutOfRangeException = (function (_super) {
            __extends(ArgumentOutOfRangeException, _super);
            function ArgumentOutOfRangeException(msg) {
                _super.call(this, msg);
            }
            return ArgumentOutOfRangeException;
        })(Exception);
        exceptions.ArgumentOutOfRangeException = ArgumentOutOfRangeException;
        var AttachException = (function (_super) {
            __extends(AttachException, _super);
            function AttachException(message, data) {
                _super.call(this, message);
                this.Data = data;
            }
            return AttachException;
        })(Exception);
        exceptions.AttachException = AttachException;
        var InvalidJsonException = (function (_super) {
            __extends(InvalidJsonException, _super);
            function InvalidJsonException(jsonText, innerException) {
                _super.call(this, "Invalid json.");
                this.JsonText = jsonText;
                this.InnerException = innerException;
            }
            return InvalidJsonException;
        })(Exception);
        exceptions.InvalidJsonException = InvalidJsonException;
        var TargetInvocationException = (function (_super) {
            __extends(TargetInvocationException, _super);
            function TargetInvocationException(message, innerException) {
                _super.call(this, message);
                this.InnerException = innerException;
            }
            return TargetInvocationException;
        })(Exception);
        exceptions.TargetInvocationException = TargetInvocationException;
        var UnknownTypeException = (function (_super) {
            __extends(UnknownTypeException, _super);
            function UnknownTypeException(fullTypeName) {
                _super.call(this, fullTypeName);
                this.FullTypeName = fullTypeName;
            }
            return UnknownTypeException;
        })(Exception);
        exceptions.UnknownTypeException = UnknownTypeException;
        var FormatException = (function (_super) {
            __extends(FormatException, _super);
            function FormatException(message) {
                _super.call(this, message);
            }
            return FormatException;
        })(Exception);
        exceptions.FormatException = FormatException;
    })(exceptions = etch.exceptions || (etch.exceptions = {}));
})(etch || (etch = {}));

var etch;
(function (etch) {
    var collections;
    (function (collections) {
        var ObservableCollection = (function () {
            function ObservableCollection() {
                this._ht = [];
                this.CollectionChanged = new nullstone.Event();
                this.PropertyChanged = new nullstone.Event();
            }
            ObservableCollection.prototype.getEnumerator = function () {
                return nullstone.IEnumerator_.fromArray(this._ht);
            };
            Object.defineProperty(ObservableCollection.prototype, "Count", {
                get: function () {
                    return this._ht.length;
                },
                enumerable: true,
                configurable: true
            });
            ObservableCollection.prototype.ToArray = function () {
                return this._ht.slice(0);
            };
            ObservableCollection.prototype.GetValueAt = function (index) {
                var ht = this._ht;
                if (index < 0 || index >= ht.length)
                    throw new etch.exceptions.IndexOutOfRangeException(index);
                return ht[index];
            };
            ObservableCollection.prototype.SetValueAt = function (index, value) {
                var ht = this._ht;
                if (index < 0 || index >= ht.length)
                    throw new etch.exceptions.IndexOutOfRangeException(index);
                var oldValue = ht[index];
                ht[index] = value;
                this.CollectionChanged.raise(this, CollectionChangedEventArgs.Replace(value, oldValue, index));
            };
            ObservableCollection.prototype.Add = function (value) {
                var index = this._ht.push(value) - 1;
                this.CollectionChanged.raise(this, CollectionChangedEventArgs.Add(value, index));
                this._RaisePropertyChanged("Count");
            };
            ObservableCollection.prototype.AddRange = function (values) {
                var index = this._ht.length;
                var len = values.length;
                for (var i = 0; i < len; i++) {
                    this._ht.push(values[i]);
                }
                this.CollectionChanged.raise(this, CollectionChangedEventArgs.AddRange(values, index));
                this._RaisePropertyChanged("Count");
            };
            ObservableCollection.prototype.Insert = function (index, value) {
                var ht = this._ht;
                if (index < 0 || index > ht.length)
                    throw new etch.exceptions.IndexOutOfRangeException(index);
                if (index >= ht.length)
                    ht.push(value);
                else
                    ht.splice(index, 0, value);
                this.CollectionChanged.raise(this, CollectionChangedEventArgs.Add(value, index));
                this._RaisePropertyChanged("Count");
            };
            ObservableCollection.prototype.IndexOf = function (value) {
                return this._ht.indexOf(value);
            };
            ObservableCollection.prototype.Contains = function (value) {
                return this._ht.indexOf(value) > -1;
            };
            ObservableCollection.prototype.Remove = function (value) {
                var index = this._ht.indexOf(value);
                if (index < 0)
                    return false;
                this._ht.splice(index, 1);
                this.CollectionChanged.raise(this, CollectionChangedEventArgs.Remove(value, index));
                this._RaisePropertyChanged("Count");
                return true;
            };
            ObservableCollection.prototype.RemoveAt = function (index) {
                if (index < 0 || index >= this._ht.length)
                    throw new etch.exceptions.IndexOutOfRangeException(index);
                var item = this._ht.splice(index, 1)[0];
                this.CollectionChanged.raise(this, CollectionChangedEventArgs.Remove(item, index));
                this._RaisePropertyChanged("Count");
            };
            ObservableCollection.prototype.Clear = function () {
                var old = this._ht;
                this._ht = [];
                this.CollectionChanged.raise(this, CollectionChangedEventArgs.Reset(old));
                this._RaisePropertyChanged("Count");
            };
            ObservableCollection.prototype._RaisePropertyChanged = function (propertyName) {
                this.PropertyChanged.raise(this, new collections.PropertyChangedEventArgs(propertyName));
            };
            return ObservableCollection;
        })();
        collections.ObservableCollection = ObservableCollection;
    })(collections = etch.collections || (etch.collections = {}));
})(etch || (etch = {}));

/// <reference path="./Engine/ClockTimer.ts" />
/// <reference path="./Primitives/Vector.ts" />
/// <reference path="./Exceptions/Exceptions.ts" />
/// <reference path="./Collections/ObservableCollection.ts" /> 

var etch;
(function (etch) {
    var collections;
    (function (collections) {
        var PropertyChangedEventArgs = (function () {
            function PropertyChangedEventArgs(propertyName) {
                Object.defineProperty(this, "PropertyName", { value: propertyName, writable: false });
            }
            return PropertyChangedEventArgs;
        })();
        collections.PropertyChangedEventArgs = PropertyChangedEventArgs;
        // todo: remove?
        collections.INotifyPropertyChanged_ = new nullstone.Interface("INotifyPropertyChanged");
        collections.INotifyPropertyChanged_.is = function (o) {
            return o && o.PropertyChanged instanceof nullstone.Event;
        };
    })(collections = etch.collections || (etch.collections = {}));
})(etch || (etch = {}));

var Size = minerva.Size;
var etch;
(function (etch) {
    var drawing;
    (function (drawing) {
        var Canvas = (function () {
            function Canvas() {
                this.IsCached = false;
                this.HTMLElement = document.createElement("canvas");
                document.body.appendChild(this.HTMLElement);
            }
            Object.defineProperty(Canvas.prototype, "Ctx", {
                get: function () {
                    return this.HTMLElement.getContext("2d");
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Canvas.prototype, "Width", {
                get: function () {
                    return this.Ctx.canvas.width;
                },
                set: function (value) {
                    this.Ctx.canvas.width = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Canvas.prototype, "Height", {
                get: function () {
                    return this.Ctx.canvas.height;
                },
                set: function (value) {
                    this.Ctx.canvas.height = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Canvas.prototype, "Size", {
                get: function () {
                    return new Size(this.Width, this.Height);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Canvas.prototype, "Style", {
                get: function () {
                    return this.Ctx.canvas.style;
                },
                enumerable: true,
                configurable: true
            });
            return Canvas;
        })();
        drawing.Canvas = Canvas;
    })(drawing = etch.drawing || (etch.drawing = {}));
})(etch || (etch = {}));

var etch;
(function (etch) {
    var drawing;
    (function (drawing) {
        // todo: make abstract?
        var DisplayObject = (function () {
            function DisplayObject() {
                this._DisplayList = new drawing.DisplayObjectCollection();
                this.FrameCount = -1;
                this.IsCached = false;
                this.IsInitialised = false;
                this.IsPaused = false;
                this.IsVisible = true;
                this.LastVisualTick = 0;
            }
            DisplayObject.prototype.Init = function (drawTo, drawFrom) {
                this.DrawTo = drawTo;
                if (drawFrom)
                    this.DrawFrom = drawFrom;
                this.IsInitialised = true;
                this.Setup();
                this.Resize();
            };
            Object.defineProperty(DisplayObject.prototype, "Ctx", {
                get: function () {
                    return this.DrawTo.Ctx;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DisplayObject.prototype, "CanvasWidth", {
                get: function () {
                    return this.Ctx.canvas.width;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DisplayObject.prototype, "CanvasHeight", {
                get: function () {
                    return this.Ctx.canvas.height;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DisplayObject.prototype, "DisplayList", {
                get: function () {
                    return this._DisplayList;
                },
                set: function (value) {
                    this._DisplayList = value;
                },
                enumerable: true,
                configurable: true
            });
            DisplayObject.prototype.Setup = function () {
            };
            DisplayObject.prototype.Update = function () {
            };
            DisplayObject.prototype.Draw = function () {
            };
            DisplayObject.prototype.IsFirstFrame = function () {
                return this.FrameCount === 0;
            };
            DisplayObject.prototype.Dispose = function () {
            };
            DisplayObject.prototype.Play = function () {
                this.IsPaused = false;
                for (var i = 0; i < this.DisplayList.Count; i++) {
                    var displayObject = this.DisplayList.GetValueAt(i);
                    displayObject.Play();
                }
            };
            DisplayObject.prototype.Pause = function () {
                this.IsPaused = true;
                for (var i = 0; i < this.DisplayList.Count; i++) {
                    var displayObject = this.DisplayList.GetValueAt(i);
                    displayObject.Pause();
                }
            };
            DisplayObject.prototype.Resize = function () {
            };
            DisplayObject.prototype.Show = function () {
                this.IsVisible = true;
                for (var i = 0; i < this.DisplayList.Count; i++) {
                    var displayObject = this.DisplayList.GetValueAt(i);
                    displayObject.Show();
                }
            };
            DisplayObject.prototype.Hide = function () {
                this.IsVisible = false;
                for (var i = 0; i < this.DisplayList.Count; i++) {
                    var displayObject = this.DisplayList.GetValueAt(i);
                    displayObject.Hide();
                }
            };
            return DisplayObject;
        })();
        drawing.DisplayObject = DisplayObject;
    })(drawing = etch.drawing || (etch.drawing = {}));
})(etch || (etch = {}));

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ObservableCollection = etch.collections.ObservableCollection;
var etch;
(function (etch) {
    var drawing;
    (function (drawing) {
        var DisplayObjectCollection = (function (_super) {
            __extends(DisplayObjectCollection, _super);
            function DisplayObjectCollection() {
                var _this = this;
                _super.call(this);
                this.CollectionChanged.on(function () {
                    // update ZIndex properties
                    for (var i = 0; i < _this.Count; i++) {
                        var obj = _this.GetValueAt(i);
                        obj.ZIndex = i;
                    }
                }, this);
            }
            // todo: use utils.Collections.swap
            DisplayObjectCollection.prototype.Swap = function (obj1, obj2) {
                var obj1Index = this.IndexOf(obj1);
                var obj2Index = this.IndexOf(obj2);
                this.SetIndex(obj1, obj2Index);
                this.SetIndex(obj2, obj1Index);
            };
            DisplayObjectCollection.prototype.ToFront = function (obj) {
                var index = 0;
                if (this.Count > 0) {
                    index = this.Count - 1;
                }
                this.SetIndex(obj, index);
            };
            DisplayObjectCollection.prototype.ToBack = function (obj) {
                this.SetIndex(obj, 0);
            };
            DisplayObjectCollection.prototype.SetIndex = function (obj, index) {
                if (index > this.Count || index < 0) {
                    throw new etch.exceptions.Exception("index out of range");
                }
                this.Remove(obj);
                this.Insert(index, obj);
            };
            Object.defineProperty(DisplayObjectCollection.prototype, "Bottom", {
                get: function () {
                    return this.GetValueAt(0);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(DisplayObjectCollection.prototype, "Top", {
                get: function () {
                    return this.GetValueAt(this.Count - 1);
                },
                enumerable: true,
                configurable: true
            });
            return DisplayObjectCollection;
        })(ObservableCollection);
        drawing.DisplayObjectCollection = DisplayObjectCollection;
    })(drawing = etch.drawing || (etch.drawing = {}));
})(etch || (etch = {}));



var DisplayObjectCollection = etch.drawing.DisplayObjectCollection;
var Point = etch.primitives.Point;

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ClockTimer = etch.engine.ClockTimer;
var DisplayObject = etch.drawing.DisplayObject;
var etch;
(function (etch) {
    var drawing;
    (function (drawing) {
        var Stage = (function (_super) {
            __extends(Stage, _super);
            function Stage(maxDelta) {
                _super.call(this);
                this.DeltaTime = new Date(0).getTime();
                this.LastVisualTick = new Date(0).getTime();
                this.Updated = new nullstone.Event();
                this.Drawn = new nullstone.Event();
                this._MaxDelta = maxDelta || 1000 / 60;
            }
            Stage.prototype.Init = function (drawTo) {
                _super.prototype.Init.call(this, drawTo);
                this.Timer = new ClockTimer();
                this.Timer.RegisterTimer(this);
            };
            Stage.prototype.OnTicked = function (lastTime, nowTime) {
                this.DeltaTime = Math.min(nowTime - this.LastVisualTick, this._MaxDelta);
                this.LastVisualTick = nowTime;
                // todo: make this configurable
                this.Ctx.clearRect(0, 0, this.Ctx.canvas.width, this.Ctx.canvas.height);
                this.UpdateDisplayList(this.DisplayList);
                this.Updated.raise(this, this.LastVisualTick);
                this.DrawDisplayList(this.DisplayList);
                this.Drawn.raise(this, this.LastVisualTick);
            };
            Stage.prototype.UpdateDisplayList = function (displayList) {
                for (var i = 0; i < displayList.Count; i++) {
                    var displayObject = displayList.GetValueAt(i);
                    displayObject.FrameCount++;
                    displayObject.DeltaTime = this.DeltaTime;
                    displayObject.LastVisualTick = this.LastVisualTick;
                    if (!displayObject.IsPaused) {
                        displayObject.Update();
                    }
                    this.UpdateDisplayList(displayObject.DisplayList);
                }
            };
            Stage.prototype.DrawDisplayList = function (displayList) {
                for (var i = 0; i < displayList.Count; i++) {
                    var displayObject = displayList.GetValueAt(i);
                    if (displayObject.IsVisible) {
                        displayObject.Draw();
                    }
                    this.DrawDisplayList(displayObject.DisplayList);
                }
            };
            Stage.prototype.ResizeDisplayList = function (displayList) {
                for (var i = 0; i < displayList.Count; i++) {
                    var displayObject = displayList.GetValueAt(i);
                    displayObject.Resize();
                    this.ResizeDisplayList(displayObject.DisplayList);
                }
            };
            Stage.prototype.Resize = function () {
                _super.prototype.Resize.call(this);
                this.ResizeDisplayList(this.DisplayList);
            };
            return Stage;
        })(drawing.DisplayObject);
        drawing.Stage = Stage;
    })(drawing = etch.drawing || (etch.drawing = {}));
})(etch || (etch = {}));



var etch;
(function (etch) {
    var events;
    (function (events) {
        (function (CollectionChangedAction) {
            CollectionChangedAction[CollectionChangedAction["Add"] = 1] = "Add";
            CollectionChangedAction[CollectionChangedAction["Remove"] = 2] = "Remove";
            CollectionChangedAction[CollectionChangedAction["Replace"] = 3] = "Replace";
            CollectionChangedAction[CollectionChangedAction["Reset"] = 4] = "Reset";
        })(events.CollectionChangedAction || (events.CollectionChangedAction = {}));
        var CollectionChangedAction = events.CollectionChangedAction;
        var CollectionChangedEventArgs = (function () {
            function CollectionChangedEventArgs() {
            }
            CollectionChangedEventArgs.Reset = function (allValues) {
                var args = new CollectionChangedEventArgs();
                Object.defineProperty(args, "Action", { value: CollectionChangedAction.Reset, writable: false });
                Object.defineProperty(args, "OldStartingIndex", { value: 0, writable: false });
                Object.defineProperty(args, "NewStartingIndex", { value: -1, writable: false });
                Object.defineProperty(args, "OldItems", { value: allValues, writable: false });
                Object.defineProperty(args, "NewItems", { value: null, writable: false });
                return args;
            };
            CollectionChangedEventArgs.Replace = function (newValue, oldValue, index) {
                var args = new CollectionChangedEventArgs();
                Object.defineProperty(args, "Action", { value: CollectionChangedAction.Replace, writable: false });
                Object.defineProperty(args, "OldStartingIndex", { value: -1, writable: false });
                Object.defineProperty(args, "NewStartingIndex", { value: index, writable: false });
                Object.defineProperty(args, "OldItems", { value: [oldValue], writable: false });
                Object.defineProperty(args, "NewItems", { value: [newValue], writable: false });
                return args;
            };
            CollectionChangedEventArgs.Add = function (newValue, index) {
                var args = new CollectionChangedEventArgs();
                Object.defineProperty(args, "Action", { value: CollectionChangedAction.Add, writable: false });
                Object.defineProperty(args, "OldStartingIndex", { value: -1, writable: false });
                Object.defineProperty(args, "NewStartingIndex", { value: index, writable: false });
                Object.defineProperty(args, "OldItems", { value: null, writable: false });
                Object.defineProperty(args, "NewItems", { value: [newValue], writable: false });
                return args;
            };
            CollectionChangedEventArgs.AddRange = function (newValues, index) {
                var args = new CollectionChangedEventArgs();
                Object.defineProperty(args, "Action", { value: CollectionChangedAction.Add, writable: false });
                Object.defineProperty(args, "OldStartingIndex", { value: -1, writable: false });
                Object.defineProperty(args, "NewStartingIndex", { value: index, writable: false });
                Object.defineProperty(args, "OldItems", { value: null, writable: false });
                Object.defineProperty(args, "NewItems", { value: newValues, writable: false });
                return args;
            };
            CollectionChangedEventArgs.Remove = function (oldValue, index) {
                var args = new CollectionChangedEventArgs();
                Object.defineProperty(args, "Action", { value: CollectionChangedAction.Remove, writable: false });
                Object.defineProperty(args, "OldStartingIndex", { value: index, writable: false });
                Object.defineProperty(args, "NewStartingIndex", { value: -1, writable: false });
                Object.defineProperty(args, "OldItems", { value: [oldValue], writable: false });
                Object.defineProperty(args, "NewItems", { value: null, writable: false });
                return args;
            };
            return CollectionChangedEventArgs;
        })();
        events.CollectionChangedEventArgs = CollectionChangedEventArgs;
    })(events = etch.events || (etch.events = {}));
})(etch || (etch = {}));

var CollectionChangedEventArgs = etch.events.CollectionChangedEventArgs;
var etch;
(function (etch) {
    var events;
    (function (events) {
        events.INotifyCollectionChanged_ = new nullstone.Interface("INotifyCollectionChanged");
        // todo: remove?
        events.INotifyCollectionChanged_.is = function (o) {
            return o && o.CollectionChanged instanceof nullstone.Event;
        };
    })(events = etch.events || (etch.events = {}));
})(etch || (etch = {}));

var etch;
(function (etch) {
    var events;
    (function (events) {
        var PropertyChangedEventArgs = (function () {
            function PropertyChangedEventArgs(propertyName) {
                Object.defineProperty(this, "PropertyName", { value: propertyName, writable: false });
            }
            return PropertyChangedEventArgs;
        })();
        events.PropertyChangedEventArgs = PropertyChangedEventArgs;
        events.INotifyPropertyChanged_ = new nullstone.Interface("INotifyPropertyChanged");
        // todo: remove?
        events.INotifyPropertyChanged_.is = function (o) {
            return o && o.PropertyChanged instanceof nullstone.Event;
        };
    })(events = etch.events || (etch.events = {}));
})(etch || (etch = {}));

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var RoutedEventArgs = etch.events.RoutedEventArgs;
var etch;
(function (etch) {
    var events;
    (function (events) {
        var RoutedEvent = (function (_super) {
            __extends(RoutedEvent, _super);
            function RoutedEvent() {
                _super.apply(this, arguments);
            }
            return RoutedEvent;
        })(nullstone.Event);
        events.RoutedEvent = RoutedEvent;
    })(events = etch.events || (etch.events = {}));
})(etch || (etch = {}));

var etch;
(function (etch) {
    var events;
    (function (events) {
        var RoutedEventArgs = (function () {
            function RoutedEventArgs() {
                this.Handled = false;
                this.Source = null;
                this.OriginalSource = null;
            }
            return RoutedEventArgs;
        })();
        events.RoutedEventArgs = RoutedEventArgs;
    })(events = etch.events || (etch.events = {}));
})(etch || (etch = {}));

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var etch;
(function (etch) {
    var primitives;
    (function (primitives) {
        var Point = (function (_super) {
            __extends(Point, _super);
            function Point() {
                _super.apply(this, arguments);
            }
            Point.prototype.Clone = function () {
                return new Point(this.x, this.y);
            };
            Point.prototype.ToVector = function () {
                return new primitives.Vector(this.x, this.y);
            };
            return Point;
        })(minerva.Point);
        primitives.Point = Point;
    })(primitives = etch.primitives || (etch.primitives = {}));
})(etch || (etch = {}));

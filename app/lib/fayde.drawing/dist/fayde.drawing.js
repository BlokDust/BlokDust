var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        Drawing.Version = '0.4.3';
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        var MAX_FPS = 100;
        var MAX_MSPF = 1000 / MAX_FPS;
        var Sketch = (function (_super) {
            __extends(Sketch, _super);
            function Sketch() {
                _super.call(this);
                this._LastVisualTick = new Date(0).getTime();
                this.Draw = new nullstone.Event();
                this.Click = new Fayde.RoutedEvent();
                this.MousePosition = new Point();
                this.DefaultStyleKey = Sketch;
                this._Timer = new Fayde.ClockTimer();
                this._Timer.RegisterTimer(this);
            }
            Sketch.prototype.CreateLayoutUpdater = function () {
                var _this = this;
                var upd = new Drawing.sketch.SketchUpdater();
                upd.assets.sketcher = function (canvas, w, h) { return _this.RaiseDraw(canvas, w, h); };
                return upd;
            };
            Sketch.prototype.RaiseDraw = function (canvas, width, height) {
                var session = new Drawing.SketchSession(canvas, width, height, this.Milliseconds);
                this.Draw.raise(this, new Drawing.SketchDrawEventArgs(session));
            };
            Sketch.prototype.OnTicked = function (lastTime, nowTime) {
                if (!this.IsAnimated)
                    return;
                var now = new Date().getTime();
                if (now - this._LastVisualTick < MAX_MSPF)
                    return;
                this._LastVisualTick = now;
                this.Milliseconds = nowTime;
                this.XamlNode.LayoutUpdater.invalidate();
            };
            Sketch.prototype.OnIsAnimatedChanged = function (args) {
            };
            Sketch.prototype.OnMouseEnter = function (e) {
                _super.prototype.OnMouseEnter.call(this, e);
            };
            Sketch.prototype.OnMouseLeave = function (e) {
                _super.prototype.OnMouseLeave.call(this, e);
            };
            Sketch.prototype.OnMouseMove = function (e) {
                _super.prototype.OnMouseMove.call(this, e);
                this.MousePosition = e.GetPosition(this);
            };
            Sketch.prototype.OnMouseLeftButtonDown = function (e) {
                _super.prototype.OnMouseLeftButtonDown.call(this, e);
                //e.Handled = true; // stop it bubbling up further
            };
            Sketch.prototype.OnMouseLeftButtonUp = function (e) {
                _super.prototype.OnMouseLeftButtonUp.call(this, e);
                //e.Handled = true; // stop it bubbling up further
            };
            Sketch.prototype.OnTouchDown = function (e) {
                _super.prototype.OnTouchDown.call(this, e);
                //e.Handled = true; // stop it bubbling up further
            };
            Sketch.IsAnimatedProperty = DependencyProperty.Register("IsAnimated", function () { return Boolean; }, Sketch, false, function (d, args) { return d.OnIsAnimatedChanged(args); });
            return Sketch;
        })(Fayde.FrameworkElement);
        Drawing.Sketch = Sketch;
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        var SketchContext = (function () {
            function SketchContext() {
                this._IsPaused = false;
                this._IsSetup = false;
                this.FrameCount = 0;
            }
            Object.defineProperty(SketchContext.prototype, "SketchSession", {
                get: function () {
                    return this._SketchSession;
                },
                set: function (value) {
                    // if this is the first time the SketchSession has been set, call Setup
                    // as there is now a context with dimensions to work with.
                    this._SketchSession = value;
                    if (!this._IsSetup) {
                        this.Setup();
                        this._IsSetup = true;
                    }
                    this.Update();
                    this.Draw();
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SketchContext.prototype, "Ctx", {
                get: function () {
                    return this.SketchSession.Ctx;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SketchContext.prototype, "Width", {
                get: function () {
                    return this.Ctx.canvas.width;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SketchContext.prototype, "Height", {
                get: function () {
                    return this.Ctx.canvas.height;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SketchContext.prototype, "Size", {
                get: function () {
                    return new Size(this.Width, this.Height);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(SketchContext.prototype, "Milliseconds", {
                get: function () {
                    return this.SketchSession.Milliseconds;
                },
                enumerable: true,
                configurable: true
            });
            SketchContext.prototype.Play = function () {
                this._IsPaused = false;
            };
            SketchContext.prototype.Pause = function () {
                this._IsPaused = true;
            };
            Object.defineProperty(SketchContext.prototype, "IsPaused", {
                get: function () {
                    return this._IsPaused;
                },
                enumerable: true,
                configurable: true
            });
            SketchContext.prototype.Setup = function () {
            };
            SketchContext.prototype.Update = function () {
            };
            SketchContext.prototype.Draw = function () {
                this.FrameCount++;
            };
            return SketchContext;
        })();
        Drawing.SketchContext = SketchContext;
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        var SketchDrawEventArgs = (function () {
            function SketchDrawEventArgs(session) {
                Object.defineProperty(this, 'SketchSession', { value: session, writable: false });
            }
            return SketchDrawEventArgs;
        })();
        Drawing.SketchDrawEventArgs = SketchDrawEventArgs;
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        var SketchSession = (function () {
            function SketchSession(canvas, width, height, milliseconds) {
                this._Canvas = canvas;
                this._Canvas.width = width;
                this._Canvas.height = height;
                this.Ctx = canvas.getContext('2d');
                Object.defineProperty(this, 'Width', { value: width, writable: false });
                Object.defineProperty(this, 'Height', { value: height, writable: false });
                this.Milliseconds = milliseconds;
            }
            return SketchSession;
        })();
        Drawing.SketchSession = SketchSession;
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        var sketch;
        (function (sketch) {
            var SketchUpdater = (function (_super) {
                __extends(SketchUpdater, _super);
                function SketchUpdater() {
                    _super.apply(this, arguments);
                }
                SketchUpdater.prototype.init = function () {
                    this.setHitTestPipe(minerva.singleton(sketch.hittest.SketchHitTestPipeDef)).setRenderPipe(minerva.singleton(sketch.render.SketchRenderPipeDef));
                    var assets = this.assets;
                    assets.canvas = document.createElement('canvas');
                    _super.prototype.init.call(this);
                };
                // on size changed, set canvas dimensions to fit.
                SketchUpdater.prototype.onSizeChanged = function (oldSize, newSize) {
                    _super.prototype.onSizeChanged.call(this, oldSize, newSize);
                    var assets = this.assets;
                    assets.canvas.width = newSize.width;
                    assets.canvas.height = newSize.height;
                };
                return SketchUpdater;
            })(minerva.core.Updater);
            sketch.SketchUpdater = SketchUpdater;
        })(sketch = Drawing.sketch || (Drawing.sketch = {}));
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        var sketch;
        (function (sketch) {
            var hittest;
            (function (hittest) {
                var SketchHitTestPipeDef = (function (_super) {
                    __extends(SketchHitTestPipeDef, _super);
                    function SketchHitTestPipeDef() {
                        _super.call(this);
                        this.removeTapin('canHitInside');
                    }
                    return SketchHitTestPipeDef;
                })(minerva.core.hittest.HitTestPipeDef);
                hittest.SketchHitTestPipeDef = SketchHitTestPipeDef;
            })(hittest = sketch.hittest || (sketch.hittest = {}));
        })(sketch = Drawing.sketch || (Drawing.sketch = {}));
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Drawing;
    (function (Drawing) {
        var sketch;
        (function (sketch) {
            var render;
            (function (render) {
                var SketchRenderPipeDef = (function (_super) {
                    __extends(SketchRenderPipeDef, _super);
                    function SketchRenderPipeDef() {
                        _super.call(this);
                        this.replaceTapin('doRender', tapins.doRender);
                    }
                    return SketchRenderPipeDef;
                })(minerva.core.render.RenderPipeDef);
                render.SketchRenderPipeDef = SketchRenderPipeDef;
                var tapins;
                (function (tapins) {
                    function doRender(input, state, output, ctx, region, tree) {
                        ctx.save();
                        minerva.core.helpers.renderLayoutClip(ctx, input, tree);
                        var w = input.actualWidth;
                        var h = input.actualHeight;
                        input.sketcher && input.sketcher(input.canvas, w, h);
                        ctx.raw.drawImage(input.canvas, 0, 0, w, h, 0, 0, w, h);
                        ctx.restore();
                        return true;
                    }
                    tapins.doRender = doRender;
                })(tapins || (tapins = {}));
            })(render = sketch.render || (sketch.render = {}));
        })(sketch = Drawing.sketch || (Drawing.sketch = {}));
    })(Drawing = Fayde.Drawing || (Fayde.Drawing = {}));
})(Fayde || (Fayde = {}));
//# sourceMappingURL=fayde.drawing.js.map
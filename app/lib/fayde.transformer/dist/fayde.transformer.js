var Fayde;
(function (Fayde) {
    var Transformer;
    (function (Transformer) {
        Transformer.Version = '0.6.1';
    })(Transformer = Fayde.Transformer || (Fayde.Transformer = {}));
})(Fayde || (Fayde = {}));
var ScaleTransform = Fayde.Media.ScaleTransform;
var TranslateTransform = Fayde.Media.TranslateTransform;
var Vector = Fayde.Utils.Vector;
var Fayde;
(function (Fayde) {
    var Transformer;
    (function (_Transformer) {
        var MAX_FPS = 100;
        var MAX_MSPF = 1000 / MAX_FPS;
        var Transformer = (function () {
            function Transformer() {
                this._LastVisualTick = new Date(0).getTime();
                this._IsPointerDown = false;
                this._IsDragging = false;
                this._PointerDelta = new Vector(0, 0);
                this._DragVelocity = new Vector(0, 0);
                this._DragAcceleration = new Vector(0, 0);
                this._VelocityAccumulationTolerance = 10; // dragging faster than this builds velocity
                this._DragMinSpeed = 2;
                this._DragMaxSpeed = 30;
                this._DragFriction = 2;
                this.UpdateTransform = new nullstone.Event();
                this._TweenEasing = TWEEN.Easing.Quadratic.InOut;
                this._Timer = new Fayde.ClockTimer();
                this._Timer.RegisterTimer(this);
            }
            Object.defineProperty(Transformer.prototype, "ScaleTransform", {
                get: function () {
                    if (!this._ScaleTransform) {
                        var scaleTransform = new ScaleTransform();
                        scaleTransform.ScaleX = 1;
                        scaleTransform.ScaleY = 1;
                        return scaleTransform;
                    }
                    return this._ScaleTransform;
                },
                set: function (value) {
                    this._ScaleTransform = value;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Transformer.prototype, "TranslateTransform", {
                get: function () {
                    if (!this._TranslateTransform) {
                        var translateTransform = new TranslateTransform();
                        translateTransform.X = 0;
                        translateTransform.Y = 0;
                        return translateTransform;
                    }
                    return this._TranslateTransform;
                },
                set: function (value) {
                    this._TranslateTransform = value;
                },
                enumerable: true,
                configurable: true
            });
            Transformer.prototype.OnTicked = function (lastTime, nowTime) {
                var now = new Date().getTime();
                if (now - this._LastVisualTick < MAX_MSPF)
                    return;
                this._LastVisualTick = now;
                TWEEN.update(nowTime);
                if (this.DragAccelerationEnabled) {
                    this._AddVelocity();
                }
                if (this.ConstrainToViewport) {
                    this._Constrain();
                }
                var transforms = new TransformGroup();
                transforms.Children.Add(this.ScaleTransform);
                transforms.Children.Add(this.TranslateTransform);
                this.UpdateTransform.raise(this, new _Transformer.TransformerEventArgs(transforms));
            };
            // todo: rename this to UpdateSize
            Transformer.prototype.SizeChanged = function (viewportSize) {
                this.ViewportSize = viewportSize;
                this.ScaleTransform = this._GetTargetScaleTransform(this.ZoomLevel);
                this.TranslateTransform = this._GetTargetTranslateTransform(this.ScaleTransform);
            };
            Transformer.prototype._ValidateZoomLevel = function (level) {
                return (level >= 0) && (level <= this.ZoomLevels);
            };
            // pass a positive or negative value
            Transformer.prototype.Zoom = function (amount) {
                var newLevel = this.ZoomLevel + amount;
                if (!this._ValidateZoomLevel(newLevel))
                    return;
                this.ZoomLevel = newLevel;
                this.ZoomTo(newLevel);
            };
            Transformer.prototype.ZoomTo = function (level) {
                var _this = this;
                if (!this._ValidateZoomLevel(level))
                    return;
                var scale = this._GetTargetScaleTransform(level);
                var translate = this._GetTargetTranslateTransform(scale);
                var currentSize = new Size(this.ScaleTransform.ScaleX, this.ScaleTransform.ScaleY);
                var newSize = new Size(scale.ScaleX, scale.ScaleY);
                var zoomTween = new TWEEN.Tween(currentSize).to(newSize, this.AnimationSpeed).delay(0).easing(this._TweenEasing).onUpdate(function () {
                    _this.ScaleTransform.ScaleX = currentSize.width;
                    _this.ScaleTransform.ScaleY = currentSize.height;
                }).onComplete(function () {
                    //console.log("zoomLevel: " + this.ZoomLevel);
                });
                zoomTween.start(this._LastVisualTick);
                this.ScrollTo(translate);
            };
            Transformer.prototype._GetTargetScaleTransform = function (level) {
                var transform = new ScaleTransform();
                transform.ScaleX = Math.pow(this.ZoomFactor, level);
                transform.ScaleY = Math.pow(this.ZoomFactor, level);
                return transform;
            };
            Transformer.prototype.Scroll = function (position) {
                var t = new TranslateTransform();
                t.X = this.TranslateTransform.X + position.x;
                t.Y = this.TranslateTransform.Y + position.y;
                this.ScrollTo(t);
            };
            Transformer.prototype.ScrollTo = function (newTransform) {
                var _this = this;
                var currentOffset = new Size(this.TranslateTransform.X, this.TranslateTransform.Y);
                var newOffset = new Size(newTransform.X, newTransform.Y);
                var scrollTween = new TWEEN.Tween(currentOffset).to(newOffset, this.AnimationSpeed).delay(0).easing(this._TweenEasing).onUpdate(function () {
                    _this.TranslateTransform.X = currentOffset.width;
                    _this.TranslateTransform.Y = currentOffset.height;
                });
                scrollTween.start(this._LastVisualTick);
            };
            Transformer.prototype._GetTargetTranslateTransform = function (targetScaleTransform) {
                var currentCenter = this._GetZoomOrigin(this.ScaleTransform);
                var targetCenter = this._GetZoomOrigin(targetScaleTransform);
                var diff = new Point(targetCenter.x - currentCenter.x, targetCenter.y - currentCenter.y);
                var translateTransform = new TranslateTransform();
                translateTransform.X = this.TranslateTransform.X - diff.x;
                translateTransform.Y = this.TranslateTransform.Y - diff.y;
                return translateTransform;
            };
            Transformer.prototype._GetZoomOrigin = function (scaleTransform) {
                // todo: use this.RenderTransformOrigin instead of halving width
                var width = scaleTransform.ScaleX * this.ViewportSize.width;
                var height = scaleTransform.ScaleY * this.ViewportSize.height;
                return new Point(width * 0.5, height * 0.5);
            };
            Transformer.prototype._Constrain = function () {
                if (this.TranslateTransform.X > 0) {
                    this.TranslateTransform.X = 0;
                }
                var width = this.ScaleTransform.ScaleX * this.ViewportSize.width;
                if (this.TranslateTransform.X < (width - this.ViewportSize.width) * -1) {
                    this.TranslateTransform.X = (width - this.ViewportSize.width) * -1;
                }
                if (this.TranslateTransform.Y > 0) {
                    this.TranslateTransform.Y = 0;
                }
                var height = this.ScaleTransform.ScaleY * this.ViewportSize.height;
                if (this.TranslateTransform.Y < (height - this.ViewportSize.height) * -1) {
                    this.TranslateTransform.Y = (height - this.ViewportSize.height) * -1;
                }
            };
            Transformer.prototype._AddVelocity = function () {
                var pointerStopped = false;
                if (this._LastDragAccelerationPointerPosition && this._LastDragAccelerationPointerPosition.Equals(this._PointerPosition)) {
                    pointerStopped = true;
                }
                this._LastDragAccelerationPointerPosition = this._PointerPosition;
                if (this._IsDragging) {
                    if (pointerStopped) {
                        // pointer isn't moving. remove velocity
                        this._RemoveVelocity();
                    }
                    else {
                        // only add to velocity if dragging fast enough
                        if (this._PointerDelta.Mag() > this._VelocityAccumulationTolerance) {
                            // calculate acceleration
                            this._DragAcceleration.Add(this._PointerDelta);
                            // integrate acceleration
                            this._DragVelocity.Add(this._DragAcceleration);
                            this._DragVelocity.Limit(this._DragMaxSpeed);
                        }
                    }
                }
                else {
                    // decelerate if _DragVelocity is above minimum speed
                    if (this._DragVelocity.Mag() > this._DragMinSpeed) {
                        // calculate deceleration
                        var friction = this._DragVelocity.Get();
                        friction.Mult(-1);
                        friction.Normalise();
                        friction.Mult(this._DragFriction);
                        this._DragAcceleration.Add(friction);
                        // integrate deceleration
                        this._DragVelocity.Add(this._DragAcceleration);
                        this.TranslateTransform.X += this._DragVelocity.X;
                        this.TranslateTransform.Y += this._DragVelocity.Y;
                    }
                }
                // reset acceleration
                this._DragAcceleration.Mult(0);
            };
            Transformer.prototype._RemoveVelocity = function () {
                this._DragVelocity.Mult(0);
            };
            Transformer.prototype.PointerDown = function (position) {
                this._IsPointerDown = true;
                this._LastPointerPosition = this._PointerPosition || new Vector(0, 0);
                this._PointerPosition = new Vector(position.x, position.y);
                this._RemoveVelocity();
            };
            Transformer.prototype.PointerUp = function () {
                this._IsPointerDown = false;
                this._IsDragging = false;
            };
            Transformer.prototype.PointerMove = function (position) {
                if (this._IsPointerDown) {
                    this._IsDragging = true;
                }
                this._LastPointerPosition = this._PointerPosition || new Vector(0, 0);
                this._PointerPosition = new Vector(position.x, position.y);
                this._PointerDelta = this._PointerPosition.Get();
                this._PointerDelta.Sub(this._LastPointerPosition);
                if (this._IsDragging) {
                    this.TranslateTransform.X += this._PointerDelta.X;
                    this.TranslateTransform.Y += this._PointerDelta.Y;
                }
            };
            return Transformer;
        })();
        _Transformer.Transformer = Transformer;
    })(Transformer = Fayde.Transformer || (Fayde.Transformer = {}));
})(Fayde || (Fayde = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TransformGroup = Fayde.Media.TransformGroup;
var Fayde;
(function (Fayde) {
    var Transformer;
    (function (Transformer) {
        var TransformerControl = (function (_super) {
            __extends(TransformerControl, _super);
            function TransformerControl() {
                _super.call(this);
                this.TransformUpdated = new nullstone.Event();
                this.DefaultStyleKey = TransformerControl;
                this.MouseLeftButtonDown.on(this.Transformer_MouseLeftButtonDown, this);
                this.MouseLeftButtonUp.on(this.Transformer_MouseLeftButtonUp, this);
                this.MouseMove.on(this.Transformer_MouseMove, this);
                this.TouchDown.on(this.Transformer_TouchDown, this);
                this.TouchUp.on(this.Transformer_TouchUp, this);
                this.TouchMove.on(this.Transformer_TouchMove, this);
                this.SizeChanged.on(this.Transformer_SizeChanged, this);
                this._Transformer = new Transformer.Transformer();
                this._Transformer.AnimationSpeed = this.AnimationSpeed;
                this._Transformer.ZoomFactor = this.ZoomFactor;
                this._Transformer.ZoomLevels = this.ZoomLevels;
                this._Transformer.ZoomLevel = this.ZoomLevel;
                this._Transformer.ConstrainToViewport = this.ConstrainToViewport;
                this._Transformer.DragAccelerationEnabled = this.DragAccelerationEnabled;
                this._Transformer.ViewportSize = this.ViewportSize;
                this._Transformer.UpdateTransform.on(this.UpdateTransform, this);
            }
            TransformerControl.prototype.OnZoomFactorChanged = function (args) {
                this._Transformer.ZoomFactor = this.ZoomFactor;
                this._Transformer.ZoomTo(this.ZoomLevel);
            };
            TransformerControl.prototype.OnZoomLevelsChanged = function (args) {
                this._Transformer.ZoomLevels = this.ZoomLevels;
                this._Transformer.ZoomTo(this.ZoomLevel);
            };
            TransformerControl.prototype.OnZoomLevelChanged = function (args) {
                this._Transformer.ZoomLevel = this.ZoomLevel;
                this._Transformer.ZoomTo(this.ZoomLevel);
            };
            TransformerControl.prototype.OnConstrainToViewportChanged = function (args) {
                this._Transformer.ConstrainToViewport = this.ConstrainToViewport;
            };
            TransformerControl.prototype.OnAnimationSpeedChanged = function (args) {
                this._Transformer.AnimationSpeed = this.AnimationSpeed;
            };
            TransformerControl.prototype.OnDragAccelerationEnabledChanged = function (args) {
                this._Transformer.DragAccelerationEnabled = this.DragAccelerationEnabled;
            };
            TransformerControl.prototype.OnXPositionChanged = function (args) {
                this._Transformer.Scroll(new Point(args.NewValue, 0));
            };
            TransformerControl.prototype.OnYPositionChanged = function (args) {
                this._Transformer.Scroll(new Point(0, args.NewValue));
            };
            Object.defineProperty(TransformerControl.prototype, "ViewportSize", {
                get: function () {
                    return new Size(this.ActualWidth, this.ActualHeight);
                },
                enumerable: true,
                configurable: true
            });
            TransformerControl.prototype.UpdateTransform = function (sender, e) {
                this.RenderTransform = e.Transforms;
                this.TransformUpdated.raise(this, e);
            };
            // intialise viewport size and handle resizing
            TransformerControl.prototype.Transformer_SizeChanged = function (sender, e) {
                this._Transformer.SizeChanged(this.ViewportSize);
            };
            TransformerControl.prototype.Transformer_MouseLeftButtonDown = function (sender, e) {
                if (e.Handled)
                    return;
                this.CaptureMouse();
                this._Transformer.PointerDown(e.AbsolutePos);
            };
            TransformerControl.prototype.Transformer_MouseLeftButtonUp = function (sender, e) {
                if (e.Handled)
                    return;
                this._Transformer.PointerUp();
                this.ReleaseMouseCapture();
            };
            TransformerControl.prototype.Transformer_MouseMove = function (sender, e) {
                if (e.Handled)
                    return;
                this._Transformer.PointerMove(e.AbsolutePos);
            };
            TransformerControl.prototype.Transformer_TouchDown = function (sender, e) {
                if (e.Handled)
                    return;
                e.Device.Capture(this);
                var pos = e.GetTouchPoint(null);
                this._Transformer.PointerDown(new Point(pos.Position.x, pos.Position.y));
            };
            TransformerControl.prototype.Transformer_TouchUp = function (sender, e) {
                if (e.Handled)
                    return;
                e.Device.ReleaseCapture(this);
                this._Transformer.PointerUp();
            };
            TransformerControl.prototype.Transformer_TouchMove = function (sender, e) {
                if (e.Handled)
                    return;
                var pos = e.GetTouchPoint(null);
                this._Transformer.PointerMove(new Point(pos.Position.x, pos.Position.y));
            };
            TransformerControl.ZoomFactorProperty = DependencyProperty.RegisterFull("ZoomFactor", function () { return Number; }, TransformerControl, 2, function (d, args) { return d.OnZoomFactorChanged(args); });
            TransformerControl.ZoomLevelsProperty = DependencyProperty.RegisterFull("ZoomLevels", function () { return Number; }, TransformerControl, 0, function (d, args) { return d.OnZoomLevelsChanged(args); });
            TransformerControl.ZoomLevelProperty = DependencyProperty.RegisterFull("ZoomLevel", function () { return Number; }, TransformerControl, 0, function (d, args) { return d.OnZoomLevelChanged(args); });
            TransformerControl.ConstrainToViewportProperty = DependencyProperty.RegisterFull("ConstrainToViewport", function () { return Boolean; }, TransformerControl, true, function (d, args) { return d.OnConstrainToViewportChanged(args); });
            TransformerControl.AnimationSpeedProperty = DependencyProperty.RegisterFull("AnimationSpeed", function () { return Number; }, TransformerControl, 250, function (d, args) { return d.OnAnimationSpeedChanged(args); });
            TransformerControl.DragAccelerationEnabledProperty = DependencyProperty.RegisterFull("DragAccelerationEnabled", function () { return Boolean; }, TransformerControl, true, function (d, args) { return d.OnDragAccelerationEnabledChanged(args); });
            TransformerControl.XPositionProperty = DependencyProperty.RegisterFull("XPosition", function () { return Number; }, TransformerControl, 0, function (d, args) { return d.OnXPositionChanged(args); });
            TransformerControl.YPositionProperty = DependencyProperty.RegisterFull("YPosition", function () { return Number; }, TransformerControl, 0, function (d, args) { return d.OnYPositionChanged(args); });
            return TransformerControl;
        })(Fayde.Controls.ContentControl);
        Transformer.TransformerControl = TransformerControl;
    })(Transformer = Fayde.Transformer || (Fayde.Transformer = {}));
})(Fayde || (Fayde = {}));
var Fayde;
(function (Fayde) {
    var Transformer;
    (function (Transformer) {
        var TransformerEventArgs = (function () {
            function TransformerEventArgs(transforms) {
                Object.defineProperty(this, 'Transforms', { value: transforms, writable: false });
            }
            return TransformerEventArgs;
        })();
        Transformer.TransformerEventArgs = TransformerEventArgs;
    })(Transformer = Fayde.Transformer || (Fayde.Transformer = {}));
})(Fayde || (Fayde = {}));
//# sourceMappingURL=fayde.transformer.js.map
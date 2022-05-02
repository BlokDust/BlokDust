/// <reference path="Control.ts" />
/// <reference path="../Input/KeyEventArgs.ts" />

module Fayde.Controls {
    var Key = Input.Key;
    var MAX_UNDO_COUNT = 10;
    export class TextBoxBase extends Control {
        static CaretBrushProperty = DependencyProperty.RegisterCore("CaretBrush", () => Media.Brush, TextBoxBase);
        static SelectionForegroundProperty = DependencyProperty.RegisterCore("SelectionForeground", () => Media.Brush, TextBoxBase);
        static SelectionBackgroundProperty = DependencyProperty.RegisterCore("SelectionBackground", () => Media.Brush, TextBoxBase);
        static SelectionLengthProperty = DependencyProperty.RegisterFull("SelectionLength", () => Number, TextBoxBase, 0, undefined, undefined, true, positiveIntValidator);
        static SelectionStartProperty = DependencyProperty.RegisterFull("SelectionStart", () => Number, TextBoxBase, 0, undefined, undefined, true, positiveIntValidator);
        static BaselineOffsetProperty = DependencyProperty.Register("BaselineOffset", () => Number, TextBoxBase);
        static MaxLengthProperty = DependencyProperty.RegisterFull("MaxLength", () => Number, TextBoxBase, 0, undefined, undefined, undefined, positiveIntValidator);
        CaretBrush: Media.Brush;
        SelectionForeground: Media.Brush;
        SelectionBackground: Media.Brush;
        SelectionLength: number;
        SelectionStart: number;
        BaselineOffset: number;
        MaxLength: number;

        private _Selecting: boolean = false;
        private _Captured: boolean = false;

        IsReadOnly = false;
        AcceptsReturn = false;

        $ContentProxy = new Internal.TextBoxContentProxy();
        $Proxy: Text.Proxy;
        $Advancer: Internal.ICursorAdvancer;
        $View: Internal.TextBoxView;

        constructor (eventsMask: Text.EmitChangedType) {
            super();
            var view = this.$View = this.CreateView();
            view.MouseLeftButtonDown.on((s, e) => this.OnMouseLeftButtonDown(e), this);
            view.MouseLeftButtonUp.on((s, e) => this.OnMouseLeftButtonUp(e), this);
            this.$Proxy = new Text.Proxy(eventsMask, MAX_UNDO_COUNT);

            this._SyncFont();
        }

        private _SyncFont () {
            var view = this.$View;
            var propds = [
                Control.ForegroundProperty,
                Control.FontFamilyProperty,
                Control.FontSizeProperty,
                Control.FontStretchProperty,
                Control.FontStyleProperty,
                Control.FontWeightProperty
            ];
            propds.forEach(propd => propd.Store.ListenToChanged(this, propd, (dobj, args) => view.setFontProperty(propd, args.NewValue), this));
        }

        CreateView (): Internal.TextBoxView {
            return new Internal.TextBoxView();
        }

        get Cursor (): CursorType {
            var cursor = this.GetValue(FrameworkElement.CursorProperty);
            if (cursor === CursorType.Default)
                return CursorType.IBeam;
            return cursor;
        }

        OnApplyTemplate () {
            super.OnApplyTemplate();
            this.$ContentProxy.setElement(<FrameworkElement>this.GetTemplateChild("ContentElement", FrameworkElement), this.$View);
        }

        OnLostFocus (e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.$View.setIsFocused(false);
        }

        OnGotFocus (e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.$View.setIsFocused(true);
        }

        OnMouseLeftButtonDown (e: Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;
            e.Handled = true;
            this.Focus();
            this._Captured = this.CaptureMouse();
            this._Selecting = true;

            var cursor = this.$View.GetCursorFromPoint(e.GetPosition(this.$View));
            this.$Proxy.beginSelect(cursor);
        }

        OnMouseLeftButtonUp (e: Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;
            if (this._Captured)
                this.ReleaseMouseCapture();
            e.Handled = true;
            this._Selecting = false;
            this._Captured = false;
        }

        OnMouseMove (e: Input.MouseEventArgs) {
            if (!this._Selecting)
                return;
            e.Handled = true;
            var cursor = this.$View.GetCursorFromPoint(e.GetPosition(this.$View));
            this.$Proxy.adjustSelection(cursor);
        }

        OnTouchDown (e: Input.TouchEventArgs) {
            super.OnTouchDown(e);
            if (e.Handled)
                return;
            e.Handled = true;
            this.Focus();
            e.Device.Capture(this);
            this._Selecting = true;

            var pos = e.Device.GetTouchPoint(this.$View).Position;
            var cursor = this.$View.GetCursorFromPoint(pos);
            this.$Proxy.beginSelect(cursor);
        }

        OnTouchUp (e: Input.TouchEventArgs) {
            super.OnTouchUp(e);
            if (e.Handled)
                return;
            if (e.Device.Captured === this)
                e.Device.ReleaseCapture(this);
            e.Handled = true;
            this._Selecting = false;
        }

        OnTouchMove (e: Input.TouchEventArgs) {
            super.OnTouchMove(e);
            if (!this._Selecting)
                return;
            e.Handled = true;
            var pos = e.Device.GetTouchPoint(this.$View).Position;
            var cursor = this.$View.GetCursorFromPoint(pos);
            this.$Proxy.adjustSelection(cursor);
        }

        OnKeyDown (args: Input.KeyEventArgs) {
            switch (args.Key) {
                case Key.Shift: //shift
                case Key.Ctrl: //ctrl
                case Key.Alt: //alt
                    return;
            }

            var isReadOnly = this.IsReadOnly;
            var handled = false;
            var proxy = this.$Proxy;
            proxy.begin();

            switch (args.Key) {
                case Key.Back:
                    if (isReadOnly)
                        break;
                    handled = this._KeyDownBackSpace(args.Modifiers);
                    break;
                case Key.Delete:
                    if (isReadOnly)
                        break;
                    if (args.Modifiers.Shift) {
                        //Shift+Delete => Cut
                        handled = true;
                    } else {
                        handled = this._KeyDownDelete(args.Modifiers);
                    }
                    break;
                case Key.Insert:
                    if (args.Modifiers.Shift) {
                        //Shift+Insert => Paste
                        handled = true;
                    } else if (args.Modifiers.Ctrl) {
                        //Ctrl+Insert => Copy
                        handled = true;
                    }
                    break;
                case Key.PageDown:
                    handled = this._KeyDownPageDown(args.Modifiers);
                    break;
                case Key.PageUp:
                    handled = this._KeyDownPageUp(args.Modifiers);
                    break;
                case Key.Home:
                    handled = this._KeyDownHome(args.Modifiers);
                    break;
                case Key.End:
                    handled = this._KeyDownEnd(args.Modifiers);
                    break;
                case Key.Left:
                    handled = this._KeyDownLeft(args.Modifiers);
                    break;
                case Key.Right:
                    handled = this._KeyDownRight(args.Modifiers);
                    break;
                case Key.Down:
                    handled = this._KeyDownDown(args.Modifiers);
                    break;
                case Key.Up:
                    handled = this._KeyDownUp(args.Modifiers);
                    break;
                default:
                    if (args.Modifiers.Ctrl) {
                        switch (args.Key) {
                            case Key.A:
                                //Ctrl+A => Select All
                                handled = true;
                                proxy.selectAll();
                                break;
                            case Key.C:
                                //Ctrl+C => Copy
                                //TODO: Copy to clipboard
                                handled = true;
                                break;
                            case Key.X:
                                //Ctrl+X => Cut
                                if (isReadOnly)
                                    break;
                                //TODO: Copy to clipboard
                                //TODO: Clear text
                                handled = true;
                                break;
                            case Key.Y:
                                //Ctrl+Y => Redo
                                if (!isReadOnly) {
                                    handled = true;
                                    proxy.redo();
                                }
                                break;
                            case Key.Z:
                                //Ctrl+Z => Undo
                                if (!isReadOnly) {
                                    handled = true;
                                    proxy.undo();
                                }
                                break;
                        }
                    }
                    break;
            }

            if (handled) {
                args.Handled = handled;
            }
            proxy.end();

            if (!args.Handled && !isReadOnly)
                this.PostOnKeyDown(args);
        }

        PostOnKeyDown (args: Input.KeyEventArgs) {
            if (args.Handled)
                return;

            if (args.Modifiers.Alt || args.Modifiers.Ctrl)
                return;

            var proxy = this.$Proxy;
            proxy.begin();
            if (args.Key === Key.Enter) {
                if (this.AcceptsReturn === true) {
                    proxy.enterText('\n');
                    args.Handled = true;
                }
            } else if (args.Char != null && !args.Modifiers.Ctrl && !args.Modifiers.Alt) {
                proxy.enterText(args.Char);
                args.Handled = true;
            }
            proxy.end();
        }

        private _KeyDownBackSpace (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Shift || modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;
            var start = 0;
            var length = 0;

            if (cursor !== anchor) {
                length = Math.abs(cursor - anchor);
                start = Math.min(anchor, cursor);
            } else if (modifiers.Ctrl) {
                start = this.$Advancer.CursorPrevWord(cursor);
                length = cursor - start;
            } else if (cursor > 0) {
                start = this.$Advancer.CursorPrevChar(cursor);
                length = cursor - start;
            }

            proxy.removeText(start, length);
            return true;
        }

        private _KeyDownDelete (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Shift || modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;
            var start = 0;
            var length = 0;

            if (cursor !== anchor) {
                length = Math.abs(cursor - anchor);
                start = Math.min(anchor, cursor);
            } else if (modifiers.Ctrl) {
                //Ctrl+Delete => delete the word start at the cursor
                length = this.$Advancer.CursorNextWord(cursor) - cursor;
                start = cursor;
            } else {
                length = this.$Advancer.CursorNextChar(cursor) - cursor;
                start = cursor;
            }

            return proxy.removeText(start, length);
        }

        private _KeyDownPageDown (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;

            cursor = this.$Advancer.CursorDown(cursor, true);

            if (!modifiers.Shift)
                anchor = cursor;

            return proxy.setAnchorCursor(anchor, cursor);
        }

        private _KeyDownPageUp (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;

            cursor = this.$Advancer.CursorUp(cursor, true);

            if (!modifiers.Shift)
                anchor = cursor;

            return proxy.setAnchorCursor(anchor, cursor);
        }

        private _KeyDownHome (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;

            if (modifiers.Ctrl) {
                cursor = this.$Advancer.CursorBegin(cursor);
            } else {
                cursor = this.$Advancer.CursorLineBegin(cursor);
            }

            if (!modifiers.Shift)
                anchor = cursor;

            return proxy.setAnchorCursor(anchor, cursor);
        }

        private _KeyDownEnd (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;

            if (modifiers.Ctrl) {
                cursor = this.$Advancer.CursorEnd(cursor);
            } else {
                cursor = this.$Advancer.CursorLineEnd(cursor);
            }

            if (!modifiers.Shift)
                anchor = cursor;

            return proxy.setAnchorCursor(anchor, cursor);
        }

        private _KeyDownLeft (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;

            if (modifiers.Ctrl) {
                cursor = this.$Advancer.CursorPrevWord(cursor);
            } else if (!modifiers.Shift && anchor !== cursor) {
                cursor = Math.min(anchor, cursor);
            } else {
                cursor = this.$Advancer.CursorPrevChar(cursor);
            }

            if (!modifiers.Shift)
                anchor = cursor;

            return proxy.setAnchorCursor(anchor, cursor);
        }

        private _KeyDownRight (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var anchor = proxy.selAnchor;
            var cursor = proxy.selCursor;

            if (modifiers.Ctrl) {
                cursor = this.$Advancer.CursorNextWord(cursor);
            } else if (!modifiers.Shift && anchor !== cursor) {
                cursor = Math.max(anchor, cursor);
            } else {
                cursor = this.$Advancer.CursorNextChar(cursor);
            }

            if (!modifiers.Shift)
                anchor = cursor;

            return proxy.setAnchorCursor(anchor, cursor);
        }

        private _KeyDownDown (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var cursor = this.$Advancer.CursorDown(proxy.selCursor, false);
            var anchor = proxy.selAnchor;
            if (!modifiers.Shift)
                anchor = cursor;
            return proxy.setAnchorCursor(anchor, cursor);
        }

        private _KeyDownUp (modifiers: Input.IModifiersOn): boolean {
            if (modifiers.Alt)
                return false;

            var proxy = this.$Proxy;
            var cursor = this.$Advancer.CursorUp(proxy.selCursor, false);
            var anchor = proxy.selAnchor;
            if (!modifiers.Shift)
                anchor = cursor;
            return proxy.setAnchorCursor(anchor, cursor);
        }
    }
    Fayde.RegisterType(TextBoxBase, Fayde.XMLNSINTERNAL);

    module reactions {
        DPReaction<Media.Brush>(TextBoxBase.CaretBrushProperty, (tbb: TextBoxBase, ov, nv) => {
            tbb.$View.setCaretBrush(nv);
        });
        DPReaction<number>(TextBoxBase.SelectionStartProperty, (tbb: TextBoxBase, ov, nv) => {
            tbb.$Proxy.setSelectionStart(nv);
            tbb.$View.setSelectionStart(nv);
        }, false);
        DPReaction<number>(TextBoxBase.SelectionLengthProperty, (tbb: TextBoxBase, ov, nv) => {
            tbb.$Proxy.setSelectionLength(nv);
            tbb.$View.setSelectionLength(nv);
        }, false);
        DPReaction<Media.Brush>(TextBoxBase.SelectionBackgroundProperty, (tbb: TextBoxBase, ov, nv) => {
            tbb.$View.setFontAttr("selectionBackground", nv);
            tbb.XamlNode.LayoutUpdater.invalidate();
        });
        DPReaction<Media.Brush>(TextBoxBase.SelectionForegroundProperty, (tbb: TextBoxBase, ov, nv) => {
            tbb.$View.setFontAttr("selectionForeground", nv);
            tbb.XamlNode.LayoutUpdater.invalidate();
        });
        DPReaction<number>(TextBoxBase.MaxLengthProperty, (tbb: TextBoxBase, ov, nv) => {
            tbb.$Proxy.maxLength = nv;
        }, false);
    }

    function positiveIntValidator (dobj: DependencyObject, propd: DependencyProperty, value: any): boolean {
        if (typeof value !== 'number')
            return false;
        return value >= 0;
    }
}
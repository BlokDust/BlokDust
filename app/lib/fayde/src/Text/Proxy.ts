module Fayde.Text {
    export enum EmitChangedType {
        NOTHING = 0,
        SELECTION = 1 << 0,
        TEXT = 1 << 1,
    }

    export class Proxy implements ITextOwner {
        selAnchor: number = 0;
        selCursor: number = 0;
        selText: string = "";
        text: string = "";
        maxLength: number = 0;
        acceptsReturn: boolean = false;

        private $$batch: number = 0;
        private $$emit = EmitChangedType.NOTHING;
        private $$syncing: boolean = false;
        private $$eventsMask: EmitChangedType;

        private $$history: Text.History.Tracker;

        SyncSelectionStart: (value: number) => void;
        SyncSelectionLength: (value: number) => void;
        SyncText: (value: string) => void;

        constructor (eventsMask: EmitChangedType, maxUndoCount: number) {
            this.$$eventsMask = eventsMask;
            this.$$history = new Text.History.Tracker(maxUndoCount);
            this.SyncSelectionStart = (value: number) => {
            };
            this.SyncSelectionLength = (value: number) => {
            };
            this.SyncText = (value: string) => {
            };
        }

        setAnchorCursor (anchor: number, cursor: number): boolean {
            if (this.selAnchor === anchor && this.selCursor === cursor)
                return false;
            this.SyncSelectionStart(Math.min(anchor, cursor));
            this.SyncSelectionLength(Math.abs(cursor - anchor));
            this.selAnchor = anchor;
            this.selCursor = cursor;
            this.$$emit |= EmitChangedType.SELECTION;
            return true;
        }

        enterText (newText: string): boolean {
            var anchor = this.selAnchor;
            var cursor = this.selCursor;
            var length = Math.abs(cursor - anchor);
            var start = Math.min(anchor, cursor);

            if ((this.maxLength > 0 && this.text.length >= this.maxLength) || (newText === '\r') && !this.acceptsReturn)
                return false;

            if (length > 0) {
                this.$$history.replace(anchor, cursor, this.text, start, length, newText);
                this.text = Text.Buffer.replace(this.text, start, length, newText);
            } else {
                this.$$history.enter(anchor, cursor, start, newText);
                this.text = Text.Buffer.insert(this.text, start, newText);
            }

            this.$$emit |= EmitChangedType.TEXT;
            cursor = start + 1;
            anchor = cursor;

            return this.setAnchorCursor(anchor, cursor);
        }

        removeText (start: number, length: number): boolean {
            if (length <= 0)
                return false;

            this.$$history.delete(this.selAnchor, this.selCursor, this.text, start, length);
            this.text = Text.Buffer.cut(this.text, start, length);

            this.$$emit |= EmitChangedType.TEXT;

            return this.setAnchorCursor(start, start);
        }

        undo () {
            var action = this.$$history.undo(this);
            if (!action)
                return;

            var anchor = action.SelectionAnchor;
            var cursor = action.SelectionCursor;

            this.$$batch++;
            this.SyncSelectionStart(Math.min(anchor, cursor));
            this.SyncSelectionLength(Math.abs(cursor - anchor));
            this.$$emit = EmitChangedType.TEXT | EmitChangedType.SELECTION;
            this.selAnchor = anchor;
            this.selCursor = cursor;
            this.$$batch--;

            this.$syncEmit();
        }

        redo () {
            var anchor = this.$$history.redo(this);
            if (anchor == null)
                return;
            var cursor = anchor;

            this.$$batch++;
            this.SyncSelectionStart(Math.min(anchor, cursor));
            this.SyncSelectionLength(Math.abs(cursor - anchor));
            this.$$emit = EmitChangedType.TEXT | EmitChangedType.SELECTION;
            this.selAnchor = anchor;
            this.selCursor = cursor;
            this.$$batch--;

            this.$syncEmit();
        }

        begin () {
            this.$$emit = EmitChangedType.NOTHING;
            this.$$batch++;
        }

        end () {
            this.$$batch--;
            this.$syncEmit();
        }

        beginSelect (cursor: number) {
            this.$$batch++;
            this.$$emit = EmitChangedType.NOTHING;
            this.SyncSelectionStart(cursor);
            this.SyncSelectionLength(0);
            this.$$batch--;

            this.$syncEmit();
        }

        adjustSelection (cursor: number) {
            var anchor = this.selAnchor;

            this.$$batch++;
            this.$$emit = EmitChangedType.NOTHING;
            this.SyncSelectionStart(Math.min(anchor, cursor));
            this.SyncSelectionLength(Math.abs(cursor - anchor));
            this.selAnchor = anchor;
            this.selCursor = cursor;
            this.$$batch--;

            this.$syncEmit();
        }

        selectAll () {
            this.select(0, this.text.length);
        }

        clearSelection (start: number) {
            this.$$batch++;
            this.SyncSelectionStart(start);
            this.SyncSelectionLength(0);
            this.$$batch--;
        }

        select (start: number, length: number): boolean {
            start = Math.min(Math.max(0, start), this.text.length);
            length = Math.min(Math.max(0, length), this.text.length - start);

            this.$$batch++;
            this.SyncSelectionStart(start);
            this.SyncSelectionLength(length);
            this.$$batch--;

            this.$syncEmit();
            return true;
        }

        setSelectionStart (value: number) {
            var length = Math.abs(this.selCursor - this.selAnchor);
            var start = value;
            if (start > this.text.length) {
                this.SyncSelectionStart(this.text.length);
                return;
            }

            if (start + length > this.text.length) {
                this.$$batch++;
                length = this.text.length - start;
                this.SyncSelectionLength(length);
                this.$$batch--;
            }

            var changed = (this.selAnchor !== start);

            this.selCursor = start + length;
            this.selAnchor = start;

            this.$$emit |= EmitChangedType.SELECTION;
            this.$syncEmit();
        }

        setSelectionLength (value: number) {
            var start = Math.min(this.selAnchor, this.selCursor);
            var length = value;
            if (start + length > this.text.length) {
                length = this.text.length - start;
                this.SyncSelectionLength(length);
                return;
            }

            var changed = (this.selCursor !== (start + length));

            this.selCursor = start + length;
            this.selAnchor = start;
            this.$$emit |= EmitChangedType.SELECTION;
            this.$syncEmit();
        }

        setText (value: string) {
            var text = value || "";
            if (!this.$$syncing) {
                if (this.text.length > 0) {
                    this.$$history.replace(this.selAnchor, this.selCursor, this.text, 0, this.text.length, text);
                    this.text = Text.Buffer.replace(this.text, 0, this.text.length, text);
                } else {
                    this.$$history.insert(this.selAnchor, this.selCursor, 0, text);
                    this.text = text + this.text;
                }

                this.$$emit |= EmitChangedType.TEXT;
                this.clearSelection(0);

                this.$syncEmit(false);
            }
        }

        private $syncEmit (syncText?: boolean) {
            syncText = syncText !== false;

            if (this.$$batch !== 0 || this.$$emit === EmitChangedType.NOTHING)
                return;

            if (syncText && (this.$$emit & EmitChangedType.TEXT))
                this.$syncText();

            /*
             this.$$emit &= this.$$eventsMask;
             if (this.$$emit & TextBoxEmitChangedType.TEXT) {
             Incite(this, { type: 'text' });
             }
             if (this.$$emit & TextBoxEmitChangedType.SELECTION) {
             Incite(this, { type: 'selection' });
             }
             */

            this.$$emit = EmitChangedType.NOTHING;
        }

        private $syncText () {
            this.$$syncing = true;
            this.SyncText(this.text);
            this.$$syncing = false;
        }
    }
}
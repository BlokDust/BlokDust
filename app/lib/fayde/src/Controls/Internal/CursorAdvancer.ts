module Fayde.Controls.Internal {
    export interface ICursorAdvancer {
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

    export class TextBoxCursorAdvancer implements ICursorAdvancer {
        constructor (private $textOwner: Text.ITextOwner) {
        }

        CursorDown (cursor: number, isPage: boolean): number {
            //TODO:
            return cursor;
        }

        CursorUp (cursor: number, isPage: boolean): number {
            //TODO:
            return cursor;
        }

        CursorNextWord (cursor: number): number {
            //TODO:
            return cursor;
        }

        CursorPrevWord (cursor: number): number {
            //TODO:
            return cursor;
        }

        CursorNextChar (cursor: number): number {
            var text = this.$textOwner.text;
            if (text && text.charAt(cursor) === '\r' && text.charAt(cursor + 1) === '\n')
                return cursor + 2;
            return Math.min(text.length, cursor + 1);
        }

        CursorPrevChar (cursor: number): number {
            var text = this.$textOwner.text;
            if (cursor >= 2 && text && text.charAt(cursor - 2) === '\r' && text.charAt(cursor - 1) === '\n')
                return cursor - 2;
            return Math.max(0, cursor - 1);
        }

        CursorLineBegin (cursor: number): number {
            var text = this.$textOwner.text;
            var r = text.lastIndexOf("\r", cursor);
            var n = text.lastIndexOf("\n", cursor);
            return Math.max(r, n, 0);
        }

        CursorLineEnd (cursor: number): number {
            var text = this.$textOwner.text;
            var len = text.length;
            var r = text.indexOf("\r", cursor);
            if (r < 0) r = len;
            var n = text.indexOf("\n", cursor);
            if (n < 0) n = len;
            return Math.min(r, n);
        }

        CursorBegin (cursor: number): number {
            return 0;
        }

        CursorEnd (cursor: number): number {
            return this.$textOwner.text.length;
        }
    }

    export class PasswordBoxCursorAdvancer implements ICursorAdvancer {
        constructor (private $textOwner: Text.ITextOwner) {
        }

        CursorDown (cursor: number, isPage: boolean): number {
            return this.CursorEnd(cursor);
        }

        CursorUp (cursor: number, isPage: boolean): number {
            return this.CursorBegin(cursor);
        }

        CursorNextWord (cursor: number): number {
            return this.CursorEnd(cursor);
        }

        CursorPrevWord (cursor: number): number {
            return this.CursorBegin(cursor);
        }

        CursorNextChar (cursor: number): number {
            var text = this.$textOwner.text;
            if (text && text.charAt(cursor) === '\r' && text.charAt(cursor + 1) === '\n')
                return cursor + 2;
            return Math.min(text.length - 1, cursor + 1);
        }

        CursorPrevChar (cursor: number): number {
            var text = this.$textOwner.text;
            if (cursor >= 2 && text && text.charAt(cursor - 2) === '\r' && text.charAt(cursor - 1) === '\n')
                return cursor - 2;
            return Math.max(0, cursor - 1);
        }

        CursorLineBegin (cursor: number): number {
            return this.CursorBegin(cursor);
        }

        CursorLineEnd (cursor: number): number {
            return this.CursorEnd(cursor);
        }

        CursorBegin (cursor: number): number {
            return this.$textOwner.text.length;
        }

        CursorEnd (cursor: number): number {
            return 0;
        }
    }
}
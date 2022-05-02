module Fayde.Text.History {
    export class InsertAction implements IAction {
        SelectionAnchor: number;
        SelectionCursor: number;
        Start: number;
        Text: string;
        IsGrowable: boolean;

        constructor (selectionAnchor: number, selectionCursor: number, start: number, inserted: string, isAtomic?: boolean) {
            this.SelectionAnchor = selectionAnchor;
            this.SelectionCursor = selectionCursor;
            this.Start = start;
            this.Text = inserted;
            this.IsGrowable = isAtomic !== true;
        }

        Undo (bo: ITextOwner) {
            bo.text = Buffer.cut(bo.text, this.Start, this.Text.length);
        }

        Redo (bo: ITextOwner): number {
            bo.text = Buffer.insert(bo.text, this.Start, this.Text);
            return this.Start + this.Text.length;
        }

        Insert (start: number, text: string) {
            if (!this.IsGrowable || start !== (this.Start + this.Text.length))
                return false;
            this.Text += text;
            return true;
        }
    }
}
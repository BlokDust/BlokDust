module Fayde.Text.History {
    export class DeleteAction implements IAction {
        SelectionAnchor: number;
        SelectionCursor: number;
        Start: number;
        Text: string;

        constructor (selectionAnchor: number, selectionCursor: number, buffer: string, start: number, length: number) {
            this.SelectionAnchor = selectionAnchor;
            this.SelectionCursor = selectionCursor;
            this.Start = start;
            this.Text = buffer.substr(start, length);
        }

        Undo (bo: ITextOwner) {
            bo.text = Buffer.insert(bo.text, this.Start, this.Text);
        }

        Redo (bo: ITextOwner): number {
            bo.text = Buffer.cut(bo.text, this.Start, this.Text.length);
            return this.Start;
        }
    }
}
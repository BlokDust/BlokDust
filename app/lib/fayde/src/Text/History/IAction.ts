module Fayde.Text.History {
    export interface IAction {
        SelectionAnchor: number;
        SelectionCursor: number;
        Undo(bufferholder: ITextOwner);
        Redo(bufferholder: ITextOwner): number;
    }
}
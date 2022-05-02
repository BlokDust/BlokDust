module Fayde.Text.History {
    export class Tracker {
        private $$undo: IAction[] = [];
        private $$redo: IAction[] = [];
        private $$maxUndoCount: number;

        constructor (maxUndoCount: number) {
            this.$$maxUndoCount = maxUndoCount;
        }

        get canUndo (): boolean {
            return this.$$undo.length > 0;
        }

        get canRedo (): boolean {
            return this.$$redo.length > 0;
        }

        undo (bufferholder: ITextOwner): IAction {
            if (this.$$undo.length < 1)
                return null;

            var action = this.$$undo.pop();
            if (this.$$redo.push(action) > this.$$maxUndoCount)
                this.$$redo.shift();

            action.Undo(bufferholder);
            return action
        }

        redo (bufferholder: ITextOwner): number {
            if (this.$$redo.length < 1)
                return;

            var action = this.$$redo.pop();
            if (this.$$undo.push(action) > this.$$maxUndoCount)
                this.$$undo.shift();

            return action.Redo(bufferholder);
        }

        enter (anchor: number, cursor: number, start: number, newText: string) {
            var action = <InsertAction>this.$$undo[this.$$undo.length - 1];

            if (!(action instanceof InsertAction) || !action.Insert(start, newText))
                return this.insert(anchor, cursor, start, newText);
            if (this.$$redo.length > 0)
                this.$$redo = [];
        }

        insert (anchor: number, cursor: number, start: number, newText: string) {
            this.$doAction(new InsertAction(anchor, cursor, start, newText));
        }

        replace (anchor: number, cursor: number, text: string, start: number, length: number, newText: string) {
            this.$doAction(new ReplaceAction(anchor, cursor, text, start, length, newText));
        }

        delete (anchor: number, cursor: number, text: string, start: number, length: number) {
            this.$doAction(new Text.History.DeleteAction(anchor, cursor, text, start, length));
        }

        private $doAction (action: IAction) {
            this.$$undo.push(action);
            if (this.$$undo.length > this.$$maxUndoCount)
                this.$$undo.shift();
            this.$$redo = [];
        }
    }
}
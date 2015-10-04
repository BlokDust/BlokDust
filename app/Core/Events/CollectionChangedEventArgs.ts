export enum CollectionChangedAction {
    Add = 1,
    Remove = 2,
    Replace = 3,
    Reset = 4,
}

export class CollectionChangedEventArgs implements nullstone.IEventArgs {
    Action: CollectionChangedAction;
    OldStartingIndex: number;
    NewStartingIndex: number;
    OldItems: any[];
    NewItems: any[];

    static Reset(allValues: any[]): CollectionChangedEventArgs {
        var args = new CollectionChangedEventArgs();
        Object.defineProperty(args, "Action", { value: CollectionChangedAction.Reset, writable: false });
        Object.defineProperty(args, "OldStartingIndex", { value: 0, writable: false });
        Object.defineProperty(args, "NewStartingIndex", { value: -1, writable: false });
        Object.defineProperty(args, "OldItems", { value: allValues, writable: false });
        Object.defineProperty(args, "NewItems", { value: null, writable: false });
        return args;
    }
    static Replace(newValue: any, oldValue: any, index: number): CollectionChangedEventArgs {
        var args = new CollectionChangedEventArgs();
        Object.defineProperty(args, "Action", { value: CollectionChangedAction.Replace, writable: false });
        Object.defineProperty(args, "OldStartingIndex", { value: -1, writable: false });
        Object.defineProperty(args, "NewStartingIndex", { value: index, writable: false });
        Object.defineProperty(args, "OldItems", { value: [oldValue], writable: false });
        Object.defineProperty(args, "NewItems", { value: [newValue], writable: false });
        return args;
    }
    static Add(newValue: any, index: number): CollectionChangedEventArgs {
        var args = new CollectionChangedEventArgs();
        Object.defineProperty(args, "Action", { value: CollectionChangedAction.Add, writable: false });
        Object.defineProperty(args, "OldStartingIndex", { value: -1, writable: false });
        Object.defineProperty(args, "NewStartingIndex", { value: index, writable: false });
        Object.defineProperty(args, "OldItems", { value: null, writable: false });
        Object.defineProperty(args, "NewItems", { value: [newValue], writable: false });
        return args;
    }
    static AddRange(newValues: any[], index: number): CollectionChangedEventArgs {
        var args = new CollectionChangedEventArgs();
        Object.defineProperty(args, "Action", { value: CollectionChangedAction.Add, writable: false });
        Object.defineProperty(args, "OldStartingIndex", { value: -1, writable: false });
        Object.defineProperty(args, "NewStartingIndex", { value: index, writable: false });
        Object.defineProperty(args, "OldItems", { value: null, writable: false });
        Object.defineProperty(args, "NewItems", { value: newValues, writable: false });
        return args;
    }
    static Remove(oldValue: any, index: number): CollectionChangedEventArgs {
        var args = new CollectionChangedEventArgs();
        Object.defineProperty(args, "Action", { value: CollectionChangedAction.Remove, writable: false });
        Object.defineProperty(args, "OldStartingIndex", { value: index, writable: false });
        Object.defineProperty(args, "NewStartingIndex", { value: -1, writable: false });
        Object.defineProperty(args, "OldItems", { value: [oldValue], writable: false });
        Object.defineProperty(args, "NewItems", { value: null, writable: false });
        return args;
    }
}
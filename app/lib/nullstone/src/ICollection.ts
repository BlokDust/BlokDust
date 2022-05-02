/// <reference path="Interface" />

module nullstone {
    export interface ICollection<T> extends IEnumerable<T> {
        Count: number;
        GetValueAt(index: number): T;
        SetValueAt(index: number, value: T);
        Insert(index: number, value: T);
        Add(value: T);
        Remove(value: T): boolean;
        RemoveAt(index: number);
        Clear();
    }
    export var ICollection_ = new Interface<ICollection<any>>("ICollection");
}
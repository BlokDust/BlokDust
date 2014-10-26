import IDisplayObject = require("./IDisplayObject");

class DisplayObjectCollection<T extends IDisplayObject> extends Fayde.Collections.ObservableCollection<T> {

    constructor(){
        super();

        this.CollectionChanged.Subscribe(() => {
            // update ZIndex properties
            for (var i = 0; i < this.Count; i++){
                var obj = this.GetValueAt(i);
                obj.ZIndex = i;
            }
        }, this)
    }

    SwapIndex(obj1: T, obj2: T){
        var obj1Index = this.IndexOf(obj1);
        var obj2Index = this.IndexOf(obj2);

        this.SetIndex(obj1, obj2Index);
        this.SetIndex(obj2, obj1Index);
    }

    ToFront(obj: T){
        this.SetIndex(obj, this.Count - 1);
    }

    ToBack(obj: T){
        this.SetIndex(obj, 0);
    }

    SetIndex(obj: T, index: number){
        if (index > this.Count - 1 || index < 0){
            throw new Exception("index out of range");
        }

        this.Remove(obj);
        this.Insert(obj, index);
    }

    get Top(): T{
        return this.GetValueAt(this.Count - 1);
    }
}

export = DisplayObjectCollection;
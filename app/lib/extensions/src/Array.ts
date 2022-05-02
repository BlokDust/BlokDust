if (!Array.prototype.clone) {
    Array.prototype.clone = function (): any[] {
        return this.slice(0);
    };
}

if (!Array.prototype.contains) {
    Array.prototype.contains = function (val: any): boolean{
        return this.indexOf(val) !== -1;
    };
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement: any, fromIndex?: number): number {
        var i = (fromIndex || 0);
        var j = this.length;

        for (i; i < j; i++) {
            if (this[i] === searchElement) {
                return i;
            }
        }
        return -1;
    };
}

Array.prototype.indexOfTest = function (test: (item: any) => boolean, fromIndex?: number): number {
    var i = (fromIndex || 0);
    var j = this.length;

    for (i; i < j; i++) {
        if (test(this[i])) return i;
    }

    return -1;
};

Array.prototype.insert = function(item: any, index: number){
    this.splice(index, 0, item);
};

if (!Array.prototype.last) {
    Array.prototype.last = function (): any {
        return this[this.length - 1];
    };
}

Array.prototype.move = function (fromIndex, toIndex): void {
    this.splice(toIndex, 0, this.splice(fromIndex, 1)[0]);
};

Array.prototype.remove = function(item: any) {
    var index = this.indexOf(item);
    if (index > -1) {
        this.splice(index, 1);
    }
};

Array.prototype.removeAt = function(index: number) {
    this.splice(index, 1);
};
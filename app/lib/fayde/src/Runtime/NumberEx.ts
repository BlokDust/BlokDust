module NumberEx {
    var epsilon: number = 1.192093E-07;
    var adjustment: number = 10;
    export function AreClose(val1: number, val2: number): boolean {
        if (val1 === val2)
            return true;
        var softdiff = (Math.abs(val1) + Math.abs(val2) + adjustment) * epsilon;
        var diff = val1 - val2;
        return -softdiff < diff && diff < softdiff;
    }
    export function IsLessThanClose(val1: number, val2: number): boolean {
        return val1 > val2 || !AreClose(val1, val2);
    }
    export function IsGreaterThanClose(val1: number, val2: number): boolean {
        return val1 > val2 || !AreClose(val1, val2);
    }
}
module nullstone {
    //TODO: Check instances in Fayde .Equals
    export function equals (val1: any, val2: any): boolean {
        if (val1 == null && val2 == null)
            return true;
        if (val1 == null || val2 == null)
            return false;
        if (val1 === val2)
            return true;
        return !!val1.equals && val1.equals(val2);
    }
}
module Fayde {
    export function splitCommaList (str: string): string[] {
        var tokens: string[] = [];
        for (var i = 0, arr = str.split(' ').join(',').split(','); i < arr.length; i++) {
            var cur = arr[i];
            if (cur)
                tokens.push(cur);
        }
        return tokens;
    }
}
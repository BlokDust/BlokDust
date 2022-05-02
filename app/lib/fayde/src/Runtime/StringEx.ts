module StringEx {
    export function Format(format: string, ...items: any[]): string {
        var args = arguments;
        return format.replace(/{(\d+)}/g, function (match: string, ...matches: any[]): string {
            var i = parseInt(matches[0]);
            return typeof items[i] != 'undefined'
                ? items[i]
                : match;
        });
    }
}
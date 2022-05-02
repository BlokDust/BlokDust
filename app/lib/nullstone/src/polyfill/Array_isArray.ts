if (!Array.isArray) {
    Array.isArray = (arg: any): arg is Array<any> => {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}
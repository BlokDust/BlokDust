declare function escape(s: string): any;
declare function unescape(s: string): any;

interface Array<T>{
    clone(): Array<T>;
    contains(val: any): boolean;
    indexOf(searchElement: any, fromIndex?: number): number;
    indexOfTest(test: (item: any) => boolean, fromIndex?: number): number;
    insert(item: any, index: number): void;
    last(): any;
    move(fromIndex: number, toIndex: number): void;
    remove(item: any): void;
    removeAt(index: number): void;
}

interface Math {
    clamp(value: number, min: number, max: number): number;
    constrain(value: number, low: number, high: number): number;
    degreesToRadians(degrees: number): number;
    distanceBetween(x1: number, y1: number, x2: number, y2: number): number;
    lerp(start: number, stop: number, amount: number): number;
    mag(a: number, b: number, c: number): number;
    map(value: number, start1: number, stop1: number, start2: number, stop2: number): number;
    median(values: number[]): number;
    randomBetween(low: number, high?: number): number;
    roundToDecimalPlace(num: number, dec: number): number;
    radiansToDegrees(radians: number): number;
    normalise(num: number, min: number, max: number): number;
    sq(n: number): number;
    TAU: number;
}

interface Number {
    isInteger(): boolean;
}

interface String {
    b64_to_utf8(str: string): string;
    contains(str: string): boolean;
    endsWith(text: string): boolean;
    hashCode(): string;
    isAlphanumeric(): boolean;
    ltrim(): string;
    rtrim(): string;
    startsWith(text: string): boolean;
    toCssClass(): string;
    toFileName(): string;
    trim(): string;
    utf8_to_b64(str: string): string;
}

interface StringConstructor {
    format(template: string, ...args: any[]): string;
}
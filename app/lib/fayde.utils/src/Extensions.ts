
interface HTMLElement{
    ontouchstart: any;
}

interface Window{
    btoa(str: string): string;
    atob(str: string): string;
    escape(s: string): any;
    unescape(s: string): any;
}

interface Window {
    webkitRequestAnimationFrame(callback: FrameRequestCallback): number;
    mozRequestAnimationFrame(callback: FrameRequestCallback): number;
    oRequestAnimationFrame(callback: FrameRequestCallback): number;
}

// String
interface String {
    format(template: string, ...args: any[]): string;
    startsWith(text: string): boolean;
    endsWith(text: string): boolean;
    ltrim(): string;
    rtrim(): string;
    fulltrim(): string;
    toFileName(): string;
    contains(str: string): boolean;
    utf8_to_b64(str: string): string;
    b64_to_utf8(str: string): string;
}

// Array
interface Array<T>{
    clone(): Array<T>;
    last(): any;
    contains(item: any): boolean;
    remove(item: any): void;
    removeAt(index: number): void;
    insert(item: any, index: number): void;
}

// Number
interface Number {
    isInt(): boolean;
}

// Math
interface Math {
    clamp(value: number, min: number, max: number): number;
    constrain(value: number, low: number, high: number): number;
    degreesToRadians(degrees: number): number;
    distanceBetween(x1: number, y1: number, x2: number, y2: number): number;
    lerp(start: number, stop: number, amount: number): number;
    mag(a: number, b: number, c: number): number;
    map(value: number, start1: number, stop1: number, start2: number, stop2: number): number;
    randomBetween(low: number, high?: number): number;
    roundToDecimalPlace(num: number, dec: number): number;
    radiansToDegrees(radians: number): number;
    normalise(num: number, min: number, max: number): number;
    sq(n: number): number;
    TAU: number;
}
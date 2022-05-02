declare module perfex {
    var version: string;
}
declare module perfex {
    interface IPhase {
        tag: string;
        start: number;
        duration: number;
    }
    class phases {
        static current: IPhase;
        static all: IPhase[];
        static getUniqueTags(): string[];
        static start(tag: string): void;
    }
}
declare module perfex {
    interface ITiming {
        tag: string;
        context: any;
        phase: IPhase;
        start: number;
        duration: number;
    }
    class timer {
        static all: ITiming[];
        static get(tag?: string, phase?: string): ITiming[];
        static count(tag?: string, phase?: string): number;
        static getSplit(tag?: string, phase?: string): ISplitTiming[];
        static getUniqueTags(): string[];
        static reset(): void;
        static start(tag: string, context: any): void;
        static stop(): void;
    }
}
declare module perfex {
    interface ISplit {
        start: number;
        end: number;
    }
    interface ISplitTiming extends ITiming {
        exclusions: ISplit[];
    }
}
declare module perfex {
    function xavg(tag: string, phase?: string): number;
}
interface Console {
    table(data: any[]): any;
}
declare module perfex {
    function table(): void;
}
declare module perfex {
    function total(tag: string, phase?: string): number;
    function xtotal(tag: string, phase?: string): number;
}

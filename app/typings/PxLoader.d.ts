/**
 * Created by luketwyman on 23/02/2015.
 */

declare var PxLoader:any;

interface PxLoader {
    start(): void;
    addImage(url: string): void;
    addCompletionListener(func): void;
}
/**
 * Created by luketwyman on 07/03/2015.
 */

interface JQueryStatic {
    wave64(url: string, height?: number, width?: number, rgb?: number[], callback?: (data: any) => void): void;
}

interface Window {
    $: any;
}
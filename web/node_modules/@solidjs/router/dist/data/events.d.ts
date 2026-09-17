import type { RouterContext } from "../types.js";
type NativeEventConfig = {
    preload?: boolean;
    explicitLinks?: boolean;
    actionBase?: string;
    transformUrl?: (url: string) => string;
};
export declare function setupNativeEvents({ preload, explicitLinks, actionBase, transformUrl }?: NativeEventConfig): (router: RouterContext) => void;
export {};

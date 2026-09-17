import type { BaseRouterProps } from "./components.jsx";
import type { JSX } from "solid-js";
export type RouterProps = BaseRouterProps & {
    url?: string;
    actionBase?: string;
    explicitLinks?: boolean;
    preload?: boolean;
    /**
     * Opt-in explicit scroll restoration for back/forward navigation (read
     * once, not reactive). Sets `history.scrollRestoration = "manual"` and
     * restores saved positions after the navigation settles, replacing the
     * browser heuristic that loses offsets when the destination route forces
     * a layout while rendering (#577).
     */
    scrollRestoration?: boolean;
};
export declare function Router(props: RouterProps): JSX.Element;

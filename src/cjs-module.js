import ClosetViewer from "./viewer";
export {default as ClosetViewer} from "./viewer";
export var viewer = new ClosetViewer();
if (window !== undefined) {
    if (typeof window === 'object') {
        if (window.cvInit) window.cvInit();
    }
}
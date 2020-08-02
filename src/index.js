import "@babel/polyfill";
import ClosetViewer from "./viewer";
global._babelPolyfill = false;

const closet = window.closet || {
  viewer: new ClosetViewer()
};

closet.ClosetViewer = ClosetViewer;

export { closet };

if (window.cvInit) window.cvInit();

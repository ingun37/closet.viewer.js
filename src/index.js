
import 'babel-polyfill';
import ClosetViewer from './viewer';
global._babelPolyfill = false;

const closet = window.closet || {
  viewer: new ClosetViewer(),
};

closet.ClosetViewer = ClosetViewer;

exports.closet = closet;

if (window.cvInit) window.cvInit();



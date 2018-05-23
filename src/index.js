
import 'babel-polyfill'
import { init, loadZrestUrl, onWindowResize, getCameraMatrix } from './viewer'

window.closet = window.closet || (function () {
    return {
        init: function(data) {
            console.log(data)
        },
        viewer: {
            init: function(data){
                console.log('viewer init', data)
                init(data);
            },
            loadZrestUrl: function(url, callback) {
                if(url !== ''){
                    loadZrestUrl(url, callback);
                }
            },
            onWindowResize : function(data){
                onWindowResize(data);
            },
            getCameraMatrix : function() {
                getCameraMatrix();
            }
        }
    }
}())

if(window.cvInit) window.cvInit()



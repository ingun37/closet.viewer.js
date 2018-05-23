
import 'babel-polyfill'
import { init, loadZrestUrl, onWindowResize, getCameraMatrix, loadProgress } from './viewer'

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
            loadZrestUrl: function(url) {
                if(url !== ''){
                    loadZrestUrl(url);
                }
            },
            onWindowResize : function(data){
                onWindowResize(data);
            },
            getCameraMatrix : function() {
                getCameraMatrix();
            },
            loadProgress : function(){
                loadProgress();
            }
        }
    }
}())

if(window.cvInit) window.cvInit()



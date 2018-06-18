
import 'babel-polyfill'
import { init, loadZrestUrl, onWindowResize, getCameraMatrix, changeColorway } from './viewer'

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

                return getCameraMatrix();
            },
            changeColorway : function(index){
                changeColorway(index);
            }
        }
    }
}())

if(window.cvInit) window.cvInit()



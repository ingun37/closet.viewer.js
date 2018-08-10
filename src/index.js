
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
            // camera matrix나 colorway index 업데이트 안할 거면 각 변수를 undefined 상태로 넘기면 된다.
            loadZrestUrlWithParameters: function(url, cameraMatrix, colorwayIndex, callback) {
                if(url !== ''){
                    loadZrestUrl(url, cameraMatrix, colorwayIndex, callback);
                }
            },
            onWindowResize : function(data){
                onWindowResize(data);
            },
            getCameraMatrix : function() {                
                return getCameraMatrix();
            },
            setCameraMatrix : function(mat, bUpdateRendering) {
                setCameraMatrix(mat, bUpdateRendering);
            },
            changeColorway : function(index){
                changeColorway(index);
            }
        }
    }
}())

if(window.cvInit) window.cvInit()



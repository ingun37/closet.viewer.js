

import { init, loadZrestUrl } from './viewer'

window.CLO = window.CLO || (function () {

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
                    loadZrestUrl(url)
                }

            }
        }
    }
}())

if(window.cvInit) window.cvInit()



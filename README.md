
## <a name="3"></a> CLOSET 3D Viewer
>CLOSET 3D Viewer is a JavaScript library to see the object in 3D on any web pages or applications supporting for HTTPS and JavaScript. Following the guide below, you can make your own 3D web viewer. As CLOSET has been also implemented with this library, you can refer to CLOSET(https://www.clo-set.com/Marketplace/Detail?itemid=a39e955d947647539314f85443c90e9b) as an example.   
>(Guide will be updated in a few days) 

### Usage ###

Download the [library](https://github.com/clovirtualfashion/closet.viewer.js) and include it in your HTML.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CLO Viewer Test</title>
</head>
<body>
<script type='text/javascript' src='js/clo.viewer.js'></script>
<script>
    CLO.viewer.init({
        element: 'detail_viewer',
        width: 620,
        height: 780
    })

    CLO.viewer.loadZrestUrl('https://s3.clo3d.com/zpac/denim.zrest');
</script>
</body>
</html>
```


### Methods

#### CLO.viewer.init(\[options:Object\])

Initialize viewer with options.

#### Options

| Option | Type | Description |
|--------|--------|--------|
| `element`| String | Specifies a `id` for the container element.
| `width`| Number | Width of viewer.
| `height`| Number | Height of viewer.

#### CLO.viewer.loadZrestUrl(\[zrestUrl:String\])

Load the file from the server and places the 3D object on the viewer.

### Browser Support

Works in `IE11+`, and all modern browsers.
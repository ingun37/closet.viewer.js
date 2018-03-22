
## CLOSET 3D Viewer
CLOSET 3D Viewer is a JavaScript library to see the object in 3D on any web pages or applications supporting for HTTPS and JavaScript. By following the guide below, you can make your own 3D web viewer. As CLOSET has been also implemented with this library, you can refer to CLOSET(https://www.clo-set.com/Marketplace/Detail?itemid=a39e955d947647539314f85443c90e9b) as an example.   

### Download ###

Only you need is "closet.viewer.js" file under "dist" folder. If you want to customize the library, see [How to build](#1)

### Usage ###

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CLO Viewer Test</title>
</head>
<body>
<script type='text/javascript' src='js/closet.viewer.js'></script>
<script>
    closet.viewer.init({
        element: 'detail_viewer',
        width: 620,
        height: 780
    })

    closet.viewer.loadZrestUrl('https://s3.clo3d.com/zpac/denim.zrest');
</script>
</body>
</html>
```

Here you need to get the URL of ZRest file. ZRest is a file format containing 3D geometry and material information only. When you upload a 3D file(ZPrj, Zpac, AVT and etc) onto CLOSET, a ZRest file is automatically generated in CLOSET server. You can get the URL of the ZRest file by using CLOSET API - [api/Item/ZrestUrl/{itemId}](http://www.clo-set.com/swagger/ui/index#!/ItemApi/ItemApi_ZrestUrl).

### Methods

#### closet.viewer.init(\[options:Object\])

Initialize viewer with options.

#### Options

| Option | Type | Description |
|--------|--------|--------|
| `element`| String | Specifies a `id` for the container element.
| `width`| Number | Width of viewer.
| `height`| Number | Height of viewer.

#### closet.viewer.loadZrestUrl(\[zrestUrl:String\])

Load the file from the server and places the 3D object on the viewer.

### Browser Support

Works in `IE11+`, and all modern browsers.

### <a name="1"></a> How to build

If you want to modify the source code and make your own library, please follow the guide below. 

1. First, you need to install [Node.js](https://nodejs.org/dist/v8.10.0/node-v8.10.0-x64.msi). 

2. Clone a copy of the git repo by running:
```bash
git clone https://github.com/clovirtualfashion/closet.viewer.js.git
```

3. Enter the viewer directory:
```bash
cd closet.viewer.js
```

4. Install all dependencies and run the build script:
```bash
npm install && npm run build
```

5. Running develop with webpack-dev-server:
```bash
npm run develop
```

6. Then, you can get closet.viewer.js in "dist" folder.


## Overview
CLOSET API provides a programming interface for file management and data retrieval on CLOSET. To access to the API, you need to create an account first. Then, you can access all files and data which will be saved with your account by using the API. In addition to the API, we also provide CLOSET 3D Viewer - a library to view 3D model(ZRrj, ZPac, AVT, ...) in your web sites or applications. 

1. [Create your account](#1)
2. [CLOSET API](#2)
3. [CLOSET 3D Viewer](#3)

## <a name="1"></a> Create your account

1. Sign up for a CLOSET and get email verification
>Proceed to sign-up. If you already have an account, you may skip this part. 

<kbd>![Image](https://files.clo-set.com/public/common/images/signup.png)</kbd>
  
>When you complete the sign-up, you will receive a verification email.  
Click the activate button.

<kbd>![Image](https://files.clo-set.com/public/common/images/activate.png)</kbd>
  
<br/>    
      
2. Log in and go to CLOSET main page
>When you verify your email, you will be logged in to the CLOSET and you will be taken to the main page. 
>Once the account is created, you can use the API. Before getting into how to use API, we'd like to give you a brief introduction on some key features to help your understanding.
>In the main page, you can see Company and Workrooms which are automatically created. If you enter Company by clicking the icon, you can see Brand, Season and Workroom. These can be viewed as hierarchical folders that make file management easier in fashion companies. Workroom is the only folder where the garment files will be placed. There are two types of Workrooms. 1) Public Room is a Workroom that is shared over all Brands in a Company and 2) Workroom is the space that can be accessed only within a Brand.

<kbd>![Image](https://files.clo-set.com/public/common/images/main.png)</kbd>

<br/>    

3. Enter the workroom and upload the file
>In Workroom, you can upload any files including ZPrj, Zpac, AVT, jpg, png, pdf, and etc. This can be done either by hand or by using the API. After uploading is completed, CLO 3D file (ZPrj, ZPac and AVT) is converted to the compact file format that is used by CLOSET 3D Viewer. As the conversion usually takes tens of seconds, it is done on the server side of CLOSET.

<kbd>![Image](https://files.clo-set.com/public/common/images/publicroom.png)</kbd>

<kbd>![Image](https://files.clo-set.com/public/common/images/upload.png)</kbd>

<br/>    

4. Try with the 3D Viewer
>Once the conversion is completed, you can check the object through the 3D Viewer. Click the thumbnail to enter its detail page. To see the object in 3D, you usually need to wait for the conversion time (10~20 secs). This is the same as using the API.

<kbd>![Image](https://files.clo-set.com/public/common/images/viewer.png)</kbd>

<br/>    

## <a name="2"></a> CLOSET API
>With using the API, you can upload/download files to/from the Workroom and retrieve the information of the uploaded file.
To use CLOSET APIs, you must first call the login API to get a token. If the login succeeds, you will receive a token in response. Then, you can call the APIs through HTTP basic authentication with the token and CLOSET ID (the email address).

#### Server URL 
>All requests should be made to `https://www.clo-set.com/`

#### Authentication
>All requests require [HTTP Basic Authentication](https://en.wikipedia.org/wiki/Basic_access_authentication) authentication and should be made over HTTPS. HTTP Basic Authentication requires a username and password. Input your CLOSET ID(the email address) and the token as the username and password, respectively. Note that CLOSET ID and Token should be encoded with Base64.

#### Example - Request Header
```
Authorization: Basic { base64({Email}:{Token}) }
```
#### API Documentation
>You can find all APIs with examples at https://www.clo-set.com/swagger.

<br/>    

## <a name="3"></a> CLOSET 3D Viewer
>CLOSET 3D Viewer is a JavaScript library to see the object in 3D on any web pages or applications supporting for HTTPS and JavaScript. Following the guide below, you can make your own 3D web viewer. As CLOSET has been also implemented with this library, you can refer to CLOSET(https://www.clo-set.com/Marketplace/Detail?itemid=a39e955d947647539314f85443c90e9b) as an example.   
>(Guide will be updated in a few days) 

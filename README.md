# This is a Fork of [Javascript BCR Library](https://github.com/syneo-tools-gmbh/Javascript-BCR-Library) 1.0.12

## Using the Lib
For further Information regarding the Library-Use please visit:  [Javascript BCR Library](https://github.com/syneo-tools-gmbh/Javascript-BCR-Library)

Many thanks to the original authors

The Authors of the original Library are: **Gaspare Ferraro, Renzo Sala, Simone Ponte, Paolo Macco**

As far I can tell, the Javascript BCR Library is licensed using the Apache Licences Version 2.0. For further information please visit [Javascript BCR Library](https://github.com/syneo-tools-gmbh/Javascript-BCR-Library) and have a Look at `LICENSE.md`.

## Why the fork?
I am currently developing a business card reader as a PWA for a project at my university. 

I have used create-react-app to create the app. Since create-react-app is based on Babel and eslint the BCR library has not yet been implemented as a JavaScript module, this caused a few problems.

To simplify the integration, I use `grunt` (and the plugin `grunt-contrib-uglify-es`) to pack all the JavaScript files into a bundle file that is stored in the `dist` folder. `bcr.min.js` does not contain a QR code lib. To use the QR code functionality, `bcr.qr.min.js` must be used.

The language training `data` from `tesseract.js`  and the tesseract-files (`tesseract-core` and `worker.min.js`) are copied (using `grunt-contrib-copy` ) to the `dist/data/` folder.

`languages`, `cropStrategy`, `ocrEngines`, `bcr` are now exported and can be included using the import statement.

In addition, the two bundle files gets a corresponding header with instructions for `eslint`.

Furthermore, the default for `defaultDynamicInclude` and `defaultQRScanner` are set to `false`.

## Tesseract.js V2
I have added support for Tesseract.js V2. If you want to use it, select `bcr.tesseractv2.min.js` or  `bcr.tesseractv2.qr.min.js`.

Also you need to copy `tesseractv2` and `tesseractv2-lang-data` to your public folder. And you also have to set `tesseractVersion` on `2` when you call initialize.


```
import {bcr,ocrEngines, cropStrategy, languages, tesseractVersions} from "../libs/bcrminifed/bcr.tesseractv2.min.js";

...

const DEFAULT_ENGINE = ocrEngines.TESSERACT;
const DEFAULT_CROP_STRATEGY = cropStrategy.SMART;
const DEFAULT_LANGUAGE = languages.GERMAN;
const DEFAULT_VERSION = tesseractVersions.V2;

...

return await bcr.initialize(DEFAULT_ENGINE,DEFAULT_CROP_STRATEGY,language, undefined, undefined, false, false, DEFAULT_VERSION);
```

When not using any more, please clean-up (the Worker get's terminated). The performance is better, when you not initialize and terminate the Worker each time you recognize a Business-Card.
```
         return await bcr.cleanUp();
```
If you want to use other trainings-data, change this part. All Files are downloaded form this git-Project [Trainungsdata](https://github.com/naptha/tessdata). 

There you can get also Download Trainigsdata for other languages. But regard, you need also Data-Sets in your language for the BCR-Analyzing.
```
{expand: true, cwd: 'src/tesseractv2-lang-data/', src: ['**'], dest: 'dist/tesseractv2-lang-data', filter: 'isFile'},
// Here you can change Trainingdata
/* {expand: true, cwd: 'src/tesseractv2-lang-data-best/', src: ['**'], dest: 'dist/tesseractv2-lang-data', filter: 'isFile'},
{expand: true, cwd: 'src/tesseractv2-lang-data-fast/', src: ['**'], dest: 'dist/tesseractv2-lang-data', filter: 'isFile'}*/
```

## How to use?
Clone the repository and use `npm install` to resolve the dependencies. 

If you want to use offline-detection, please have a look at this part, and maybe customize it.

```
    // ************************************************************
    // Customize this part
    // ************************************************************
    let executionPath = "";
    if(window && window.location && window.location.href) {
        executionPath = window.location.href;
    } else {
        executionPath = currentScriptPath();
    }

    //Tesseract.js V1
    let WORKER_PATH = executionPath + 'tesseract/worker.min.js';
    let TESSERACT_PATH = executionPath + 'tesseract/tesseract-core.js';
    let LANG_PATH = executionPath + 'data/';

    //Tesseract.js V2
    let WORKER_PATH_V2 = executionPath + 'tesseractv2/worker.min.js';
    let TESSERACT_PATH_V2 = executionPath + 'tesseractv2/tesseract-core.wasm.js';
    let LANG_PATH_V2 = executionPath + 'tesseractv2-lang-data';
    // ************************************************************
    // Customize this part
    // ************************************************************
```

Then you can use `npm run build` to start the grunt-bundling.

The bundle-Files, the tesseract-files and the training-files are now in the `dist`-Folder.

When you are using create-react-app and want to use offline-detection, copy `data` and `tesseract` to your public-folder.

When you don't want a minified-Version for testing, you can make adjustments in `gruntfile.js`.

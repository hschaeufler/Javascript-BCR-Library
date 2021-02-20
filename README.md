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

The language training data from `tesseract.js` is copied (using `grunt-contrib-copy` ) to the `dist/data/` folder.

`languages`, `cropStrategy`, `ocrEngines`, `bcr` are now exported and can be included using the import statement.

In addition, the two bundle files gets a corresponding header with instructions for `eslint`.

Furthermore, the default for `defaultDynamicInclude` and `defaultQRScanner` are set to `false`.


## How to use?
Clone the repository and use `npm install` to resolve the dependencies. 

Then you can use `npm run build` to start the grunt-bundling.

The bundle-Files and the training-files are now in the `dist`-Folder.

When you don't want a minified-Version for testing, you can make adjustments in `gruntfile.js`.

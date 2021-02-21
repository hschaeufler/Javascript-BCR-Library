/**
 * Cordova BCR Library 1.0.12
 * Authors: Gaspare Ferraro, Renzo Sala
 * Contributors: Simone Ponte, Paolo Macco
 * Filename: bcr.js
 * Description: main library
 *
 * @license
 * Copyright 2019 Syneo Tools GmbH. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* QR CODE LIBRARY*/
/* https://github.com/LazarSoft/jsqrcode */

// ************************************************************
// Enum values
// ************************************************************
export const languages = {
    DANISH: "dan",
    GERMAN: "deu",
    ENGLISH: "eng",
    FRENCH: "fra",
    ITALIAN: "ita",
    SPANISH: "spa",
    SWEDISH: "swe"
};

export const cropStrategy = {
    SMART: "smartcrop"
};

export const ocrEngines = {
    TESSERACT: "tesseract",
    GOOGLEVISION: "google"
};

export const tesseractVersions = {
    V1: 1,
    V2: 2
};

// ****************************************************************************
// Language Datasets
// ****************************************************************************
let languagesDS = {};

// ****************************************************************************
// BCR main class
// ****************************************************************************
export let bcr = (function () {

    // ************************************************************
    // private properties (defaults)
    // ************************************************************
    let defaultMaxWidth = 2160;
    let defaultMaxHeight = 1440;
    let defaultLanguage = languages.GERMAN;
    let defaultCropStrategy = cropStrategy.SMART;
    let defaultQRScanner = false;
    let defaultOcrEngine = ocrEngines.TESSERACT;
    let defaultTesseractVersion = tesseractVersions.V1;
    let defaultDynamicInclude = false;
    let inputOcr = "";
    let tesseractWorker;

    // ************************************************************
    // private methods
    // ************************************************************

    // get current script path
    let currentScriptPath = function () {

        let scripts = document.querySelectorAll('script[src]');
        let returnExecutionPath = "";

        scripts.forEach(function (item) {
            if (item.src.indexOf('bcr.js') > -1) {
                let currentScript = item.src;
                let currentScriptChunks = currentScript.split('/');
                let currentScriptFile = currentScriptChunks[currentScriptChunks.length - 1];
                returnExecutionPath = currentScript.replace(currentScriptFile, '');
            }
        });

        return returnExecutionPath;
    };

    // load files
    let loadJs = function (filename, callback, attrs) {
        console.log("Loading", filename);
        let scriptTag = document.createElement('script');

        if (typeof filename !== "undefined")
            scriptTag.src = filename;

        scriptTag.onload = callback;
        scriptTag.onreadystatechange = callback;

        if (typeof attrs !== "undefined") {
            Object.keys(attrs).forEach(function (k) {
                scriptTag[k] = attrs[k]
            });
        }
        document.body.appendChild(scriptTag);
    };



    // ************************************************************
    // Customize this part
    // ************************************************************
    let executionPath = "";
    if(window && window.location && window.location.origin) {
        executionPath = window.location.origin + "/";
    } else if(window && window.location && window.location.href) {
        let url = window.location.href
        let arr = url ? url.split("/") : null;
        let result = arr && arr.length >2 ? arr[0] + "//" + arr[2] : "";
        executionPath = result + "/"

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

    // ************************************************************
    // Tesseract V2 - Part
    // ************************************************************
    let progressCallback = (m) => {
        console.log(m);
    };

    let createTesseractV2Engine = function (language, callback) {
        initalizeWorker(language).then(function (worker) {
            tesseractWorker = worker;
            // resolve after tesseract initialization
            if(callback){
                callback();
            }
        });
    };

    //initalize Tesseract V2-Worker
    async function initalizeWorker(language){
        const { createWorker, PSM } = Tesseract;

        const worker = createWorker({
            workerPath: WORKER_PATH_V2,
            langPath: LANG_PATH_V2,
            corePath: TESSERACT_PATH_V2,
            logger: m => {
                if(progressCallback){
                    progressCallback(m);
                }
            }
        });
        await worker.load();
        await worker.loadLanguage(language);
        await worker.initialize(language);
        //siehe https://yvonnickfrin.dev/ocr-in-javascript-with-tesseract
        // und https://github.com/tesseract-ocr/tesseract/blob/4.0.0/src/ccstruct/publictypes.h#L163
        //AUTO
        await worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO,
        });
        return worker;
    }


    // ************************************************************
    // public methods and properties
    // ************************************************************
    return {

        /**
         * initialize the bcr reader
         * @param {string} ocrEngine the selected engine (tesseract, googlevision).
         * @param {string} crop the crop strategy.
         * @param {string} language the language trained data.
         * @param {number} width max internal width.
         * @param {number} height max internal height.
         * @param {boolean} qrScanner enabled
         * @param {boolean} dynamicInclude use dynamic library js include.
         * @return {void} return promise
         */
        initialize: function (ocrEngine = defaultOcrEngine, crop = defaultCropStrategy, language = defaultLanguage, width = defaultMaxWidth, height = defaultMaxHeight, qrScanner = defaultQRScanner, dynamicInclude = defaultDynamicInclude, tesseractVersion = defaultTesseractVersion) {
            return new Promise(resolve => {

                // check crop_strategy
                if (typeof width === "undefined") width = defaultMaxWidth;

                // check crop_strategy
                if (typeof height === "undefined") height = defaultMaxHeight;

                // check crop_strategy
                if (typeof crop === "undefined") crop = defaultCropStrategy;

                // check crop_strategy
                if (typeof language === "undefined") language = defaultLanguage;

                // Check QR Scanner
                if (typeof qrScanner === "undefined") qrScanner = defaultQRScanner;

                // Check Tesseract Version
                if (typeof tesseractVersion === "undefined") tesseractVersion = defaultTesseractVersion;

                // assign defaults from init
                defaultMaxWidth = width;
                defaultMaxHeight = height;
                defaultCropStrategy = crop;
                defaultLanguage = language;
                defaultQRScanner = qrScanner;
                defaultOcrEngine = ocrEngine;
                defaultTesseractVersion = tesseractVersion;

                // create tesseract engine
                let createTesseractEngine = function () {
                    window.Tesseract = Tesseract.create({
                        workerPath: WORKER_PATH,
                        langPath: LANG_PATH,
                        corePath: TESSERACT_PATH
                    });

                    // resolve after tesseract initialization
                    resolve();
                };

                if (dynamicInclude) {
                    // scripts to include
                    let scriptsURL = [];

                    // BCR library
                    scriptsURL.push("bcr.analyze.js");
                    scriptsURL.push("bcr.cleaning.js");
                    scriptsURL.push("bcr.utility.js");

                    // Language datasets
                    for (let k in languages)
                        scriptsURL.push("lang/" + languages[k] + ".js");

                    // Datasets
                    scriptsURL.push("bcr.cities.js");
                    scriptsURL.push("bcr.job.js");
                    scriptsURL.push("bcr.names.js");
                    scriptsURL.push("bcr.streets.js");

                    // include qr code scanner (if in the settings)
                    if (bcr.qrScanner()) {
                        scriptsURL.push("qr/grid.js");
                        scriptsURL.push("qr/version.js");
                        scriptsURL.push("qr/detector.js");
                        scriptsURL.push("qr/formatinf.js");
                        scriptsURL.push("qr/errorlevel.js");
                        scriptsURL.push("qr/bitmat.js");
                        scriptsURL.push("qr/datablock.js");
                        scriptsURL.push("qr/bmparser.js");
                        scriptsURL.push("qr/datamask.js");
                        scriptsURL.push("qr/rsdecoder.js");
                        scriptsURL.push("qr/gf256poly.js");
                        scriptsURL.push("qr/gf256.js");
                        scriptsURL.push("qr/decoder.js");
                        scriptsURL.push("qr/qrcode.js");
                        scriptsURL.push("qr/findpat.js");
                        scriptsURL.push("qr/alignpat.js");
                        scriptsURL.push("qr/databr.js");
                    }

                    // include the tesseract engine if the engine is tesseract
                    if (ocrEngine === ocrEngines.TESSERACT) {
                        // Tesseract.js
                        scriptsURL.push("tesseract/tesseract.min.js");
                    }

                    // load next available script of callback if none
                    let nextLoad = function () {

                        // no more scripts
                        if (scriptsURL.length === 0) {
                            if (ocrEngine === ocrEngines.TESSERACT) {
                                // create engine and return promise
                                createTesseractEngine();
                            } else {
                                resolve();
                            }
                        } else {
                            // load next script
                            loadJs(executionPath + scriptsURL.shift(), nextLoad);
                        }
                    };
                    nextLoad();
                } else {
                    if (ocrEngine === ocrEngines.TESSERACT && tesseractVersion === tesseractVersions.V1) {
                        // create engine and return promise
                        createTesseractEngine();
                    } else if (ocrEngine === ocrEngines.TESSERACT && tesseractVersion === tesseractVersions.V2) {
                        createTesseractV2Engine(language,resolve);
                    } else {
                        resolve();
                    }
                }

            });
        },

        /**
         * main method for recognizing
         * @param {string} b64image the base 64 encoded image.
         * @param {function} callback callback on complete.
         * @param {function} progress callback on progress.
         * @param {string} ocr json of ocr from google vision ocr.
         * @return {void} return
         */
        recognize: function (b64image, callback, progress, ocr = '') {

            console.log("recognize", "start");

            // main gateway on engine's selection
            if (defaultOcrEngine === ocrEngines.TESSERACT) {
                inputOcr = "";

                //set progress-Callback directly for Version V2
                if(defaultTesseractVersion === tesseractVersions.V2) {
                    progressCallback = progress;
                    if(tesseractWorker==null){
                        console.warn("Engine was not initilized - initalizing with default-Values");
                        createTesseractV2Engine(defaultLanguage);
                    }
                }
            } else {
                inputOcr = ocr;
            }

            // If qr Scanner enabled try to find some VCard
            if (bcr.qrScanner()) {
                console.log("QRCODE attempt");
                QRCodeScanner(b64image, function (ret) {

                    // QRCode not found, fallback normal analysis
                    if (ret === undefined) {
                        console.log("recognizeBcr", "QR NOT FOUND");
                        loadAndProcess(b64image, callback, progress);
                    } else {
                        console.log("recognizeBcr", "QR FOUND", ret["fields"]);

                        // fill return data from the qrcode scan
                        let returnData = {
                            stages: [b64image],
                            result: ret["fields"],
                            blocks: []
                        };

                        callback(returnData);
                    }
                }, progress);
            } else {
                console.log("no QRCODE, processing with BCR");
                loadAndProcess(b64image, callback, progress);
            }
            console.log("recognizeBCR", "end");
        },

        /**
         * Method for cleaning up (Terminating worker, when using tesseractjs2)
         * @return {boolean} return
         */
        cleanUp: async function () {
            const isClean = true;
            if(tesseractWorker){
                await tesseractWorker.terminate();
                console.log("cleanup", "succesfull");
            }

            return isClean;
        },

        /**
         * public property to expose the strategy set
         * @return {string}
         * the strategy label internally set
         */
        cropStrategy: function () {
            return defaultCropStrategy;
        },

        /**
         * public property to expose maxwidth default
         * @return {number}
         the value of the max width used internally to normalize the resolution
         */
        maxWidth: function () {
            return defaultMaxWidth;
        },

        /**
         * public property to expose maxheight default
         * @return {number}
         * the value of the max height used internally to normalize the resolution
         */
        maxHeight: function () {
            return defaultMaxHeight;
        },

        /**
         * public property to expose default engine
         * @return {string}
         * the value of the engine chosed
         */
        ocrEngine: function () {
            return defaultOcrEngine;
        },

        /**
         * public property to expose default tesseract Version
         * @return {string}
         * the value of the chosen tesseractjs Library Version
         */
        tesseractVersion: function () {
            return defaultTesseractVersion;
        },

        /**
         * public property to get Tesseract V2 Worker
         * @return {tesseractWorker}
         * the initlaized TesseractJS V2 Worker
         */
        tesseractWorker: function () {
            return tesseractWorker;
        },

        /**
         * public property to expose default language
         * @return {string}
         * the value of the language trained data
         */
        language: function () {
            return defaultLanguage;
        },

        /**
         * public property to expose the worker
         * @return {object}
         * the initialized tesseract worker
         */
        tesseract: function () {
            return tesseractWorker;
        },

        /**
         * public property to expose the ocr
         * @return {object}
         * the ocr passed
         */
        ocr: function () {
            return inputOcr;
        },

        /**
         * public property to expose the QRScanner option
         * @return {boolean}
         * if VCard QRScanner read is enabled
         */
        qrScanner: function () {
            return defaultQRScanner;
        },

        /**
         * public property to expose the dynamicInclude flag value
         * @return {boolean}
         * if the scripts are loaded by the library
         */
        dynamicInclude: function () {
            return defaultDynamicInclude;
        },

        /**
         * public method to extract data from a block
         * @param {string} text the text.
         * @param {string} resultField the field.
         * @return {string} the extracted field
         */
        extractField: function (text, resultField) {

            let result = text;

            if (resultField === "Name") {
                result = splitName(text);
            } else if (resultField === "Web") {
                result = extractWeb(text);
            } else if (resultField === "Email") {
                result = extractEmail(text);
            } else if (resultField === "Phone" || resultField === "Mobile" || resultField === "Fax") {
                result = extractNumber(text);
            } else if (resultField === "Address") {
                result = splitAddress(text);
            }

            return result;
        },

        /**
         * public method to refresh the derived field name
         * @param {object} nameField the text.
         * @return {object} the refreshed field
         */
        refreshName: function (nameField) {
            return refreshDerivedName(nameField);
        },

        /**
         * public method to refresh the derived field address
         * @param {object} addressField the text.
         * @return {object} the refreshed field
         */
        refreshAddress: function (addressField) {
            return refreshDerivedAddress(addressField);
        }

    };
})();

export default bcr;
/**
 * Cordova BCR Library 0.0.6
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

// ****************************************************************************
// BCR main class
// ****************************************************************************
let bcr = (function () {

    // ************************************************************
    // private methods
    // ************************************************************
    const maxwidth = 2160;
    const maxheight = 1440;
    var default_crop_strategy = "smartcrop"; // "smartcrop" | "opencv"

    // get current script path
    let currentScriptPath = function () {

        let scripts = document.querySelectorAll('script[src]');
        let currentScript = scripts[scripts.length - 1].src;
        let currentScriptChunks = currentScript.split('/');
        let currentScriptFile = currentScriptChunks[currentScriptChunks.length - 1];

        return currentScript.replace(currentScriptFile, '');
    };

    // load files
    let loadJs = function (filename, callback) {
        console.log("Loading", filename);
        let scriptTag = document.createElement('script');
        scriptTag.src = filename;

        scriptTag.onload = callback;
        scriptTag.onreadystatechange = callback;

        document.body.appendChild(scriptTag);
    };

    let executionPath = currentScriptPath();
    let WORKER_PATH = executionPath + 'tesseract/worker.js';
    let TESSERACT_PATH = executionPath + 'tesseract/tesseract-core.js';
    let LANG_PATH = executionPath + 'data/';

    // ************************************************************
    // public methods and properties
    // ************************************************************
    return {

        // init function
        initialize: function (crop_strategy) {

            // check crop_strategy
            if (typeof crop_strategy === "undefined") crop_strategy = default_crop_strategy;

            // assign crop strategy
            default_crop_strategy = crop_strategy;

            // scripts to include
            let scripts = [];

            // BCR library
            scripts.push("bcr.analyze.js");
            scripts.push("bcr.cleaning.js");
            scripts.push("bcr.utility.js");

            // Datasets
            scripts.push("bcr.cities.js");
            scripts.push("bcr.job.js");
            scripts.push("bcr.names.js");
            scripts.push("bcr.streets.js");

            // Tesseract.js
            scripts.push("tesseract/tesseract.js");

            // final callback function
            let callback = function () {
                window.Tesseract = Tesseract.create({
                    workerPath: WORKER_PATH,
                    langPath: LANG_PATH,
                    corePath: TESSERACT_PATH
                });
            };

            // load next available script of callback if none
            let nextLoad = function () {
                if (scripts.length === 0) return callback();
                return loadJs(executionPath + scripts.shift(), nextLoad);
            };

            nextLoad();
        },

        // main method for recognizing
        recognizeBcr: function (b64image, callback, progress) {
            console.log("recognizeBCR", "start");
            loadAndProcess(b64image, callback, progress);
            console.log("recognizeBCR", "end");
        },

        /**
         * return crop strategy set
         * @return {string}
         * the strategy label internally set
         */
        CROP_STRATEGY: function () {
            return default_crop_strategy;
        },

        /**
         * return maxwidth default
         * @return {number}
          the value of the max width used internally to normalize the resolution
         */
        MAXWIDTH: function () {
            return maxwidth;
        },

        /**
         * return maxheight default
         * @return {number}
         * the value of the max height used internally to normalize the resolution
         */
        MAXHEIGHT: function () {
            return maxheight;
        }

    };
})();

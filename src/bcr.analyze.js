/**
 * Cordova BCR Library 1.0.12
 * Authors: Gaspare Ferraro, Renzo Sala
 * Contributors: Simone Ponte, Paolo Macco
 * Filename: bcr.analyze.js
 * Description: core module
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

//import QrScanner from "./qr/qr-scanner.min.js";
//QrScanner.WORKER_PATH = './qr/qr-scanner-worker.min.js';

// CONSTS
const MIN_LINE_LENGHT = 4;
const THRESHOLD_HIGH = 0.8;
const THRESHOLD_LOW = 0.2;
const TEL_MIN_LENGTH = 6;
const DISTANCE_TOLERANCE = 4;
const MIN_SCORE = 0.05;
const THRESHOLD_SIMILARITY = 0.3;

// ****************************************************************************
// REGEXES
// ****************************************************************************
const typos = [
    {regex: /[A-Za-z]0[A-Za-z]/g, find: "0", replace: "o"}, // 0 instead of o inside a text
    {regex: /[A-Za-z]00[A-Za-z]/g, find: "00", replace: "oo"}, // 00 instead of oo inside a text
    {regex: /[A-Za-z]\|[A-Za-z]/g, find: "|", replace: "l"}, // pipe for l
    {regex: /[A-Za-z]\|0[A-Za-z]/g, find: "|0", replace: "lo"}, // 0 instead of o + pipe and words
    {regex: /[A-Za-z]0\|[A-Za-z]/g, find: "0|", replace: "ol"}, // 0 instead of o + pipe and words
    {regex: /[A-Za-z]\u00A9[A-Za-z]/g, find: /\u00A9/g, replace: "@"}, // @ instead of ©
    {regex: /[A-Za-z]\u00AE[A-Za-z]/g, find: /\u00AE/g, replace: "@"}, // @ instead of ©
    {regex: /.eh/g, find: ".eh", replace: ".ch"}, // .ch in domains, usually got wrong
    {regex: /\s\|\s/g, find: "\s|\s", replace: ""}, // pipes on the fly (got from graphic elements)
    {regex: /\u2014/g, find: /\u2014/g, replace: "-"}, // never use long -
    {regex: /,com/g, find: ",com", replace: ".com"}, // .com in domains, usually got ,com
    {regex: /.oom/g, find: ".oom", replace: ".com"}, // .com in domains, usually got .oom
    {regex: /[A-Za-z]{2}1[A-Za-z]{2}/g, find: "1", replace: "i"} // 1 instead of i
];

// email
const email = /(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/gi;

// web
const web = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})/gi;

// tel
const regex_tel = [
    {
        regex: /([+][0-9]{1,4}\s*)?(\([0-9]{1,2}\)\s*)?([0-9]+[\s|\\\/.-]?){3,}/g,
        confidence: 0.3
    },
    {
        regex: /((tel|phon|dir)\w*([.|:])*\s*)([+][0-9]{1,4}\s*)?(\([0-9]{1,2}\)\s*)?([0-9]+[\s|\\\/.-]?){3,}/g,
        confidence: 0.5
    }
];

// fax
const regex_fax = [
    {
        regex: /([+][0-9]{1,4}\s*)?(\([0-9]{1,2}\)\s*)?([0-9]+[\s|\\\/.-]?){3,}/g,
        confidence: 0.3
    },
    {
        regex: /((fax)\w*([.|:])*\s*)([+][0-9]{1,4}\s*)?(\([0-9]{1,2}\)\s*)?([0-9]+[\s|\\\/.-]?){3,}/g,
        confidence: 0.5
    }
];

// mobile
const regex_mobile = [
    {
        regex: /([+][0-9]{1,4}\s*)?(\([0-9]{1,2}\)\s*)?([0-9]+[\s|\\\/.-]?){3,}/g,
        confidence: 0.3
    },
    {
        regex: /((mobi|cell|hand)\w*([.|:])*\s*)([+][0-9]{1,4}\s*)?(\([0-9]{1,2}\)\s*)?([0-9]+[\s|\\\/.-]?){3,}/g,
        confidence: 0.5
    }
];

// Vcard parser new version
export function VCardParse(input) {
    let card = initializeResult();
    input.split(/\r\n|\r|\n/).forEach(function (line) {
        let idxSeparator = line.indexOf(":");
        if (idxSeparator === -1) return;

        let k = line.substr(0, idxSeparator).toUpperCase();
        let v = line.substr(idxSeparator + 1);

        let attr = {};
        if (k.indexOf(";") !== -1) {
            let attrs = k.split(";");
            for (let i = 1; i < attrs.length; i++) {
                if (attrs[i].indexOf("=") === -1) {
                    attr[attrs[i]] = true;
                } else {
                    let attrSplitted = attrs[i].split("=");
                    attr[attrSplitted[0]] = attrSplitted[1];
                }
            }
            k = attrs[0];
        }

        switch (k) {
            case "N":
                let name = v.replace(/;/g, " ");
                card["fields"]["Name"] = splitName(name);
                break;
            case "TITLE":
                card["fields"]["Job"] = v;
                break;
            case "EMAIL":
                card["fields"]["Email"] = v;
                break;
            case "ORG":
                card["fields"]["Company"] = v;
                break;
            case "URL":
                card["fields"]["Web"] = v;
                break;
            case "ADR":
                let address = v.replace(/;/g," ");
                card["fields"]["Address"] = splitAddress(address);
                break;
            case "TEL":
                let attrK = Object.keys(attr);
                console.log("TEL", k, attr, v);
                if ((attrK.indexOf("TYPE") !== -1 && attr["TYPE"] === "WORK") || attrK.indexOf("WORK") !== -1) {
                    card["fields"]["Mobile"] = v;
                } else if ((attrK.indexOf("TYPE") !== -1 && attr["TYPE"] === "CELL") || attrK.indexOf("CELL") !== -1) {
                    card["fields"]["Mobile"] = v;
                } else if ((attrK.indexOf("TYPE") !== -1 && attr["TYPE"] === "HOME") || attrK.indexOf("HOME") !== -1) {
                    card["fields"]["Phone"] = v;
                }
                break;
            default:
                break;
        }
    });
    return card;
}

// MeCard parser
export function MeCardParse(input) {
    let card = initializeResult();
    input.split(";").forEach(function (line) {
        let idxSeparator = line.indexOf(":");
        if (idxSeparator === -1) return;

        let k = line.substr(0, idxSeparator).toUpperCase();
        let v = line.substr(idxSeparator + 1);

        switch (k) {
            case "N":
                let name = v.replace(/,/g, " ");
                card["fields"]["Name"] = splitName(name);
                break;
            case "TITLE":
                card["fields"]["Job"] = v;
                break;
            case "EMAIL":
                card["fields"]["Email"] = v;
                break;
            case "ORG":
                card["fields"]["Company"] = v;
                break;
            case "URL":
                card["fields"]["Web"] = v;
                break;
            case "ADR":
                let address = v.replace(/,/g, " ");
                card["fields"]["Address"] = splitAddress(address);
                break;
            case "TEL":
                card["fields"]["Mobile"] = v;
                break;
            default:
                break;
        }
    });
    return card;
}

// QR Code Scanner
function QRCodeScanner(b64, callback, progress) {

    qrcode.callback = function (result) {

        // urldecode
        var string_result = unescape(result);
        string_result = string_result.replace("ï»¿", "");

        if (string_result.startsWith("BEGIN:VCARD")) {
            console.log("QRCodeScanner VCARD FOUND", "result", result);
            let vcard = VCardParse(string_result);
            callback(vcard);
        } else if (string_result.startsWith("MECARD:")) {
            console.log("QRCodeScanner MECARD FOUND", "result", result);
            let vcard = MeCardParse(string_result.replace("MECARD:",""));
            callback(vcard);
        } else {
            console.log("QRCodeScanner", "result", undefined);
            callback(undefined);
        }

    };
    console.log("QRCodeScanner", "start");
    qrcode.decode(b64);
}

// perform text analysis
function analyzeOcr(ocr, callback, progress) {

    // init progress object
    let progressData = {
        section: "",
        progress: {}
    };

    console.log(ocr);

    progressData.section = "BCR";
    progressData.progress = {
        status: "Text analysis",
        progress: 0
    };
    progress(progressData);

    // BCR analisys from OCR
    let result = analyzePipelineBCR(ocr);

    progressData.section = "BCR";
    progressData.progress = {
        status: "Text analysis",
        progress: 1
    };
    progress(progressData);

    // print result
    console.log("Result: ");
    console.log(result);

    // callback
    callback(result.fields, result.blocks);

}

// perform ocr and analyze text
function analyze(canvas, callback, progress) {
    let worker;
    if(bcr.tesseractVersion() == tesseractVersions.V2){
        worker  = bcr.tesseractWorker().recognize(canvas).then(function (result) {
            if(result && result.data){
                return result.data;
            }
            return result;
        });
    } else {
        worker = Tesseract.recognize(canvas, {
            lang: bcr.language()
        })
            .progress(function (data) {
                let result = {
                    section: "",
                    progress: {}
                };
                result.section = "OCR";
                result.progress = data;
                progress(result);
            });
    }

    worker.then(function (ocrResult) {

            console.log(ocrResult);

            // BCR analisys from OCR
            let result = analyzePipeline(ocrResult);

            // print result
            console.log("Result: ");
            console.log(result);

            // callback
            callback(result.fields, result.blocks);
        });
}

// initialize result
function initializeResult() {
    return {
        fields:
            {
                Company: "",
                Email: "",
                Address: {
                    StreetAddress: "",
                    ZipCode: "",
                    Country: "",
                    Text: "",
                    City: ""
                },
                Web: "",
                Phone: "",
                Text: "",
                Fax: "",
                Job: "",
                Mobile: "",
                Name: {
                    Text: "",
                    Surname: "",
                    Name: {
                        FirstName: "",
                        Text: "",
                        MiddleName: "",
                        ExtraName: ""
                    }
                }
            },
        blocks: []
    };
}

// analyze pipeline from given ocr
function analyzePipelineBCR(ocr) {

    // Step 1: Map logical blocks
    console.log("Analyze pipeline", "stage", 0, "mapBlocks");
    ocr = bcrAssignBlocks(ocr);

    // Step 2: Clean text from google vision
    console.log("Analyze pipeline", "stage", 1, "cleanText");
    ocr = cleanExternalText(ocr);

    // Step 3: Score email
    console.log("Analyze pipeline", "stage", 2, "scoreEmail");
    ocr = scoreEmail(ocr);

    // Step 4: Score web
    console.log("Analyze pipeline", "stage", 3, "scoreWeb");
    ocr = scoreWeb(ocr);

    // Step 5: Score numbers
    console.log("Analyze pipeline", "stage", 4, "scoreNumbers");
    ocr = scoreNumbers(ocr);

    // Step 6: Score company
    console.log("Analyze pipeline", "stage", 5, "scoreCompany");
    ocr = scoreCompany(ocr);

    // Step 7: Score name
    console.log("Analyze pipeline", "stage", 6, "scoreName");
    ocr = scoreName(ocr);

    // Step 8: Score job
    console.log("Analyze pipeline", "stage", 7, "scoreJob");
    ocr = scoreJob(ocr);

    // Step 9: Score address
    console.log("Analyze pipeline", "stage", 8, "scoreAddress");
    ocr = scoreAddress(ocr);

    // Step 10: Assign result
    console.log("Analyze pipeline", "stage", 9, "assignResult");

    // return result
    return assignResults(ocr);
}

// analyze pipeline
function analyzePipeline(ocr) {

    // Step 0: Break lines from tesseract
    console.log("Analyze pipeline", "stage", 0, "breakLines");
    ocr = breakLines(ocr);

    // Step 1: Clean text from tesseract
    console.log("Analyze pipeline", "stage", 1, "cleanText");
    ocr = cleanText(ocr);

    // Step 2: Build logical blocks
    console.log("Analyze pipeline", "stage", 2, "buildBlocks");
    ocr = bcrBuildBlocks(ocr);

    // Step 3: Score email
    console.log("Analyze pipeline", "stage", 3, "scoreEmail");
    ocr = scoreEmail(ocr);

    // Step 4: Score web
    console.log("Analyze pipeline", "stage", 4, "scoreWeb");
    ocr = scoreWeb(ocr);

    // Step 5: Score numbers
    console.log("Analyze pipeline", "stage", 5, "scoreNumbers");
    ocr = scoreNumbers(ocr);

    // Step 6: Score company
    console.log("Analyze pipeline", "stage", 6, "scoreCompany");
    ocr = scoreCompany(ocr);

    // Step 7: Score name
    console.log("Analyze pipeline", "stage", 7, "scoreName");
    ocr = scoreName(ocr);

    // Step 8: Score job
    console.log("Analyze pipeline", "stage", 8, "scoreJob");
    ocr = scoreJob(ocr);

    // Step 9: Score address
    console.log("Analyze pipeline", "stage", 9, "scoreAddress");
    ocr = scoreAddress(ocr);

    // Step 10: Assign result
    console.log("Analyze pipeline", "stage", 10, "assignResult");

    // return result
    return assignResults(ocr);
}

// ****************************************************************************
// PREPROCESS OCR Object
// ****************************************************************************

// break long line (only tesseract)
function breakLines(ocr) {
    let ocrCleaned = {};
    ocrCleaned.info = {};
    ocrCleaned.lines = [];
    ocrCleaned.words = [];
    ocrCleaned.text = ocr.text;

    for (let i = 0; i < ocr.lines.length; i++) {
        let w = ocr.lines[i].words;
        w.sort(function (w1, w2) {
            return w1.bbox.x0 < w2.bbox.x0 ? -1 : +1;
        });

        // one word, nothing to split
        if (w.length === 1) {
            ocrCleaned.lines.push(ocr.lines[i]);
            ocrCleaned.words.push(w[0]);
            continue;
        }

        // Average char width distance
        let dist = 0;
        let len = 0;
        for (let j = 0; j < w.length; j++) {
            dist += w[j].bbox.x1 - w[j].bbox.x0;
            len += w[j].text.length;
        }
        dist /= len;
        dist *= DISTANCE_TOLERANCE;   // tolerance

        // Break lines
        let curLines = [];
        for (let j = 0; j <= w.length; j++) {

            let skipCondition = j !== w.length && w[j].text.length > 0 && w[j].text.trim().endsWith(":");

            if (j !== w.length && (skipCondition || curLines.length === 0 || (w[j].bbox.x0 - curLines[curLines.length - 1].bbox.x1) < dist)) {
                // Add word to current line
                curLines.push(w[j]);
            } else {
                // Create line object
                let line = {};

                // Map bounding box
                line.bbox = {};
                line.bbox.x0 = curLines.map(o => o.bbox.x0).reduce((x, y) => x < y ? x : y);
                line.bbox.x1 = curLines.map(o => o.bbox.x1).reduce((x, y) => x < y ? y : x);
                line.bbox.y0 = curLines.map(o => o.bbox.y0).reduce((x, y) => x < y ? x : y);
                line.bbox.y1 = curLines.map(o => o.bbox.y1).reduce((x, y) => x < y ? y : x);

                // Map words
                line.words = [];
                curLines.forEach(o => o.line = line);
                curLines.forEach(o => line.words.push(o));
                curLines.forEach(o => ocrCleaned.words.push(o));

                line.text = curLines.map(o => o.text).join(" ");
                line.used = false;

                // push curLines in lines
                ocrCleaned.lines.push(line);

                // Reset current line
                curLines = [w[j]];
            }
        }
    }

    return ocrCleaned;
}

// blocks strategy assignment (only tesseract)
function blocksStrategyAssignment(text) {

    // "" = trash, "ok" = get, "subtext1|subtext2|.." = split
    let result = "";

    // ******************************************************
    // conditions to strategy // 0 assign, 1 extract more blocks, 2 trash
    // ******************************************************
    if (text.length <= MIN_LINE_LENGHT) {
        // line too short, trash
        return "";
    }

    // line contains more logical blocks (patterns, like tel[xxxxxxxx]fax[xxxxxxx])
    // numbers
    let telmatches = checkRE(regex_tel[1].regex, text);
    let faxmatches = checkRE(regex_fax[0].regex, text);
    let mobmatches = checkRE(regex_mobile[1].regex, text);
    let mailmatches = checkRE(email, text);
    let webmatches = checkRE(web, text);
    let total_matches = telmatches.length + faxmatches.length + mobmatches.length + mailmatches.length + webmatches.length;

    // check separate matches

    // extract tel
    if (telmatches.length > 0 && telmatches.length < total_matches) {
        for (let i = 0; i < telmatches.length; i++) {
            result += telmatches[i] + "|";
        }
    }
    // extract fax
    if (faxmatches.length > 0 && faxmatches.length < total_matches) {
        for (let i = 0; i < faxmatches.length; i++) {
            result += faxmatches[i] + "|";
        }
    }
    // extract mob
    if (mobmatches.length > 0 && mobmatches.length < total_matches) {
        for (let i = 0; i < mobmatches.length; i++) {
            result += mobmatches[i] + "|";
        }
    }
    // extract mail
    if (mailmatches.length > 0 && mailmatches.length < total_matches) {
        for (let i = 0; i < mailmatches.length; i++) {
            result += mailmatches[i] + "|";
        }
    }
    // extract web
    if (webmatches.length > 0 && webmatches.length < total_matches) {
        for (let i = 0; i < webmatches.length; i++) {
            result += webmatches[i] + "|";
        }
    }

    // remove last separator
    if (result !== "") {
        return result.substring(0, result.length - 2);
    } else {
        // get it as it is
        return "ok";
    }
}

// Build logical blocks
// Description: parse lines to extract real blocks
// Blocks = lines; split line for different fonts; split line for matching tel numbers
function bcrBuildBlocks(ocr) {

    // add field
    ocr.BCR = {};
    ocr.BCR.blocks = [];

    // cycle over lines
    for (let i = 0; i < ocr.lines.length; i++) {
        let block = {
            text: "",
            fontSize: 0,
            fields: {email: 0, web: 0, phone: 0, fax: 0, mobile: 0, job: 0, name: 0, address: 0, company: 0},
            result: "",
            used: false
        };

        let assign_strategy = blocksStrategyAssignment(ocr.lines[i].text);

        // ******************************************************
        // assignment
        // ******************************************************
        if (assign_strategy === "") {
            // trash
        } else if (assign_strategy.indexOf("|") > -1) {
            // extract
            let subblocks = assign_strategy.split('|');
            for (let k = 0; k < subblocks.length; k++) {
                let subblock = {
                    text: "",
                    fontSize: 0,
                    fields: {email: 0, web: 0, phone: 0, fax: 0, mobile: 0, job: 0, name: 0, address: 0, company: 0}
                };
                subblock.text = subblocks[k];
                subblock.fontSize = bcrGetWordsFont(ocr.lines[i].words);
                ocr.BCR.blocks.push(subblock);
            }
        } else {
            // assign line as it is (trimmed, removed cr lf)
            block.text = ocr.lines[i].text.replace(/[\n\r|]/g, '').trim();
            block.fontSize = bcrGetWordsFont(ocr.lines[i].words);

            //block.fontSize = ocr.
            ocr.BCR.blocks.push(block);
        }
    }

    let averageFontSize = 0;
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        averageFontSize += ocr.BCR.blocks[i].fontSize;
    }
    ocr.BCR.averageFontSize = averageFontSize / ocr.BCR.blocks.length;

    return ocr;
}

// Assign blocks from given ocr to outputstructure
function bcrAssignBlocks(ocr) {

    // add field
    ocr.BCR = {blocks: undefined};
    console.log("OCR", ocr);
    console.log("OCR.bcr", ocr.BCR);
    ocr.BCR.blocks = [];

    // cycle over lines
    if (ocr.lines !== null && typeof ocr.lines !== "undefined" && ocr.lines.linetext !== null && typeof ocr.lines.linetext !== "undefined") {
        for (let i = 0; i < ocr.lines.linetext.length; i++) {
            let block = {
                text: "",
                fontSize: 0,
                fields: {email: 0, web: 0, phone: 0, fax: 0, mobile: 0, job: 0, name: 0, address: 0, company: 0},
                used: false
            };

            // assign line as it is (remove extra space, trimmed, removed cr lf)
            block.text = cleanLine(ocr.lines.linetext[i]);
            block.fontSize = parseInt(ocr.lines.lineframe[i].height);

            //block.fontSize = ocr.
            ocr.BCR.blocks.push(block);
        }

        let averageFontSize = 0;
        for (let i = 0; i < ocr.BCR.blocks.length; i++) {
            averageFontSize += ocr.BCR.blocks[i].fontSize;
        }
        ocr.BCR.averageFontSize = averageFontSize / ocr.BCR.blocks.length;
    }

    return ocr;
}

// clean text
function cleanText(ocr) {
    // foreach word, make correction (and propagate to text and to lines)
    for (let i = 0; i < ocr.words.length; i++) {
        for (let it = 0; it < typos.length; it++) {
            // replaces all the typos
            let backupWord = ocr.words[i].text;

            let matches = checkRE(typos[it].regex, ocr.words[i].text);
            if (matches.length > 0) {

                // fix word
                let word = ocr.words[i].text.replace(typos[it].find, typos[it].replace);

                // replace the word
                ocr.words[i].text = word;

                // replace the word in line
                ocr.words[i].line.text = ocr.words[i].line.text.replace(backupWord, word);

                if(ocr && ocr.words[i] && ocr.words[i].paragraph && ocr.words[i].paragraph.text){
                    ocr.words[i].paragraph.text = ocr.words[i].paragraph.text.replace(backupWord, word);
                }

                if(ocr && ocr.words[i] && ocr.words[i].page && ocr.words[i].page.text){
                    ocr.words[i].page.text = ocr.words[i].page.text.replace(backupWord, word);
                }

                ocr.text = ocr.text.replace(backupWord, word);
            }
        }
    }
    return ocr;
}

// clean the line from extra spaces
function cleanLine(ocr) {

    // remove extra spaces after + and - from ocr given
    ocr = ocr.replace(/\+ /g, '+');
    ocr = ocr.replace(/- /g, '-');
    ocr = ocr.replace(/ \+/g, '+');
    ocr = ocr.replace(/ -/g, '-');

    // remove cr lf
    ocr = ocr.replace(/[\n\r|]/g, '');

    return ocr.trim();
}

// clean text from imported ocr
function cleanExternalText(ocr) {

    // text cleaning for google ocr gived pipeline
    for (let iCounter = 0; iCounter < ocr.BCR.blocks.length; iCounter++) {

        for (let it = 0; it < typos.length; it++) {

            // replaces all the typos
            let currentBlock = ocr.BCR.blocks[iCounter].text;

            let matches = checkRE(typos[it].regex, currentBlock);
            if (matches.length > 0) {

                // fix and replace the word
                ocr.BCR.blocks[iCounter].text = currentBlock.replace(typos[it].find, typos[it].replace);
            }
        }
    }

    // return cleaned ocr
    return ocr;
}

// ****************************************************************************
// UTILITIES
// ****************************************************************************

// get font distance
function getFontBiggerRatio(average, real) {

    // normalize
    real = (real < average) ? average : real;
    real = (real > average * 2) ? average * 2 : real;

    // return value
    return (real / average) - 1;
}

// get average font size of words
function bcrGetWordsFont(words) {

    let fontSize = 0;

    // cycle over words
    for (let i = 0; i < words.length; i++) {
        fontSize += words[i].font_size;
    }
    fontSize = fontSize / words.length;

    return fontSize;
}

// check regexp
function checkRE(re, st) {
    return String(st).toLowerCase().match(re) || [];
}

// ****************************************************************************
// EXTARCT VALUE FROM BLOCK
// ****************************************************************************

// extract web from candidate
function extractWeb(text) {
    let result = checkRE(web, text);
    if (result.length > 0) {
        return result[0];
    } else {
        return text;
    }
}

// extract mail from candidate
function extractEmail(text) {
    let result = checkRE(email, text);
    if (result.length > 0) {
        return result[0];
    } else {
        return text;
    }
}

// extract number from candidate
function extractNumber(text) {

    // remove literals, multiple spaces
    return text.replace(/[^0-9|+-]/g, ' ').replace(/\s+/g, " ").trim();
}

// extract company from candidate
function extractCompany(text) {
    // return as it is
    return text;
}

// extract company from candidate
function extractName(text) {
    // return as it is
    return text;
}

// extract job
function extractJob(text) {
    // return as it is
    return text;
}

// extract title
function extractTitle(text) {
    // return as it is
    return text;
}

// extract address city
function extractCity(text) {

    // extract city or empty
    let txt = text.toLowerCase().split(" ");
    for (let j = 0; j < cities.length; j++) {
        for (let k = 0; k < txt.length; k++) {
            if (txt[k] === cities[j][0]) {
                if (cities[j][0] / txt[k] < THRESHOLD_HIGH) continue;
                return txt[k];
            }
        }
    }

    return "";
}

// extract address country
function extractCountry(text) {

    let txt = text.toLowerCase().split(" ");
    for (let j = 0; j < countryDS.length; j++) {
        for (let k = 0; k < txt.length; k++) {
            if (txt[k].indexOf(countryDS[j]) !== -1) {
                if (countryDS[j] / txt[k] < THRESHOLD_HIGH) continue;
                return txt[k];
            }
        }
    }

    return "";
}

// extract address zip
function extractZip(text) {

    let numbers = text.replace(/[^0-9]/g, " ").trim().split(" ");

    if (numbers.length > 0) {
        for (let j = numbers.length - 1; j >= 0; j--) {
            if (typeof numbers[j] === "undefined") {
                continue;
            }
            if (numbers[j].length < 4) {
                continue;
            }
            if (numbers[j].length > 6) {
                continue;
            }

            return numbers[j];
        }
    }

    return "";
}

// extract address street
function extractStreet(text, city, country, zip) {
    let txt = text.toLowerCase();
    for (let j = 0; j < streetsDS.length; j++) {
        let re = streetsDS[j];
        if (checkRE(re, txt).length > 0) {
            let result = txt.replace(city, '').replace(country, '').replace(zip, '').trim();
            result = result.replace(/  +/g, ' ');
            return result;
        }
    }
    return "";
}

// split name in sub parts and assign it
function splitName(text) {

    let result = {
        Text: text,
        Surname: "",
        Name: {
            FirstName: "",
            Text: "",
            MiddleName: "",
            ExtraName: ""
        },
        Title: ""
    };

    let name_parts = text.split(' ');

    // assign surname, last chunk
    result.Surname = name_parts[name_parts.length - 1];

    // assign name
    let firstPosition = 0;
    for (let iCounter = 0; iCounter < name_parts.length - 1; iCounter++) {

        // title
        if (iCounter === firstPosition) {
            let txt = name_parts[iCounter].trim();

            // trash title in first chunk only
            let foundTrash = false;
            for (let j = 0; j < titleTrashDS.length; j++) {
                let matchesTrash = checkRE(titleTrashDS[j], txt);
                if (matchesTrash.length > 0) {
                    firstPosition = firstPosition + 1;
                    foundTrash = true;
                    break;
                }
            }

            // find title in first chunk only
            if (!foundTrash) {
                for (let j = 0; j < titleDS.length; j++) {
                    let matches = checkRE(titleDS[j], txt);
                    if (matches.length > 0) {
                        result.Title = txt;
                        firstPosition = firstPosition + 1;
                        break;
                    }
                }
            }
        }

        // first name
        if (iCounter === firstPosition) {
            result.Name.FirstName = name_parts[iCounter].trim();
            result.Name.Text += " " + name_parts[iCounter].trim();
        } else if (iCounter === firstPosition + 1) {
            result.Name.MiddleName = name_parts[iCounter].trim();
            result.Name.Text += " " + name_parts[iCounter].trim();
        } else if (iCounter === firstPosition + 2) {
            result.Name.ExtraName = name_parts[iCounter].trim();
            result.Name.Text += " " + name_parts[iCounter].trim();
        }

        // trim the name text
        result.Name.Text = result.Name.Text.trim();
    }

    return result;
}

// split address
function splitAddress(text) {

    let city = extractCity(text);
    let country = extractCountry(text);
    let zip = extractZip(text);

    let result = {
        City: city,
        Country: country,
        StreetAddress: extractStreet(text, city, country, zip),
        Text: "",
        ZipCode: zip
    };

    if (result.StreetAddress !== "") result.Text += " " + titleCase(result.StreetAddress);
    if (result.City !== "") result.Text += " " + titleCase(result.City);
    if (result.ZipCode !== "") result.Text += " " + result.ZipCode;
    if (result.Country !== "") result.Text += " " + titleCase(result.Country);
    if (result.Text !== "") result.Text = result.Text.substr(1);

    return result;
}

// refresh the derived field name
function refreshDerivedName(nameField) {

    let nameFullText = "";
    let nameText = "";
    if (nameField.Title !== "") nameFullText += " " + titleCase(currentResult.result.Name.Title);
    if (nameField.Name.FirstName !== "") nameFullText += " " + titleCase(currentResult.result.Name.Name.FirstName);
    if (nameField.Name.MiddleName !== "") nameFullText += " " + titleCase(currentResult.result.Name.Name.MiddleName);
    if (nameField.Name.ExtraName !== "") nameFullText += " " + titleCase(currentResult.result.Name.Name.ExtraName);
    if (nameField.Surname !== "") nameFullText += " " + titleCase(currentResult.result.Name.Surname);
    if (nameField.Name.FirstName !== "") nameText += " " + titleCase(currentResult.result.Name.Name.FirstName);
    if (nameField.Name.MiddleName !== "") nameText += " " + titleCase(currentResult.result.Name.Name.MiddleName);
    if (nameField.Name.ExtraName !== "") nameText += " " + titleCase(currentResult.result.Name.Name.ExtraName);
    nameField.Text = nameFullText.substr(1);
    nameField.Name.Text = nameText.substr(1);

    return nameField;
}

// refresh the derived field address
function refreshDerivedAddress(addressField) {

    let addressText = "";
    if (addressField.StreetAddress !== "") addressText += " " + titleCase(addressField.StreetAddress);
    if (addressField.City !== "") addressText += " " + titleCase(addressField.City);
    if (addressField.ZipCode !== "") addressText += " " + addressField.ZipCode;
    if (addressField.Country !== "") addressText += " " + titleCase(addressField.Country);
    addressField.Text = addressText.substr(1);

    return addressField;
}

// ****************************************************************************
// SCORES BLOCKS
// ****************************************************************************

// score email (strategies: regex, @)
function scoreEmail(ocr) {

    // confidence 1
    let confidence = 1;
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        let matches = checkRE(email, ocr.BCR.blocks[i].text);
        if (matches.length > 0) ocr.BCR.blocks[i].fields.email = confidence;
    }

    // confidence 0.5
    confidence = 0.5;
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].text.indexOf("@") !== -1 && ocr.BCR.blocks[i].fields.email === 0) ocr.BCR.blocks[i].fields.email = confidence;
    }

    return ocr;
}

// score web (strategies: regex)
function scoreWeb(ocr) {

    // confidence 1
    let confidence = 1;
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        let matches = checkRE(web, ocr.BCR.blocks[i].text);
        if (matches.length > 0) ocr.BCR.blocks[i].fields.web = confidence;
    }

    return ocr;
}

// score tel, fax, mobile (strategies: regex)
function scoreNumbers(ocr) {

    // tel
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (extractNumber(ocr.BCR.blocks[i].text).length > TEL_MIN_LENGTH) {
            for (let k = 0; k < regex_tel.length; k++) {
                let matches = checkRE(regex_tel[k].regex, ocr.BCR.blocks[i].text);
                if (matches.length > 0) ocr.BCR.blocks[i].fields.phone += regex_tel[k].confidence;
            }
        }
    }

    // fax
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (extractNumber(ocr.BCR.blocks[i].text).length > TEL_MIN_LENGTH) {
            for (let k = 0; k < regex_fax.length; k++) {
                let matches = checkRE(regex_fax[k].regex, ocr.BCR.blocks[i].text);
                if (matches.length > 0) ocr.BCR.blocks[i].fields.fax += regex_fax[k].confidence;
            }
        }
    }

    // mobile
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (extractNumber(ocr.BCR.blocks[i].text).length > TEL_MIN_LENGTH) {
            for (let k = 0; k < regex_mobile.length; k++) {
                let matches = checkRE(regex_mobile[k].regex, ocr.BCR.blocks[i].text);
                if (matches.length > 0) ocr.BCR.blocks[i].fields.mobile += regex_mobile[k].confidence;
            }
        }
    }

    // return result
    return ocr;
}

// score company (mail similarity, font, website)
function scoreCompany(ocr) {

    let keywords = {};

    // cycle on candidates (web, email)
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {

        // Get websites candidates' title and find keywords
        if (ocr.BCR.blocks[i].fields.web > 0) {
            let website = extractWeb(ocr.BCR.blocks[i].text);
            if (typeof website !== "undefined" && website.length > 0) {
                website = website.substr(website.indexOf(".") + 1);
                if (website.indexOf(".") !== -1) {
                    website = website.substr(0, website.lastIndexOf("."));
                }
                website = website.toLowerCase();
                if (typeof website !== "undefined" && website.length > 0)
                    keywords[website] = website;
            }
        }

        // Get email domain and find keywords
        if (ocr.BCR.blocks[i].fields.email > 0) {
            let email = ocr.BCR.blocks[i].text;
            if (typeof email !== "undefined" && email.length > 0) {
                email = email.substr(email.indexOf("@") + 1);
                email = email.substr(0, email.indexOf("."));
                email = email.toLowerCase();
                if (typeof email !== "undefined" && email.length > 0)
                    keywords[email] = email;
            }
        }

    }

    // cycle on blocks
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.web === 0 && ocr.BCR.blocks[i].fields.email === 0) {
            let word = ocr.BCR.blocks[i].text.toLowerCase();
            Object.keys(keywords).forEach(k => {
                // calculate similarity
                let sim = sSimilarity(word, k);

                // assign if more than threshold
                if (sim > THRESHOLD_LOW) {
                    // contribute max 0.8
                    ocr.BCR.blocks[i].fields.company = sim * 0.8;
                }
                // remaining 0.2, assigned by font criteria
                ocr.BCR.blocks[i].fields.company += getFontBiggerRatio(ocr.BCR.averageFontSize, ocr.BCR.blocks[i].fontSize) * 0.2;
            });
        }
    }

    return ocr;
}

// score name (email, font, dataset)
function scoreName(ocr) {

    let keywords = [];

    // mail assigned case (0.6)
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.email > 0) {
            let email = ocr.BCR.blocks[i].text;

            if (typeof email !== "undefined" && email.length > 0) {
                let nick = email.substr(0, email.indexOf("@"));
                nick = nick.replace(new RegExp("\\.", 'g'), " ");

                if (typeof email !== "undefined" && email.length > 0)
                    keywords.push(nick);
            }
        }
    }

    // cycle on blocks
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.email === 0) {
            let word = ocr.BCR.blocks[i].text.toLowerCase();
            for (let k = 0; k < keywords.length; k++) {
                // calculate similarity
                let sim = sSimilarity(word, keywords[k]);

                // assign if more than threshold
                if (sim > THRESHOLD_SIMILARITY) {
                    // contribute max 0.5
                    ocr.BCR.blocks[i].fields.name = sim * 0.5;
                }
                // contribute max 0.2, assigned by font criteria
                ocr.BCR.blocks[i].fields.name += getFontBiggerRatio(ocr.BCR.averageFontSize, ocr.BCR.blocks[i].fontSize) * 0.2;

            }

        }
    }

    // contribute max 0.3, assigned by dataset
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.email === 0) {
            let line = ocr.BCR.blocks[i].text.toLowerCase();
            let splitted = line.toLowerCase().split(" ");
            for (let j = 0; j < splitted.length; j++) {
                if (namesDS.indexOf(splitted[j]) !== -1) {
                    ocr.BCR.blocks[i].fields.name += 0.3;
                    break;
                }
            }
        }
    }

    // regex for title + font (max contribute: 0.1)
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        let txt = ocr.BCR.blocks[i].text.toLowerCase();
        for (let j = 0; j < titleDS.length; j++) {
            let re = titleDS[j];

            // regex evaluation
            if (checkRE(re, txt).length > 0) {
                ocr.BCR.blocks[i].fields.name += 0.1;
            }
        }
    }

    return ocr;
}

// score job (nearest name)
function scoreJob(ocr) {

    // cycle blocks (proximity name, next block: 0.3)
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.name > 0) {
            if (i + 1 < ocr.BCR.blocks.length)
                ocr.BCR.blocks[i + 1].fields.job = 0.25;
        }
    }

    // regex + font (max contribute: 0.3)
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        let txt = ocr.BCR.blocks[i].text.toLowerCase();
        for (let j = 0; j < jobDS.length; j++) {
            let re = jobDS[j];

            // regex evaluation
            if (checkRE(re, txt).length > 0) {
                ocr.BCR.blocks[i].fields.job += 0.55;
            }
        }

        // contribute max 0.2, assigned by font criteria
        ocr.BCR.blocks[i].fields.job += getFontBiggerRatio(ocr.BCR.averageFontSize, ocr.BCR.blocks[i].fontSize) * 0.2;
    }

    return ocr;
}

// score address
function scoreAddress(ocr) {

    // score 0.2 for country
    // find country in dataset
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        let txt = ocr.BCR.blocks[i].text.toLowerCase().split(" ");
        for (let j = 0; j < countryDS.length; j++) {
            for (let k = 0; k < txt.length; k++) {
                if (txt[k].indexOf(countryDS[j]) !== -1) {
                    if (countryDS[j] / txt[k] < THRESHOLD_HIGH) continue;
                    ocr.BCR.blocks[i].fields.address += 0.2;
                }
            }
        }
    }

    // score 0.2 for city
    // find city in dataset
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        let txt = ocr.BCR.blocks[i].text.toLowerCase().split(" ");
        for (let j = 0; j < cities.length; j++) {
            for (let k = 0; k < txt.length; k++) {
                if (txt[k] === cities[j][0]) {
                    if (cities[j][0] / txt[k] < THRESHOLD_HIGH) continue;
                    ocr.BCR.blocks[i].fields.address += 0.2;
                }
            }
        }
    }

    // score 0.2 for address pattern
    // Street address matching typical names
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        let txt = ocr.BCR.blocks[i].text.toLowerCase();
        for (let j = 0; j < streetsDS.length; j++) {
            let re = streetsDS[j];

            // regex evaluation
            if (checkRE(re, txt).length > 0) {
                ocr.BCR.blocks[i].fields.address += 0.4;
            }
        }
    }

    // score 0.2 for zip
    // Find zip code (in already used address scored)
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.address > 0) {
            let numbers = ocr.BCR.blocks[i].text.replace(/[^0-9]/g, " ").trim().split(" ");

            if (numbers.length > 0) {
                for (let j = numbers.length - 1; j >= 0; j--) {
                    if (typeof numbers[j] === "undefined") {
                        continue;
                    }
                    if (numbers[j].length < 4) {
                        continue;
                    }
                    if (numbers[j].length > 6) {
                        continue;
                    }

                    ocr.BCR.blocks[i].fields.address += 0.05;
                    break;
                }
            }
        }
    }

    // score 0.1 for multiple assignment
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.address > 2) ocr.BCR.blocks[i].fields.address += 0.1;
    }

    // score 0.1 the not used, -0.2 for the used
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.web === 0
            && ocr.BCR.blocks[i].fields.email === 0
            && ocr.BCR.blocks[i].fields.company === 0
            && ocr.BCR.blocks[i].fields.name === 0
            && ocr.BCR.blocks[i].fields.phone === 0
            && ocr.BCR.blocks[i].fields.fax === 0
            && ocr.BCR.blocks[i].fields.mobile === 0
            && ocr.BCR.blocks[i].fields.job === 0
        ) {
            ocr.BCR.blocks[i].fields.address += 0.05;
        } else {
            ocr.BCR.blocks[i].fields.address -= 0.05;
        }
    }

    return ocr;
}

// get max score from other fields
function getMaxScore(excludedField, block) {
    let maxScore = 0;
    for (let property in block.fields) {
        if (!block.fields.hasOwnProperty(property)) continue;
        if (property !== excludedField) {
            maxScore = Math.max(maxScore, parseFloat(block.fields[property]));
        }
    }

    return maxScore;
}

// ****************************************************************************
// Assign results
// ****************************************************************************

// assign results
function assignResults(ocr) {

    let result = initializeResult();
    let web = [];
    let email = [];
    let name = [];
    let company = [];
    let job = [];
    let phone = [];
    let fax = [];
    let mobile = [];
    let address = [];

    // cycling on blocks
    for (let i = 0; i < ocr.BCR.blocks.length; i++) {
        if (ocr.BCR.blocks[i].fields.web > 0) {
            web.push({text: extractWeb(ocr.BCR.blocks[i].text), confidence: ocr.BCR.blocks[i].fields.web, block: i});
        }
        if (ocr.BCR.blocks[i].fields.email > 0) {
            email.push({
                text: extractEmail(ocr.BCR.blocks[i].text),
                confidence: ocr.BCR.blocks[i].fields.email,
                block: i
            });
        }
        if (ocr.BCR.blocks[i].fields.phone > 0) {
            let telmatches = checkRE(regex_tel[1].regex, ocr.BCR.blocks[i].text);
            let telmatch = (telmatches.length > 0) ? telmatches[0] : ocr.BCR.blocks[i].text;
            if (telmatch !== "") {
                phone.push({
                    text: extractNumber(telmatch),
                    confidence: ocr.BCR.blocks[i].fields.phone,
                    block: i
                });
            }
        }
        if (ocr.BCR.blocks[i].fields.fax > 0) {
            let faxmatches = checkRE(regex_fax[1].regex, ocr.BCR.blocks[i].text);
            let faxmatch = (faxmatches.length > 0) ? faxmatches[0] : ocr.BCR.blocks[i].text;
            if (faxmatch !== "") {
                fax.push({
                    text: extractNumber(faxmatch),
                    confidence: ocr.BCR.blocks[i].fields.fax,
                    block: i
                });
            }
        }
        if (ocr.BCR.blocks[i].fields.mobile > 0) {
            let mobmatches = checkRE(regex_mobile[1].regex, ocr.BCR.blocks[i].text);
            let mobmatch = (mobmatches.length > 0) ? mobmatches[0] : ocr.BCR.blocks[i].text;
            if (mobmatch !== "") {
                mobile.push({
                    text: extractNumber(mobmatch),
                    confidence: ocr.BCR.blocks[i].fields.mobile,
                    block: i
                });
            }
        }
        if (ocr.BCR.blocks[i].fields.company > 0) {
            company.push({
                text: extractCompany(ocr.BCR.blocks[i].text),
                confidence: ocr.BCR.blocks[i].fields.company,
                block: i
            });
        }
        if (ocr.BCR.blocks[i].fields.name > 0) {
            name.push({text: extractName(ocr.BCR.blocks[i].text), confidence: ocr.BCR.blocks[i].fields.name, block: i});
        }
        if (ocr.BCR.blocks[i].fields.job > 0) {
            job.push({text: extractJob(ocr.BCR.blocks[i].text), confidence: ocr.BCR.blocks[i].fields.job, block: i});
        }
        if (ocr.BCR.blocks[i].fields.address > 0) {

            let city = extractCity(ocr.BCR.blocks[i].text);
            let country = extractCountry(ocr.BCR.blocks[i].text);
            let zip = extractZip(ocr.BCR.blocks[i].text);

            // special case, no text: the extraction is done
            address.push({
                city: city,
                country: country,
                zip: zip,
                street: extractStreet(ocr.BCR.blocks[i].text, city, country, zip),
                confidence: ocr.BCR.blocks[i].fields.address,
                block: i
            });
        }
    }

    // sort arrays and assign result
    if (web.length > 0) {
        let web_found = web.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1)[0];
        if (web_found.confidence > MIN_SCORE) {
            result.fields.Web = web_found.text;
            ocr.BCR.blocks[web_found.block].used = true;
            ocr.BCR.blocks[web_found.block].result = "Web";
        }
    }

    if (email.length > 0) {
        email.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1);
        for (let k = 0; k < email.length; k++) {
            if (!ocr.BCR.blocks[email[k].block].used && email[k].confidence > MIN_SCORE) {
                result.fields.Email = email[k].text;
                ocr.BCR.blocks[email[k].block].used = true;
                ocr.BCR.blocks[email[k].block].result = "Email";
                break;
            }
        }
    }
    if (phone.length > 0) {
        phone.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1);
        for (let k = 0; k < phone.length; k++) {
            if (!ocr.BCR.blocks[phone[k].block].used && phone[k].confidence > MIN_SCORE && phone[k].confidence >= getMaxScore("phone", ocr.BCR.blocks[phone[k].block])) {
                result.fields.Phone = phone[k].text;
                ocr.BCR.blocks[phone[k].block].used = true;
                ocr.BCR.blocks[phone[k].block].result = "Phone";
                break;
            }
        }
    }
    if (fax.length > 0) {
        fax.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1); // TODO: why [0] ?
        for (let k = 0; k < fax.length; k++) {
            if (!ocr.BCR.blocks[fax[k].block].used && fax[k].confidence > MIN_SCORE && fax[k].confidence >= getMaxScore("fax", ocr.BCR.blocks[fax[k].block])) {
                result.fields.Fax = fax[k].text;
                ocr.BCR.blocks[fax[k].block].used = true;
                ocr.BCR.blocks[fax[k].block].result = "Fax";
                break;
            }
        }
    }
    if (mobile.length > 0) {
        mobile.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1); // TODO: why [0] ?
        for (let k = 0; k < mobile.length; k++) {
            if (!ocr.BCR.blocks[mobile[k].block].used && mobile[k].confidence > MIN_SCORE && mobile[k].confidence >= getMaxScore("mobile", ocr.BCR.blocks[mobile[k].block])) {
                result.fields.Mobile = mobile[k].text;
                ocr.BCR.blocks[mobile[k].block].used = true;
                ocr.BCR.blocks[mobile[k].block].result = "Mobile";
                break;
            }
        }
    }
    if (company.length > 0) {
        company.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1); // TODO: why [0] ?
        for (let k = 0; k < company.length; k++) {
            if (!ocr.BCR.blocks[company[k].block].used && company[k].confidence > MIN_SCORE) {
                result.fields.Company = company[k].text;
                ocr.BCR.blocks[company[k].block].used = true;
                ocr.BCR.blocks[company[k].block].result = "Company";
                break;
            }
        }
    }
    if (name.length > 0) {
        name.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1); // TODO: why [0] ?
        for (let k = 0; k < name.length; k++) {
            if (!ocr.BCR.blocks[name[k].block].used && name[k].confidence > MIN_SCORE) {
                result.fields.Name = splitName(name[k].text);
                ocr.BCR.blocks[name[k].block].used = true;
                ocr.BCR.blocks[name[k].block].result = "Name";
                break;
            }
        }
    }
    if (job.length > 0) {
        job.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1); // TODO: why [0] ?
        for (let k = 0; k < job.length; k++) {
            if (!ocr.BCR.blocks[job[k].block].used && job[k].confidence > MIN_SCORE) {
                result.fields.Job = job[k].text;
                ocr.BCR.blocks[job[k].block].used = true;
                ocr.BCR.blocks[job[k].block].result = "Job";
                break;
            }
        }
    }
    if (address.length > 0) {
        address.sort((a, b) => (a.confidence < b.confidence) ? 1 : -1); // TODO: why [0] ?
        for (let k = 0; k < address.length; k++) {
            if (!ocr.BCR.blocks[address[k].block].used && address[k].confidence > MIN_SCORE) {

                // assign first found not empty
                if (address[k].street.length > 0 && result.fields.Address.StreetAddress.length === 0) {
                    if (address[k].street.trim() !== "") result.fields.Address.StreetAddress = address[k].street.trim();
                }
                if (address[k].city.length > 0 && result.fields.Address.City.length === 0) {
                    if (address[k].city.trim() !== "") result.fields.Address.City = address[k].city.trim();
                }
                if (address[k].zip.length > 0 && result.fields.Address.ZipCode.length === 0) {
                    if (address[k].zip.trim() !== "") result.fields.Address.ZipCode = address[k].zip.trim();
                }
                if (address[k].country.length > 0 && result.fields.Address.Country.length === 0) {
                    if (address[k].country.trim() !== "") result.fields.Address.Country = address[k].country.trim();
                }

                ocr.BCR.blocks[address[k].block].used = true;
                ocr.BCR.blocks[address[k].block].result = "Address";
            }
        }

        if (result.fields.Address.StreetAddress !== "") result.fields.Address.Text += " " + titleCase(result.fields.Address.StreetAddress);
        if (result.fields.Address.City !== "") result.fields.Address.Text += " " + titleCase(result.fields.Address.City);
        if (result.fields.Address.ZipCode !== "") result.fields.Address.Text += " " + result.fields.Address.ZipCode;
        if (result.fields.Address.Country !== "") result.fields.Address.Text += " " + titleCase(result.fields.Address.Country);
        if (result.fields.Address.Text !== "") result.fields.Address.Text = result.fields.Address.Text.substr(1);
    }

    // assign blocks
    result.blocks = ocr.BCR.blocks;

    return result;
}

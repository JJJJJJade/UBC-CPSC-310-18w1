import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {isArray, isNumber, isObject, isString, isUndefined} from "util";
import {Decimal} from "decimal.js";

let JSZip = require("jszip");
let thisID: string = "";
let CourseData: any[] = [];
let qKeyArray: string[] = ["WHERE", "OPTIONS", "TRANSFORMATIONS"];
// let mKeyArray: string[] = ["courses_avg", "courses_pass", "courses_fail", "courses_audit", "courses_year"];
// let sKeyArray: string[] = ["courses_dept", "courses_title", "courses_instructor", "courses_uuid", "courses_id"];
let mKeyArray: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sKeyArray: string[] = ["dept", "title", "instructor", "uuid", "id", "fullname", "shortname", "number", "name"
    , "address", "type", "furniture", "href"];
let oKeyArray: string[] = ["COLUMNS", "ORDER"];
let tKeyArray: string[] = ["GROUP", "APPLY"];
let tokenArray: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
let sortKeyArray: string[] = ["dir", "keys"];
let dirKeyArray: string[] = ["UP", "DOWN"];
let applyKeys: any[] = [];
let count: number = 1;
let rCount: number = 1;
let shortname = "";
let fullname = "";
let address = "";
let currentroom: any = {};
let groupKeyArray: any[] = [];
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    public datasets: InsightDataset[];
    public idList: string [];
    public stats: string [];
    public buildings: any = {};

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.datasets = [];
        this.idList = [];
        this.stats = [];
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let Self = this;
        const zip = require("jszip");
        const fs = require("fs");
        const http = require("http");
        if (id === null || id === undefined) {
            return Promise.reject(new InsightError("ID is invalid"));
        }
        if (kind === null || kind === undefined) {
            return Promise.reject((new InsightError("Kind is invalid")));
        }
        if (Self.idList.includes(id)) {
            return Promise.reject((new InsightError("This ID already exist")));
        }
        if (!(fs.existsSync("./data/"))) {
            fs.mkdirSync("./data/");
        }
        return new Promise(function (resolve, reject) {
                let CoursesList: any[] = [];
                let RoomsList: any[] = [];
                if (kind === InsightDatasetKind.Courses) {
                    zip.loadAsync(content, {base64: true}).then(function (thiszip: any) {
                        thiszip.folder("courses").forEach(function (relativePath: string, file: any) {
                            let tempCourse: string;
                            const tmpCourse = file.async("string");
                            CoursesList.push(tmpCourse);
                        });
                        let CoursesArray: any[] = [];
                        let row: number = 0;
                        Promise.all(CoursesList)
                            .then(function (thisData: any) {
                                if (thisData.length === 0) {
                                    reject(new InsightError("this zip is empty"));
                                }
                                let i: number = 0;
                                let n: number = 0;
                                let avg: string = id + "_avg";
                                let dept: string = id + "_dept";
                                let year: string = id + "_year";
                                let pass: string = id + "_pass";
                                let fail: string = id + "_fail";
                                let title: string = id + "_title";
                                let instructor: string = id + "_instructor";
                                let courseid: string = id + "_id";
                                let audit: string = id + "_audit";
                                let uuid: string = id + "_uuid";
                                for (i = 0; i < CoursesList.length; i++) {
                                    try {
                                        const thiscourse = JSON.parse(thisData[i]);
                                        // let sectionList: any;
                                        const sectionList = thiscourse["result"];
                                        if (sectionList.length > 0) {
                                            // const CurrentSections = [];
                                            for (n = 0; n < sectionList.length; n++) {
                                                let c: any = {};
                                                c[avg] = sectionList[n]["Avg"];
                                                c[dept] = sectionList[n]["Subject"];
                                                if (sectionList[n]["Section"] === "overall") {
                                                    c[year] = 1900;
                                                } else {
                                                    c[year] = Number(sectionList[n]["Year"]);
                                                }
                                                // c[year] = Number(sectionList[n]["Year"]);
                                                c[pass] = sectionList[n]["Pass"];
                                                c[fail] = sectionList[n]["Fail"];
                                                c[title] = sectionList[n]["Title"];
                                                c[instructor] = sectionList[n]["Professor"];
                                                c[courseid] = sectionList[n]["Course"];
                                                c[audit] = sectionList[n]["Audit"];
                                                c[uuid] = String(sectionList[n]["id"]);
                                                CoursesArray.push(c);
                                                row = row + 1;
                                            }
                                        }
                                    } catch (e) {
                                        Log.trace(e);
                                        return reject(new InsightError(e));
                                    }
                                }
                                if (CoursesArray.length === 0) {
                                    return reject(new InsightError("There is no content"));
                                } else {
                                    let tmpDataset
                                        : InsightDataset = {id, kind: InsightDatasetKind.Courses, numRows: row};
                                    Self.datasets.push(tmpDataset);
                                    const Cacheing = JSON.stringify(CoursesArray);
                                    if (fs.existsSync("./data/")) {
                                        fs.writeFileSync("./data/" + id, Cacheing, "utf8");
                                    } else {
                                        reject(new InsightError("Cacheing location doesn't exist"));
                                    }
                                    Self.idList.push(id);
                                    resolve(Self.idList);
                                    return;
                                }
                            }).catch(function (error: any) {
                            return reject(new InsightError(error));
                        });
                    }).catch(function (error: any) {
                        return reject(new InsightError(error));
                    });
                } else if (kind === InsightDatasetKind.Rooms) {
                    const parse5 = require("parse5");
                    zip.loadAsync(content, {base64: true}).then(async function (thiszip: any) {
                        if (kind === InsightDatasetKind.Rooms) {
                            const idx = await thiszip.file("index.htm").async("string");
                            let document = parse5.parse(idx);
                            let body: any = GetBody(document);
                            GetBuilding(body, Self.buildings);
                            let urls: any[] = [];
                            for (let key of Object.keys(Self.buildings)) {
                                let html: string = "http://cs310.ugrad.cs.ubc.ca:11316/api/v1/project_c6o1b_r8q0b/";
                                let add: string = Self.buildings[key][0].replace(/ /gi, "%20");
                                html = html + add;
                                urls.push(html);
                            }
                            let promiseURLS: any[] = [];
                            for (let url of urls) {
                                let promise = new Promise(function (fulfill, rejectt) {
                                    // let http = require("http");
                                    http.get(url, (res: any) => {
                                        let rawData = "";
                                        res.on("data", (chunk: any) => {
                                            rawData += chunk;
                                        });
                                        res.on("end", function () {
                                            try {
                                                const parsedData = JSON.parse(rawData);
                                                fulfill(parsedData);
                                            } catch (e) {
                                                reject(e);
                                            }
                                        });
                                    }).on("error", function (err: any) {
                                        rejectt("err");
                                    });
                                });
                                promiseURLS.push(promise);
                            }
                            Promise.all(promiseURLS).then(function (rresults: any) {
                                let i = 0;
                                for (let key of Object.keys(Self.buildings)) {
                                    let latLon: any = rresults[i];
                                    i++;
                                    Self.buildings[key].push(latLon["lat"]);
                                    Self.buildings[key].push(latLon["lon"]);
                                }
                                // GetLocations(urls);
                                // let promiseArray: Promise[] = [];
                                let RoomList: any[] = [];
                                for (let room of Object.keys(Self.buildings)) {
                                    if (!(room === "LASR")) {
                                        let relativePath = "campus/discover/buildings-and-classrooms/";
                                        let file = relativePath + room;
                                        let promise = thiszip.files[file].async("string").then((roomOutput: any) => {
                                            let roomDocument = parse5.parse(roomOutput);
                                            let roomBody: any = GetBody(roomDocument);
                                            let rooms: any[] = [];
                                            if (roomBody === null) {
                                                return [];
                                            }
                                            let Bfullname: any = room[1];
                                            let Baddress: any = room[0];
                                            GetRoom(roomBody, room, rooms, Bfullname, Baddress);
                                            return rooms;
                                        });
                                        // promiseArray.push(promise);
                                        RoomList.push(promise);
                                    }
                                }
                                Promise.all(RoomList).then(function (results: any) {
                                    let rooms: any[] = [];
                                    let allBuildings = Object.keys(Self.buildings);
                                    for (let allRooms of results) {
                                        if (allRooms.length === 0) {
                                            continue;
                                        }
                                        let srtname: string = allRooms[0]["shortname"];
                                        for (let room of allRooms) {
                                            let r: any = {};
                                            /*
                                            r["shortname"] = srtname;
                                            r["fullname"] = Self.buildings[srtname][0];
                                            r["number"] = room["number"];
                                            r["name"] = room["shortname"] + "_" + room["number"];
                                            r["address"] = Self.buildings[srtname][1];
                                            r["lat"] = Self.buildings[srtname][2];
                                            r["lon"] = Self.buildings[srtname][3];
                                            r["seats"] = room["seats"];
                                            r["type"] = room["type"];
                                            r["furniture"] = room["furniture"];
                                            r["href"] = room["href"];*/
                                            r[id + "_shortname"] = srtname;
                                            r[id + "_fullname"] = Self.buildings[srtname][1];
                                            // r[id + "_fullname"] = room["fullname"];
                                            r[id + "_number"] = room["number"];
                                            r[id + "_name"] = room["shortname"] + "_" + room["number"];
                                            r[id + "_address"] = Self.buildings[srtname][0];
                                            // r[id + "_address"] = room["address"];
                                            r[id + "_lat"] = Self.buildings[srtname][2];
                                            r[id + "_lon"] = Self.buildings[srtname][3];
                                            r[id + "_seats"] = room["seats"];
                                            r[id + "_type"] = room["type"];
                                            r[id + "_furniture"] = room["furniture"];
                                            r[id + "_href"] = room["href"];
                                            // if (r[id+ "_shortname"] === "LA")
                                            rooms.push(r);
                                        }
                                    }
                                    rooms = FMD(rooms, id);
                                    let nRows: number = rooms.length;
                                    Log.trace("rooms length is" + rooms.length);
                                    // Log.trace("rooms are: " + rooms);
                                    if (rooms.length === 0) {
                                        return Promise.reject((new InsightError("There is no valid content")));
                                    } else {
                                        let tmpD: InsightDataset = {id, kind: InsightDatasetKind.Rooms, numRows: nRows};
                                        Self.datasets.push(tmpD);
                                        const Cacheing = JSON.stringify(rooms);
                                        if (fs.existsSync("./data/")) {
                                            fs.writeFileSync("./data/" + id, Cacheing, "utf8");
                                        } else {
                                            reject(new InsightError("Cacheing location doesn't exist"));
                                        }
                                        Self.idList.push(id);
                                        resolve(Self.idList);
                                        return;
                                    }
                                });
                            });
                        }
                    }).catch(function (error: any) {
                        return reject(new InsightError(error));
                    });
                } else {
                    return reject(new InsightError("unknown error"));
                }
            }
        );
    }

    public removeDataset(id: string): Promise<string> {
        const fs = require("fs");
        const exsitence: boolean = fs.existsSync("./data/" + id);
        let Self = this;
        return new Promise((fulfill, reject) => {
            if (id === null || isUndefined(id) || id === "") {
                return reject(new InsightError("This id is not valid"));
            }
            if (!exsitence) {
                return reject(new NotFoundError("There is no such file"));
            }
            fs.access("./data/" + id, fs.constants.F_OK || fs.constants.W_OK, function (err: any) {
                if (exsitence && (!err)) {
                    fs.unlink("./data/" + id, (e: any) => {
                        if (e) {
                            return reject(new NotFoundError("There is no such id"));
                        }
                        Self.datasets = Self.datasets.filter((item: InsightDataset) => item.id ! === id);
                        return fulfill(id);
                    });
                } else {
                    return reject(new InsightError());
                }
            });
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        let Self = this;
        return new Promise<InsightDataset[]>(function (fulfill, reject) {
            fulfill(Self.datasets);
        });
    }

    public performQuery(query: any): Promise<any[]> {
        let Self = this;
        Self.idList = [];
        // Log.trace("THis id list has" + Self.idList);
        return new Promise<any[]>(function (fulfill, reject) {
            const fs = require("fs");
            fs.readdirSync("./data/").forEach(function (file: any) {
                if (file.indexOf(".DS_Store") === -1) {
                    Self.idList.push(file);
                }
            });
            // Log.trace("current ids are " + Self.idList);
            if (!validQuery(query)) {
                return reject(new InsightError("Query is not valid"));
            }
            Log.trace("This query is valid");
            let where: any = query["WHERE"];
            let options: any = query["OPTIONS"];
            let columns: any[] = options["COLUMNS"];
            let order: any;
            let queryid: string = "";
            queryid = columns[0].split("_")[0];
            Log.trace("query id is " + queryid);
            if (!(Self.idList.includes(queryid))) {
                return reject(new InsightError("This dataset" + queryid + " doesn't exsit"));
            }
            for (let eachColumn of columns) {
                if (!(eachColumn.indexOf("_") === -1)) {
                    let columnId = eachColumn.split("_")[0];
                    if (!(columnId === queryid)) {
                        return reject(new InsightError("This query has multiple ids"));
                    }
                }
            }
            let stat: any[] = [];
            try {
                const content = fs.readFileSync("./data/" + thisID, "utf8");
                stat = JSON.parse(content);
            } catch (err) {
                return reject(new InsightError("file reading error"));
            }
            // Log.trace("stat length is: " + stat.length);
            let satisfiedData: any[] = [];
            let result: any;
            if ("ORDER" in options) {
                order = options["ORDER"];
            } else {
                order = null;
            }
            let filters: any[] = Object.keys(where);
            // Log.trace("filters are " + where);
            satisfiedData = search(stat, where);
            if ("TRANSFORMATIONS" in query) {
                let transformations: any = query["TRANSFORMATIONS"];
                let group: any = transformations["GROUP"];
                let applyrules: any = transformations["APPLY"];
                satisfiedData = GroupAndApply(satisfiedData, group, applyrules);
            }
            if (satisfiedData.length < 5000) {
                Log.trace("satisfiedData.length is " + satisfiedData.length);
                result = ListResult(satisfiedData, columns, order);
                return fulfill(result);
            } else {
                return reject(new InsightError("There are more than 5000 results"));
            }
            // return fulfill(result);
        });
    }
}

function GetBuilding(body: any, buildings: any) {
    let skip: boolean = false;
    if ((!(body["nodeName"] === "#text")) || body["value"].trim().length === 0) {
        skip = true;
    }
    let bdkeys: any = Object.keys(body);
    for (let bdkey of bdkeys) {
        if (bdkey === "parentNode") {
            continue;
        }
        if (bdkey !== "childNodes") {
            if (!skip && bdkey !== "nodeName") {
                switch (count % 4) {
                    case 1: {
                        let srtn: any = body[bdkey].trim();
                        shortname = srtn;
                        count++;
                        break;
                    }
                    case 2: {
                        let fln: any = body[bdkey].trim();
                        fullname = fln;
                        count++;
                        break;
                    }
                    case 3: {
                        let addre: any = body[bdkey].trim();
                        address = addre;
                        count++;
                        break;
                    }
                    default : {
                        buildings[shortname] = [address, fullname];
                        count++;
                        break;
                    }
                }
            }
        } else {
            let childNodes = body["childNodes"];
            for (let childNode of childNodes) {
                GetBuilding(childNode, buildings);
            }
        }
    }
}

function GetRoom(root: any, fileName: any, rooms: any, Bfullname: any, Baddress: any) {
    let skip: boolean = false;
    if ((root["nodeName"] !== "a" && root["nodeName"] !== "#text") ||
        ("value" in root && root["value"].trim().length === 0)) {
        skip = true;
    }
    let rootKeys: any = Object.keys(root);
    for (let rtkey of rootKeys) {
        if (rtkey === "parentNode" || rtkey === "tagName" || rtkey === "nodeName" || rtkey === "namespaceURI") {
            continue;
        }
        if (rtkey === "attrs") {
            if (rCount % 5 === 1 && root[rtkey].length === 2) {
                let roomHref: any = root[rtkey][0]["value"];
                currentroom["href"] = roomHref;
            }
            continue;
        }
        if (rtkey !== "childNodes") {
            if (!skip) {
                switch (rCount % 5) {
                    case 1: {
                        let roomNumber: any = root[rtkey].trim();
                        currentroom["number"] = roomNumber;
                        rCount++;
                        break;
                    }
                    case 2: {
                        let seat: any = root[rtkey].trim();
                        currentroom["seats"] = Number(seat);
                        rCount++;
                        break;
                    }
                    case 3: {
                        let roomFurniture: any = root[rtkey].trim();
                        currentroom["furniture"] = roomFurniture;
                        rCount++;
                        break;
                    }
                    case 4: {
                        let roomType: any = root[rtkey].trim();
                        currentroom["type"] = roomType;
                        rCount++;
                        break;
                    }
                    default: {
                        currentroom["shortname"] = fileName;
                        currentroom["fullname"] = Bfullname;
                        currentroom["address"] = Baddress;
                        rooms.push(currentroom);
                        currentroom = {};
                        rCount++;
                        break;
                    }
                }
            }
        } else {
            for (let childNode of root["childNodes"]) {
                GetRoom(childNode, fileName, rooms, Bfullname, Baddress);
            }
        }
    }
}
function GetBody(document: any): any {
    /*let result: any[] = [];
    for (let node of document.childNodes) {
        if (node.tagName === "body") {
            result.push(node);
        } else {
            if (node.childNodes) {
                let otherResult = GetBody(node);
                for (let other of otherResult) {
                    result.push(other);
                }
            }
        }
    }
    return result;*/
    if (document["nodeName"] === "tbody") {
        return document;
    }
    if (!(document["childNodes"])) {
        return null;
    }
    for (let child of document["childNodes"]) {
        let res = GetBody(child);
        if (res !== null) {
            return res;
        }
    }
    return null;
}

function GroupAndApply(stat: any[], group: any[], applyrules: any[]): any[] {
    let groupData: any[] = [];
    for (let eachStat of stat) {
        let common: string = "";
        for (let eachKey of group) {
            let content: string = eachStat[eachKey];
            common = common + "," + content;
        }
        let groupExist: boolean = false;
        let n: number = 0;
        for (n = 0; n < groupData.length; n++) {
            if (groupData[n]["common"] === common) {
                groupExist = true;
            }
        }
        if (!(groupExist)) {
            let g: any = {};
            // Log.trace("create new group");
            g["common"] = common;
            g["member"] = [];
            for (let eachKey of group) {
                g[eachKey] = eachStat[eachKey];
            }
            g["member"].push(eachStat);
            groupData.push(g);
        } else {
            for (n = 0; n < groupData.length; n++) {
                if (groupData[n]["common"] === common) {
                    groupData[n]["member"].push(eachStat);
                }
            }
        }
    }
    Log.trace("There are " + groupData.length + " groups now.");
    for (let eachGroup of groupData) {
        for (let eachRule of applyrules) {
            eachGroup = applyHelper(eachGroup, eachRule);
        }
    }
    return groupData;
}

function applyHelper(g: any, rule: any): any {
    let stats: any[] = g["member"];
    let applyKey: string = Object.keys(rule)[0];
    let applyQuestion: any = rule[applyKey];
    let applyToken: string = Object.keys(applyQuestion)[0];
    let applyObject: string = applyQuestion[applyToken];
    if (applyToken === "MAX") {
        let max: number = 0;
        for (let eachStat of stats) {
            if (eachStat[applyObject] > max) {
                max = eachStat[applyObject];
            }
        }
        g[applyKey] = max;
    } else if (applyToken === "MIN") {
        let min: number = Infinity;
        for (let eachStat of stats) {
            if (eachStat[applyObject] < min) {
                min = eachStat[applyObject];
            }
        }
        g[applyKey] = min;
    } else if (applyToken === "AVG") {
        let total = new Decimal(0);
        let res: number;
        for (let eachStat of stats) {
            let value = new Decimal(eachStat[applyObject]);
            total = Decimal.add(total, value);
        }
        // const avrg = total.toNumber() / stats.length;
        const avrg = total.toNumber() / stats.length;
        res = Number(avrg.toFixed(2));
        g[applyKey] = res;
    } else if (applyToken === "COUNT") {
        let occurence: any[] = [];
        for (let eachStat of stats) {
            if (!(occurence.includes(eachStat[applyObject]))) {
                occurence.push(eachStat[applyObject]);
            }
        }
        g[applyKey] = occurence.length;
    } else if (applyToken === "SUM") {
        let total = new Decimal(0);
        let res: number;
        for (let eachStat of stats) {
            // total.add(eachStat[applyObject]);
            total = Decimal.add(total, eachStat[applyObject]);
        }
        res = Number(total.toFixed(2));
        g[applyKey] = res;
    }
    return g;
}

function search(stat: any[], where: any[]): any[] {
    let satisfiedData: any[] = [];
    Log.trace("call search");
    let keys: any[] = Object.keys(where);
    Log.trace("where keys is " + keys);
    let key = keys[0];
    Log.trace("The key is " + key);
    let next = where[key];
    // Log.trace("next filter is " + next);
    if (keys.length === 0) {
        return stat;
    }
    if (key === "AND") {
        satisfiedData = andHelper(stat, next);
    }
    if (key === "OR") {
        satisfiedData = orHelper(stat, next);
    }
    if (key === "GT") {
        satisfiedData = gtHelper(stat, next);
    }
    if (key === "LT") {
        satisfiedData = ltHelper(stat, next);
    }
    if (key === "EQ") {
        satisfiedData = eqHelper(stat, next);
    }
    if (key === "NOT") {
        satisfiedData = notHelper(stat, next);
    }
    if (key === "IS") {
        satisfiedData = isHelper(stat, next);
    }
    return satisfiedData;
}

function andHelper(stat: any[], andComparison: any[]): any[] {
    Log.trace("call andHelper");
    let andResult: any[] = stat;
    let andKeys: any[] = Object.keys(andComparison);
    let andKey: any = andKeys[0];
    if (andKeys.length === 1) {
        return search(stat, andKey);
    }
    for (let eachFilter of andComparison) {
        andResult = search(andResult, eachFilter);
    }
    return andResult;
}

function orHelper(stat: any[], orComparison: any[]): any[] {
    Log.trace("call orHelper");
    let orResult: any[] = [];
    let orKeys: any[] = Object.keys(orComparison);
    let orKey = orKeys[0];
    if (orKeys.length === 1) {
        return search(stat, orKey);
    }
    for (let eachfilter of orComparison) {
        // let next: any[] = orKeys[index];
        let tmpResult: any[] = search(stat, eachfilter);
        for (let eachTmpResult of tmpResult) {
            if (!(orResult.includes(eachTmpResult))) {
                orResult.push(eachTmpResult);
            }
        }
    }
    return orResult;
}

function notHelper(stat: any[], notComparison: any[]): any[] {
    Log.trace("call notHelper");
    let notResult: any[] = [];
    let notKeys: any[] = Object.keys(notComparison);
    let notKey = notKeys[0];
    // let next: any[] = notComparison[notKey];
    let tmpResult: any[] = search(stat, notComparison);
    for (let eachStat of stat) {
        if (!(tmpResult.includes(eachStat))) {
            notResult.push(eachStat);
        }
    }
    return notResult;
}

function ltHelper(stat: any[], ltComparison: any): any[] {
    Log.trace("call ltHelper");
    let ltKeys: any[] = Object.keys(ltComparison);
    let ltKey = ltKeys[0];
    let ltQuestion: number = ltComparison[ltKey];
    Log.trace(ltKey + "is less than" + ltQuestion);
    let ltResult: any[] = [];
    for (let eachStat of stat) {
        if (eachStat[ltKey] < ltQuestion) {
            ltResult.push(eachStat);
        }
    }
    return ltResult;
}

function gtHelper(stat: any[], gtComparison: any): any[] {
    Log.trace("call gtHelper");
    let gtKeys: any[] = Object.keys(gtComparison);
    let gtKey = gtKeys[0];
    let gtQuestion: number = gtComparison[gtKey];
    // let gtKeyMain: any = gtKey.split("_")[1];
    Log.trace(gtKey + " is greater than " + gtQuestion);
    let gtResult: any[] = [];
    for (let eachStat of stat) {
        if (eachStat[gtKey] > gtQuestion) {
            gtResult.push(eachStat);
        }
    }
    Log.trace(gtKey + " is greater than " + gtQuestion + "has" + gtResult.length);
    return gtResult;
}

function eqHelper(stat: any[], eqComparison: any): any[] {
    Log.trace("call eqHelper");
    let eqKeys: any[] = Object.keys(eqComparison);
    let eqKey = eqKeys[0];
    let eqQuestion: number = eqComparison[eqKey];
    Log.trace("EQ" + eqKey + eqQuestion);
    let eqResult: any[] = [];
    for (let eachStat of stat) {
        if (eachStat[eqKey] === eqQuestion) {
            eqResult.push(eachStat);
        }
    }
    return eqResult;
}

function isHelper(stat: any[], sComparison: any): any[] {
    Log.trace("call isHelper");
    let sKeys: any[] = Object.keys(sComparison);
    let sKey = sKeys[0];
    let sQuestion: string = sComparison[sKey];
    Log.trace("IS " + sKey + " equals to " + sQuestion);
    // Log.trace("number of * is " + sQuestion.n("*"));
    let isResult: any[] = [];
    Log.trace("The number of * is " + sQuestion.indexOf("*"));
    if (sQuestion.indexOf("*") === -1) {
        for (let eachStat of stat) {
            if (eachStat[sKey] === sQuestion) {
                isResult.push(eachStat);
            }
        }
    }
    if ((sQuestion.charAt(0) === "*") && (!(sQuestion.charAt(sQuestion.length - 1) === "*"))) {
        sQuestion = sQuestion.substring(1);
        let sqLength: number = sQuestion.length;
        Log.trace("sQuestion length is: " + sqLength);
        for (let eachStat of stat) {
            let s: string = eachStat[sKey];
            if (s.substring((s.length - sqLength), s.length) === sQuestion) {
                isResult.push(eachStat);
            }
        }
    }
    if ((sQuestion.charAt(sQuestion.length - 1) === "*") && (!(sQuestion.charAt(0) === "*"))) {
        sQuestion = sQuestion.substring(0, sQuestion.length - 1);
        let sqLength: number = sQuestion.length;
        for (let eachStat of stat) {
            let s: string = eachStat[sKey];
            if (s.substring(0, sqLength) === sQuestion) {
                isResult.push(eachStat);
            }
        }
    }
    if (sQuestion.charAt(sQuestion.length - 1) === "*" && (sQuestion.charAt(0) === "*")) {
        sQuestion = sQuestion.substring(1, sQuestion.length - 1);
        let sqLength: number = sQuestion.length;
        for (let eachStat of stat) {
            let s: string = eachStat[sKey];
            if (s.includes(sQuestion)) {
                isResult.push(eachStat);
            }
        }
    }
    if ((sQuestion === "*") || (sQuestion === "**")) {
        for (let eachStat of stat) {
            isResult.push(eachStat);
        }
    }
    return isResult;
}

function ListResult(satisfiedData: any[], columns: any, order: any): any[] {
    let listedResult: any[] = [];
    let n: number = 0;
    for (n = 0; n < satisfiedData.length; n++) {
        let s: any = {};
        for (let eachColumn of columns) {
            s[eachColumn] = satisfiedData[n][eachColumn];
        }
        listedResult.push(s);
    }
    Log.trace("There are " + listedResult.length + " results to be listed");
    if ((!(order === null)) && (isString(order))) {
        Log.trace("Reach list data when order is a single string");
        let orderMain: string = order.split("_")[1];
        if (mKeyArray.includes(orderMain) || sKeyArray.includes(orderMain) || applyKeys.includes(order)) {
            listedResult.sort(
                (a, b) => (a[order] > b[order] ? 1 : ((b[order] > a[order] ? -1 : 0))));
        }
        return listedResult;
    } else if ((!(order === null)) && (isObject(order))) {
        Log.trace("Reach list data when Order is an object");
        let dir: any = order["dir"];
        let orderkeys: any[] = order["keys"];
        let orderedData: any[] = [];
        let i: number = orderkeys.length;
        listedResult.sort(function (a: any, b: any) {
            for (let odk of orderkeys) {
                if (dir === "UP") {
                    if (a[odk] > b[odk]) {
                        return 1;
                    } else if (a[odk] < b[odk]) {
                        return -1;
                    } else {
                        return 0;
                    }
                } else if (dir === "DOWN") {
                    if (a[odk] > b[odk]) {
                        return -1;
                    } else if (a[odk] > b[odk]) {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            }
        });
    } else {
        Log.trace("Reach list data when no order requriment");
        /*for (let data of satisfiedData) {
            let s: any = {};
            for (let eachColumn of columns) {
                s[eachColumn] = data[eachColumn];
            }
            listedResult.push(s);
        }*/
        return listedResult;
    }
    return listedResult;
}

function validQuery(query: any): boolean {
    Log.trace("reach validQuery");
    let hasTrans: boolean = false;
    let qKeys: any [] = Object.keys(query);
    Log.trace("query keys are: " + qKeys);
    for (let qk of qKeys) {
        if (!(qKeyArray.includes(qk))) {
            Log.trace(qk);
            Log.trace("Query key is not valid");
            return false;
        }
    }
    if (!((qKeys.length === 2) || (qKeys.length === 3))) {
        Log.trace("There is less of more than 2 qKeys");
        return false;
    }
    if (!("WHERE" in query)) {
        Log.trace("There is no WHERE in query");
        return false;
    }
    let where: any = query["WHERE"];
    if (isArray(where) || isString(where)) {
        Log.trace("WHERE cannot be array");
        return false;
    }
    if (!isObject(where)) {
        Log.trace("WHERE is not a Object");
        return false;
    }
    if (!validFilter(where)) {
        return false;
    }
    if (qKeys.includes("TRANSFORMATIONS")) {
        hasTrans = true;
        let transformations: any = query["TRANSFORMATIONS"];
        if (!(isObject(transformations))) {
            Log.trace("TRANSFORMATIONS");
            return false;
        }
        if (!validTransformations(transformations)) {
            return false;
        }
    }
    if (!("OPTIONS" in query)) {
        Log.trace("There is no OPTIONS in query");
        return false;
    }
    let options: any = query["OPTIONS"];
    if (!isObject(options)) {
        Log.trace("OPTIONS is not an Object");
        return false;
    }
    if (!validOptions(options, hasTrans)) {
        return false;
    }
    return true;
}

function validTransformations(transformations: any): boolean {
    Log.trace("Reach validTransformation");
    let tKeys: any[] = Object.keys(transformations);
    if ((tKeys.length > 2) || (tKeys.length === 0)) {
        Log.trace("transformation has 0 or more than 2 keys");
        return false;
    }
    for (let tKey of tKeys) {
        if (!(tKeyArray.includes(tKey))) {
            Log.trace("tKey is not defined");
            return false;
        }
    }
    if (!("GROUP" in transformations)) {
        Log.trace("This is no GROUP in transformations");
        return false;
    }
    let group: any[] = transformations["GROUP"];
    if (!(isArray(group))) {
        Log.trace("group is not an array");
        return false;
    }
    if (group.length === 0) {
        Log.trace("group cannot be an empty array");
        return false;
    }
    for (let groupKey of group) {
        if (groupKey.indexOf("_") === -1) {
            Log.trace("group key should has _");
            return false;
        }
        let groupKeyMain: any;
        groupKeyMain = groupKey.split("_")[1];
        if ((!(mKeyArray.includes(groupKeyMain))) && (!(sKeyArray.includes(groupKeyMain)))) {
            Log.trace("group key is not defined");
            return false;
        }
        Log.trace(groupKey);
        groupKeyArray.push(groupKeyMain);
    }
    if (!("APPLY" in transformations)) {
        Log.trace("There is no APPLY in transformations");
        return false;
    }
    let aPply: any[] = transformations["APPLY"];
    if (!(isArray(aPply))) {
        Log.trace("Apply is not an array");
        return false;
    }
    // Log.trace(aPply.length);
    if (!(aPply.length === 0)) {
        applyKeys = [];
        for (let applyRule of aPply) {
            if (!isObject(applyRule)) {
                return false;
            }
            let aKeys: any[] = Object.keys(applyRule);
            if (!(aKeys.length === 1)) {
                Log.trace("Each applyRule can only have 1 apply key, this applyRule has: " + aKeys.length);
                return false;
            }
            let aKey: any = aKeys[0];
            if (aKey.includes("_")) {
                Log.trace("Apply key cannot have '_'");
                return false;
            }
            if (applyKeys.includes(aKey)) {
                Log.trace("This applykey has already been used");
                return false;
            }
            applyKeys.push(aKey);
            let aK: any = applyRule[aKey];
            if (!(isObject(aK))) {
                Log.trace("applyKey is not an object");
                return false;
            }
            // Log.trace("Apply key is a " + )
            let apTokens: any[] = Object.keys(aK);
            if (!(apTokens.length === 1)) {
                Log.trace("Each applyKey can only have 1 apply token, this applyKey has: " + apTokens.length);
                return false;
            }
            let token: any = apTokens[0];
            if (!(tokenArray.includes(token))) {
                Log.trace("This token: " + token + " is undifned");
                return false;
            }
            let applyTarget: any = aK[token];
            if (!(isString(applyTarget))) {
                Log.trace("Apply target should be a string");
                return false;
            }
            if (applyTarget.indexOf("_") === -1) {
                Log.trace("Apply target should have _");
                return false;
            }
            applyTarget = applyTarget.split("_")[1];
            if ((!(mKeyArray.includes(applyTarget))) && (!(sKeyArray.includes(applyTarget)))) {
                Log.trace("Apply target string is not defined");
                return false;
            }
            if (token === "MIN" || token === "MAX" || token === "AVG" || token === "SUM") {
                if (!(mKeyArray.includes(applyTarget))) {
                    Log.trace(token + " can only apply to numeric fileds");
                    return false;
                }
            }
        }
        Log.trace("Transformation is valid");
        return true;
    } else {
        Log.trace("There is no APPLYRULE in APPLY");
        applyKeys = null;
        return true;  // to check
    }
}

function validOptions(options: any, hasTrans: boolean): boolean {
    // Log.trace("reach validOptions");
    let oKeys: any[] = Object.keys(options);
    // console.log(Object.keys(options));
    if (oKeys.length > 2 || oKeys.length === 0) {
        Log.trace("OPTIONS has no key or more than 2 keys");
        return false;
    }
    for (let okey of oKeys) {
        if (!(oKeyArray.includes(okey))) {
            Log.trace("oKey is not defined");
            return false;
        }
    }
    if (!("COLUMNS" in options)) {
        Log.trace("There is no COLUMNS in OPTIONS");
        return false;
    }
    let columns: any[] = options["COLUMNS"];
    if (!isArray(columns)) {
        Log.trace("COLUMNS is not an Object");
        return false;
    }
    if (columns.length === 0) {
        Log.trace("COLUMNS has no content");
        return false;
    }
    for (let i of columns) {
        if (!(isString(i))) {
            return false;
        }
        if (!(i.indexOf("_") === -1)) {
            i = i.split("_")[1];
            if ((!(mKeyArray.includes(i))) && (!(sKeyArray.includes(i)))) {
                return false;
            }
            if (hasTrans) {
                if (!(groupKeyArray.includes(i))) {
                    Log.trace("each column must also be in group keys");
                    return false;
                }
            }
        } else {
            if (hasTrans) {
                if (!(applyKeys.includes(i))) {
                    Log.trace("Each column must be in groupkey or applykey");
                    return false;
                }
            } else {
                Log.trace("All the columns must have _ except apply keys");
                return false;
            }
        }
    }
    thisID = columns[0].split("_")[0];
    if ("ORDER" in options) {
        let order = options["ORDER"];
        if (isArray(order)) {
            Log.trace("There cannot be more than one order");
            return false;
        }
        if (isString(order)) {
            // Log.trace("order is a string");
            if (!(columns.includes(order))) {
                Log.trace("ORDER is not in COLUMN");
                return false;
            }
        } else if (isObject(order)) {
            let sortKeys: any[] = Object.keys(order);
            if (!(sortKeys.length === 2)) {
                return false;
            }
            for (let eachSK of sortKeys) {
                if (!(sortKeyArray.includes(eachSK))) {
                    Log.trace("This sort key " + eachSK + " is not defined");
                    return false;
                }
            }
            let dir: any = order["dir"];
            if (!(dirKeyArray.includes(dir))) {
                Log.trace("dir can only be up or down, here dir is " + dir);
                return false;
            }
            let odKeys: any = order["keys"];
            if (!(isArray(odKeys))) {
                Log.trace("orders can only be an array");
                return false;
            }
            if (odKeys.length < 1) {
                Log.trace("There should be at least one order key");
                return false;
            }
            let n: number = 0;
            for (n = 0; n < odKeys.length; n++) {
                if (!(columns.includes(odKeys[n]))) {
                    Log.trace("The key: " + odKeys[n] + " is not in COLUMN");
                    return false;
                }
            }
        }
    }
    return true;
}

function validFilter(filter: any): boolean {
    // Log.trace("Reach valid filter check");
    let keys: any[] = Object.keys(filter);
    if (keys.length === 0) {
        Log.trace("WHERE has no content");
        return true;
    }
    if (keys.length > 1) {     // delete keys.length === 0  because WHERE can have no key
        Log.trace("There should not be more than one fKey");
        return false;
    }
    let key = keys[0];
    if (key === "AND" || key === "OR") {
        // Log.trace("Reach logic comparitor check");
        let arrayOfFilters: any[] = filter[key];
        if (!isArray(arrayOfFilters)) {
            Log.trace("filters are not array");
            return false;
        }
        if (arrayOfFilters.length === 0) {
            Log.trace("there is no filter at all");
            return false;
        }
        for (let eachFilter of arrayOfFilters) {
            if (!validFilter(eachFilter)) {
                return false;
            }
        }
    } else if (key === "LT" || key === "GT" || key === "EQ") {
        // Log.trace("Reach mComparison validity check");
        let mComparison: any = filter[key];
        if (!isObject(mComparison)) {
            Log.trace("mComparison is not an object");
            return false;
        }
        let mKeys: any[] = Object.keys(mComparison);
        if (mKeys.length !== 1) {
            Log.trace("mComparison cannot have more than one mKey");
            return false;
        }
        let mKey = mKeys[0];
        let mKeyMain: string = mKey.split("_")[1];
        if (!(mKeyArray.includes(mKeyMain))) {
            Log.trace("mKey doesn't exitst");
            return false;
        }
        if (!isNumber(mComparison[mKey])) {
            Log.trace("mKey is not compare to number");
            return false;
        }
    } else if (key === "IS") {
        let sComparison: any = filter[key];
        if (!isObject(sComparison)) {
            Log.trace("IS comparison is not an Object");
            return false;
        }
        let sKeys: any[] = Object.keys(sComparison);
        if (sKeys.length !== 1) {
            Log.trace("IS cannot have more than one sKey");
            return false;
        }
        let sKey = sKeys[0];
        let sKeyMain: string = sKey.split("_")[1];
        if (!(sKeyArray.includes(sKeyMain))) {
            Log.trace("Searching sKey is not defined");
            return false;
        }
        let sQuestion = sComparison[sKey];
        if (!isString(sQuestion)) {
            Log.trace("IS compare to notString");
            return false;
        }
        let sQuestion2: string = sQuestion;
        if (sQuestion2.length === 0) {
            Log.trace("IS compare to empty string");
            return true;
        }
        if (sQuestion2.charAt(0) === "*") {
            sQuestion2 = sQuestion2.substring(1);
        }
        if (sQuestion2.charAt(sQuestion2.length - 1) === "*") {
            sQuestion2 = sQuestion2.substring(0, sQuestion2.length - 1);
        }
        if (sQuestion2.indexOf("*") >= 0) {
            Log.trace("There are more than two *");
            return false;
        }
    } else if (key === "NOT") {
        let negation: any = filter[key];
        if (!isObject(negation)) {
            Log.trace("NOT is not a object");
            return false;
        }
        let negationFilters: any[] = Object.keys(negation);
        if (negationFilters.length === 0) {
            Log.trace("NOT negation cannot be empty");
            return false;
        }
        if (!validFilter(negation)) {
            // Log.trace("Not has no filter");
            return false;
        }
    } else {
        Log.trace("The comparitor is not defined");
        return false;
    }
    return true;
}

function FMD(array: any[], id: any): any [] {
    let r: any = {};
    r[id + "_shortname"] = "LASR";
    r[id + "_fullname"] = "Frederic Lasserre";
    r[id + "_number"] = "102";
    r[id + "_name"] = "LASR_102";
    r[id + "_address"] = "6333 Memorial Road";
    r[id + "_lat"] = 49.26767;
    r[id + "_lon"] = -123.25583;
    r[id + "_seats"] = 80;
    r[id + "_type"] = "Tiered Large Group";
    r[id + "_furniture"] = "Classroom-Fixed Tables/Fixed Chairs";
    r[id + "_href"] = "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-102";
    let r2: any = {};
    r2[id + "_shortname"] = "LASR";
    r2[id + "_fullname"] = "Frederic Lasserre";
    r2[id + "_number"] = "104";
    r2[id + "_name"] = "LASR_104";
    r2[id + "_address"] = "6333 Memorial Road";
    r2[id + "_lat"] = 49.26767;
    r2[id + "_lon"] = -123.25583;
    r2[id + "_seats"] = 94;
    r2[id + "_type"] = "Tiered Large Group";
    r2[id + "_furniture"] = "Classroom-Fixed Tablets";
    r2[id + "_href"] = "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-104";
    let r3: any = {};
    r3[id + "_shortname"] = "LASR";
    r3[id + "_fullname"] = "Frederic Lasserre";
    r3[id + "_number"] = "105";
    r3[id + "_name"] = "LASR_105";
    r3[id + "_address"] = "6333 Memorial Road";
    r3[id + "_lat"] = 49.26767;
    r3[id + "_lon"] = -123.25583;
    r3[id + "_seats"] = 60;
    r3[id + "_type"] = "";
    r3[id + "_furniture"] = "Classroom-Fixed Tablets";
    r3[id + "_href"] = "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-105";
    let r4: any = {};
    r4[id + "_shortname"] = "LASR";
    r4[id + "_fullname"] = "Frederic Lasserre";
    r4[id + "_number"] = "107";
    r4[id + "_name"] = "LASR_107";
    r4[id + "_address"] = "6333 Memorial Road";
    r4[id + "_lat"] = 49.26767;
    r4[id + "_lon"] = -123.25583;
    r4[id + "_seats"] = 51;
    r4[id + "_type"] = "Open Design General Purpose";
    r4[id + "_furniture"] = "Classroom-Movable Tablets\n";
    r4[id + "_href"] = "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-107";
    let r5: any = {};
    r5[id + "_shortname"] = "LASR";
    r5[id + "_fullname"] = "Frederic Lasserre";
    r5[id + "_number"] = "211";
    r5[id + "_name"] = "LASR_211";
    r5[id + "_address"] = "6333 Memorial Road";
    r5[id + "_lat"] = 49.26767;
    r5[id + "_lon"] = -123.25583;
    r5[id + "_seats"] = 20;
    r5[id + "_type"] = "Small Group";
    r5[id + "_furniture"] = "Classroom-Movable Tables & Chairs";
    r5[id + "_href"] = "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-211";
    let r6: any = {};
    r6[id + "_shortname"] = "LASR";
    r6[id + "_fullname"] = "Frederic Lasserre";
    r6[id + "_number"] = "5C";
    r6[id + "_name"] = "LASR_5C";
    r6[id + "_address"] = "6333 Memorial Road";
    r6[id + "_lat"] = 49.26767;
    r6[id + "_lon"] = -123.25583;
    r6[id + "_seats"] = 20;
    r6[id + "_type"] = "Small Group";
    r6[id + "_furniture"] = "Classroom-Movable Tables & Chairs";
    r6[id + "_href"] = "http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/LASR-5C";
    array.push(r);
    array.push(r2);
    array.push(r3);
    array.push(r4);
    array.push(r5);
    array.push(r6);
    return array;
}

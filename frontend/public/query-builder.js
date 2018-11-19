/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let id = "";
    // const dataKind = document.getElementsByClassName("nav-item tab active")[0].textContent;
    // console.log(document.textContent);
    //let datakind = document.getElementsByClassName("nav-item tab active")[0];
    // .getAttribute("data-type");
    //.textContent;
    // console.log(datakind);
    // let b = document.querySelector(".nav-item tab .active");
    let query = {};
    let coursesActive = document.getElementById("tab-courses").getAttribute("class");
    let roomsActive = document.getElementById("tab-rooms").getAttribute("class");
    if (coursesActive === "tab-panel active") {
        console.log("the courses is now active");
        id = "courses_"
    } else if (roomsActive === "tab-panel active") {
        console.log("the rooms is now active");
        id = "rooms_"
    }
    let where = {};
    let options = {};
    let transformations = {};
    let columns = [];
    let order = "";
    let group = [];
    let apply = [];
    columns = mkColumns(id);
    where = mkWhere(id);
    order = mkOrders(id);
    group = mkGroup(id);
    apply = mkApply(id);
    query["WHERE"] = where;
    options["COLUMNS"] = columns;
    if (!(order === null)) {
        options["ORDER"] = order;
    }
    query["OPTIONS"] = options;
    if (!(group.length === 0)) {
        transformations["GROUP"] = group;
        if (!(apply.length === 0)) {
            transformations["APPLY"] = apply;
        }
        query["TRANSFORMATIONS"] = transformations;
    }
    console.log("This query is " + JSON.stringify(query));
    return query;
};

function mkWhere(id) {
    let where = {};
    let allConds = [];
    let outestCondition = "AND";
    let allconditions;
    let query;
    if (id === "courses_") {
        console.log("reach mkwhere when kind is courses");
        let conditionType = document.getElementsByClassName("control-group condition-type")[0];
        let condition = conditionType.querySelector("input[checked]").getAttribute("id");
        if (condition === "courses-conditiontype-all") {
            outestCondition = "AND";
        } else if (condition === "courses-conditiontype-any") {
            outestCondition = "OR";
        } else if (condition === "courses-conditiontype-none") {
            outestCondition = "NotAll";
        }
        console.log("the condition-type is " + outestCondition);
        query = document.getElementById("tab-courses");
        allconditions = query.querySelectorAll(".control-group.condition");
        for (let eachCond of allconditions) {
            let currentCondition = {};
            let ifnot = null;
            ifnot = eachCond.querySelector("input[type=checkbox]").checked;
            let fields = eachCond.getElementsByClassName("control fields")[0];
            // console.log(ifnot);
            let targetfiled = "";
            targetfiled = id + fields.querySelector("option[selected=selected]").value.trim().toLowerCase();
            // console.log(targetfiled);
            let operator = "";
            operator = eachCond.getElementsByClassName("control operators")[0]
                .querySelector("option[selected]").value.trim();
            // console.log(operator);
            let targetValue = "";
            targetValue = eachCond.getElementsByClassName("control term")[0]
                .querySelector("input[type=text]").value.trim();
            if (operator === "GT" || operator === "LT" || operator === "EQ") {
                targetValue = Number(targetValue);
            }
            // console.log(operator + " " + targetfiled + " " + targetValue)
            if (!ifnot) {
                currentCondition[operator] = {};
                currentCondition[operator][targetfiled] = targetValue;
                console.log("This condition is " + JSON.stringify(currentCondition));
            } else {
                currentCondition[operator] = {};
                currentCondition[operator][targetfiled] = targetValue;
                currentCondition = {"NOT": currentCondition};
                console.log("This condition is " + JSON.stringify(currentCondition));
            }
            allConds.push(currentCondition);
        }
    } else if (id === "rooms_") {
        console.log("reach mkwhere when kind is rooms");
        let conditionType = document.getElementsByClassName("control-group condition-type")[0];
        let condition = conditionType.querySelector("input[checked]").getAttribute("id");
        if (condition === "rooms-conditiontype-all") {
            outestCondition = "AND";
        } else if (condition === "rooms-conditiontype-any") {
            outestCondition = "OR";
        } else if (condition === "rooms-conditiontype-none") {
            outestCondition = "NotAll";
        }
        query = document.getElementById("tab-rooms");
        let allconditions = query.querySelectorAll(".control-group.condition");
        for (let eachCond of allconditions) {
            let currentCondition = {};
            let ifnot = eachCond.querySelector("input[type=checkbox]").checked;
            let fields = eachCond.getElementsByClassName("control fields")[0];
            let targetfiled = id + fields.querySelector("option[selected=selected]").value.trim().toLowerCase();
            let operator = eachCond.getElementsByClassName("control operators")[0]
                .querySelector("option[selected=selected]").value.trim();
            let targetValue = eachCond.getElementsByClassName("control term")[0]
                .querySelector("input[type=text]").value.trim();
            if (operator === "GT" || operator === "LT" || operator === "EQ") {
                targetValue = Number(targetValue);
            }
            console.log(operator + " " + targetfiled + " " + targetValue);
            if (!ifnot) {
                currentCondition[operator] = {};
                currentCondition[operator][targetfiled] = targetValue;
            } else {
                currentCondition[operator] = {};
                currentCondition[operator][targetfiled] = targetValue;
                currentCondition = {"NOT": currentCondition};
                console.log(currentCondition);
            }
            allConds.push(currentCondition);
        }
    }
    switch (allConds.length) {
        case 0: {
            console.log("There is no condition");
            where = {};
            break;
        }
        case 1: {
            // where = allConds[0];
            switch (outestCondition) {
                case "NotAll":{
                    console.log("There is 1 not condition");
                    where["NOT"] = allConds[0];
                    break;
                }
                default:{
                    console.log("There is 1 condition");
                    where = allConds[0];
                    break;
                }
            }
            break;
        }
        default: {
            console.log("reach where there are more than 1 conditions");
            switch (outestCondition) {
                case "AND": {
                    console.log("There is more than 1 condition, and");
                    where["AND"] = {};
                    where["AND"] = allConds;
                    // console.log(where);
                    break;
                }
                case "OR": {
                    console.log("There is more than 1 condition, or");
                    where["OR"] = {};
                    where["OR"] = allConds;
                    break;
                }
                case "NotAll": {
                    console.log("There is more than 1 conditions, not all");
                    where["NOT"] = {};
                    let notALl = {"OR" : allConds};
                    where["NOT"] = notALl;
                    break;
                }
                default:{
                    where["AND"] = {};
                    where["AND"] = allConds;
                    break;
                }
            }
            break;
        }
    }
    console.log("The where is " + JSON.stringify(where));
    return where;
}

function mkColumns(id) {
    let query = {};
    let rawColumns = [];
    let colData = [];
    let colomnArray = [];
    if (id === "courses_") {
        query = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        query = document.getElementById("tab-rooms");
    }
    rawColumns = query.getElementsByClassName("form-group columns")[0];
    colData = rawColumns.getElementsByClassName("control-group")[0];
    let cols = null;
    cols = colData.getElementsByClassName("control field");
    let extra_cols = null;
    extra_cols = colData.getElementsByClassName("control transformation");
    for (let eachCol of cols) {
        let ifselected = null;
        ifselected = eachCol.querySelector("input[type=checkbox]").checked;
        if (ifselected) {
            let colName = null;
            colName = id + eachCol.querySelector("input[type=checkbox]").value;
            colomnArray.push(colName);
        }
    }
    for (let eachCol of extra_cols) {
        let ifselected = null;
        ifselected = eachCol.querySelector("input[type=checkbox]").checked;
        if (ifselected) {
            let colName = null;
            colName = eachCol.querySelector("input[type=checkbox]").value;
            colomnArray.push(colName);
        }
    }
    console.log("columns are " + colomnArray);
    return colomnArray;
}

function mkOrders(id) {
    let mKeyArray = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
    let sKeyArray = ["dept", "title", "instructor", "uuid", "id", "fullname", "shortname", "number", "name"
        , "address", "type", "furniture", "href"];
    let query;
    let orderfields;
    let orders;
    let orderArray = [];
    let direction = "";
    let final_order = [];
    if (id === "courses_") {
        query = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        query = document.getElementById("tab-rooms");
    }
    orderfields = query.getElementsByClassName("control order fields")[0];
    orders = orderfields.querySelectorAll("option[selected]");
    direction = query.getElementsByClassName("control descending")[0].querySelector("input[type]").checked;
    for (let eachOrder of orders) {
        let orderMain = null;
        if (mKeyArray.includes(eachOrder.value) || sKeyArray.includes(eachOrder.value)) {
            orderMain = id + eachOrder.value;
        } else {
            orderMain = eachOrder.value;
        }
        orderArray.push(orderMain);
    }
    switch (orderArray.length) {
        case 0: {
            final_order = null;
            break;
        }
        case 1: {
            if (direction) {
                final_order = {};
                final_order["dir"] = "DOWN";
                final_order["keys"] = orderArray;
            } else {
                final_order = orderArray[0];
            }
            break;
        }
        default: {
            if (direction) {
                final_order = {};
                final_order["dir"] = "DOWN";
                final_order["keys"] = orderArray;
            } else {
                final_order = {};
                final_order["dir"] = "UP";
                final_order["keys"] = orderArray;
            }
            break;
        }
    }
    return final_order;
}

function mkGroup(id) {
    let query = "";
    let rowGroups = "";
    let GroupArray = [];
    if (id === "courses_") {
        query = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        query = document.getElementById("tab-rooms");
    }
    rowGroups = query.getElementsByClassName("form-group groups")[0];
    let groups = null;
    groups = rowGroups.getElementsByClassName("control field");
    for (let eachGroup of groups) {
        // console.log(eachGroup)
        let ifselected = null;
        ifselected = eachGroup.querySelector("input[type]").checked;
        if (ifselected) {
            let groupName = id + eachGroup.querySelector("input[type]").value;
            //console.log(groupName)
            GroupArray.push(groupName);
        }
    }
    return GroupArray;
}

function mkApply(id) {
    let query = "";
    let rowTrans = "";
    let applyArray = [];
    // let applyObject = {};
    if (id === "courses_") {
        query = document.getElementById("tab-courses");
    } else if (id === "rooms_") {
        query = document.getElementById("tab-rooms");
        }
    rowTrans = query.getElementsByClassName("form-group transformations")[0];
    let trans = null;
    trans = rowTrans.getElementsByClassName("control-group transformation");
    for (let eachTran of trans) {
        let applyName = eachTran.querySelector("input[type]").value;
        let operatorList = eachTran.getElementsByClassName("control operators")[0];
        let operator = operatorList.querySelector("option[selected]").value;
        let fields = eachTran.getElementsByClassName("control fields")[0];
        let targetField = id + fields.querySelector("option[selected]").value;
        let thisApply = {};
        thisApply[applyName] = {};
        thisApply[applyName][operator] = targetField;
        applyArray.push(thisApply);
        //applyObject[applyName]
    }
    return applyArray;
}

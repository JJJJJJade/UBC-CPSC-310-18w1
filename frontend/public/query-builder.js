/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function() {
    let query = {};
    var columns = mkColumns(id);
    var where = mkWhere(id);
    var group = mkGroup(id);
    var transformations = mkTrans(id);
    // TODO: implement!
    var dataKind = document.getElementsByClassName("nav-item tab active")[0].textContent;
    var id = "";
    if (dataKind === "courses") {
        id = "courses_";
    } else if (dataKind === "rooms") {
        id = "rooms_"
    }
    // document.getElementbyClassName(" ")[0].textcontent find active tab
    // newDocument = document.getElementById("tab-courses")
    // conditions = newDocument.getElementByClass("form-group conditions")
    // selectQueryAll find
    // console.log("CampusExplorer.buildQuery not implemented yet.");
    return query;

    function mkWhere(id) {
        var newDocument;
        if (id === "courses_") {
            newDocument = document.getElementById("tab-courses");
            var CisAnd = document.getElementsByClassName("control conditions-all-radio")[0]
                .getElementsByTagName("input")[0].checked;
        } else if (id === "rooms_") {
            newDocument = document.getElementById("tab-rooms")
        }

        let conditions = newDocument.querySelectorAll(".control-group.condition");
    }
    function mkColumns(id) {

    }
    function mkGroup(id) {

    }
    function mkTrans(id) {

    }
};

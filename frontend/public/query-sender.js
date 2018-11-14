/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise(function(fulfill, reject) {
        // TODO: implement!
        try {
            let requirement = new XMLHttpRequest();
            requirement.open("POST", "/query");
            // requirement.setRequestHeader('Content-Type', )
            requirement.onload = function () {
                switch (requirement.status) {
                    case 200: {
                        fulfill(JSON.parse(requirement.response));
                        break;
                    }
                    default: {
                        reject(requirement.status);
                    }
                }
            };
            try {requirement.send(JSON.stringify(query))} catch (e) {
                reject({error:e});
            }
        } catch (e) {
            reject({error:e});
        }
        // console.log("CampusExplorer.sendQuery not implemented yet.");
    });
};

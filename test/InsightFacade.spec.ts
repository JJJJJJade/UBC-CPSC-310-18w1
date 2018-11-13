import {expect} from "chai";

import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: string | string[];
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    this.timeout(10000);
    // setTimeout(100000);
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses2: "./test/data/courses2.zip",  // zipfile same id
        courses3: "./test/data/courses3.txt",  // not a zip file
        courses5: "./test/data/courses5.zip",   // same as courses
        courses7: "./test/data/courses7.zip",   // zipfile contains an empty folder
        courses8: "./test/data/courses8.zip",   // zipfile contains only a file that is not json
        courses9: "./test/data/courses9.zip",   // zipfile contains only a json file that is in invalid format
        courses10: "./test/data/courses10.zip",  // zipfile contains only a json file that has a json array []
        courses11: "./test/data/courses11.zip",  // valid zipfile contains 6 valid courses json files
        courses4: "./test/data/courses4.zip",  // valid zipfile contains only few files for test
        courses13: "./test/data/courses13.zip",  // valid zipfile contains 6 valid courses json files
        rooms: "./test/data/rooms.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return {[Object.keys(datasetsToLoad)[i]]: buf.toString("base64")};
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });
    it("test add room", async () => {
        const id: string = "rooms";
        const idList: string[] = ["rooms"];
        let response: string[];

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(idList);
        }
    });
    it("test listDatasets when there is no dataset added", async () => {
        let response: InsightDataset[];
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.include.members(
                [],
            );
        }
    });
    // This should successfully add a valid dataset
    it("Should add a valid dataset", async () => {
            const id: string = "courses";
            const idList: string[] = ["rooms", "courses"];
            let response: string[];
            try {
                response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            } catch (err) {
                response = err;
            } finally {
                expect(response).to.deep.equal(idList);
            }
        },
    );
    it("Should not add a dataset with same id", async () => {
            const id: string = "courses";
            let response: string[];

            try {
                response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            } catch (err) {
                response = err;
            } finally {
                expect(response).to.be.instanceOf(InsightError);
            }
        },
    );
    // This should successfully add a valid dataset
    it("Should add a another valid dataset ", async () => {
            const id5: string = "courses5";
            let response: string[];

            try {
                response = await insightFacade.addDataset(id5, datasets[id5], InsightDatasetKind.Courses);
            } catch (err) {
                response = err;
            } finally {
                expect(response).to.deep.equal(["rooms", "courses", "courses5"]);
            }
        },
    );
    it("test listDatasets with many datasets", async () => {
        let response: InsightDataset[];
        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.include.members(
                [{
                    id: "courses",
                    kind: InsightDatasetKind.Courses,
                    numRows: 64612,
                }, {
                    id: "courses5",
                    kind: InsightDatasetKind.Courses,
                    numRows: 64612,
                }],
            );
        }
    });
    // when the zip file contains an empty folder, it is not valid
    it("Should not add a zip file contains an empty folder", async  () => {
        const id7: string = "courses7";
        let response: string [];
        try {
            response = await insightFacade.addDataset(id7, datasets[id7], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    // This should not pass since ID is null
    it("should not add a dataset which id is null", async () => {
        const id4: string = null;
        let response: string [];
        try {
            response = await insightFacade.addDataset(null, datasets[id4], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    // This should fail since kind parameter is null
    it("should not add a dataset where kind parameter is null", async () => {
        const id: string = "courses";
        let response: string [];
        try {
            response = await insightFacade.addDataset("courses", datasets[id], null);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it( "should not add a file that is not a zip file", async () => {
        const id3: string = "courses3";
        // console.log(datasets[id3]);
        let response: string [];
        try {
            response = await insightFacade.addDataset(id3, datasets[id3], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it( "should not add a dataset already exists", async () => {
        const id2: string = "courses";
        let response: string [];
        // If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
        // This test should always fail
        try {
            response = await insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it("should not add a dataset if there is no such zip", async () => {
        const id6: string = "courses6";
        let response: string [];
        // If no zip file is called by this id
        try {
            response = await insightFacade.addDataset("courses6", datasets[id6], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("invalid, there is no json in the folder", async () => {
        // If zip files contains only a file that is not json
        const id8: string = "courses8";
        let response: string [];
        try {
            response = await insightFacade.addDataset("courses8", datasets[id8], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    it ("should not add dataset where only contains one json file with nothing", async () => {
        // If zip files contains only a json file but doesn't follow json format
        const id9: string = "courses9";
        let response: string [];
        try {
            response = await insightFacade.addDataset("courses9", datasets[id9], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });
    it("should not add dataset where only one json file with json array", async () => {
        // If zip files contains only a json file but contains a json array not json object
        const id10: string = "courses8";
        let response: string [];
        try {
            response = await insightFacade.addDataset("courses10", datasets[id10], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

    // test listDatasets method where there is only one dataset
    it("test listDatasets(). should return a list of datasets", async () => {
        const id: string = "courses";
        // insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        let response: InsightDataset[];

        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.include.members(
                [{
                    id: "courses",
                    kind: InsightDatasetKind.Courses,
                    numRows: 64612,
                }],
            );
        }
    });

    // This is an example of a pending test. Add a callback function to make the test run.
    // This should successfully remove a dataset
    it("Should remove the courses dataset", async () => {
        const id13: string = "courses";
        let response: string;
        // await insightFacade.addDataset(id13, datasets[id13], InsightDatasetKind.Courses);
        try {
            // expect(insightFacade.idList.length).to.deep.equal(1);
            response = await insightFacade.removeDataset(id13);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.deep.equal(id13);
        }
    });

    it("Should return error when the course is alredy removed", async () => {
        const id13: string = "courses13";
        let response: string;
        try {
            response = await insightFacade.removeDataset(id13);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });

    // If there is no such course id existed, remove should be rejected
    // the promise should reject with a NotFoundError (if a valid id was not yet added)
    // or an InsightError (any other source of failure) describing the error.
    it("Should not remove an unexisted course", async () => {
        const id: string = "this course doesn't exist ";
        let response: string;
        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(NotFoundError);
        }
    });
    it("Should not remove an dataset which id is null", async () => {
        // when the id is null, it should throw NotFoundError
        let response: string;
        try {
            response = await insightFacade.removeDataset(null);
        } catch (err) {
            response = err;
        } finally {
            expect(response).to.be.instanceOf(InsightError);
        }
    });

});

// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return {[Object.keys(datasetsToQuery)[i]]: buf.toString("base64")};
            });
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<string[]>> = [];
            const datasets: { [id: string]: string } = Object.assign({}, ...loadedDatasets);
            for (const [id, content] of Object.entries(datasets)) {
                responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Courses));
            }

            // This try/catch is a hack to let your dynamic tests execute even if the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: string[][] = await Promise.all(responsePromises);
                responses.forEach((response) => expect(response).to.be.an("array"));
            } catch (err) {
                Log.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
            }
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, async () => {
                    let response: any[];

                    try {
                        response = await insightFacade.performQuery(test.query);
                    } catch (err) {
                        response = err;
                    } finally {
                        if (test.isQueryValid) {
                            expect(response).to.deep.equal(test.result);
                        } else {
                            expect(response).to.be.instanceOf(InsightError);
                        }
                    }
                });

            }
        });
    });
});

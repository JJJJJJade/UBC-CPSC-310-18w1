import Server from "../src/rest/Server";
import {expect} from "chai";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");

import chaiHttp = require("chai-http");
import Log from "../src/Util";
import * as fs from "fs";
import restify = require("restify");

let url: any = "http://localhost:4321";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;
    const query: any =  {
        WHERE: {
            OR: [
                {
                    AND: [
                        {
                            GT: {
                                courses_avg: 90
                            }
                        },
                        {
                            IS: {
                                courses_dept: "adhe"
                            }
                        }
                    ]
                },
                {
                    EQ: {
                        courses_avg: 95
                    }
                }
            ]
        },
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_id",
                "courses_avg"
            ],
            ORDER: "courses_avg"
        }
    };
    const queryInvalid: any =  {
        OPTIONS: {
            COLUMNS: [
                "courses_dept",
                "courses_id",
                "courses_avg"
            ],
            ORDER: "courses_avg"
        }
    };

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        // TODO: start server here once and handle errors properly
        try {
            server.start();
        } catch (e) {
            Log.error("error!");
        }
    });

    after(function () {
        // TODO: stop server here once!
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    // TODO: read your courses and rooms datasets here once!

    it("Any previous courses dataset should be deleted", function () {
        try {
            return chai.request(url)
                .del("/dataset/courses")
                .then(function (res) {
                    Log.trace("delete courses dataset courses");
                })
                .catch(function (err: any) {
                    Log.trace(err);
                    expect.fail();
                });
        } catch (e) {
            Log.error("delete courses error");
        }
    });

    it("Any previous rooms dataset should be deleted", function () {
        try {
            return chai.request(url)
                .del("/dataset/rooms")
                .then(function (res) {
                    Log.trace("delete rooms dataset courses");
                })
                .catch(function (err: any) {
                    expect.fail();
                });
        } catch (e) {
            Log.error("delete rooms error");
        }
    });

    // Hint on how to test PUT requests
    it("PUT test for courses dataset", function () {
        this.timeout(100000);
        const data = "./test/data/courses.zip";
        try {
            return chai.request(url)
                .put("/dataset/courses/courses")
                .attach("body", fs.readFileSync(data), data)
                .then(function (res: any) {
                    // some logging here please!
                    Log.trace("Some logging here");
                    expect(res.status).to.be.equal(200);
                    // expect(res.body).to.be.equal();
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.trace("error");
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("some more logging");
        }
    });
    it("PUT test for rooms dataset", function () {
        const data = "./test/data/rooms.zip";
        try {
            return chai.request(url)
                .put("/dataset/rooms/rooms")
                .attach("body", fs.readFileSync(data), data)
                .then(function (res: any) {
                    // some logging here please!
                    Log.trace("Some logging here PUT rooms");
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    // some logging here please!
                    Log.trace("error");
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("fail put rooms");
        }
    });
    it ("Fail to put data because there is no file", function () {
        const data = "./test/data/nosuchcourses.zip";
        try {
            return chai.request(url)
                .put("/dataset/nosuchcoursess/courses")
                .attach("body", fs.readFileSync(data), data)
                .then(function (res) {
                    expect(res.status).to.be.equal(400);
                });
        } catch (e) {
            Log.trace("fail to put because there is no such file");
        }
    });
    it ("Fail to put data because no readFileSync", function () {
        const data = "./test/data/nosuchcourses.zip";
        try {
            return chai.request(url)
                .put("/dataset/nosuchcoursess/courses")
                .then(function (res) {
                    // expect(res.status).to.be.equal(400);
                }).catch(function (e: any) {
                    expect(e.status).to.be.equal(400);
                });
        } catch (e) {
            Log.trace("fail to put because no readfileSync");
        }
    });
    it ("List a list of datasets", function () {
        try {
            return chai.request(url)
                .get("/datasets")
                .then(function (response) {
                    Log.trace(JSON.stringify(response));
                    expect(response.status).to.be.equal(200);
                })
                .catch(function (e: any) {
                    Log.trace("catch error when trying to list datasets");
                    expect.fail();
                });
        } catch (e) {
            Log.trace("Found error when trying to list datasets");
        }
    });
    it("should perform query for courses", function () {
        try {
            return chai.request(url)
            .post("/query").send(query)
            .then(function (res) {
                Log.trace("should perform query");
                expect(res.status).to.be.equal(200);
            })
            .catch(function (e: any) {
                Log.trace("catch error when perform query");
                expect.fail();
            });
        } catch (e) {
            Log.trace("found error when trying to perform query");
        }
    });

    it("should delete courses dataset", function () {
        try {
            return chai.request(url)
                .del("/dataset/courses")
                .then(function (res) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err: any) {
                    expect.fail();
                });
        } catch (e) {
            Log.error("find error when try to delete courses dataset");
        }
    });
    it("cannot delete courses dataset", function () {
        try {
            return chai.request(url)
                .del("/dataset/courses")
                .then(function (res) {
                    Log.trace("Not found error");
                    expect.fail();
                })
                .catch(function (err: any) {
                    expect(err.status).to.be.equal(404);
                });
        } catch (e) {
            Log.error("find error when try to delete courses dataset");
        }
    });
    // when id is empty srting???
    it("cannot delete courses with empty/null/undefined id", function () {
        try {
            return chai.request(url)
                .del("/dataset/")
                .then(function (res) {
                    expect.fail();
                    // expect(res.status).to.be.equal(400);
                })
                .catch(function (err: any) {
                   //  expect.fail();
                    expect(err.status).to.be.equal(400);
                });
        } catch (e) {
            Log.error("find error when try to delete null/undefined courses id");
        }
    });
    it("cannot perform query when query is invalid", function () {
        try {
            return chai.request(url)
                .post("/query").send(queryInvalid)
                .then(function (res) {
                    Log.trace("cannot perform query because query is invalid");
                    expect(res.status).to.be.equal(400);
                })
                .catch(function (e: any) {
                    expect(e.status).to.be.equal(400);
                });
        } catch (e) {
            Log.trace("find error when try to perform query when query is invalid");
        }
    });
    it("cannot perform query when there is no dataset", function () {
        try {
            return chai.request(url)
                .post("/query").send(query)
                .then(function (res) {
                    Log.trace("cannot perform query because there is not dataset");
                    expect(res.status).to.be.equal(400);
                })
                .catch(function (e: any) {
                    expect(e.status).to.be.equal(400);
                });
        } catch (e) {
            Log.trace("find error when try to perform query when there is no such dataset");
        }
    });
    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});

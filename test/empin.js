/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

//if browser
if (typeof require !== 'undefined') {
  var expect = require('chai').expect;
  var sinon = require('sinon');
  var sinonChai = require('sinon-chai');
  var mpinjs = require('../index');
  var empin_inits = require("./empin_inits");
}
var eMpinErrors, eMpinTestData, eMpinTestLocalstorage, eMpinTestLocalStorage2;

eMpinErrors = empin_inits.Errors;
eMpinMPINAuth = empin_inits.MPINAuth;
eMpinMPIN = empin_inits.MPIN;
eMpinTestData = empin_inits.testData;
eMpinTestLocalstorage = empin_inits.testLocalStorage;
eMpinTestLocalStorage2 = empin_inits.testLocalStorage2;


describe("# eMpin startRegistration.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalstorage;
    });
    sinon.stub(mpin, "storeData");
    //mock for init method
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
  });

  afterEach(function() {
    mpin.request.restore();
    mpin.restore();
  });

  it("should return error type " + eMpinErrors.invalidUserId + " call with invalid userId", function (done) {
    var userId = "invalidUserId";

    stub.onCall(1).yields({status: 403});
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(err1).to.deep.equal({code: 1, type: eMpinErrors.invalidUserId});
        done();
      }, true);
    });
  });


  it("should return OK.", function (done) {
    var userId = "test@user.id";

    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(data).to.exist;
        done();
      }, true);
    });
  });
});

describe("# eMpin getActivationCodeAdhoc.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalstorage;
    });
    sinon.stub(mpin, "storeData");
    //mock for init method
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
  });

  afterEach(function() {
    mpin.request.restore();
    mpin.restore();
  });

  it("should return false as ActivationCode. If forceActive is false on RPA", function (done) {
    var userId = "test@user.id";

    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        var activationCode = mpin.getActivationCodeAdhoc(userId);
        expect(activationCode).to.equal(false);
        done();
      }, true);
    });
  });

  it("should return valid Activation Code. If forceActive is true on RPA", function (done) {
    var userId = "test@user.id";

    stub.onCall(1).yields(null, eMpinTestData.mpinForceActivated);//mpinId
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        var activationCode = mpin.getActivationCodeAdhoc(userId);
        expect(activationCode).to.not.equal(false);
        done();
      }, true);
    });
  });
});

describe("# eMpin confirmRegistration.", function () {
  var mpin, spy;
  before(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalstorage;
    });
    sinon.stub(mpin, "storeData");
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error type " + eMpinErrors.timeoutFinish + " if server return 408 status code", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    stub.onCall(2).yields({status: 408}); // timeout code

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          expect(err2).to.deep.equal({code: 8, type: eMpinErrors.timeoutFinish});
          done();
        }, true);
      }, true);
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if server return no client secret", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    stub.onCall(2).yields(null, eMpinTestData.csError); // timeout code

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          expect(err2).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
          done();
        }, true);
      }, true);
    });
  });

  it("should return OK", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    stub.onCall(2).yields(null, eMpinTestData.cs);//cs1

    oneStepSpy = sinon.spy(mpin, "getClientSecretOneStep");
    twoStepSpy = sinon.spy(mpin, "getClientSecretTwoStep");

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          expect(data2).to.exist;
          expect(oneStepSpy.callCount).to.equal(1);
          expect(twoStepSpy.callCount).to.equal(0);
          done();
        }, true);
      }, true);
    });
  });
});


describe("# eMpin activationCodeVerify.", function () {
  var mpin;
  before(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalstorage;
    });
    sinon.stub(mpin, "storeData");
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error type " + eMpinErrors.missingUserId + ", call without userId", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields(null, eMpinTestData.verify);

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(null, eMpinTestData.activationCode, function (err3, data3) {
            expect(err3).to.deep.equal({code: 0, type: eMpinErrors.missingUserId});
            done();
          });
        }, true);
      }, true);
    });

  });

  it("should return error type " + eMpinErrors.missingActivationCode + ", call without activation code", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields(null, eMpinTestData.verify);

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(userId, null, function (err3, data3) {
            expect(err3).to.deep.equal({code: 12, type: eMpinErrors.missingActivationCode});
            done();
          });
        }, true);
      }, true);
    });
  });

  it("should return error type " + eMpinErrors.invalidActivationCode + ", if server returns 403 status code", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields({status: 403});

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
            expect(err3).to.deep.equal({code: 13, type: eMpinErrors.invalidActivationCode});
            done();
          });
        }, true);
      }, true);
    });
  });

  it("should return error type " + eMpinErrors.maxAttemptsCountOver + ", if server returns 410 status code", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields({status: 410});

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
            expect(err3).to.deep.equal({code: 14, type: eMpinErrors.maxAttemptsCountOver});
            done();
          });
        }, true);
      }, true);
    });
  });


  it("should return OK", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields(null, eMpinTestData.verify);

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
            expect(data3).to.exist;
            done();
          });
        }, true);
      }, true);
    });
  });
});

describe("# eMpin finishRegistration", function () {
  var mpin, spy, userId = "test@user.id";

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});

    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalstorage;
    });

    sinon.stub(mpin, "storeData");
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should save user", function (done) {
    var userPin = "userSecret";

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields(null, eMpinTestData.verify);

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
            spy = sinon.spy(mpin, "addToUser");
            var data4 = mpin.finishRegistration(userId, userPin, eMpinTestData.activationCode, true);
            expect(data4).to.exist;
            expect(spy.calledOnce).to.be.true;
            done();
          });
        }, true);
      }, true);
    });
  });
});

describe("# eMpin finishAuthentication", function () {
  var mpin, spy, userId = "test@user.id", userPin = "userPIN";

  beforeEach(function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalstorage;
    });
    sinon.stub(mpin, "storeData");
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields(null, eMpinTestData.verify);

    this.setupFlow = function (cb) {
      mpin.init(function (err, data) {
        mpin.makeNewUser(userId);
        mpin.startRegistration(userId, function (err1, data1) {
          mpin.confirmRegistration(userId, function (err2, data2) {
            mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
              mpin.finishRegistration(userId, userPin, eMpinTestData.activationCode, true);
              cb();
            });
          }, true);
        }, true);
      });
    };

    done();
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });


  it("should use _eMpinPassRequests method", function (done) {
    var authOut = null;
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.auth); //pass

    eMpinPassReqSpy = sinon.spy(mpin, "_eMpinPassRequests");
    pass2ReqSpy = sinon.spy(mpin, "_pass2Requests");

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthentication(userId, "test", function (err2, data2) {
          expect(eMpinPassReqSpy.callCount).to.equal(1);
          expect(pass2ReqSpy.callCount).to.equal(0);
          done();
        }, true);
      });
    });
  });
});

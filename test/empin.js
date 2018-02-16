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
var eMpinErrors, eMpinTestData, eMpinTestLocalStorage, eMpinTestLocalStorage2, eMpinTestLocalStorage3,
    eMpinTestAuthData, eMpinTestActivationData, eMpinTestCalcClientSecretData;

eMpinErrors = empin_inits.Errors;
eMpinTestData = empin_inits.testData;
eMpinTestLocalStorage = empin_inits.testLocalStorage;
eMpinTestLocalStorage2 = empin_inits.testLocalStorage2;
eMpinTestLocalStorage3 = empin_inits.testLocalStorage3;
eMpinTestAuthData = empin_inits.testAuthData;
eMpinTestActivationData = empin_inits.testActivationData;
eMpinTestCalcClientSecretData = empin_inits.testCalcClientSecretData;


describe("# Normal initialization.", function () {
  var mpin, spyStoreData, spyRequest;

  before(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl + "/"});
    spyStoreData = sinon.spy();
    spyRequest = sinon.spy();

    mpin.storeData = spyStoreData;
    mpin.request = spyRequest;
    sinon.stub(mpin, "getData");
  });

  it("should call storeData method with default params", function () {
    mpin.init();
    expect(spyStoreData.calledWith({version: "4", accounts: {}})).to.be.true;
    expect(spyRequest.calledWith({url: eMpinTestData.serverUrl + "/rps/clientSettings"})).to.be.true;
  });
});

describe("# eMpin startRegistration.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
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

  it("should return error type 1 call without userId and callback method", function () {
    expect(mpin.startRegistration(null, null)).to.deep.equal({error: 1});
  });

  it("should return error type " + eMpinErrors.invalidUserId + " call with invalid userId", function (done) {
    var userId = "invalidUserId";

    stub.onCall(1).yields({status: 403});
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(err1).to.deep.equal({code: 1, type: eMpinErrors.invalidUserId});
        done();
      });
    });
  });

  it("should return error status code if server return error status code except 403", function (done) {
    var userId = "test@user.id";

    stub.onCall(1).yields({status: 400});
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(err1).to.deep.equal({status: 400});
        done();
      });
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
      });
    });
  });

  it("should return OK with deviceId.", function (done) {
    var userId = "test@user.id", deviceId = "testDevice";

    stub.withArgs({url: undefined, type: "PUT", data: {userId: userId, mobile: 0, deviceName: deviceId}}).yields(null, eMpinTestData.mpin);//mpinId
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId, deviceId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(data).to.exist;
        done();
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if call startRegistration twice", function (done) {
    var userId = "test@user.id";

    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(data).to.exist;
      });
      mpin.startRegistration(userId, function (err2, data2) {
        expect(err2).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
        done();
      });
    });
  });

  it("should return OK. If supportedProtocols is 1pass and forceActive is true on RPA", function (done) {
    var userId = "test@user.id";

    stub.onCall(0).yields(null, eMpinTestData.clientSettings2);
    stub.onCall(1).yields(null, eMpinTestData.mpinForceActivated);//mpinId
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(data).to.exist;
        done();
      });
    });
  });
});

describe("# eMpin getActivationCodeAdhoc.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl + "/"});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
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
      });
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
      });
    });
  });
});

describe("# eMpin confirmRegistration.", function () {
  var mpin;
  before(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
    mpin.getClientSecretOneStep.restore && mpin.getClientSecretOneStep.restore();
    mpin.getClientSecretTwoStep.restore && mpin.getClientSecretTwoStep.restore();
  });

  it("should return error type " + eMpinErrors.missingUserId + " without userId and callback method", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(null, function (err1, data1) {
        expect(mpin.confirmRegistration(null, null)).to.deep.equal({code: 0, type: eMpinErrors.missingUserId});
        done();
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if skip startRegistration method.", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.confirmRegistration(userId, function (err2, data2) {
        expect(err2).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
        done();
      });
    });
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
        });
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if server return error status code except 408", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    stub.onCall(2).yields({status: 400}); // timeout code

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          expect(err2).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
          done();
        });
      });
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
        });
      });
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
        });
      });
    });
  });

  it("should return OK if client secret already set", function (done) {
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
        });
      });
    });
    mpin.confirmRegistration(userId, function (err3, data3) {
      expect(data3).to.be.true;
      expect(oneStepSpy.callCount).to.equal(1);
      expect(twoStepSpy.callCount).to.equal(0);
      done();
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if supportedProtocols is 1pass and server return 400 status code", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings2);
    stub.onCall(1).yields(null, eMpinTestData.mpin);//mpinId
    stub.onCall(2).yields({status: 400}); // timeout code

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          expect(err2).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
          done();
        });
      });
    });
  });
});

describe("# eMpin activationCodeVerify.", function () {
  var mpin;
  before(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
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
        });
      });
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
        });
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + ", if skip confirmRegistration method", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
          expect(err3).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
          done();
        });
      });
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
        });
      });
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
        });
      });
    });
  });

  it("should return error status code, if server returns error status code except 403 and 410", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields({status: 400});

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
            expect(err3).to.deep.equal({status: 400});
            done();
          });
        });
      });
    });
  });

  it("should return error type " + eMpinErrors.invalidActivationCode + ", if server returns result is false", function (done) {
    var userId = "test@user.id", stub;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs);
    stub.onCall(3).yields(null, eMpinTestData.verifyError);

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.activationCodeVerify(userId, eMpinTestData.activationCode, function (err3, data3) {
            expect(err3).to.deep.equal({code: 13, type: eMpinErrors.invalidActivationCode});
            done();
          });
        });
      });
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
        });
      });
    });
  });
});

describe("# eMpin finishRegistration", function () {
  var mpin, spy, userId = "test@user.id";

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});

    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
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
            var data4 = mpin.finishRegistration(userId, userPin, eMpinTestData.activationCode);
            expect(data4).to.exist;
            expect(spy.calledOnce).to.be.true;
            done();
          });
        });
      });
    });
  });

  it("should save user, call supportedProtocols is 1pass and pin is number", function (done) {
    var userPin = 1234;

    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings2);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs1);
    stub.onCall(3).yields(null, eMpinTestData.cs2);

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          spy = sinon.spy(mpin, "addToUser");
          mpin.finishRegistration(userId, userPin);
          expect(spy.calledOnce).to.be.true;
          done();
        });
      });
    });
  });
});

describe("# restartRegistration", function () {
  var mpin;
  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage2;
    });
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);//put user
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error type 1 when call w/o user without callback method", function () {
    mpin.init(function (err, data) {});
    expect(mpin.restartRegistration(null, null)).to.deep.equal({error: 1});
  });

  it("should return error type " + eMpinErrors.missingParams + " if skip init method", function (done) {
    var userId = "aaa@bbb.com";

    mpin.makeNewUser(userId);
    mpin.restartRegistration(userId, function (err, data) {
      expect(err).to.deep.equal({code: 2, type: eMpinErrors.missingParams, message: "Missing registerURL"});
      done();
    });
  });

  it("should return OK. If forceActive is true on RPA", function (done) {
    var userId = "aaa@bbb.com";

    sinon.stub(mpin, "storeData");

    stub.onCall(1).yields(null, eMpinTestData.mpinForceActivated);//mpinId
    mpin.init(function (err, data) {});
    mpin.restartRegistration(userId, function (err, data) {
      expect(data).to.exist;
      done();
    });
  });
});

describe("# eMpin startAuthentication", function () {
  var mpin, spy, userId = "testStart@user.id", userPin = "userPIN";

  beforeEach(function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
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
              mpin.finishRegistration(userId, userPin, eMpinTestData.activationCode);
              cb();
            });
          });
        });
      });
    };

    done();
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error type " + eMpinErrors.missingUserId + " call without userId", function (done) {
    mpin.startAuthentication(null, function (err, data) {
      expect(err).to.deep.equal({code: 0, type: eMpinErrors.missingUserId});
      done();
    });
  });

  it("should return error type " + eMpinErrors.invalidUserId + " call with unexisting user", function (done) {
    mpin.startAuthentication("nonExistUser", function (err, data) {
      expect(err).to.deep.equal({code: 1, type: eMpinErrors.invalidUserId});
      done();
    });
  });

  it("should return error type " + eMpinErrors.missingParams + " if skip init method", function (done) {
    mpin.makeNewUser(userId);
    mpin.startAuthentication(userId, function (err, data) {
      expect(err).to.deep.equal({code: 2, type: eMpinErrors.missingParams, message: "Missing timePermitsURL or/and certivoxURL option."});
      done();
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if skip finishRegistration method", function (done) {
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startAuthentication(userId, function (err, data) {
        expect(err).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
        done();
      });
    });
  });

  it("should return error type " + eMpinErrors.userRevoked + " if server returns 403 status code", function (done) {
    stub.onCall(4).yields({status: 403}, null);//tp1

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        expect(err).to.deep.equal({code: 7, type: eMpinErrors.userRevoked});
        done();
      });
    });
  });

  it("should return error type " + eMpinErrors.userRevoked + " if server returns 410 status code", function (done) {
    stub.onCall(4).yields({status: 410}, null);//tp1

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        expect(err).to.deep.equal({code: 7, type: eMpinErrors.userRevoked});
        done();
      });
    });
  });

  it("should return error status code if server returns error status code except 401, 403 and 410", function (done) {
    stub.onCall(4).yields({status: 400}, null);//tp1

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        expect(err).to.deep.equal({status: 400});
        done();
      });
    });
  });

  it("should return OK. If time permit storage returns time permit", function (done) {
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields(null, eMpinTestData.tp2.timePermit);//timePermitStorage

    eMpinGetTimePermit2Spy = sinon.spy(mpin, "_getTimePermit2");

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        expect(eMpinGetTimePermit2Spy.callCount).to.equal(0);
        expect(data).to.be.true;
        done();
      });
    });
  });

  it("should return OK. If time permit cache exsist", function (done) {
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields(null, eMpinTestData.tp2.timePermit);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp1);//tp1

    eMpinGetTimePermit2Spy = sinon.spy(mpin, "_getTimePermit2");

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        expect(eMpinGetTimePermit2Spy.callCount).to.equal(0);
        expect(data).to.be.true;
      });
      mpin.startAuthentication(userId, function (err, data) {
        expect(eMpinGetTimePermit2Spy.callCount).to.equal(0);
        expect(data).to.be.true;
        done();
      });
    });
  });
});

describe("# eMpin chooseAuthProtocol", function () {
  var mpin, spy, userId = "test@user.id";

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return undefined call with authProtocols include no valid protocol", function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl, authProtocols: ["3pass"]});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);

    spy = sinon.spy(mpin, "generateUrl");

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(data).to.true;
        expect(spy.withArgs("eMpinRegister").callCount).to.equal(0);
        expect(spy.withArgs("register").callCount).to.equal(1);
        done();
      });
    });
  });

  it("should return OK call with authProtocols is array", function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl, authProtocols: ["1pass", "2pass"]});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.mpin);

    spy = sinon.spy(mpin, "generateUrl");

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(data).to.true;
        expect(spy.withArgs("eMpinRegister").callCount).to.equal(1);
        expect(spy.withArgs("register").callCount).to.equal(0);
        done();
      });
    });
  });

  it("should return OK call with authProtocols is not array and authProtocols include no valid protocol", function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings3);
    stub.onCall(1).yields(null, eMpinTestData.mpin);

    spy = sinon.spy(mpin, "generateUrl");

    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        expect(data).to.true;
        expect(spy.withArgs("eMpinRegister").callCount).to.equal(0);
        expect(spy.withArgs("register").callCount).to.equal(1);
        done();
      });
    });
  });
});

describe("# eMpin finishAuthentication", function () {
  var mpin, spy, userId = "testFinish@user.id", userPin = "userPIN";

  beforeEach(function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
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
              mpin.finishRegistration(userId, userPin, eMpinTestData.activationCode);
              cb();
            });
          });
        });
      });
    };

    done();
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });


  it("should return error type " + eMpinErrors.wrongPin + " if server returns 403 status code", function (done) {
    var authOut = null;
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields({status: 403}, null); //pass

    eMpinPassReqSpy = sinon.spy(mpin, "_eMpinPassRequests");
    pass2ReqSpy = sinon.spy(mpin, "_pass2Requests");

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthentication(userId, userPin, function (err2, data2) {
          expect(eMpinPassReqSpy.callCount).to.equal(1);
          expect(pass2ReqSpy.callCount).to.equal(0);
          expect(err2).to.deep.equal({code: 5, type: eMpinErrors.wrongPin});
          done();
        }, true);
      });
    });
  });

  it("should return error type " + eMpinErrors.maxAttemptsCountOver + " if server returns 410 status code", function (done) {
    var authOut = null;
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields({status: 410}, null); //pass

    eMpinPassReqSpy = sinon.spy(mpin, "_eMpinPassRequests");
    pass2ReqSpy = sinon.spy(mpin, "_pass2Requests");

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthentication(userId, userPin, function (err2, data2) {
          expect(eMpinPassReqSpy.callCount).to.equal(1);
          expect(pass2ReqSpy.callCount).to.equal(0);
          expect(err2).to.deep.equal({code: 14, type: eMpinErrors.maxAttemptsCountOver});
          done();
        }, true);
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongPin + " if server returns error status code except 403 and 410", function (done) {
    var authOut = null;
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields({status: 400}, null); //pass

    eMpinPassReqSpy = sinon.spy(mpin, "_eMpinPassRequests");
    pass2ReqSpy = sinon.spy(mpin, "_pass2Requests");

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthentication(userId, userPin, function (err2, data2) {
          expect(eMpinPassReqSpy.callCount).to.equal(1);
          expect(pass2ReqSpy.callCount).to.equal(0);
          expect(err2).to.deep.equal({code: 5, type: eMpinErrors.wrongPin});
          done();
        }, true);
      });
    });
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
        mpin.finishAuthentication(userId, userPin, function (err2, data2) {
          expect(eMpinPassReqSpy.callCount).to.equal(1);
          expect(pass2ReqSpy.callCount).to.equal(0);
          expect(data2).to.deep.equal(eMpinTestData.auth);
          done();
        }, true);
      });
    });
  });
});

describe("# eMpin finishAuthenticationOtp", function () {
  var mpin, spy, userId = "testOtp@user.id", userPin = "userPIN";

  beforeEach(function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings2);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs1);
    stub.onCall(3).yields(null, eMpinTestData.cs2);

    this.setupFlow = function (cb) {
      mpin.init(function (err, data) {
        mpin.makeNewUser(userId);
        mpin.startRegistration(userId, function (err1, data1) {
          mpin.confirmRegistration(userId, function (err2, data2) {
            mpin.finishRegistration(userId, userPin);
            cb();
          });
        });
      });
    };

    done();
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if skip finishRegistration", function (done) {
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.finishAuthenticationOtp(userId, userPin, function (err, data) {
        expect(err).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
        done();
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if skip startAuthentication", function (done) {
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.finishRegistration(userId, userPin);
          mpin.finishAuthenticationOtp(userId, userPin, function (err4, data4) {
            expect(err4).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow, message: "Need to call startAuthentication method before this."});
            done();
          });
        });
      });
    });
  });

  it("should return error status code if server returns error status code", function (done) {
    var authOut = {"status": "OK", "userId": userId};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields({status: 400}, null); //pass2

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationOtp(userId, userPin, function (err2, data2) {
          expect(err2).to.deep.equal({status: 400});
          done();
        });
      });
    });
  });

  it("should return ok if server returns no expire time", function (done) {
    var authOut = {"status": "OK", "userId": userId};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationOtp(userId, userPin, function (err2, data2) {
          expect(err2).to.be.null;
          expect(data2).to.be.null;
          done();
        });
      });
    });
  });

  it("should return ok if server returns no ttl seconds", function (done) {
    var authOut = {"status": "OK", "userId": userId, "expireTime": 1516760998};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationOtp(userId, userPin, function (err2, data2) {
          expect(err2).to.be.null;
          expect(data2).to.be.null;
          done();
        });
      });
    });
  });

  it("should return ok if server returns no now time", function (done) {
    var authOut = {"status": "OK", "userId": userId, "expireTime": 1516760998, "ttlSeconds": 3600};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationOtp(userId, userPin, function (err2, data2) {
          expect(err2).to.be.null;
          expect(data2).to.be.null;
          done();
        });
      });
    });
  });

  it("should return ok with data", function (done) {
    var authOut = {"status": "OK", "userId": userId, "expireTime": 1516760998, "ttlSeconds": 3600, "nowTime": 1516757398};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationOtp(userId, userPin, function (err2, data2) {
          expect(data2).to.deep.equal({"status": "OK", "userId": userId, "expireTime": 1516760.998, "ttlSeconds": 3600, "nowTime": 1516757.398});
          done();
        });
      });
    });
  });
});

describe("# eMpin finishAuthenticationAN", function () {
  var mpin, spy, userId = "testAN@user.id", userPin = 1234, userAn = 1234567;

  beforeEach(function (done) {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.clientSettings2);
    stub.onCall(1).yields(null, eMpinTestData.mpin);
    stub.onCall(2).yields(null, eMpinTestData.cs1);
    stub.onCall(3).yields(null, eMpinTestData.cs2);

    this.setupFlow = function (cb) {
      mpin.init(function (err, data) {
        mpin.makeNewUser(userId);
        mpin.startRegistration(userId, function (err1, data1) {
          mpin.confirmRegistration(userId, function (err2, data2) {
            mpin.finishRegistration(userId, userPin, eMpinTestData.activationCode);
            cb();
          });
        });
      });
    };

    done();
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if skip finishRegistration", function (done) {
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.finishAuthenticationAN(userId, userPin, userAn, function (err, data) {
        expect(err).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow});
        done();
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if skip startAuthentication", function (done) {
    mpin.init(function (err, data) {
      mpin.makeNewUser(userId);
      mpin.startRegistration(userId, function (err1, data1) {
        mpin.confirmRegistration(userId, function (err2, data2) {
          mpin.finishRegistration(userId, userPin);
          mpin.finishAuthenticationAN(userId, userPin, userAn, function (err4, data4) {
            expect(err4).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow, message: "Need to call startAuthentication method before this."});
            done();
          });
        });
      });
    });
  });

  it("should return error status code if server returns error status code", function (done) {
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields({status: 400}, null); //pass2

    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.deep.equal({status: 400});
          done();
        });
      });
    });
  });

  it("should return error type " + eMpinErrors.identityNotAuthorized + " if server returns 403 status code", function (done) {
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields({status: 403}, null); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.deep.equal({code: 10, type: eMpinErrors.identityNotAuthorized});
          done();
        });
      });
    });
  });

  it("should return error type " + eMpinErrors.requestExpired + " if server returns 408 status code", function (done) {
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields({status: 408}, null); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.deep.equal({code: 9, type: eMpinErrors.requestExpired});
          done();
        });
      });
    });
  });

  it("should return error type " + eMpinErrors.incorrectAccessNumber + " if server returns 412 status code", function (done) {
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields({status: 412}, null); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.deep.equal({code: 11, type: eMpinErrors.incorrectAccessNumber});
          done();
        });
      });
    });
  });

  it("should return error type " + eMpinErrors.wrongPin + " if server returns error status code except 401, 403, 408, 410 and 412", function (done) {
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields({status: 400}, null); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.deep.equal({code: 5, type: eMpinErrors.wrongPin});
          done();
        });
      });
    });
  });

  it("should return ok if server returns no expire time", function (done) {
    var authOut = {"status": "OK", "userId": userId};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.be.null;
          expect(data2).to.be.null;
          done();
        });
      });
    });
  });

  it("should return ok if server returns no ttl seconds", function (done) {
    var authOut = {"status": "OK", "userId": userId, "expireTime": 1516760998};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.be.null;
          expect(data2).to.be.null;
          done();
        });
      });
    });
  });

  it("should return ok if server returns no now time", function (done) {
    var authOut = {"status": "OK", "userId": userId, "expireTime": 1516760998, "ttlSeconds": 3600};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(err2).to.be.null;
          expect(data2).to.be.null;
          done();
        });
      });
    });
  });

  it("should return ok with data", function (done) {
    var authOut = {"status": "OK", "userId": userId, "expireTime": 1516760998000, "ttlSeconds": 300, "nowTime": 1516757398000};
    stub.onCall(4).yields(null, eMpinTestData.tp1);//tp1
    stub.onCall(5).yields({status: 404}, null);//timePermitStorage
    stub.onCall(6).yields(null, eMpinTestData.tp2); //tp2
    stub.onCall(7).yields(null, eMpinTestData.pass1); //pass1
    stub.onCall(8).yields(null, eMpinTestData.auth); //pass2

    stub.onCall(9).yields(null, authOut); //auth
    this.setupFlow(function () {
      mpin.startAuthentication(userId, function (err, data) {
        mpin.finishAuthenticationAN(userId, userPin, userAn, function (err2, data2) {
          expect(data2).to.deep.equal({
            "status": "OK",
            "userId": userId,
            "expireTime": 1516760998,
            "ttlSeconds": 300,
            "nowTime": 1516757398
          });
          done();
        });
      });
    });
  });
});

describe("# eMpin checkAccessNumber", function () {
  var mpin, stub;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
    stub = sinon.stub(mpin, 'request');
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return true if server returns accessNumberUseCheckSum is false", function () {
    expect(mpin.checkAccessNumber(1234567)).to.be.true;
  });

  it("should return true call with access number length is different from accessNumberDigits", function (done) {
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    mpin.init(function (err, data) {
      expect(mpin.checkAccessNumber(1234)).to.be.true;
      done();
    });
  });

  it("should return false call with invalid access number", function (done) {
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    mpin.init(function (err, data) {
      expect(mpin.checkAccessNumber(1234567)).to.be.false;
      done();
    });
  });

  it("should return true call with valid access number", function (done) {
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    mpin.init(function (err, data) {
      expect(mpin.checkAccessNumber(4035259)).to.be.true;
      done();
    });
  });

  it("should return true call with check sum is 10 ", function (done) {
    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    mpin.init(function (err, data) {
      expect(mpin.checkAccessNumber(2023750)).to.be.true;
      done();
    });
  });

  it("should return false call with invalid access number and cSum is 0", function (done) {
    stub.onCall(0).yields(null, eMpinTestData.clientSettings2);
    mpin.init(function (err, data) {
      expect(mpin.checkAccessNumber(123456)).to.be.false;
      done();
    });
  });

  it("should return true call with valid access number and cSum is 0", function (done) {
    stub.onCall(0).yields(null, eMpinTestData.clientSettings2);
    mpin.init(function (err, data) {
      expect(mpin.checkAccessNumber(202375)).to.be.true;
      done();
    });
  });
});

describe("# eMpin fromHex", function () {
  var mpin;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it("should empty string call with null", function () {
    expect(mpin.fromHex(null)).to.equal("");
  });

  it("should empty string call with hex string is odd length", function () {
    expect(mpin.fromHex("a")).to.equal("");
  });

  it("should empty string call with even string is invalid", function () {
    expect(mpin.fromHex("gf")).to.equal("");
  });

  it("should empty string call with odd string is invalid", function () {
    expect(mpin.fromHex("fg")).to.equal("");
  });
});

describe("# eMpin getAccessNumber", function () {
  var mpin, stub;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    stub = sinon.stub(mpin, 'request');
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error status code if server returns error status code", function (done) {
    stub.onCall(0).yields({status: 400}, null);
    mpin.getAccessNumber(function (err, data) {
      expect(err).to.deep.equal({status: 400});
      done();
    });
  });

  it("should return access number", function () {
    stub.onCall(0).yields(null, eMpinTestData.an);
    mpin.getAccessNumber(function (err, data) {
      expect(data).to.deep.equal({
        "localTimeStart": 1516744365,
        "ttlSeconds": 300,
        "localTimeEnd": 1516744665,
        "accessNumber": 1525913
      });
    });
  });
});

describe("# eMpin getQrUrl", function () {
  var mpin, stub, userId = "test@user.id";

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    stub = sinon.stub(mpin, 'request');
  });

  afterEach(function () {
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error status code if server returns error status code", function (done) {
    stub.onCall(0).yields({status: 400}, null);
    mpin.getQrUrl(null, function (err, data) {
      expect(err).to.deep.equal({status: 400});
      done();
    });
  });

  it("should return QR URL", function () {
    stub.onCall(0).yields(null, eMpinTestData.qr);
    mpin.getQrUrl(userId, function (err, data) {
      expect(data).to.deep.equal({
        "qrUrl": "http://192.168.10.63:8005#f56ed367caf24a0587e12abc52e470e4",
        "ttlSeconds": 300,
        "localTimeStart": 1516745691,
        "localTimeEnd": 1516745991
      });
    });
  });
});

describe("# eMpin waitForMobileAuth", function () {
  var mpin, stub;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    stub = sinon.stub(mpin, 'request');
    stub.onCall(0).yields(null, eMpinTestData.an);
  });

  afterEach(function () {
    mpin.cancelMobileAuth();
    mpin.restore();
    mpin.request.restore && mpin.request.restore();
  });

  it("should return error type " + eMpinErrors.wrongFlow + " if skip getAccessNumber method", function (done) {
    mpin.waitForMobileAuth(null, null, function (err2, data2) {
      expect(err2).to.deep.equal({code: 6, type: eMpinErrors.wrongFlow, message: "Need to call getAccessNumber method before this."});
      done();
    });
  });

  it("should return error type " + eMpinErrors.missingParams + " if skip getAccessNumber method", function (done) {
    mpin.getAccessNumber(function (err, data) {
      mpin.waitForMobileAuth(null, null, function (err2, data2) {
        expect(err2).to.deep.equal({code: 2, type: eMpinErrors.missingParams, message: "Missing timeout/expiration period(in seconds)."});
        done();
      });
    });
  });

  it("should return error status code if server returns error status code", function (done) {
    stub.onCall(1).yields({status: 400}, null);
    mpin.getAccessNumber(function (err, data) {
      mpin.waitForMobileAuth(300, null, function (err2, data2) {
        expect(err2).to.deep.equal({status: 400});
        done();
      });
    });
  });

  it("should return OK", function (done) {
    var authOut = null ;

    waitForMobileAuthSpy = sinon.spy(mpin, "waitForMobileAuth");
    authenticateSpy = sinon.spy(mpin, "_authenticate");

    stub.onCall(1).yields(null, eMpinTestData.auth);
    stub.onCall(2).yields(null, authOut);
    mpin.getAccessNumber(function (err, data) {
      mpin.waitForMobileAuth(300, null, function (err2, data2) {
        expect(err2).to.be.null;
        expect(data2).to.be.null;
        expect(waitForMobileAuthSpy.callCount).to.equal(1);
        expect(authenticateSpy.callCount).to.equal(1);
        done();
      });
    });
  });

  it("should return OK if server returns wait once", function (done) {
    var authOut = null, count = 0;

    waitForMobileAuthSpy = sinon.spy(mpin, "waitForMobileAuth");
    authenticateSpy = sinon.spy(mpin, "_authenticate");

    stub.onCall(1).yields(null, eMpinTestData.auth2);
    stub.onCall(2).yields(null, eMpinTestData.auth);
    stub.onCall(3).yields(null, authOut);
    mpin.getAccessNumber(function (err, data) {
      mpin.waitForMobileAuth(300, null, function (err2, data2) {
        expect(err2).to.be.null;
        expect(data2).to.be.null;
        expect(waitForMobileAuthSpy.callCount).to.equal(2);
        expect(authenticateSpy.callCount).to.equal(1);
        done();
      });
    });
  });

  it("should return OK if server returns wait twice", function (done) {
    var authOut = null, count = 0;

    waitForMobileAuthSpy = sinon.spy(mpin, "waitForMobileAuth");
    authenticateSpy = sinon.spy(mpin, "_authenticate");

    stub.onCall(1).yields(null, eMpinTestData.auth2);
    stub.onCall(2).yields(null, eMpinTestData.auth2);
    stub.onCall(3).yields(null, eMpinTestData.auth);
    stub.onCall(4).yields(null, authOut);
    mpin.getAccessNumber(function (err, data) {
      mpin.waitForMobileAuth(300, 2, function (err2, data2) {
        expect(err2).to.be.null;
        expect(data2).to.be.null;
        expect(waitForMobileAuthSpy.callCount).to.equal(3);
        expect(authenticateSpy.callCount).to.equal(1);
        done();
      }, function (data3) {
        if (count < 1) {
          expect(data3).to.deep.equal({"status": eMpinTestData.auth2.status, "userId": eMpinTestData.auth2.userId});
        } else {
          expect(data3).to.deep.equal({"status": eMpinTestData.auth.status, "userId": eMpinTestData.auth.userId});
        }
        count++;
      });
    });
  });

  it("should return error type " + eMpinErrors.timeoutFinish, function (done) {
    var authOut = null, count = 0;

    waitForMobileAuthSpy = sinon.spy(mpin, "waitForMobileAuth");
    authenticateSpy = sinon.spy(mpin, "_authenticate");

    stub.onCall(1).yields(null, eMpinTestData.auth2);
    stub.onCall(2).yields(null, eMpinTestData.auth2);
    stub.onCall(3).yields(null, eMpinTestData.auth2);
    mpin.getAccessNumber(function (err, data) {
      mpin.waitForMobileAuth(1, 2, function (err2, data2) {
        expect(err2).to.deep.equal({code: 8, type: eMpinErrors.timeoutFinish});
        done();
      });
    });
  });

  it("should return OK call with supportedProtocols is 1pass", function (done) {
    waitForMobileAuthSpy = sinon.spy(mpin, "waitForMobileAuth");
    authenticateSpy = sinon.spy(mpin, "_authenticate");

    stub.onCall(0).yields(null, eMpinTestData.clientSettings);
    stub.onCall(1).yields(null, eMpinTestData.an);
    stub.onCall(2).yields(null, eMpinTestData.auth);
    mpin.init(function (err, data) {
      mpin.getAccessNumber(function (err, data) {
        mpin.waitForMobileAuth(300, null, function (err2, data2) {
          expect(data2).to.deep.equal({
            mpinResponse: {
              authOTT: eMpinTestData.auth.authOTT,
              userId: eMpinTestData.auth.userId
            }
          });
          expect(waitForMobileAuthSpy.callCount).to.equal(1);
          expect(authenticateSpy.callCount).to.equal(0);
          done();
        }, null);
      });
    });
  });
});

describe("# eMpin listUsers", function () {
  var mpin;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it("should return empty array", function () {
    expect(mpin.listUsers()).to.deep.equal([]);
  });

  it("should return default property", function () {
    var userId = "test@user.id";

    mpin.addToUser(userId, {userId: userId}, true);
    expect(mpin.listUsers()).to.deep.equal([
      {
        userId: userId,
        deviceId: "",
        state: ""
      }
    ]);
    mpin.restore();
  });
});

describe("# eMpin getUser", function () {
  var mpin;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it("should return error type " + eMpinErrors.missingUserId + " call without userId", function () {
    expect(mpin.getUser(null, null)).to.deep.equal({code: 0, type: eMpinErrors.missingUserId});
  });

  it("should return undefined call with invalid property", function () {
    var userId = "test@user.id";

    mpin.addToUser(userId, {userId: userId}, true);
    expect(mpin.getUser(userId, "test")).to.be.undefined;
    mpin.restore();
  });
});

describe("# eMpin deleteUser", function () {
  var mpin;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return eMpinTestLocalStorage;
    });
    sinon.stub(mpin, "storeData");
  });

  afterEach(function () {
    mpin.restore();
  });

  it("should return error type " + eMpinErrors.missingUserId + " call without userId", function () {
    expect(mpin.deleteUser(null)).to.deep.equal({code: 0, type: eMpinErrors.missingUserId});
  });

  it("should return error type " + eMpinErrors.invalidUserId + " call with invalid userId", function () {
    expect(mpin.deleteUser("test")).to.deep.equal({code: 1, type: eMpinErrors.invalidUserId});
  });

  it("should delete user", function () {
    var userId = "test@user.id";

    mpin.addToUser(userId, {userId: userId}, true);
    expect(mpin.deleteUser(userId)).to.be.undefined;
    expect(mpin.listUsers()).to.deep.equal([]);
  });
});

describe("# eMpin deleteData", function () {
  var mpin, mpinData = eMpinTestLocalStorage2;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return mpinData;
    });
    sinon.stub(mpin, "storeData");
  });

  afterEach(function () {
    mpin.restore();
  });

  it("should delete data", function () {
    var userId = "test@user.id";

    mpin.addToUser(userId, {userId: userId, mpinId: eMpinTestLocalStorage2.defaultIdentity});
    expect(mpin.deleteData(userId)).to.be.undefined;
    expect(mpinData.accounts[eMpinTestLocalStorage2.defaultIdentity]).to.be.undefined
  });
});

describe("# eMpin setData", function () {
  var mpin, mpinData = eMpinTestLocalStorage;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "getData", function () {
      return mpinData;
    });
    sinon.stub(mpin, "storeData");
  });

  it("should set user", function () {
    expect(mpin.setData("testId", {mpinId: "testId", regOTT: "testOTT"})).to.be.undefined;
    expect(mpinData.accounts.testId.regOTT).to.equal("testOTT");
  });
});

describe("# eMpin recover", function () {
  var mpin, stub;

  beforeEach(function () {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    stub = sinon.stub(mpin, "getData");
    stub.returns(null);
    stub.withArgs("mpin").returns(eMpinTestLocalStorage3);
    sinon.stub(mpin, "setData");
  });

  it("should recover old data", function () {
    var storeDataStub;

    storeDataStub = sinon.stub(mpin, "storeData");

    expect(mpin.recover()).to.be.undefined;
    expect(storeDataStub.callCount).to.equal(1);
  });
});

describe("# _isBytes.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return false call with null", function () {
    expect(mpin._isBytes(null)).to.equal(false);
  });

  it ("should return false call with empty string", function () {
    expect(mpin._isBytes('')).to.equal(false);
  });

  it ("should return true call with empty array", function () {
    expect(mpin._isBytes([])).to.equal(true);
  });

  it ("should return false call with string", function () {
    expect(mpin._isBytes(['a'])).to.equal(false);
  });

  it ("should return true call with integer array", function () {
    expect(mpin._isBytes([1.0])).to.equal(true);
  });

  it ("should return false call with floting point array", function () {
    expect(mpin._isBytes([1.1])).to.equal(false);
  });

  it ("should return true call with min byte array", function () {
    expect(mpin._isBytes([0])).to.equal(true);
  });

  it ("should return true call with max byte array", function () {
    expect(mpin._isBytes([255])).to.equal(true);
  });

  it ("should return false call with under min byte array", function () {
    expect(mpin._isBytes([-1])).to.equal(false);
  });

  it ("should return false call with over max byte array", function () {
    expect(mpin._isBytes([256])).to.equal(false);
  });

  it ("should return true call with valid array", function () {
    expect(mpin._isBytes([0, 255])).to.equal(true);
  });

  it ("should return false call with first invalid array", function () {
    expect(mpin._isBytes([-1, 255])).to.equal(false);
  });

  it ("should return false call with second invalid array", function () {
    expect(mpin._isBytes([0, 256])).to.equal(false);
  });
});

describe("# _uintToBytes.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return null call with null", function () {
    expect(mpin._uintToBytes(null)).to.equal(null);
  });

  it ("should return null call with string", function () {
    expect(mpin._uintToBytes('')).to.equal(null);
  });

  it ("should return byte array call with integer", function () {
    expect(mpin._uintToBytes(1.0)).to.deep.equal([1]);
  });

  it ("should return null call with floting point", function () {
    expect(mpin._uintToBytes(1.1)).to.equal(null);
  });

  it ("should return byte array call with zero", function () {
    expect(mpin._uintToBytes(0)).to.deep.equal([0]);
  });

  it ("should return null call with negative integer", function () {
    expect(mpin._uintToBytes(-1)).to.equal(null);
  });

  it ("should return max 1 byte array call with integer", function () {
    expect(mpin._uintToBytes(255)).to.deep.equal([255]);
  });

  it ("should return min 2 bytes array call with integer", function () {
    expect(mpin._uintToBytes(256)).to.deep.equal([0, 1]);
  });

  it ("should return 2 bytes array call with integer", function () {
    expect(mpin._uintToBytes(257)).to.deep.equal([1, 1]);
  });

  it ("should return 3 bytes array call with integer", function () {
    expect(mpin._uintToBytes(65536)).to.deep.equal([0, 0, 1]);
  });
});

describe("# _uintToFixedLengthBytes.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return null call with null", function () {
    expect(mpin._uintToFixedLengthBytes(null, 0)).to.equal(null);
  });

  it ("should return byte array call with zero and length is 1 shorter than input length", function () {
    expect(mpin._uintToFixedLengthBytes(0, 0)).to.deep.equal([0]);
  });

  it ("should return byte array call with zero and length is same input length", function () {
    expect(mpin._uintToFixedLengthBytes(0, 1)).to.deep.equal([0]);
  });

  it ("should return array of byte and 1 zero-elements call with zero and length is 1 longer than input length", function () {
    expect(mpin._uintToFixedLengthBytes(0, 2)).to.deep.equal([0, 0]);
  });

  it ("should return array of byte and 2 zero-elements call with zero and length is 2 longer than input length", function () {
    expect(mpin._uintToFixedLengthBytes(0, 3)).to.deep.equal([0, 0, 0]);
  });

  it ("should return byte array call with 2-bytes integer and length is 1 shorter than input length", function () {
    expect(mpin._uintToFixedLengthBytes(256, 1)).to.deep.equal([0, 1]);
  });

  it ("should return byte array call with 2-bytes integer and length is same input length", function () {
    expect(mpin._uintToFixedLengthBytes(256, 2)).to.deep.equal([0, 1]);
  });

  it ("should return array of bytes and 1 zero-element call with 2-bytes integer and length is 1 longer than input length", function () {
    expect(mpin._uintToFixedLengthBytes(256, 3)).to.deep.equal([0, 1, 0]);
  });

  it ("should return array of bytes and 2 zero-elements call with 2-bytes integer and length is 2 longer than input length", function () {
    expect(mpin._uintToFixedLengthBytes(256, 4)).to.deep.equal([0, 1, 0, 0]);
  });
});

describe("# _bytesToUint.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return null call with null", function () {
    expect(mpin._bytesToUint(null)).to.equal(null);
  });

  it ("should return zero call with empty array", function () {
    expect(mpin._bytesToUint([])).to.equal(0);
  });

  it ("should return integer call with min byte array", function () {
    expect(mpin._bytesToUint([0])).to.equal(0);
  });

  it ("should return integer call with integer array", function () {
    expect(mpin._bytesToUint([1])).to.equal(1);
  });

  it ("should return integer call with max byte array", function () {
    expect(mpin._bytesToUint([255])).to.equal(255);
  });

  it ("should return integer call with min 2 bytes array", function () {
    expect(mpin._bytesToUint([0, 1])).to.equal(256);
  });

  it ("should return integer call with 2 bytes array", function () {
    expect(mpin._bytesToUint([1, 1])).to.equal(257);
  });

  it ("should return integer call with min 3 bytes array", function () {
    expect(mpin._bytesToUint([0, 0, 1])).to.equal(65536);
  });
});

describe("# _hexToBytes.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return null call with null", function () {
    expect(mpin._hexToBytes(null)).to.equal(null);
  });

  it ("should return null call with integer", function () {
    expect(mpin._hexToBytes(0)).to.equal(null);
  });

  it ("should return empty array call with empty array", function () {
    expect(mpin._hexToBytes('')).to.deep.equal([]);
  });

  it ("should return byte array call with min number hex array", function () {
    expect(mpin._hexToBytes('0')).to.deep.equal([0]);
  });

  it ("should return byte array call with max number hex array", function () {
    expect(mpin._hexToBytes('9')).to.deep.equal([9]);
  });

  it ("should return byte array call with min alphabet hex with lower case array", function () {
    expect(mpin._hexToBytes('a')).to.deep.equal([10]);
  });

  it ("should return byte array call with max alphabet hex with lower array", function () {
    expect(mpin._hexToBytes('f')).to.deep.equal([15]);
  });

  it ("should return byte array call with min alphabet hex with upper case array", function () {
    expect(mpin._hexToBytes('A')).to.deep.equal([10]);
  });

  it ("should return byte array call with max alphabet hex with upper case array", function () {
    expect(mpin._hexToBytes('F')).to.deep.equal([15]);
  });

  it ("should return null call with invalid symbol of char code is 1 less than number's char code", function () {
    expect(mpin._hexToBytes('/')).to.equal(null);
  });

  it ("should return null call with invalid symbol of char code is 1 more than number's char code", function () {
    expect(mpin._hexToBytes(':')).to.equal(null);
  });

  it ("should return null call with invalid symbol of char code is 1 less than lower case alphabet's char code", function () {
    expect(mpin._hexToBytes('`')).to.equal(null);
  });

  it ("should return null call with invalid alphabet with lower case", function () {
    expect(mpin._hexToBytes('g')).to.equal(null);
  });

  it ("should return null call with invalid symbol of char code is 1 less than upper case alphabet's char code", function () {
    expect(mpin._hexToBytes('@')).to.equal(null);
  });

  it ("should return null call with invalid alphabet with upper case", function () {
    expect(mpin._hexToBytes('G')).to.equal(null);
  });

  it ("should return byte array call with max 2 hexes", function () {
    expect(mpin._hexToBytes('ff')).to.deep.equal([255]);
  });

  it ("should return null call with valid alphabet and invalid alphabet", function () {
    expect(mpin._hexToBytes('fg')).to.equal(null);
  });

  it ("should return 2 bytes array call with hexes", function () {
    expect(mpin._hexToBytes('0f00')).to.deep.equal([15, 0]);
  });

  it ("should return 2 bytes array call with hexes with odd length", function () {
    expect(mpin._hexToBytes('f00')).to.deep.equal([15, 0]);
  });
});

describe("# _bytesToHex.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return null call with null", function () {
    expect(mpin._bytesToHex(null)).to.equal(null);
  });

  it ("should return empty string call with empty array", function () {
    expect(mpin._bytesToHex([])).to.equal('');
  });

  it ("should return hex call with min byte array", function () {
    expect(mpin._bytesToHex([0])).to.equal('00');
  });

  it ("should return hex call with byte array", function () {
    expect(mpin._bytesToHex([1])).to.equal('01');
  });

  it ("should return hex call with max byte array", function () {
    expect(mpin._bytesToHex([255])).to.equal('ff');
  });

  it ("should return hex call with min 2 bytes array", function () {
    expect(mpin._bytesToHex([1, 0])).to.equal('0100');
  });

  it ("should return hex call with 2 bytes array", function () {
    expect(mpin._bytesToHex([15, 0])).to.equal('0f00');
  });
});

describe("# _reverseBytes.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return null call with null", function () {
    expect(mpin._reverseBytes(null)).to.equal(null);
  });

  it ("should return empty array call with empty array", function () {
    expect(mpin._reverseBytes([])).to.deep.equal([]);
  });

  it ("should return reverse array call with array of 1 element", function () {
    expect(mpin._reverseBytes([0])).to.deep.equal([0]);
  });

  it ("should return reverse array call with array of 2 elements", function () {
    expect(mpin._reverseBytes([0, 1])).to.deep.equal([1, 0]);
  });

  it ("should return reverse array call with array of 3 elements", function () {
    expect(mpin._reverseBytes([0, 1, 2])).to.deep.equal([2, 1, 0]);
  });
});

describe("# _calculateMPinToken.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return error code call with invalid param", function () {
    expect(mpin._calculateMPinToken(eMpinTestAuthData.mpinId, "0000", "0")).to.equal(-14);
  });
});

describe("# initializeRNG.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return error code call with invalid param", function () {
    expect(mpin.initializeRNG("0")).to.be.undefined;
  });
});

describe("# _addShares.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return error code call with invalid param", function () {
    expect(mpin._addShares("0", "0")).to.equal(-14);
  });
});

describe("# _pass1Request.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return error code call with invalid param", function () {
    expect(mpin._pass1Request(eMpinTestAuthData.mpinId, "0", "0", "0000", 0, "0")).to.equal(-14);
  });
});

describe("# _pass2Request.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return error code call with invalid param", function () {
    expect(mpin._pass2Request("0", false, "0")).to.equal(-14);
  });
});

describe("# _eMpinAuthenticate.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "_getLocalEntropy", function () {
      return eMpinTestAuthData.localEntropy;
    });
  });

  it ("should return param array call with valid param", function () {
    expect(mpin._eMpinAuthenticate(
      eMpinTestAuthData.mpinId,
      eMpinTestAuthData.time,
      eMpinTestAuthData.token,
      eMpinTestAuthData.timePermit,
      eMpinTestAuthData.pin
    )).to.deep.equal({
      MpinId : eMpinTestAuthData.mpinId,
      U : eMpinTestAuthData.u,
      V : eMpinTestAuthData.v,
      W : eMpinTestAuthData.w,
      Nonce : eMpinTestAuthData.nonce,
      CCT : eMpinTestAuthData.cct
    });
  });

  it ("should return param array call with valid param and getPrng_ returning non-zero array for second time", function () {
    sinon.stub(mpin, "getPrng_", function () {
      var index = 0;
      var xNonceValueArray = [
        175, 14, 31, 205, 62, 79, 156, 26, 47, 54, 255, 235, 28, 97, 77, 95, 92, 139, 143, 218, 201, 53, 195, 236, 135, 65, 228, 246, 54, 89, 56, 239,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        200, 195, 196, 86, 88, 37, 52, 33, 96, 193, 243, 202, 198, 26, 36, 235, 96, 209, 194, 74, 175, 223, 140, 223, 54, 217, 138, 232, 254, 43, 1, 198,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0
      ];

      return {
        getByte: function () {
          value = xNonceValueArray[index];
          index += 1;
          return value;
        }
      }
    });
    expect(mpin._eMpinAuthenticate(
      eMpinTestAuthData.mpinId,
      eMpinTestAuthData.time,
      eMpinTestAuthData.token,
      eMpinTestAuthData.timePermit,
      eMpinTestAuthData.pin
    )).to.deep.equal({
      MpinId : eMpinTestAuthData.mpinId,
      U : eMpinTestAuthData.u,
      V : eMpinTestAuthData.v,
      W : eMpinTestAuthData.w,
      Nonce : eMpinTestAuthData.nonce,
      CCT : eMpinTestAuthData.time
    });
  });

  it ("should return param array call with valid param and getPrng_ returning non-zero array for third time", function () {
    sinon.stub(mpin, "getPrng_", function () {
      var index = 0;
      var xNonceValueArray = [
        175, 14, 31, 205, 62, 79, 156, 26, 47, 54, 255, 235, 28, 97, 77, 95, 92, 139, 143, 218, 201, 53, 195, 236, 135, 65, 228, 246, 54, 89, 56, 239,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0,
        200, 195, 196, 86, 88, 37, 52, 33, 96, 193, 243, 202, 198, 26, 36, 235, 96, 209, 194, 74, 175, 223, 140, 223, 54, 217, 138, 232, 254, 43, 1, 198
      ];

      return {
        getByte: function () {
          value = xNonceValueArray[index];
          index += 1;
          return value;
        }
      }
    });
    expect(mpin._eMpinAuthenticate(
      eMpinTestAuthData.mpinId,
      eMpinTestAuthData.time,
      eMpinTestAuthData.token,
      eMpinTestAuthData.timePermit,
      eMpinTestAuthData.pin
    )).to.deep.equal({
      MpinId : eMpinTestAuthData.mpinId,
      U : eMpinTestAuthData.u,
      V : eMpinTestAuthData.v,
      W : eMpinTestAuthData.w,
      Nonce : eMpinTestAuthData.nonce,
      CCT : eMpinTestAuthData.time
    });
  });

  it ("should return empty array call with valid and getPrng_ returning zero array", function () {
    sinon.stub(mpin, "getPrng_", function () {
      var index = 0;
      var xNonceValueArray = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0
      ];

      return {
        getByte: function () {
          value = xNonceValueArray[index];
          index += 1;
          return value;
        }
      }
    });
    expect(mpin._eMpinAuthenticate(
      eMpinTestAuthData.mpinId,
      eMpinTestAuthData.time,
      eMpinTestAuthData.token,
      eMpinTestAuthData.timePermit,
      eMpinTestAuthData.pin
    )).to.deep.equal({});
  });
});

describe("# _eMpinAuthenticateDet.", function () {
  var ctx, mpin;
  

  beforeEach(function() {
    ctx = new CTX("BN254CX");
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return param array call with valid param", function () {
    expect(mpin._eMpinAuthenticateDet(
      eMpinTestAuthData.mpinId,
      eMpinTestAuthData.time,
      eMpinTestAuthData.token,
      eMpinTestAuthData.timePermit,
      eMpinTestAuthData.pin,
      Math.floor(parseInt(eMpinTestAuthData.time, 16) / (3600 * 24 * 1000)),
      ctx.BIG.fromBytes([200, 195, 196, 86, 88, 37, 52, 33, 96, 193, 243, 202, 198, 26, 36, 235, 96, 209, 194, 74, 175, 223, 140, 223, 54, 217, 138, 232, 254, 43, 1, 198]),
      ctx.BIG.fromBytes([175, 14, 31, 205, 62, 79, 156, 26, 47, 54, 255, 235, 28, 97, 77, 95, 92, 139, 143, 218, 201, 53, 195, 236, 135, 65, 228, 246, 54, 89, 56, 239])
    )).to.deep.equal({
      MpinId : eMpinTestAuthData.mpinId,
      U : eMpinTestAuthData.u,
      V : eMpinTestAuthData.v,
      W : eMpinTestAuthData.w,
      Nonce : eMpinTestAuthData.nonce,
      CCT : eMpinTestAuthData.time
    });
  });

  it ("should return param array call with max random value", function () {
    expect(mpin._eMpinAuthenticateDet(
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030353a34353a32352e313233393431222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20226666666666666666666666666666666666666666666666666666666666666666227d",
      "158be10d6e1",
      "040bb0bb1b34cca81130cc61c3305d586d13b71cd2140a1bb6a189cb3fb2201aac089b531d74b343201dab4c19d53afb83f5556d766d21c3581a7adadb91d867cc",
      "040e56923c849168e6ec3f3b06a2e63ac4427170fa74002c9a5146e04ff7933a6623066e4dd2a9308bd0d02c5a8d285eed306d7a075f63451b320751c848bf1389",
      "1111",
      Math.floor(parseInt("158be10d6e1", 16) / (3600 * 24 * 1000)),
      ctx.BIG.fromBytes([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,255, 255, 255]),
      ctx.BIG.fromBytes([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,255, 255, 255])
    )).to.deep.equal({
      MpinId : "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030353a34353a32352e313233393431222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20226666666666666666666666666666666666666666666666666666666666666666227d",
      U : "040ba44779a7f376057f357fb07bf7915de53d6d3c16dd82efbbf6b295f1fe473c0ad16462d88e4dba6a09a4bd091afdba3ad2cac275fb9faa4c5ab07bd2d484c6",
      V : "040ecb27f984fc297b0c2d1d6e9568b3382ce9c6960b8df9fdc12570c2034db1a30274852d82ce618a1a274c2c77a4806517eabbdd7a51e9c57c4e0efe8aa98154",
      W : "04202598424d5909460e7f5fc34b7c1bdb17cfcd1237ea66168679937f426e0ceb2162734eac651c980cc5a2a535441dfffa876316e26861ff2d96da8bb65012af",
      Nonce : "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      CCT : "158be10d6e1"
    });
  });

  it ("should return param array call with min random value", function () {
    expect(mpin._eMpinAuthenticateDet(
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030353a35333a35342e323735323633222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20223030303030303030303030303030303030303030303030303030303030303030227d",
      "158be189d16",
      "04084cc798d17b60c5bb887e98b4935fe4fbd47959220d5b03ab4175a10df6bed91713174ad627bf16dc43e6241f151f41ed7011b5302c841df677e70845b93a13",
      "0401134a4ea2853df04c0bc03e65bc1dc80ac9c8596978611ab996c65eff9610cd06a54631a8366610359913ce6db4f3eb3f84444cba5f71b2f3d3ac54b425a338",
      "1111",
      Math.floor(parseInt("158be189d16", 16) / (3600 * 24 * 1000)),
      ctx.BIG.fromBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0, 0, 1]),
      ctx.BIG.fromBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0, 0, 0])
    )).to.deep.equal({
      MpinId : "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030353a35333a35342e323735323633222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20223030303030303030303030303030303030303030303030303030303030303030227d",
      U : "040e83b73a5edb52cd0e1df703005b3d423ff7855755e794231b033b79ec2d9dac02f8548bbcb195d309a71fdeb3565b2e7452496bea0b073fc509c0938d700fa4",
      V : "040c1771eb1c37933416553ee49930f91c521a8ed8e58a2d160a0fefc8fe1b68a0054bdeaaa7a457bc990376d12e85a34df0e9bd18b19ae06b891511bf70559183",
      W : "0411245f1eccc467eccf6c1c991ad7134283f79e8432626cee5c021ea5b3bd03a00c535b5b983c55f08ca742bad20a6284feedf2563b649f12ee622fe8b18990d8",
      Nonce : "0000000000000000000000000000000000000000000000000000000000000000",
      CCT : "158be189d16"
    });
  });
});

describe("# _eMpinActivationCheck.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
    sinon.stub(mpin, "_getLocalEntropy", function () {
      return eMpinTestAuthData.localEntropy;
    });
  });

  it ("should return param array call with valid param", function () {
    expect(mpin._eMpinActivationCheck(
      eMpinTestActivationData.mpinId,
      eMpinTestActivationData.clientSecret
    )).to.deep.equal({
      MpinId : eMpinTestActivationData.mpinId,
      U : eMpinTestActivationData.u,
      V : eMpinTestActivationData.v
    });
  });

  it ("should return param array call with valid param and getPrng_ returning non-zero array for second time", function () {
    sinon.stub(mpin, "getPrng_", function () {
      var index = 0;
      var xNonceValueArray = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        175, 14, 31, 205, 62, 79, 156, 26, 47, 54, 255, 235, 28, 97, 77, 95, 92, 139, 143, 218, 201, 53, 195, 236, 135, 65, 228, 246, 54, 89, 56, 239,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0
      ];

      return {
        getByte: function () {
          value = xNonceValueArray[index];
          index += 1;
          return value;
        }
      }
    });
    expect(mpin._eMpinActivationCheck(
      eMpinTestActivationData.mpinId,
      eMpinTestActivationData.clientSecret
    )).to.deep.equal({
      MpinId : eMpinTestActivationData.mpinId,
      U : eMpinTestActivationData.u,
      V : eMpinTestActivationData.v
    });
  });

  it ("should return param array call with valid param and getPrng_ returning non-zero array for third time", function () {
    sinon.stub(mpin, "getPrng_", function () {
      var index = 0;
      var xNonceValueArray = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        175, 14, 31, 205, 62, 79, 156, 26, 47, 54, 255, 235, 28, 97, 77, 95, 92, 139, 143, 218, 201, 53, 195, 236, 135, 65, 228, 246, 54, 89, 56, 239
      ];

      return {
        getByte: function () {
          value = xNonceValueArray[index];
          index += 1;
          return value;
        }
      }
    });
    expect(mpin._eMpinActivationCheck(
      eMpinTestActivationData.mpinId,
      eMpinTestActivationData.clientSecret
    )).to.deep.equal({
      MpinId : eMpinTestActivationData.mpinId,
      U : eMpinTestActivationData.u,
      V : eMpinTestActivationData.v
    });
  });

  it ("should return param array call with valid param and getPrng_ returning zero array", function () {
    sinon.stub(mpin, "getPrng_", function () {
      var index = 0;
      var xNonceValueArray = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ,0, 0, 0, 0, 0, 0, 0, 0, 0
      ];

      return {
        getByte: function () {
          value = xNonceValueArray[index];
          index += 1;
          return value;
        }
      }
    });
    expect(mpin._eMpinActivationCheck(
      eMpinTestActivationData.mpinId,
      eMpinTestActivationData.clientSecret
    )).to.deep.equal({});
  });
});

describe("# _eMpinActivationCheckDet.", function () {
  var ctx, mpin;
  

  beforeEach(function() {
    ctx = new CTX("BN254CX");
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return param array call with valid param", function () {
    expect(mpin._eMpinActivationCheckDet(
      eMpinTestActivationData.mpinId,
      eMpinTestActivationData.clientSecret,
      ctx.BIG.fromBytes([175, 14, 31, 205, 62, 79, 156, 26, 47, 54, 255, 235, 28, 97, 77, 95, 92, 139, 143, 218, 201, 53, 195, 236, 135, 65, 228, 246, 54, 89, 56, 239])
    )).to.deep.equal({
      MpinId : eMpinTestActivationData.mpinId,
      U : eMpinTestActivationData.u,
      V : eMpinTestActivationData.v
    });
  });

  it ("should return param array call with max random value", function () {
    expect(mpin._eMpinActivationCheckDet(
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030343a31363a32322e353138313933222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20226666666666666666666666666666666666666666666666666666666666666666227d",
      "0423474f80a2158c0dc4c11b82cd07e408d56efd54a25b2c217310a3c2f2e8bb5323e17189f7d47aabe950fdddbfce1dab909dcfae0e411922a9540f3f3bb2a952",
      ctx.BIG.fromBytes([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,255, 255, 255])
    )).to.deep.equal({
      MpinId : "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030343a31363a32322e353138313933222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20226666666666666666666666666666666666666666666666666666666666666666227d",
      U : "040c48f778964a3eaf54fb44538795ce3df778fd8e29b6583cb73e3d863e3139380f3cfaa9b7f9a48c0ada77bb7da68b7faa94fc46b5af834fd6d6354513b98216",
      V : "0412e06e5b53cad204b765ee70509797b87208d212f1111e03d6b278db2bbcb8361039b9c389f9c016946de574d3df49aadee883109c14e438c1f1b76f8b14e24f"
    });
  });

  it ("should return param array call with min random value", function () {
    expect(mpin._eMpinActivationCheckDet(
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030343a33383a30312e313832383530222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20223030303030303030303030303030303030303030303030303030303030303030227d",
      "0411dd12a9bca98426fb036bd3c2d7091860bbdffccc2ba1f0edb299eb28fe9bdc1650906a0b9756725d789cb7d009d050c981064bc548175365d3dfb3a3c35ea4",
      ctx.BIG.fromBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
    )).to.deep.equal({
      MpinId : "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31322d30322030343a33383a30312e313832383530222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20223030303030303030303030303030303030303030303030303030303030303030227d",
      U : "0415f4dc516e5e6787ee7ffe92a47a462660a56887de260df8f449ba1b8325ab480f565df2fe9a2001dacc7a928ce279f0b130fd01747103c25c03e786fc796760",
      V : "0423da0a2badfa7120a216d19872a9358ec938aca25778a3a95b4f90ec874f9a26006be88144ed52dbbd61b73a23142c3508f2709bd120894e71701877f54c3060"
    });
  });
});

describe("# _eMpinCalcClientSecretWithActivationCode.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return secret call with encode flag", function () {
    expect(mpin._eMpinCalcClientSecretWithActivationCode(
      eMpinTestCalcClientSecretData.mpinId,
      eMpinTestCalcClientSecretData.clientSecret,
      eMpinTestCalcClientSecretData.ActivationCode,
      true
    )).to.equal("04120ce6342e23565c3a64c1662ee7d283b20297fccc912788713a07b48b2cfdbe1e59ec3718800a6ebdbdc9eddd18bf1cfaf931214aa9a27a4cf13886706d45b5");
  });

  it ("should return secret call with encode flag", function () {
    expect(mpin._eMpinCalcClientSecretWithActivationCode(
      eMpinTestCalcClientSecretData.mpinId,
      eMpinTestCalcClientSecretData.clientSecret,
      eMpinTestCalcClientSecretData.ActivationCode,
      false
    )).to.equal("04229c8b88eb9049d5bdb951a72181dee432fcbe79a2e8757ea3c7b135610a31830bb255a5684bec6b853d3936ffa54de80ea4b630f2f84dfdf363e97e628a9aaf");
  });
});

describe("# _eMpinCalcClientSecretWithStringPin.", function () {
  var mpin;

  beforeEach(function() {
    mpin = new mpinjs({server: eMpinTestData.serverUrl});
  });

  it ("should return secret call with encode flag", function () {
    expect(mpin._eMpinCalcClientSecretWithStringPin(
      eMpinTestCalcClientSecretData.mpinId,
      eMpinTestCalcClientSecretData.clientSecret,
      eMpinTestCalcClientSecretData.pin,
      true
    )).to.equal("04222d0d3f2c3fde6782f5433a3c51946fea781fb3850cb441da35cec34370c9210fff5f7f13c2b29bb2dccd6972e1e57aa3ef100a41214137a8d1c68f0af4122b");
  });

  it ("should return secret call with decode flag", function () {
    expect(mpin._eMpinCalcClientSecretWithStringPin(
      eMpinTestCalcClientSecretData.mpinId,
      eMpinTestCalcClientSecretData.clientSecret,
      eMpinTestCalcClientSecretData.pin,
      false
    )).to.equal("040af1fb1388102b28c214b041d073d82626af7144d7bab4f37047bb6b8141ebe815004fac9090f80dbef17ca8c86f2b1bf0986b5dd504e1fd213a024b05b2e4e5");
  });
});

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

var mpinjs = (function () {
  var Mpin, Users = {}, Errors = {}, States = {}, rng, DEBUG;

  Errors.missingUserId = {code: 0, type: "MISSING_USERID"};
  Errors.invalidUserId = {code: 1, type: "INVALID_USERID"};
  Errors.missingParams = {code: 2, type: "MISSING_PARAMETERS"};
  Errors.identityNotVerified = {code: 3, type: "IDENTITY_NOT_VERIFIED"};
  Errors.identityMissing = {code: 4, type: "IDENTITY_MISSING"};
  Errors.wrongPin = {code: 5, type: "WRONG_PIN"};
  Errors.wrongFlow = {code: 6, type: "WRONG_FLOW"};
  Errors.userRevoked = {code: 7, type: "USER_REVOKED"};
  Errors.timeoutFinish = {code: 8, type: "TIMEOUT_FINISH"};
  Errors.requestExpired = {code: 9, type: "REQUEST_EXPIRED"};
  Errors.identityNotAuthorized = {code: 10, type: "IDENTITY_NOT_AUTHORIZED"};
  Errors.incorrectAccessNumber = {code: 11, type: "INCORRECT_ACCESS_NUMBER"};

  Errors.missingActivationCode = {code: 12, type: "MISSING_ACTIVATION_CODE"};
  Errors.invalidActivationCode = {code: 13, type: "INVALID_ACTIVATION_CODE"};
  Errors.maxAttemptsCountOver = {code: 14, type: "MAX_ATTEMPTS_COUNT_OVER"};

  States.invalid = "INVALID";
  States.start = "STARTED";
  States.active = "ACTIVATED";
  States.register = "REGISTERED";
  States.block = "BLOCKED";

  DEBUG = false;

  Mpin = function (options) {
    if (!options || !options.server) {
      return new Error("Missing server URL");
    }

    this.opts = options;
    this.settings = {};

    this.ctx = new CTX("BN254CX");

    this.rng = new this.ctx.RAND();
    this.SEC = [];
    this.X = [];

  };

  Mpin.prototype.storageKey = "mpinjs";

  //supportedProtocols
  // temporary until extend with other portocols
  // then supported should be object of objects
  Mpin.prototype.cfg = {
    protocols: {
      supported: ["1pass", "2pass"],
      default: "2pass"
    }
  };

  Mpin.prototype.init = function (cb) {
    var self = this, _initUrl;

    this.recover();

    var mpinData = this.getData();
    if (!mpinData) {
      mpinData = {
        version: "4",
        accounts: {}
      };
      this.storeData(mpinData);
    }

    if (this.opts.server.slice(-1) === "/") {
      _initUrl = this.opts.server;
    } else {
      _initUrl = this.opts.server + "/";
    }
    _initUrl += this.opts.rpsPrefix || "rps";
    _initUrl += "/clientSettings";

    this.request({url: _initUrl}, function (err, data) {
      if (err && cb) {
        return cb(err, null);
      }

      self.ready = true;
      self.settings = data;

      self.chooseAuthProtocol();
      cb && cb(null, true);
    });
  };

  Mpin.prototype.makeNewUser = function (userId, deviceId) {
    if (!userId) {
      return Errors.missingUserId;
    }

    this.addToUser(userId, {userId: userId, deviceId: deviceId, state: States.invalid});

    return this;
  };

  Mpin.prototype.startRegistration = function (userId, cb) {
    var _reqData = {}, self = this, _userState;
    if (!userId) {
      return cb ? cb(Errors.missingUserId, null) : {error: 1};
    } else if (!this.checkUser(userId)) {
      return cb(Errors.invalidUserId, null);
    } else if (!this.settings.registerURL) {
      return cb({code: Errors.missingParams.code, type: Errors.missingParams.type, message: "Missing registerURL"}, null);
    }



    //invalid
    _userState = this.getUser(userId, "state");
    if (_userState !== States.invalid) {
      return cb(Errors.wrongFlow, null);
    }

    // The following checks that the registration protocol is 1pass.
    if (this.authProtocol === "1pass") {
      _reqData.url = this.generateUrl("eMpinRegister");
    } else {
      _reqData.url = this.generateUrl("register");
    }
    _reqData.type = "PUT";
    _reqData.data = {
      userId: userId,
      mobile: 0
    };

    if (Users[userId].deviceId) {
      _reqData.data.deviceName = Users[userId].deviceId;
    }

    this.request(_reqData, function (err, data) {

      if (err) {
        if (err.status === 403) {
          return cb && cb(Errors.invalidUserId, null);
        }
        return cb(err, null);
      }

      self.addToUser(userId, {regOTT: data.regOTT, mpinId: data.mpinId, state: States.start});

      // The following checks that the registration protocol is 1pass.
      if (self.authProtocol === "1pass") {
        self.addToUser(userId, {cs1: data.clientSecretShare, csParams: data.params, state: States.active});

        if (data.active) {
          self.addToUser(userId, {activationSkip: true, activationCode: data.activationCode});
        } else {
          self.addToUser(userId, {activationSkip: false, activationCode: data.activationCode});
        }
      } else {
        //force activate
        if (data.active) {
          self.addToUser(userId, {state: States.active});
        }
      }

      cb && cb(null, true);
    });
  };

  Mpin.prototype.getActivationCodeAdhoc = function(userId) {
    if (Users[userId].activationSkip) {
      return Users[userId].activationCode;
    } else {
      return false;
    }
  };

  //request cs1 + cs2
  Mpin.prototype.confirmRegistration = function (userId, cb) {
    var _cs1Url = "", self = this, _userState;
    if (!userId) {
      return cb ? cb(Errors.missingUserId, null) : Errors.missingUserId;
    } else if (!this.checkUser(userId)) {
      return cb(Errors.invalidUserId, null);
    } else if (!this.settings.signatureURL) {
      return cb({code: Errors.missingParams.code, type: Errors.missingParams.type, message: "Missing signatureURL option."}, null);
    }

    //started || activated
    _userState = this.getUser(userId, "state");
    if (_userState !== States.start && _userState !== States.active) {
      return cb(Errors.wrongFlow, null);
    }

    //already set.
    if (Users[userId].csHex) {
      return cb(null, true);
    }

    // The following checks that the registration protocol is 1pass.
    if (this.authProtocol === "1pass") {
      this.getClientSecretOneStep(userId, cb);
    } else {
      this.getClientSecretTwoStep(userId, cb);
    }
  };

  Mpin.prototype.getClientSecretOneStep = function(userId, cb) {
    var _cs2Url = "", self = this;
    _cs2Url = self.settings.certivoxURL + "clientSecret?" + Users[userId].csParams;

    //req cs2
    self.request({url: _cs2Url}, function (err, cs2Data) {
      var csHex;
      if (err) {
        if (err.status == 408) {
          return cb(Errors.timeoutFinish, null);
        } else {
          return cb(Errors.wrongFlow, null);
        }
      }

      if (!cs2Data.clientSecret) {
        return cb(Errors.wrongFlow, null);
      }

      self.addToUser(userId, {cs2: cs2Data.clientSecret});
      csHex = self._addShares(cs2Data.clientSecret, Users[userId].cs1);

      self.addToUser(userId, {csHex: csHex});

      cb(null, true);
    });
  };

  Mpin.prototype.getClientSecretTwoStep = function(userId, cb) {
    var _cs1Url = "", self = this;

    _cs1Url = this.generateUrl('signature', {userId: userId});
    //req cs1
    this.request({url: _cs1Url}, function (err, cs1Data) {
      var _cs2Url = "";
      if (err) {
        if (err.status == 401) {
          return cb(Errors.identityNotVerified, null);
        } else {
          return cb(Errors.wrongFlow, null);
        }
      }

      _cs2Url = self.settings.certivoxURL + "clientSecret?" + cs1Data.params;

      //req cs2
      self.request({url: _cs2Url}, function (err, cs2Data) {
        var csHex;

        csHex = self._addShares(cs2Data.clientSecret, cs1Data.clientSecretShare);

        self.addToUser(userId, {csHex: csHex, state: States.active});

        cb(null, true);
      });
    });
  };

  Mpin.prototype.activationCodeVerify = function(userId, activationCode, cb) {
    if (!userId) {
      return cb && cb(Errors.missingUserId, null);
    } else if (!activationCode) {
      return cb && cb(Errors.missingActivationCode, null);
    }

    var secretKey = this.calcSecretKey(Users[userId].mpinId, Users[userId].csHex, activationCode, cb);
    if (!secretKey) {
      return cb && cb(Errors.wrongFlow, true);
    }
    var _verifyData = {};
    _verifyData.url = this.generateUrl("activation_check");
    _verifyData.type = 'POST';
    _verifyData.data = this._eMpinActivationCheck(Users[userId].mpinId, secretKey);

    this.request(_verifyData, function(verifyError, verifyData) {
      if (verifyError) {
        if (verifyError.status === 403) {
          cb && cb(Errors.invalidActivationCode, null);
        } else if (verifyError.status === 410) {
          cb && cb(Errors.maxAttemptsCountOver, null);
        } else {
          cb && cb(verifyError, null);
        }
        return;
      }

      if (verifyData.result) {
        cb && cb(null, true);
      } else {
        cb && cb(Errors.invalidActivationCode, null);
      }
    });
  };

  Mpin.prototype.calcSecretKey = function(mpinId, clientSecret, activationCode, cb) {
    if (!mpinId || !clientSecret | !activationCode) {
      return '';
    }
    var secretKey = this._eMpinCalcClientSecretWithActivationCode(mpinId, clientSecret, activationCode, false);
    return secretKey;
  };

  Mpin.prototype.finishRegistration = function (userId, pin, activationCode) {
    var _user, token;

    if (!userId) {
      return Errors.missingUserId;
    }

    _user = this.getUser(userId);

    if (_user.state !== States.active || !Users[userId].csHex) {
      return Errors.wrongFlow;
    }


    // The following checks that the registration protocol is 1pass.
    if (this.authProtocol === "1pass") {
      var secretKey = this.calcSecretKey(Users[userId].mpinId, Users[userId].csHex, activationCode);
      token = this._eMpinCalcClientSecretWithStringPin(Users[userId].mpinId, secretKey, pin, true);
      delete Users[userId].activationCode;
    } else {
      if (isNaN(pin)) {
        pin = this.toHash(pin);
      }
      token = this._calculateMPinToken(Users[userId].mpinId, pin, Users[userId].csHex);
    }
    delete Users[userId].csHex;

    this.addToUser(userId, {token: token, state: States.register});
 
    return true;
  };

  //Put user / mpinId
  Mpin.prototype.restartRegistration = function (userId, cb) {
    var _reqData = {}, self = this, _userState;

    if (!userId) {
      return cb ? cb(Errors.missingUserId, null) : {error: 1};
    } else if (!this.checkUser(userId)) {
      return cb(Errors.invalidUserId, null);
    } else if (!this.settings.registerURL) {
      return cb({code: Errors.missingParams.code, type: Errors.missingParams.type, message: "Missing registerURL"}, null);
    }

    _userState = this.getUser(userId, "state");
    if (_userState !== States.start) {
      return cb(Errors.wrongFlow, null);
    }

    _reqData.url = this.generateUrl("restart", {userId: userId});
    _reqData.type = "PUT";
    _reqData.data = {
      userId: userId,
      mobile: 0,
      regOTT: Users[userId].regOTT
    };

    this.request(_reqData, function (err, data) {
      if (err) {
        return cb(err, null);
      }

      self.addToUser(userId, {regOTT: data.regOTT, mpinId: data.mpinId});

      //force activate
      if (data.active) {
        self.addToUser(userId, {state: States.active});
      }

      cb && cb(null, true);
    });
  };

  Mpin.prototype.startAuthentication = function (userId, cb) {
    var _tp1Url, self = this, _userState;

    if (!userId) {
      return cb ? cb(Errors.missingUserId, null) : Errors.missingUserId;
    } else if (!this.checkUser(userId)) {
      return cb(Errors.invalidUserId, null);
    } else if (!this.settings.timePermitsURL || !this.settings.certivoxURL) {
      return cb({code: Errors.missingParams.code, type: Errors.missingParams.type, message: "Missing timePermitsURL or/and certivoxURL option."}, null);
    }

    //registered
    _userState = this.getUser(userId, "state");
    if (_userState !== States.register) {
      return cb(Errors.wrongFlow, null);
    }

    //checkUser
    _tp1Url = this.generateUrl('permit1', {userId: userId});
    this.request({url: _tp1Url}, function (err, data) {
      if (err) {
        if (err.status === 401 || err.status === 403 || err.status === 410) {
          return cb(Errors.userRevoked, null);
        }

        return cb(err, null);
      }
      var _signature, _tp2Url, _timePermit1, _storageUrl;
      _signature = data["signature"];
      _timePermit1 = data["timePermit"];

      self.addToUser(userId, {currentDate: data['date']});

      //check cache if exist
      if (Users[userId].timePermitCache && Users[userId].timePermitCache.date === data.date) {
        var _timePermit2 = Users[userId].timePermitCache.timePermit;
        var timePermitHex = self._addShares(_timePermit1, _timePermit2);

        self.addToUser(userId, {timePermitHex: timePermitHex});
        cb && cb(null, true); //exit with cache permit2
        return;
      } else {
        _storageUrl = self.generateUrl("storage", {date: data.date, storageId: data.storageId});

        self.request({url: _storageUrl}, function (storErr, storData) {
          if (storErr) {
            _tp2Url = self.generateUrl('permit2', {userId: userId});
            _tp2Url += "&signature=" + _signature;

            self._getTimePermit2({userId: userId, permit1: _timePermit1, permit2Url: _tp2Url, date: data.date}, cb); //continue

            return;
          }

          var _timePermit2 = storData;
          var timePermitHex = self._addShares(_timePermit1, _timePermit2);

          self.addToUser(userId, {timePermitHex: timePermitHex, timePermitCache: {date: data.date, timePermit: _timePermit2}});

          cb && cb(null, true); //exit with storage permit2
        }, false);
      }
    });
  };

  Mpin.prototype._getTimePermit2 = function (options, cb) {
    var self = this, _timePermit1 = options.permit1;

    this.request({url: options.permit2Url}, function (err2, data2) {
      if (err2) {
        if (err2.status === 401 || err2.status === 403 || err2.status === 410) {
          return cb(Errors.userRevoked, null);
        }

        return cb(err2, null);
      }

      var _timePermit2, timePermitHex, _permitCache = {};
      _timePermit2 = data2["timePermit"];
      timePermitHex = self._addShares(_timePermit1, _timePermit2);

      _permitCache.date = options.date;
      _permitCache.timePermit = data2["timePermit"];

      self.addToUser(options.userId, {timePermitHex: timePermitHex, timePermitCache: _permitCache});

      cb && cb(null, true);
    });
  };

  Mpin.prototype.chooseAuthProtocol = function () {
    var self = this;
    this.authProtocol = this.cfg.protocols.default;

    // We have 3 arrays:
    // 1. Ordered list of protocols sent from the server - this.settings.supportedProtocols
    // 2. List of protocols supported by the library - self.cfg.protocols.supported
    // 3. List of protocols that the library user would like to support - this.opts.authProtocols
    // The goal is to select the first protocol from the server's list (1) that is supported by the library (2) and selected by the lib user (3).
    // If the lib user didn't provide any preferences, then we select the first one from the server's list that is supported by the lib.
    if (this.settings.supportedProtocols && this.settings.supportedProtocols instanceof Array) {
      if (this.opts.authProtocols && this.opts.authProtocols instanceof Array) {

        this.settings.supportedProtocols.some(function (value) {
          if (self.opts.authProtocols.indexOf(value) !== -1 && self.cfg.protocols.supported.indexOf(value) !== -1) {
            self.authProtocol = value;
            return true;
          }
        });
      } else {
        this.settings.supportedProtocols.some(function (value) {
          if (self.cfg.protocols.supported.indexOf(value) !== -1) {
            self.authProtocol = value;
            return true;
          }
        });
      }
    }
  };


  Mpin.prototype.finishAuthentication = function (userId, pin, cb) {
    var _userState;

    //registered
    _userState = this.getUser(userId, "state");
    if (_userState !== States.register) {
      return cb(Errors.wrongFlow, null);
    } else if (!Users[userId].timePermitHex) {
      return cb({code: Errors.wrongFlow.code, type: Errors.wrongFlow.type, message: "Need to call startAuthentication method before this."}, null);
    }

    var opts = {
      userId: userId,
      pin: pin
    };

    // The following checks that the authentication protocol is 1pass.
    if (this.authProtocol === "1pass") {
      this._eMpinPassRequests(opts, cb);
    } else {
      this._pass2Requests(opts, cb);
    }
  };

  Mpin.prototype.finishAuthenticationOtp = function (userId, pin, cb) {
    var _userState;

    //registered
    _userState = this.getUser(userId, "state");
    if (_userState !== States.register) {
      return cb(Errors.wrongFlow, null);
    } else if (!Users[userId].timePermitHex) {
      return cb({code: Errors.wrongFlow.code, type: Errors.wrongFlow.type, message: "Need to call startAuthentication method before this."}, null);
    }

    // The following checks that the authentication protocol is 2pass.
    // This is temporary until the lib supports other protocols
    if (this.authProtocol === this.cfg.protocols.default) {
      this._pass2Requests({userId: userId, pin: pin, otp: true}, function (err, data) {
        if (err) {
          return cb(err, null);
        }

        if (!data.expireTime || !data.ttlSeconds || !data.nowTime) {
          return cb(null, null);
        }

        data.expireTime = data.expireTime / 1000;
        data.nowTime = data.nowTime / 1000;

        cb(null, data);
      });
    }
  };

  Mpin.prototype.finishAuthenticationAN = function (userId, pin, accessNumber, cb) {
    var _userState;

    //registered
    _userState = this.getUser(userId, "state");
    if (_userState !== States.register) {
      return cb(Errors.wrongFlow, null);
    } else if (!Users[userId].timePermitHex) {
      return cb({code: Errors.wrongFlow.code, type: Errors.wrongFlow.type, message: "Need to call startAuthentication method before this."}, null);
    }

    // The following checks that the authentication protocol is 2pass.
    // This is temporary until the lib supports other protocols
    if (this.authProtocol === this.cfg.protocols.default) {
      this._pass2Requests({userId: userId, pin: pin, accessNumber: accessNumber.toString()}, function (err, data) {
        if (err) {
          return cb(err, null);
        }

        if (!data.expireTime || !data.ttlSeconds || !data.nowTime) {
          return cb(null, null);
        }

        data.expireTime = data.expireTime / 1000;
        data.nowTime = data.nowTime / 1000;

        cb(null, data);
      });
    }
  };

  Mpin.prototype._eMpinPassRequests = function(opts, cb) {
    var userId = opts.userId;
    var self = this;
    var pin = opts.pin;

    var _authData = this.getEMpinAuthData(userId, pin);
    self.request(_authData, function(authError, authData) {
      if (authError) {
        if (authError.status === 403) {
          cb && cb(Errors.wrongPin, null);
        } else if (authError.status === 410) {
          cb && cb(Errors.maxAttemptsCountOver, null);
        } else {
          cb && cb(Errors.wrongPin, null);
        }
      } else {
        cb(null, authData);
      }
    });
  };

  Mpin.prototype._pass2Requests = function (opts, cb) {
    var userId, pin, otp, accessNumber, self = this, _reqData = {};
    userId = opts.userId;
    pin = isNaN(opts.pin) ? this.toHash(opts.pin) : opts.pin;

    otp = opts.otp || false;
    accessNumber = opts.accessNumber || false;

    _reqData.url = this.generateUrl("pass1");
    _reqData.type = "POST";
    _reqData.data = this.getAuthData(userId, pin);

    //  pass1
    this.request(_reqData, function (pass1Err, pass1Data) {
      var _req2Data = {}, wid = "0";
      _req2Data.url = self.generateUrl("pass2");
      _req2Data.type = "POST";

      accessNumber && (wid = accessNumber);
      _req2Data.data = self._pass2Request(pass1Data.y, otp, wid);

      _req2Data.data.mpin_id = Users[userId].mpinId;

      // pass 2
      self.request(_req2Data, function (pass2Err, pass2Data) {
        var otpCode;
        if (pass2Err) {
          return cb(pass2Err, null);
        }

        otpCode = pass2Data["OTP"] || false;

        if (pass2Data && pass2Data["OTP"]) {
          delete pass2Data["OTP"];
        }

        self._authenticate({userId: userId, mpinResponse: pass2Data, otpCode: otpCode, accessNumber: accessNumber}, cb);
      });
    });

  };

  Mpin.prototype._authenticate = function (opts, cb) {
    var _authData = {}, self = this;

    if (opts.accessNumber) {
      _authData.url = this.generateUrl("mobileauth");
    } else {
      _authData.url = this.generateUrl("auth");
    }

    _authData.type = "POST";
    _authData.data = {mpinResponse: opts.mpinResponse};

    this.request(_authData, function (authErr, authData) {
      if (authErr) {
        if (authErr.status === 401) {
          return cb(Errors.wrongPin, null);
        } else if (authErr.status === 403) {
          return cb(Errors.identityNotAuthorized, null);
        } else if (authErr.status === 408) {
          return cb(Errors.requestExpired, null);
        } else if (authErr.status === 410) {
          opts.userId && self.addToUser(opts.userId, {state: States.block});
          return cb(Errors.wrongPin, null);
        } else if (authErr.status === 412) {
          return cb(Errors.incorrectAccessNumber, null);
        } else {
          return cb(Errors.wrongPin, null);
        }
      }

      if (opts.otpCode && authData) {
        authData.otp = opts.otpCode;
      }

      cb && cb(null, authData || null);
    });
  };

  Mpin.prototype.checkAccessNumber = function (accessNumber) {
    accessNumber = accessNumber.toString();
    if (!this.settings.accessNumberUseCheckSum || accessNumber.length != this.settings.accessNumberDigits) {
      return true;
    } else {
      if (this.settings.cSum === 1) {
        return this.checkAccessNumberSum2(accessNumber, 6);
      } else {
        return this.checkAccessNumberSum(accessNumber);
      }
    }
  };

  Mpin.prototype.checkAccessNumberSum = function (accNumber, accLen) {
    accLen || (accLen = 1);

    var n = parseInt(accNumber.slice(0, accNumber.length - accLen), 10);
    var cSum = parseInt(accNumber.slice(accNumber.length - accLen, accNumber.length), 10);

    var p = 99991;
    var g = 11;
    var checkSum = ((n * g) % p) % Math.pow(10, accLen);

    return (checkSum === cSum);
  };

  Mpin.prototype.checkAccessNumberSum2 = function (accNumber, accLen) {
    var cSum, checksum, x, w, wid, wid_len, g = 11, sum_d = 0;
    wid = accNumber.toString();
    wid = wid.substring(0, accNumber.toString().length - 1);
    w = accLen + 1;
    sum_d = 0;
    wid_len = wid.length;

    for (var i = 0; i < wid_len; i++) {
      x = parseInt(wid[i]);
      sum_d += (x * w);
      w -= 1;
    }
    checksum = (g - (sum_d % g)) % g;
    checksum = (checksum === 10) ? 0 : checksum;

    //get last one digit and compare with checksum result
    cSum = accNumber.substr(-1);
    cSum = parseInt(cSum);
    return (cSum === checksum);
  };

  Mpin.prototype.getAuthData = function (userId, pin) {
    var _auth = {};

    _auth.mpin = Users[userId].mpinId;
    _auth.token = Users[userId].token;
    _auth.timePermit = Users[userId].timePermitHex;
    _auth.date = Users[userId].currentDate;

    return this._pass1Request(_auth.mpin, _auth.token, _auth.timePermit, pin, _auth.date, null);
  };

  Mpin.prototype.getEMpinAuthData = function (userId, pin) {
    var _authData = {};
    var timePermitHex = Users[userId].timePermitHex;
    var tokenHex = Users[userId].token;
    var client_current_time = this._getTime().toString(16);

    _authData.url = this.generateUrl("eMpinAuth");
    _authData.type = "POST";
    _authData.data = this._eMpinAuthenticate(Users[userId].mpinId, client_current_time, tokenHex, timePermitHex, pin);

    return _authData;
  };

  Mpin.prototype.fromHex = function (strData) {
    if (!strData || strData.length % 2 != 0)
      return '';
    strData = strData.toLowerCase();
    var digits = '0123456789abcdef';
    var result = '';
    for (var i = 0; i < strData.length; ) {
      var a = digits.indexOf(strData.charAt(i++));
      var b = digits.indexOf(strData.charAt(i++));
      if (a < 0 || b < 0)
        return '';
      result += String.fromCharCode(a * 16 + b);
    }
    return result;
  };

  Mpin.prototype.toHash = function (strData) {
    var hash = 0;
    for (var i = 0; i < strData.length; i++) {
      hash = ((hash << 5) - hash) + strData.charCodeAt(i);
    }
    return hash;
  };

  Mpin.prototype.getAccessNumber = function (cb) {
    var self = this, _reqData = {};

    _reqData.url = this.generateUrl("getnumber");
    _reqData.type = "POST";

    this.request(_reqData, function (err, data) {
      if (err) {
        return cb(err, null);
      }
      self.webOTT = data.webOTT;

      var returnData = {
        accessNumber: data.accessNumber,
        ttlSeconds: data.ttlSeconds,
        localTimeStart: data.localTimeStart / 1000,
        localTimeEnd: data.localTimeEnd / 1000
      };

      cb && cb(null, returnData);
    });
  };

  Mpin.prototype.getQrUrl = function (userId, cb) {
    var self = this, _reqData = {};

    _reqData.url = this.generateUrl("getqrurl");
    _reqData.type = "POST";
    _reqData.data = {
      prerollid: userId || ""
    };

    this.request(_reqData, function (err, data) {
      if (err) {
        return cb(err, null);
      }
      self.webOTT = data.webOTT;

      var returnData = {
        qrUrl: data.qrUrl,
        ttlSeconds: data.ttlSeconds,
        localTimeStart: data.localTimeStart / 1000,
        localTimeEnd: data.localTimeEnd / 1000
      };

      cb && cb(null, returnData);
    });
  };

  Mpin.prototype.waitForMobileAuth = function (timeoutSeconds, requestSeconds, cb, cbStatus) {
    var self = this, _reqData = {};
    if (!this.webOTT) {
      return cb({code: Errors.wrongFlow.code, type: Errors.wrongFlow.type, message: "Need to call getAccessNumber method before this."}, null);
    } else if (!timeoutSeconds) {
      return cb({code: Errors.missingParams.code, type: Errors.missingParams.type, message: "Missing timeout/expiration period(in seconds)."}, null);
    }

    self.mobileStatus = self.mobileStatus || '';

    if (typeof this.timeoutPeriod === "undefined") {
      this.timeoutPeriod = timeoutSeconds * 1000;
    }

    _reqData.url = this.generateUrl("getaccess");
    _reqData.type = "POST";
    _reqData.data = {webOTT: this.webOTT};

    this.request(_reqData, function (err, data) {
      var _requestPeriod;

      if (err) {
        cb && cb(err, null);
      } else {
        authOTT = data.authOTT
        delete data.authOTT

        if (data.status === 'authenticate') {
          cbStatus && cbStatus(data);
          // The following checks that the authentication protocol is 1pass.
          if (self.authProtocol === "1pass") {
            cb && cb(null, {mpinResponse: {authOTT: authOTT, userId: data.userId}});
          } else {
            self._authenticate({mpinResponse: {authOTT: authOTT}}, cb);
          }
        } else {
          if (self.timeoutPeriod > 0) {
            _requestPeriod = requestSeconds ? requestSeconds * 1000 : 3000;
            self.timeoutPeriod -= _requestPeriod;
            if (data.status !== self.mobileStatus) {
              self.mobileStatus = data.status;
              cbStatus && cbStatus(data);
            }
            self.intervalID2 = setTimeout(function () {
              self.waitForMobileAuth.call(self, timeoutSeconds, requestSeconds, cb, cbStatus);
            }, _requestPeriod);
            return;
          } else {
            delete self.timeoutPeriod;
            cb && cb(Errors.timeoutFinish, null);
            return;
          }
        }
      }
    });
  };

  Mpin.prototype.cancelMobileAuth = function () {
    if (this.intervalID2) {
      clearInterval(this.intervalID2);
    }

    if (this.timeoutPeriod) {
      delete this.timeoutPeriod;
    }
  };


  Mpin.prototype.generateUrl = function (type, options) {
    var url, mpData, mpin_id_bytes, hash_mpin_id_bytes = [], hash_mpin_id_hex;

    switch (type) {
      case "register":
        url = this.settings.registerURL;
        break;
      case "restart":
        url = this.settings.registerURL + "/";
        url += Users[options.userId].mpinId;
        break;
      case "eMpinRegister":
        url = this.settings.eMpinActivationURL;
        break;
      case "signature":
        url = this.settings.signatureURL + "/";
        url += Users[options.userId].mpinId;
        url += "?regOTT=" + Users[options.userId].regOTT;
        break;
      case "activation_check":
        url = this.settings.mpinAuthServerURL + '/eMpinActivationVerify';
        break;
      case "permit1":
        url = this.settings.timePermitsURL + "/";
        url += Users[options.userId].mpinId;
        break;
      case "permit2":
        mpData = this.fromHex(Users[options.userId].mpinId);
        mpin_id_bytes = this.ctx.MPIN.stringtobytes(mpData);
        hash_mpin_id_bytes = this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, mpin_id_bytes);
        hash_mpin_id_hex = this._bytesToHex(hash_mpin_id_bytes);
        url = this.settings.certivoxURL + "timePermit";
        url += "?app_id=" + this.settings.appID;
        url += "&mobile=0";
        url += "&hash_mpin_id=" + hash_mpin_id_hex;
        break;
      case "pass1":
        url = this.settings.mpinAuthServerURL + "/pass1";
        break;
      case "pass2":
        url = this.settings.mpinAuthServerURL + "/pass2";
        break;
      case "eMpinAuth":
        url = this.settings.mpinAuthServerURL + '/eMpinAuthentication';
        break;
      case "auth":
        url = this.settings.authenticateURL;
        break;
      case "mobileauth":
        url = this.settings.mobileAuthenticateURL;
        break;
      case "getnumber":
        url = this.settings.getAccessNumberURL;
        break;
      case "getqrurl":
        url = this.settings.getQrUrl;
        break;
      case "getaccess":
        url = this.settings.accessNumberURL;
        break;
      case "storage":
        url = this.settings.timePermitsStorageURL + "/" + this.settings.appID + "/";
        url += options.date + "/" + options.storageId;
        break;
    }

    return url;
  };

  Mpin.prototype.listUsers = function () {
    var listUsers = [];
    for (var uKey in Users) {
      listUsers.push({
        userId: Users[uKey].userId,
        deviceId: Users[uKey].deviceId || "",
        state: Users[uKey].state || ""
      });
    }
    return listUsers;
  };

  Mpin.prototype.checkUser = function (userId) {
    return (Users[userId]) ? true : false;
  };

  Mpin.prototype.getUser = function (userId, property) {
    var _user = {};
    if (!userId) {
      return Errors.missingUserId;
    } else if (!this.checkUser(userId)) {
      return Errors.invalidUserId;
    }

    _user = {
      userId: Users[userId].userId,
      deviceId: Users[userId].deviceId || "",
      state: Users[userId].state
    };

    if (!property) {
      return _user;
    } else if (property && _user[property]) {
      return _user[property];
    }
  };


  Mpin.prototype.deleteUser = function (userId) {
    var mpinData = this.getData(), delMpinId;

    if (!userId) {
      return Errors.missingUserId;
    } else if (!this.checkUser(userId)) {
      return Errors.invalidUserId;
    }

    delMpinId = Users[userId].mpinId;

    //memory
    delete Users[userId];

    //store
    delete mpinData.accounts[delMpinId];

    this.storeData(mpinData);
  };

  Mpin.prototype.addToUser = function (userId, userProps, skipSave) {
    if (!this.checkUser(userId)) {
      //create
      Users[userId] = {};
    }

    //If mpinId has changed, we need to delete the object withthe previous one
    if (Users[userId].mpinId && userProps.mpinId && Users[userId].mpinId != userProps.mpinId) {
      // delete information bound to mpinId
      var replace = {
        userId: userId
      };
      Users[userId] = replace;
      this.deleteData(userId);
    }

    for (var uKey in userProps) {
      if (userProps[uKey]) {
        Users[userId][uKey] = userProps[uKey];
      }
    }

    var _save = !skipSave;
    _save && this.setData(userId, userProps);
  };

  Mpin.prototype.restore = function () {
    Users = {};
  };

  Mpin.prototype.deleteData = function (userId) {
    var mpinData = this.getData();

    var mpinId = Users[userId].mpinId;
    if (!mpinData || !mpinData.accounts[mpinId]) {
      return;
    }

    delete mpinData.accounts[mpinId];

    this.storeData(mpinData);
  };

  Mpin.prototype.setData = function (userId, upData) {
    var mpinData = this.getData();

    var mpinId = upData.mpinId || Users[userId].mpinId;
    if (!mpinId) {
      return false;
    }

    //update Default Identity
    if (!mpinData.accounts[mpinId]) {
      mpinData.accounts[mpinId] = {};
    }

    if (upData.regOTT) {
      mpinData.accounts[mpinId].regOTT = upData.regOTT;
    }

    if (upData.timePermitHex) {
      mpinData.accounts[mpinId].MPinPermit = upData.timePermitHex;
    }

    if (upData.token) {
      mpinData.accounts[mpinId].token = upData.token;
    }

    if (upData.state && Users[userId].mpinId) {
      mpinData.accounts[mpinId].state = upData.state;
    }

    //cache cache
    if (upData.timePermitCache) {
      mpinData.accounts[mpinId].timePermitCache = upData.timePermitCache;
    }

    this.storeData(mpinData);
  };

  Mpin.prototype.storeData = function (mpinData, key) {
    var storageKey = key || this.storageKey;
    localStorage.setItem(storageKey, JSON.stringify(mpinData));
  };

  Mpin.prototype.recover = function () {
    var userId, userData = {}, mpinData = this.getData(), isOldData = false;

    if (!mpinData) {
      mpinData = this.getData("mpin");
      isOldData = true;
    }

    if (mpinData && "accounts" in mpinData) {
      for (var mpinId in mpinData.accounts) {
        userId = (JSON.parse(this.fromHex(mpinId))).userID;

        userData = {};
        userData.userId = userId;
        userData.mpinId = mpinId;

        mpinData.accounts[mpinId].regOTT && (userData.regOTT = mpinData.accounts[mpinId].regOTT);
        mpinData.accounts[mpinId].token && (userData.token = mpinData.accounts[mpinId].token);
        mpinData.accounts[mpinId].MPinPermit && (userData.MPinPermit = mpinData.accounts[mpinId].MPinPermit);
        mpinData.accounts[mpinId].timePermitCache && (userData.timePermitCache = mpinData.accounts[mpinId].timePermitCache);

        if (isOldData || !mpinData.accounts[mpinId].state) {
          if (mpinData.accounts[mpinId].token) {
            userData.state = States.register;
          } else if (mpinData.accounts[mpinId].regOTT) {
            userData.state = States.start;
          } else {
            userData.state = States.invalid;
          }
        } else {
          userData.state = mpinData.accounts[mpinId].state;
        }

        //call add To user & skip Save
        this.addToUser(userId, userData, !isOldData);
      }
    }

    if (isOldData && mpinData && "accounts" in mpinData) {
      delete mpinData.accounts;
      this.storeData(mpinData, "mpin");
    }
  };

  Mpin.prototype.getData = function (getKey) {
    var localKey, mpinData;
    localKey = getKey || this.storageKey;
    mpinData = localStorage.getItem(localKey);
    mpinData = JSON.parse(mpinData);
    return mpinData;
  };

//{url: url, type: "get post put", data: data}
  Mpin.prototype.request = function (options, cb, jsonResponse) {
    var _request = new XMLHttpRequest(), _url, _type, _parseJson;
    _url = options.url || "";
    _type = options.type || "GET";

    _parseJson = (typeof jsonResponse !== "undefined") ? jsonResponse : true;

    _request.onreadystatechange = function () {
      if (_request.readyState === 4 && _request.status === 200) {
        if (_parseJson && _request.responseText) {
          cb(null, JSON.parse(_request.responseText));
        } else {
          cb(null, _request.responseText);
        }
      } else if (_request.readyState === 4) {
        cb({status: _request.status}, null);
      }
    };

    _request.open(_type, _url, true);
    if (options.data) {
      _request.setRequestHeader("Content-Type", "application/json");
      _request.send(JSON.stringify(options.data));
    } else {
      _request.send();
    }
  };

/**
 * Check whether an input is a Byte-array.
 * 
 * @param {byte-array}
 *            bytes - any byte-array
 * @return {boolean} true/false
 */
  Mpin.prototype._isBytes = function (bytes) {
    function isByte(num) {
        // is Integer s.t. 0 <= num < 256?
        if (!(typeof(num) === 'number') || !(Math.round(num) === num) || (num < 0) || (256 <= num)) {
            return false;
        } else {
            return true;
        }
    }

    if (Array.isArray(bytes) && bytes.every(isByte)) {
        return true;
    } else {
        return false;
    }
  };

/**
 * Convert an Unsigned Integer to a Byte-array.
 * 
 * @param {integer}
 *            num - an integer greater than or equal to 0
 * @return {byte-array} converted data
 */
  Mpin.prototype._uintToBytes = function (num) {
    // is Unsigned Integer?
    if (!(typeof(num) === 'number') || !(Math.round(num) === num) || (num < 0)) {
      return null;
    }

    if (num === 0) {
      return [ 0 ];
    }

    var bytes = [];
    while (num > 0) {
      var byte = num % 256;
      bytes.push(byte);

      num = (num - byte) / 256;
    }
    return bytes;
  };

/**
 * Convert an Unsigned Integer to a fixed-length Byte-array with zero-fill.
 * 
 * @param {integer}
 *            num - an integer greater than or equal to 0
 * @return {byte-array} converted data
 */
  Mpin.prototype._uintToFixedLengthBytes = function (num, size) {
    var bytes = this._uintToBytes(num);
    if (bytes === null) {
      return null;
    }

    for (var i = size - bytes.length; i > 0; i--) {
      bytes.push(0);
    }
    return bytes;
  };

/**
 * Convert a Byte-array to an Unsigned Integer.
 * 
 * @param {byte-array}
 *            bytes - an integer represented by a byte-array
 * @return {integer} converted data
 */
  Mpin.prototype._bytesToUint = function (bytes) {
    // is Byte Array?
    if (!this._isBytes(bytes)) {
      return null;
    }

    var num = 0;
    for (var i = bytes.length - 1; i >= 0; i--) {
      num = 256 * num + bytes[i];
    }
    return num;
  };

/**
 * Convert a Hex-string to a Byte-array.
 * 
 * @param {hex-string}
 *            str - a hex-string
 * @return {byte-array} converted data
 */
  Mpin.prototype._hexToBytes = function (str) {
    // is Hex String?
    var re = /[^0-9a-f]+/i;
    if ((typeof str !== 'string') || (re.test(str))) {
      return null;
    }

    // 0-fill
    if (str.length % 2 !== 0) {
      str = '0' + str;
    }

    var bytes = [];
    for (var i = 0; i < str.length; i += 2) {
      bytes.push(parseInt(str.substr(i, 2), 16));
    }
    return bytes;
  };

/**
 * Convert a Byte-array to a Hex-string.
 * 
 * @param {byte-array}
 *            bytes - byte array of the hex-string
 * @return {hex-string} converted data
 */
  Mpin.prototype._bytesToHex = function (bytes) {
    // is Byte Array?
    if (!this._isBytes(bytes)) {
      return null;
    }

    var str = '';
    for (var i = 0; i < bytes.length; i++) {
      var tmp = bytes[i].toString(16);
      str = str + (tmp.length === 1 ? '0' + tmp : tmp);
    }
    return str;
  };

/**
 * Reverse a byte-array.
 * 
 * @param {byte-array}
 *            bytes - a byte-array
 * @return {byte-array} reversed byte-array of the input
 * 
 * @example r = _reverseBytes([1, 2, 3, 4, 5]); // r => [5, 4, 3, 2, 1]
 */
  Mpin.prototype._reverseBytes = function (bytes) {
    // is Byte Array?
    if (!this._isBytes(bytes)) {
      return null;
    }

    var rBytes = [];
    for (var i = bytes.length - 1; i >= 0; i--) {
      rBytes.push(bytes[i]);
    }
    return rBytes;
  };

/* Calculates the MPin Token
 *
 * This function convert mpin_id _hex to unicode. It then maps the mpin_id
 * to a point on the curve, multiplies this value by PIN and then subtracts
 * it from the client_secret curve point to generate the M-Pin token.
 *
 * @param {hex-string}
 *            mpin_id_hex - a client M-PIN ID
 * @param {string}
 *            PIN - four digit pin
 * @param {hex-string}
 *            client_secret_hex - an encoded client secret
 * @return {hex-string} an encoded M-Pin Token
 *
 */
  Mpin.prototype._calculateMPinToken = function (mpin_id_hex, PIN, client_secret_hex) {
    "use strict";
    var client_secret_bytes, mpin_id_bytes, token_hex, error_code;

    client_secret_bytes = [];
    mpin_id_bytes = [];

    if (DEBUG) {console.log("Mpin.calculateMPinToken client_secret_hex: " + client_secret_hex); }
    if (DEBUG) {console.log("Mpin.calculateMPinToken mpin_id_hex: " + mpin_id_hex); }
    if (DEBUG) {console.log("Mpin.calculateMPinToken PIN: " + PIN); }

    client_secret_bytes = this._hexToBytes(client_secret_hex);
    mpin_id_bytes = this._hexToBytes(mpin_id_hex);

    error_code = this.ctx.MPIN.EXTRACT_PIN(this.ctx.ECP.HASH_TYPE, mpin_id_bytes, PIN, client_secret_bytes);
    if (error_code !== 0) {
      return error_code;
    }
    token_hex = this._bytesToHex(client_secret_bytes);
    if (DEBUG) {console.log("Mpin.calculateMPinToken token_hex: " + token_hex); }
    return token_hex;
  };

/* Get local entropy
 *
 * This function makes a call to /dev/urandom for a 256 bit value
 *
 * @return {hex-string} 256 bit random value or null
 *
 */
  Mpin.prototype._getLocalEntropy = function () {
    "use strict";
    var crypto, array, entropy_val, i, hex_val;
    if (typeof (window) === 'undefined') {
      if (DEBUG) {console.log("Mpin.getLocalEntropy Test mode without browser"); }
      return "";
    }
    crypto = (window.crypto || window.msCrypto);
    if (typeof (crypto) !== 'undefined') {
      array = new Uint32Array(8);
      crypto.getRandomValues(array);

      entropy_val = "";
      for (i = 0; i < array.length; i++) {
        hex_val = array[i].toString(16);
        entropy_val = entropy_val + hex_val;
      }
      if (DEBUG) {console.log("Mpin.getLocalEntropy len(entropy_val): " + entropy_val.length + " entropy_val: " + entropy_val); }
      return entropy_val;
    }
    return "";
  };

/* Initialize the Random Number Generator (RNG)
 *
 * This function uses an external and, where available, a
 * local entropy source to initialize a RNG.
 *
 * @param {hex-string}
 *            seed_hex - an external seed value for RNGTurn on generation of
 *            local entropy
 *
 */
  Mpin.prototype.initializeRNG = function (seed_hex) {
    "use strict";
    var local_entropy_hex, entropy_hex, entropy_bytes;
    local_entropy_hex = this._getLocalEntropy();
    entropy_hex = local_entropy_hex + seed_hex;
    if (DEBUG) {console.log("Mpin.initializeRNG seed_val_hex: " + seed_hex); }
    if (DEBUG) {console.log("Mpin.initializeRNG local_entropy_hex: " + local_entropy_hex); }
    if (DEBUG) {console.log("Mpin.initializeRNG entropy_hex: " + entropy_hex); }

    entropy_bytes = this._hexToBytes(entropy_hex);

    this.rng.clean();
    this.rng.seed(entropy_bytes.length, entropy_bytes);
  };

  Mpin.prototype.getPrng_ = function() {
    "use strict";

    var localEntropy = this._hexToBytes(this._getLocalEntropy());

    var prng = new this.ctx.RAND();
    prng.clean();
    prng.seed(localEntropy.length, localEntropy);

    return prng;
  };

/* Add two points on the curve that are originally in hex format
 *
 * This function is used to add client secret or time permits shares.
 *
 * @param {hex-string}
 *            share1_hex - an encoded time permit or client secret share
 * @param {hex-string}
 *            share2_hex - an encoded time permit or client secret share
 * @return {hex-string} the encoded sum of the shares
 *
 */
  Mpin.prototype._addShares = function (share1_hex, share2_hex) {
    "use strict";
    var share1_bytes, share2_bytes, sum_bytes, error_code, sum_hex;

    share1_bytes = [];
    share2_bytes = [];
    sum_bytes = [];

    if (DEBUG) {console.log("Mpin.addShares share1_hex: " + share1_hex); }
    if (DEBUG) {console.log("Mpin.addShares share2_hex: " + share2_hex); }

    share1_bytes = this._hexToBytes(share1_hex);
    share2_bytes = this._hexToBytes(share2_hex);

    error_code = this.ctx.MPIN.RECOMBINE_G1(share1_bytes, share2_bytes, sum_bytes);
    if (error_code !== 0) {
      console.log("Mpin.addShares error_code: " + error_code);
      return error_code;
    }
    sum_hex = this._bytesToHex(sum_bytes);
    if (DEBUG) {console.log("Mpin.addShares sum_hex: " + sum_hex); }
    return sum_hex;
  };

/* Form the JSON request for pass one of the M-Pin protocol
 *
 * This function assigns to the property X a random value. It assigns to
 * the property SEC the sum of the client secret and time permit. It also
 * calculates the values U and UT which are required for M-Pin authentication,
 * where U = X.(map_to_curve(MPIN_ID)) and UT = X.(map_to_curve(MPIN_ID) + map_to_curve(DATE|sha256(MPIN_ID))
 * UT is called the commitment. U is the required for finding the PIN error.
 *
 * @param {hex-string}
 *            mpin_id_hex - a client M-PIN ID
 * @param {hex-string}
 *            token_hex - an encoded client secret
 * @param {hex-string}
 *            timePermit_hex - a time permit of an client generated by PKG
 *            server and SP
 * @param {string}
 *            PIN - client knowledge
 * @param {hex-string}
 *            epoch_days - the number of days since UNIX time
 * @param {hex-string}
 *            X_hex - X value generated externally. This is used for test.
 * @return {hash-array} consisting of the M-PIN ID, the points {UT, U} in G1
 *         and the protocol first pass
 *
 */
  Mpin.prototype._pass1Request = function (mpin_id_hex, token_hex, timePermit_hex, PIN, epoch_days, X_hex) {
    "use strict";
    var UT_hex, U_hex, date, error_code, mpin_id_bytes, token_bytes, timePermit_bytes, U, UT, request;

    mpin_id_bytes = [];
    token_bytes = [];
    timePermit_bytes = [];
    U = [];
    UT = [];
    request = {};

    if (DEBUG) {console.log("Mpin.pass1Request mpin_id_hex: " + mpin_id_hex); }
    if (DEBUG) {console.log("Mpin.pass1Request token_hex: " + token_hex); }
    if (DEBUG) {console.log("Mpin.pass1Request timePermit_hex: " + timePermit_hex); }
    if (DEBUG) {console.log("Mpin.pass1Request PIN: " + PIN); }
    if (DEBUG) {console.log("Mpin.pass1Request epoch_days: " + epoch_days); }

    // The following is used for test
    if (X_hex !== null) {
      if (DEBUG) {console.log("Mpin.pass1Request X: " + X_hex); }
      this.X = this._hexToBytes(X_hex);
      this.rng = null;
    }

    mpin_id_bytes = this._hexToBytes(mpin_id_hex);
    token_bytes = this._hexToBytes(token_hex);
    timePermit_bytes = this._hexToBytes(timePermit_hex);

    error_code = this.ctx.MPIN
        .CLIENT_1(this.ctx.ECP.HASH_TYPE, epoch_days, mpin_id_bytes, this.rng, this.X, PIN, token_bytes, this.SEC, U, UT, timePermit_bytes);
    if (error_code !== 0) {
      console.log("Mpin.pass1Request error_code: " + error_code);
      return error_code;
    }
    UT_hex = this._bytesToHex(UT);
    U_hex = this._bytesToHex(U);

    if (DEBUG) {console.log("Mpin.pass1Request Mpin.rng: " + this.rng); }
    if (DEBUG) {console.log("Mpin.pass1Request Mpin.X: " + this._bytesToHex(this.X)); }
    if (DEBUG) {console.log("Mpin.pass1Request Mpin.SEC: " + this._bytesToHex(this.SEC)); }

    // Form request
    request = {
      mpin_id: mpin_id_hex,
      UT: UT_hex,
      U: U_hex,
      pass: 1
    };
    if (DEBUG) {console.log("MPIN.pass1Request request: "); }
    if (DEBUG) {console.dir(request); }

    return request;
  };

/* Form the JSON request for pass two of the M-Pin protocol
 *
 * This function uses the random value y from the server, property X
 * and the combined client secret and time permit to calculate
 * the value V which is sent to the M-Pin server.
 *
 * @param {hex-string}
 *            y_hex - Random value supplied by server
 *
 * @return {hash-array} consisting of the points {V} in G1,
 *         the request OTP, the number required for mobile authentication
 *         and protocol second pass
 *
 */
  Mpin.prototype._pass2Request = function (y_hex, requestOTP, accessNumber) {
    "use strict";

    var y_bytes, x_hex, SEC_hex, error_code, V_hex, request;

    request = {};

    y_bytes = this._hexToBytes(y_hex);
    x_hex = this._bytesToHex(this.X);
    SEC_hex = this._bytesToHex(this.SEC);

    if (DEBUG) {console.log("Mpin.pass2Request x_hex: " + x_hex); }
    if (DEBUG) {console.log("Mpin.pass2Request y_hex: " + y_hex); }
    if (DEBUG) {console.log("Mpin.pass2Request SEC_hex: " + SEC_hex); }

    // Compute V
    error_code = this.ctx.MPIN.CLIENT_2(this.X, y_bytes, this.SEC);
    if (error_code !== 0) {
      console.log("Mpin.pass2Request error_code: " + error_code);
      return error_code;
    }
    V_hex = this._bytesToHex(this.SEC);

    // Form reuest
    request = {
      V: V_hex,
      OTP: requestOTP,
      WID: accessNumber,
      pass: 2
    };
    if (DEBUG) {console.log("Mpin.pass2Request request: "); }
    if (DEBUG) {console.dir(request); }

    return request;
  };

/**
 * Get current time in milliseconds.
 * 
 * @return {integer} current time (msec)
 * 
 */
  Mpin.prototype._getTime = function () {
    "use strict";

    return Date.now();
  };

/**
 * Client-side computation of the eM-Pin non-interactive protocol. This is the
 * deterministic function.
 * 
 * @param {hex-string}
 *            mpinId_hex - a client M-PIN ID
 * @param {hex-string}
 *            clientCurrentTime - current time at client's environment
 * @param {hex-string}
 *            token_hex - an encoded client secret
 * @param {hex-string}
 *            timePermit_hex - a time permit of an client generated by PKG
 *            server and SP
 * @param {string}
 *            pin - client knowledge
 * @param {hex-string}
 *            epochDays - the number of days since UNIX time
 * @param {BIG}
 *            x_bn - a random integer as temporary client secret
 * @param {BIG}
 *            nonce_bn - a random integer as nonce
 * @return {hash-array} consisting of the M-PIN ID, the points {U, V, W} in G1,
 *         the nonce and the client current time in hex-string
 * 
 */
  Mpin.prototype._eMpinAuthenticateDet = function (mpinId_hex, clientCurrentTime, token_hex, timePermit_hex, pin,
      epochDays, x_bn, nonce_bn) {
    "use strict";

    var bytes = [];

    var mpinId_ba = this._hexToBytes(mpinId_hex);
    var hashedMpinId_ba = this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, mpinId_ba);
    var A = this.ctx.ECP.mapit(hashedMpinId_ba);

    var nonce_hex = nonce_bn.toString();

    var pin_bn = this.ctx.BIG
        .fromBytes(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, this.ctx.MPIN.stringtobytes(pin)));
    var aA = A.mul(pin_bn);

    var epochDays_ba = this._reverseBytes(this._uintToFixedLengthBytes(epochDays, 4));
    var TData = epochDays_ba.concat(hashedMpinId_ba);
    var T = this.ctx.ECP.mapit(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, TData));

    var saA = this.ctx.ECP.fromBytes(this._hexToBytes(token_hex));
    var sT = this.ctx.ECP.fromBytes(this._hexToBytes(timePermit_hex));

    var D = new this.ctx.ECP();
    D.copy(A);
    D.add(T);
    var U = D.mul(x_bn);
    var W = A.mul(x_bn);

    U.toBytes(bytes);
    var U_hex = this._bytesToHex(bytes);

    W.toBytes(bytes);
    var W_hex = this._bytesToHex(bytes);

    var yData = mpinId_hex + U_hex + W_hex + nonce_hex + clientCurrentTime;
    var y_bn = this.ctx.BIG
        .fromBytes(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, this.ctx.MPIN.stringtobytes(yData)));

    var xy_bn = new this.ctx.BIG(0);
    xy_bn.add(x_bn);
    xy_bn.add(y_bn);
    xy_bn.norm();

    var V = new this.ctx.ECP();
    V.copy(saA);
    V.add(aA);
    V.add(sT);
    V = V.mul(xy_bn);
    V.neg();

    V.toBytes(bytes);
    var V_hex = this._bytesToHex(bytes);

    if (DEBUG) {
      console.log("x : " + x_bn.toString());
      console.log("y : " + y_bn.toString());
      console.log("x+y : " + xy_bn.toString());
      console.log("U : " + U.toString());
      console.log("V : " + V.toString());
      console.log("W : " + W.toString());
      console.log("A : " + A.toString());
      console.log("T : " + T.toString());
      console.log("D : " + D.toString());
      console.log("U_hex : " + U_hex);
      console.log("W_hex : " + W_hex);
      console.log("V_hex : " + V_hex);
    }

    var eMpinRequest = {
      MpinId : mpinId_hex,
      U : U_hex,
      V : V_hex,
      W : W_hex,
      Nonce : nonce_hex,
      CCT : clientCurrentTime
    };

    return eMpinRequest;
  };

/**
 * Client-side computation to check the activation code in the eM-Pin
 * non-interactive protocol. This is the deterministic function.
 * 
 * @param {hex-string}
 *            mpinId_hex - a client M-PIN ID
 * @param {hex-string}
 *            clientCurrentTime - current time of client's environment
 * @param {hex-string}
 *            x_bn - a random integer as temporary client secret
 * @return {hash-array} consisting of the M-PIN ID, the points {U, V} in G1
 * 
 */
  Mpin.prototype._eMpinActivationCheckDet = function (mpinId_hex, clientSecret_hex, x_bn) {
    "use strict";

    var bytes = [];

    var mpinId_ba = this._hexToBytes(mpinId_hex);
    var A = this.ctx.ECP.mapit(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, mpinId_ba));

    var sA = this.ctx.ECP.fromBytes(this._hexToBytes(clientSecret_hex));

    var U = A.mul(x_bn);

    U.toBytes(bytes);
    var U_hex = this._bytesToHex(bytes);

    var yData = mpinId_hex + U_hex;
    var y_bn = this.ctx.BIG
        .fromBytes(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, this.ctx.MPIN.stringtobytes(yData)));

    var xy_bn = new this.ctx.BIG(0);
    xy_bn.add(x_bn);
    xy_bn.add(y_bn);
    xy_bn.norm();

    var V = new this.ctx.ECP();
    V.copy(sA);
    V = V.mul(xy_bn);
    V.neg();

    V.toBytes(bytes);
    var V_hex = this._bytesToHex(bytes);

    var eMpinActivationRequest = {
      MpinId : mpinId_hex,
      U : U_hex,
      V : V_hex
    };
    return eMpinActivationRequest;
  };

/**
 * Client-side computation of the eM-Pin non-interactive protocol. This is the
 * random function. It calls eMpinAuth._eMpinAuthenticateDet.
 * 
 * @param {hex-string}
 *            mpinId_hex - a client M-PIN ID
 * @param {hex-string}
 *            clientCurrentTime - current time of client's environment
 * @param {hex-string}
 *            token_hex - an encoded client secret
 * @param {hex-string}
 *            timePermit_hex - a time permit of a client generated by PKG and SP
 *            servers
 * @param {string}
 *            pin - client knowledge
 * @return {hash-array} consisting of the M-PIN ID, the points {U, V, W} in G1,
 *         the nonce and the client current time in hex-string
 * 
 */
  Mpin.prototype._eMpinAuthenticate = function (mpinId_hex, clientCurrentTime, token_hex, timePermit_hex, pin) {
    "use strict";

    var prng = this.getPrng_();

    var epochDays = Math.floor(parseInt(clientCurrentTime, 16) / (3600 * 24 * 1000));

    var x_ba = [], n_ba = [], x_ba_check = [];

    for (var i = 0; i < this.ctx.BIG.MODBYTES; i++) {
      x_ba_check.push(0);
      n_ba.push(prng.getByte());
    }

    for (var i = 0; i < 3; i++){

      for (var j = 0; j < this.ctx.BIG.MODBYTES; j++) {
        x_ba.push(prng.getByte());
      }

      if (x_ba.toString() != x_ba_check.toString()){
        break
      }else{
        x_ba = [];
        if (i == 2){
          return {}
        }
      }
    }

    var x_bn = this.ctx.BIG.fromBytes(x_ba);
    var nonce_bn = this.ctx.BIG.fromBytes(n_ba);

    if (DEBUG) {
      console.log("CCT(hex) :" + clientCurrentTime);
      console.log("epochDays: " + epochDays);

      console.log("x_bn" + x_bn.toString());
      console.log("nonce_bn" + nonce_bn.toString());
    }

    return this._eMpinAuthenticateDet(mpinId_hex, clientCurrentTime, token_hex, timePermit_hex, pin, epochDays,
        x_bn, nonce_bn);
  };

/**
 * Client-side computation to check the activation code in the eM-Pin
 * non-interactive protocol. This is the random function. It calls
 * eMpinAuth._eMpinActivationCheckDet.
 * 
 * @param {hex-string}
 *            mpinId_hex - a client M-PIN ID
 * @param {hex-string}
 *            clientSecret_hex - a point of a current secret in G1
 * @return {hash-array} consisting of the M-PIN ID, the points {U, V} in G1
 * 
 */
  Mpin.prototype._eMpinActivationCheck = function(mpinId_hex, clientSecret_hex) {
    "use strict";

    var prng = this.getPrng_();

    var x_ba = [];
    var x_ba_check = [];

    for (var i = 0; i < this.ctx.BIG.MODBYTES; i++) {
      x_ba_check.push(0);
    }

    for (var i = 0; i < 3; i++){

      for (var j = 0; j < this.ctx.BIG.MODBYTES; j++) {
        x_ba.push(prng.getByte());
      }

      if (x_ba.toString() != x_ba_check.toString()){
        break
      }else{
        x_ba = [];
          if (i == 2){
            return {}
          }
      }
    }

    var x_bn = this.ctx.BIG.fromBytes(x_ba);

    return this._eMpinActivationCheckDet(mpinId_hex, clientSecret_hex, x_bn);
  };

/**
 * Encode/decode a (parted) client secret with the Activation Code in Integer.
 * It uses at a activation phase.
 * 
 * For H(ID) = A in G1, an activation code x = scalarVal in N,
 * <li> if isEncode is true, then compute sA - xA s.t. the client secret sA in
 * G1,</li>
 * <li> if isEncode is false, then compute (s-x)A + xA s.t. the encoded client
 * secret (s-x)A in G1.</li>
 * 
 * @param {hex-string}
 *            mpinId_hex - a client M-PIN ID
 * @param {hex-string}
 *            point_hex - an original/encoded client secret
 * @param {integer}
 *            scalarVal - an n-digit activation code generated by SP server
 * @param {boolean}
 *            isEncode - an encode/decode flag
 * @return {hex-string} the encoded/original client secret computed by the
 *         activation code
 */
  Mpin.prototype._eMpinCalcClientSecretWithActivationCode = function(mpinId_hex, point_hex, scalarVal, isEncode) {
    "use strict";

    var mpinId_ba = this._hexToBytes(mpinId_hex);
    var A = this.ctx.ECP.mapit(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, mpinId_ba));

    var scalarVal_ba = this._uintToBytes(scalarVal);
    var hashedScalarVal_bn = this.ctx.BIG.fromBytes(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, scalarVal_ba));
    var xA = A.mul(hashedScalarVal_bn);

    var tA = this.ctx.ECP.fromBytes(this._hexToBytes(point_hex));

    if (isEncode) {
      tA.sub(xA);
    } else {
      tA.add(xA);
    }

    var bytes = [];
    tA.toBytes(bytes);
    return this._bytesToHex(bytes);
  };

/**
 * Encode/decode a (parted) client secret with the PIN presented by ACSII
 * string. It uses at a registration phase for computing the client token.
 * 
 * For H(ID) = A in G1, a hashed PIN x = H_N(scalarVal) in N,
 * <li> if isEncode is true, then compute sA - xA s.t. the client secret sA in
 * G1,</li>
 * <li> if isEncode is false, then compute (s-x)A + xA s.t. the encoded client
 * secret (s-x)A in G1.</li>
 * 
 * @param {hex-string}
 *            mpinId_hex - a client M-PIN ID
 * @param {hex-string}
 *            point_hex - an original/encoded client secret
 * @param {string}
 *            scalarVal - client knowledge
 * @param {boolean}
 *            isEncode - an encode/decode flag
 * @return {hex-string} the encoded/original client secret computed by the PIN
 * 
 */
  Mpin.prototype._eMpinCalcClientSecretWithStringPin = function(mpinId_hex, point_hex, scalarVal, isEncode) {
    "use strict";

    var mpinId_ba = this._hexToBytes(mpinId_hex);
    var A = this.ctx.ECP.mapit(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, mpinId_ba));

    var hashedScalarVal_bn = this.ctx.BIG
        .fromBytes(this.ctx.MPIN.HASH_ID(this.ctx.ECP.HASH_TYPE, this.ctx.MPIN.stringtobytes(scalarVal)));
    var xA = A.mul(hashedScalarVal_bn);

    var tA = this.ctx.ECP.fromBytes(this._hexToBytes(point_hex));

    if (isEncode) {
      tA.sub(xA);
    } else {
      tA.add(xA);
    }

    var bytes = [];
    tA.toBytes(bytes);
    return this._bytesToHex(bytes);
  };

  return Mpin;
})();


//module.exports = mpinjs;
//http://www.matteoagosti.com/blog/2013/02/24/writing-javascript-modules-for-both-browser-and-node/
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
  module.exports = mpinjs;
else
  window.mpinjs = mpinjs;

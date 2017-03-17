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
var empin_inits = function () {
  var Errors, MPINAuth, MPIN, testData, testLocalStorage, testLocalStorage2;

  Errors = [];
  Errors.missingUserId = "MISSING_USERID";
  Errors.invalidUserId = "INVALID_USERID";
  Errors.missingParams = "MISSING_PARAMETERS";
  Errors.identityNotVerified = "IDENTITY_NOT_VERIFIED";
  Errors.identityMissing = "IDENTITY_MISSING";
  Errors.wrongPin = "WRONG_PIN";
  Errors.wrongFlow = "WRONG_FLOW";
  Errors.userRevoked = "USER_REVOKED";
  Errors.timeoutFinish = "TIMEOUT_FINISH";
  Errors.missingActivationCode = "MISSING_ACTIVATION_CODE";
  Errors.invalidActivationCode = "INVALID_ACTIVATION_CODE";
  Errors.maxAttemptsCountOver = "MAX_ATTEMPTS_COUNT_OVER";

  //overwrite global crypto function
  MPINAuth = {};
  MPINAuth.addShares = function () {
    return "040a23a7e6d381a6dbd8b806013f07d40be36b42723ad3b1d986e4bbbe9ece83f421c504a4258cf87251af4ea7e847e4da46730034fc880f92d885c419716cb944";
  };
  MPINAuth.calculateMPinToken = function () {
    return "04236eb28be98764e379049a2c4371752e7e3adc99a844800b9de2c34d2c70d95b07354c556276cbf79cee9e601807e6166d9bffedc3c1b1909ab5bf63330e2131";
  };
  MPINAuth.pass1Request = function () {
    return {};
  };
  MPINAuth.pass2Request = function () {
    return {};
  };

  eMpinAuth = {};
  eMpinAuth.activationCheck = function() {
    return {
      MpinId: "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30352d31312031373a35333a35382e333138383232222c2022757365724944223a20227465737440757365722e6964222c202273616c74223a20223934633531353366616435353236316666656231653239626164396439336536227d",
      U: "0410088291e8b416bb42459812545adb49559d87b5bcbe925d2c4c5ae6c0c76d9a1c9d2d4893de63a370899ddcf2be8ef514cbd8b869fcfb5a1e7970a6555f1967",
      V: "040d5462cea71a0e894690a1c339962e8ff57b3e0f379375d89b29cfeafe53fe641d74e570817d135ca5c150267bbb1e38ab6486951a0aa392f745bf7ded212ef8"
    };
  };
  eMpinAuth.calcClientSecretWithActivationCode = function() {
    return "04203ddb03ff81d0ee3a69922b71e33937eb106c912faf4d4b08728a4100274fab00623906abbcb73d5ab1e4d50e65046af29ed9c18ccad3bb30c0ccf935b03d7b";
  };
  eMpinAuth.authenticate = function() {
    return {
      userId: "test@user.id",
      client_curren_time: "154a1301528",
      tokenHex: "0419a1678856dcaa871a2fdabeba9920c04c6c7c4abc57cb8a0bff9d279227b00118c9c56fd10ac84a817fa3a1f52d2200eeebd84ac76538b5a8effdbf514d5798"
    }
  };
  eMpinAuth.calcClientSecretWithStringPin = function() {
    return '0419a1678856dcaa871a2fdabeba9920c04c6c7c4abc57cb8a0bff9d279227b00118c9c56fd10ac84a817fa3a1f52d2200eeebd84ac76538b5a8effdbf514d5798';
  };
  eMpinAuth.getTime = function() {
    return Date.now();
  };

  MPIN = {};
  MPIN.stringtobytes = function () {
    return "";
  }
  MPIN.HASH_ID = function () {
    return "";
  }
  MPIN.bytestostring = function () {
    return "";
  }

  testData = {};
  testData.serverUrl = "http://192.168.10.63:8005";
  testData.clientSettings = {
    requestOTP: false,
    mpinAuthServerURL: "http://192.168.10.63:8011/rps",
    registerURL: "http://192.168.10.63:8011/rps/user",
    signatureURL: "http://192.168.10.63:8011/rps/signature",
    certivoxURL: "https://community-api.certivox.net/v3/",
    timePermitsURL: "http://192.168.10.63:8011/rps/timePermit"
  };
  testData.mpin = {
    mpinId: "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30352d31312031373a34373a31372e323730373137222c2022757365724944223a20227465737440757365722e6964222c202273616c74223a20223563646431393762343434363831323638613838393332613932383833363139227d",
    active: false,
    activationCode: "0",
    clientSecretShare: "041cbe23fdf4d89c50682271821653295639aac354eceb895a02158da0733c66a723e46c9d38db19f8b8316d70be6b5df0339cd9802c5565293908ca50354dd48b",
    params: "mobile=0&expires=2016-05-11T18%3A47%3A17Z&app_id=d38e50460aa611e6b23b06df5546c0ed&hash_mpin_id=ee98736646a337ca53d176d317bd076bac01927595c76491aa8acb129871297c&signature=5bfdef889c353188236e4d2a637217098a98087d6527a6674eefe3dc157a9434&hash_user_id="
  };
  testData.mpinForceActivated = {
    mpinId: "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30352d31312031373a34373a31372e323730373137222c2022757365724944223a20227465737440757365722e6964222c202273616c74223a20223563646431393762343434363831323638613838393332613932383833363139227d",
    active: true,
    activationCode: "932823342445",
    clientSecretShare: "041cbe23fdf4d89c50682271821653295639aac354eceb895a02158da0733c66a723e46c9d38db19f8b8316d70be6b5df0339cd9802c5565293908ca50354dd48b",
    params: "mobile=0&expires=2016-05-11T18%3A47%3A17Z&app_id=d38e50460aa611e6b23b06df5546c0ed&hash_mpin_id=ee98736646a337ca53d176d317bd076bac01927595c76491aa8acb129871297c&signature=5bfdef889c353188236e4d2a637217098a98087d6527a6674eefe3dc157a9434&hash_user_id="
  };
  testData.activationCode = 932823342445;

  testData.cs = {
    clientSecret: "04023f8968bc12ca0c7666ec8563f80d5e55389e724442bf1a1dd36bab518b9155210bc72d4fe20e086d2de7c7bfdad2d17a166185de3994a76fa224974377c203",
    message: "OK",
    version: "3"
  };

  testData.csError = {
    message: "OK",
    version: "3"
  };

  testData.verify = {
    message: "eMpin Activation is valid.",
    result: true,
    version: "3"
  };
  testData.tp1 = {
    "timePermit": "04145085669aa20607c0da730c01c707010e546bb81cf17abc29cacfef8e162b0f097b547c7058f6bd88e55cadc721b5721ee9730bfb10fa239c5bfacdb62fa3f4",
    "signature": "39f9e16201d05dd3e369d43bd73cf0249e5bac01d5ff2975640d988e4a37b7f5",
    "date": 16876
  };
  testData.tp2 = {
    "timePermit": "040ff870574cb3c923410fdf33681beacd6ca6eeeb8858150efbf1241da9202c5604977ae285410df0d86a9976611b255a6fcbeeaf22bb398e4859ff3348bb4d87"
  };
  testData.auth = {
    "authOTT": "b0784ab9b6759953a3c6da85bdbdbaf3"
  };

  testLocalStorage = {
    "accounts": {
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30322d32332031363a34393a31302e313039363734222c2022757365724944223a20227465737440746573742e636f6d222c202273616c74223a20223162396336353564343665323238373661333631373033353138616636363037227d": {
        "regOTT": "4ac1cca55c09f6d4e47a253d8cd503b5",
        "state": "STARTED"
      }
    }
  };

  testLocalStorage2 = {
    "defaultIdentity": "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30322d30332031363a31333a32362e333030393938222c2022757365724944223a2022616161406262622e636f6d222c202273616c74223a20223237386166373433663465373034363764323334313936323262316333616231227d",
    "version": "0.3",
    "accounts": {
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30322d30332031363a31333a32362e333030393938222c2022757365724944223a2022616161406262622e636f6d222c202273616c74223a20223237386166373433663465373034363764323334313936323262316333616231227d": {
        "MPinPermit": "",
        "token": "",
        "regOTT": "b6216da7e3224e07eb4791815bcfcaa6"
      },
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30322d30382030383a35383a34302e373737373130222c2022757365724944223a2022646464737265406d61696c696e61746f722e636f6d222c202273616c74223a20223831373539623463313032363666646431616337323231326530643839393932227d": {
        "MPinPermit": "042235a80c4c24f25a8a61758d3dac87d72b693c989ef95704c2ba51c7f4d98a631c912c9dc48435d9dd1af3dc17fa7d9e2af9beb16cc77bd38150c4697efdf232",
        "token": "0412e48b124199f683e0ea6b8a1f1b073013dce21610de4b54cac74696e02003b1147d3ad7b4cef542c6ef61726dc4ffba039c90f7edd17cbeafb7c0737b41fc82",
        "regOTT": "11adb574045ffe27e718d8b4dc665887",
        "timePermitCache": {
          "date": 16867,
          "timePermit": "041c990c4087b5eeb7f4c2dbe5869794c208a22f63f6485a8905b35f542b2136a91cccf0696a6c60b2208ff1d3178da8fa661f7a52dda7db2738bfb1fe8b6cfa4b"
        }
      }
    },
    "deviceName": "winChrome"
  };

  return {
    Errors: Errors,
    MPINAuth: MPINAuth,
    MPIN: MPIN,
    testData: testData,
    testLocalStorage: testLocalStorage,
    testLocalStorage2: testLocalStorage2
  };
}();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
  module.exports = empin_inits;
else
  window.empin_inits = empin_inits;

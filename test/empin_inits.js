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
  var Errors, testData, testLocalStorage, testLocalStorage2, testAuthData, testActivationData, testCalcClientSecretData;

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
  Errors.requestExpired = "REQUEST_EXPIRED";
  Errors.identityNotAuthorized = "IDENTITY_NOT_AUTHORIZED";
  Errors.incorrectAccessNumber = "INCORRECT_ACCESS_NUMBER";
  Errors.missingActivationCode = "MISSING_ACTIVATION_CODE";
  Errors.invalidActivationCode = "INVALID_ACTIVATION_CODE";
  Errors.maxAttemptsCountOver = "MAX_ATTEMPTS_COUNT_OVER";

  testData = {};
  testData.serverUrl = "http://192.168.10.63:8005";
  testData.clientSettings = {
    requestOTP: false,
    mpinAuthServerURL: "http://192.168.10.63:8011/rps",
    registerURL: "http://192.168.10.63:8011/rps/user",
    signatureURL: "http://192.168.10.63:8011/rps/signature",
    certivoxURL: "https://community-api.certivox.net/v3/",
    timePermitsURL: "http://192.168.10.63:8011/rps/timePermit",
    accessNumberUseCheckSum: true,
    accessNumberDigits: 7,
    supportedProtocols: ["1pass", "2pass"],
    cSum: 1
  };
  testData.clientSettings2 = {
    requestOTP: false,
    mpinAuthServerURL: "http://192.168.10.63:8011/rps",
    registerURL: "http://192.168.10.63:8011/rps/user",
    signatureURL: "http://192.168.10.63:8011/rps/signature",
    certivoxURL: "https://community-api.certivox.net/v3/",
    timePermitsURL: "http://192.168.10.63:8011/rps/timePermit",
    accessNumberUseCheckSum: true,
    accessNumberDigits: 6,
    cSum: 0
  };
  testData.clientSettings3 = {
    requestOTP: false,
    mpinAuthServerURL: "http://192.168.10.63:8011/rps",
    registerURL: "http://192.168.10.63:8011/rps/user",
    signatureURL: "http://192.168.10.63:8011/rps/signature",
    certivoxURL: "https://community-api.certivox.net/v3/",
    timePermitsURL: "http://192.168.10.63:8011/rps/timePermit",
    accessNumberUseCheckSum: true,
    accessNumberDigits: 7,
    supportedProtocols: ["3pass"],
    cSum: 1
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
  testData.verifyError = {
    message: "eMpin Activation is invalid.",
    result: false,
    version: "3"
  };
  testData.cs1 = {
    clientSecretShare: "0421e379eb45e56ce699f0a7a83b683e84944b63fcc93a2834a4769ea40a28dc3f2064cd9d64846304999e00008b0838e246d3ea06d0013f1080c1027d54630ca9",
    params: "mobile=0&expires=2015-12-03T12%3A47%3A23Z&app_id=e340a9f240e011e5b23b06df5546c0ed&hash_mpin_id=07a9af5af89d66b969be31d3d4e29c2a0a5ad4d3e30432eed9b3915dbf52230a&signature=33e8e987b07a2d9c9f3d98f68268870ef104cd0e0b9e02ba2c55e8bbf5190913&hash_user_id="
  };
  testData.cs2 = {
    clientSecret: "0409ba1a247561ab16c35df3ad0ca9846db9968fa28757005335dc2ca35188b4f51521ac97d45bbdb3a8d1c0fdfe79ab29031054534df8b7cbac12e67e4e99d685"
  };
  testData.tp1 = {
    "timePermit": "04145085669aa20607c0da730c01c707010e546bb81cf17abc29cacfef8e162b0f097b547c7058f6bd88e55cadc721b5721ee9730bfb10fa239c5bfacdb62fa3f4",
    "signature": "39f9e16201d05dd3e369d43bd73cf0249e5bac01d5ff2975640d988e4a37b7f5",
    "date": 16876
  };
  testData.tp2 = {
    "timePermit": "040ff870574cb3c923410fdf33681beacd6ca6eeeb8858150efbf1241da9202c5604977ae285410df0d86a9976611b255a6fcbeeaf22bb398e4859ff3348bb4d87"
  };
  testData.pass1 = {
    "y": "1dacb1f6830de09c0697485159da2ba4ed2908a8e24a85b886ff284306738b31"
  };
  testData.auth = {
    "status": "authenticate",
    "userId": "test@user.id",
    "OTP": "155317",
    "authOTT": "b0784ab9b6759953a3c6da85bdbdbaf3"
  };
  testData.auth2 = {
    "status": "new",
    "userId": "test@user.id",
    "authOTT": ""
  };

  testData.an = {
    "localTimeStart": 1516744365000,
    "ttlSeconds": 300,
    "localTimeEnd": 1516744665000,
    "webOTT": "8ab9a0c5cb14119efd56f8447fcda268",
    "accessNumber": 1525913
  }

  testData.qr = {
    "localTimeStart": 1516745691000,
    "ttlSeconds": 300,
    "localTimeEnd": 1516745991000,
    "webOTT": "64790198ab575b1f2902b467e83abe40",
    "qrUrl": "http://192.168.10.63:8005#f56ed367caf24a0587e12abc52e470e4"
  }

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

  testLocalStorage3 = {
    "defaultIdentity": "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30322d30332031363a31333a32362e333030393938222c2022757365724944223a2022616161406262622e636f6d222c202273616c74223a20223237386166373433663465373034363764323334313936323262316333616231227d",
    "version": "0.3",
    "accounts": {
      "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30322d30332031363a31333a32362e333030393938222c2022757365724944223a2022616161406262622e636f6d222c202273616c74223a20223237386166373433663465373034363764323334313936323262316333616231227d": {
        "MPinPermit": "",
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

  testAuthData = {};
  testAuthData.localEntropy = "2d1571a65f710ecf486035238b21065787a980f8bce5a93f770be6c1948fcc08";
  testAuthData.mpinId = "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d30372d31332030393a35353a34332e383734313935222c2022757365724944223a2022617a415a30392e2123242526272a2b2f3d3f5e5f607b7c7d7e2d406c6f63616c686f7374222c202273616c74223a20223039636430363936313063333762613163303263326136633538393734666533227d";
  testAuthData.time = "1578f22893b";
  testAuthData.token = "040d6f3ee8377941ff0def258395dbd1216fb75154353334553a091400a0bf86880d4bc7c1d2ab1202483775bb8e5d88dce8f731a8c890e33c2b7f875df267a66e";
  testAuthData.timePermit = "04139b6ae89f0d01b82e92622530ebbc9a90bffad928eb11bf8eec9ee5be6d4cdf00482ea508769610d15c7f1ae534ea4870ba4d2086c928b7eaba065bb0c4290a";
  testAuthData.pin = "0369";
  testAuthData.u = "041950bf695cb0ab35ded81db32204e37d663062771f0fce286ded73c0a20597420fac43ce0a897f3ded15da22834c64c50127e06e3d34387e0b079ceb2d87b3d5";
  testAuthData.v = "040498b41cd6a3cbf352aae357b177a7674e09244332631cb775e1d0943745c5da04f0d96a79121ec896b3de1b3cea128800de0d5b47ce35a7129462f39709cc54";
  testAuthData.w = "0412c0651e731b5d4b7a6a0a1a52f432d74d6091551c6041d1456a925c81b4d4941c0149c0354993b4ee89305d57478624f10fdde3cde740acc6481595c83d4f30";
  testAuthData.nonce = "af0e1fcd3e4f9c1a2f36ffeb1c614d5f5c8b8fdac935c3ec8741e4f6365938ef";
  testAuthData.cct = "1578f22893b";

  testActivationData = {};
  testActivationData.mpinId = "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31302d30352030343a33383a35392e303737353235222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20226331333933323132343037306165393961653239663364626332323565633133227d";
  testActivationData.clientSecret = "04085d31ae03beefbbec5dfbfea648033746ac79caf6b3b562047c5c73b10f8fe62275b1b0e4c4ce304aaa6609143baf01e0a3b9810162e393c94ec3b19d7cd1b4";
  testActivationData.u = "041e578d246b71d00e995cdc4618996f2e6a571ab5ea1f7d406b496a69ff25502605f2d5e426298b86bdc891e4a57c0ae82acbb697b1db70620d3daf6a8f937347";
  testActivationData.v = "0404978d69b3972983fd45e5b85de1717aa93b799faaaa357126d987658f31c7f8006fa7b4eba537b2776b7eaad83dfc1c02e643c628cbbc550bc0cac14735c81a";

  testCalcClientSecretData = {};
  testCalcClientSecretData.mpinId = "7b226d6f62696c65223a20302c2022697373756564223a2022323031362d31302d30352030353a32343a34392e313332363834222c2022757365724944223a2022726f6f74406c6f63616c686f7374222c202273616c74223a20226666653265353530313133306565363165626239396465386132376633333839227d";
  testCalcClientSecretData.clientSecret = "040d14b7e361c52028946bb0c9ba2c7b3c845d205a0d0d6c441ca257ad0624b3c1131810ef3bc5030fb0c1a85b8bc86e950e1d4149ddfe1b45b68852fa0d426b52";
  testCalcClientSecretData.ActivationCode = 922663046386;
  testCalcClientSecretData.pin = "0369";

  return {
    Errors: Errors,
    testData: testData,
    testLocalStorage: testLocalStorage,
    testLocalStorage2: testLocalStorage2,
    testLocalStorage3: testLocalStorage3,
    testAuthData: testAuthData,
    testActivationData: testActivationData,
    testCalcClientSecretData: testCalcClientSecretData
  };
}();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
  module.exports = empin_inits;
else
  window.empin_inits = empin_inits;

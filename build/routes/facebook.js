'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fb = require('fb');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

_fb.FB.options({
  appId: process.env.FACEBOOK_APP_ID,
  appSecret: process.env.FACEBOOK_APP_SECRET,
  redirectUri: "http://localhost:4000/facebook/callback"
});

router.get('/me', function (req, res, next) {
  new _bluebird2.default(function (resolve, reject) {
    _fb.FB.api('me', {
      access_token: req.session.access_token || process.env.FACEBOOK_ACCESS_TOKEN
    }, function (fbResp) {
      return !fbResp || fbResp.error ? reject(fbResp.error) : resolve(fbResp);
    });
  }).then(function (result) {
    return res.json(result);
  }).catch(function (err) {
    return res.status(500).json(err);
  });
});

router.get('/posts', function (req, res, next) {
  new _bluebird2.default(function (resolve, reject) {
    _fb.FB.api('countryshore/feed', {
      access_token: req.session.access_token || process.env.FACEBOOK_ACCESS_TOKEN
    }, function (fbResp) {
      return !fbResp || fbResp.error ? reject(fbResp.error) : resolve(fbResp);
    });
  }).then(function (result) {
    var postsNotLiked = result.data.filter(function (post) {
      return post.likes.data.findIndex(function (like) {
        return like.id == process.env.FACEBOOK_USER_ID;
      }) == -1;
    });
    result.data.forEach(function (post) {
      console.log(postsNotLiked);
    });
    return res.json(postsNotLiked.map(function (value) {
      return { link: value['link'], picture: value['picture'], message: value['message'] };
    }));
  }).catch(function (err) {
    return res.status(500).json(err);
  });
});

router.get('/loginurl.:format?', function (req, res, next) {
  var url = _fb.FB.getLoginUrl({ scope: 'user_about_me,user_friends' });
  req.params.format == 'html' ? res.redirect(url) : res.json({ url: url });
});

router.get('/callback', function (req, res, next) {
  var code = req.query.code;

  if (req.query.error) {
    return res.status(500).json({ name: "Rejected", message: "The user did not allow the permissions" });
  } else if (!code) {
    return res.status(500).json({ name: "Rejected", message: "The user did not allow the permissions" });
  }

  new _bluebird2.default(function (resolve, reject) {
    _fb.FB.api('oauth/access_token', {
      client_id: _fb.FB.options('appId'),
      client_secret: _fb.FB.options('appSecret'),
      redirect_uri: _fb.FB.options('redirectUri'),
      code: code
    }, function (fbResp) {
      if (!fbResp || fbResp.error) {
        return reject(fbResp.error);
      }

      resolve(fbResp);
    });
  }).then(function (fbResp) {
    return new _bluebird2.default(function (resolve, reject) {
      _fb.FB.api('oauth/access_token', {
        client_id: _fb.FB.options('appId'),
        client_secret: _fb.FB.options('appSecret'),
        grant_type: 'fb_exchange_token',
        fb_exchange_token: fbResp.access_token
      }, function (fbResp) {
        if (!fbResp || fbResp.error) {
          return reject(fbResp.error);
        }

        resolve(fbResp);
      });
    });
  }).then(function (fbResp) {
    req.session.access_token = fbResp.access_token;
    req.session.expires = fbResp.expires || 0;

    return res.json(fbResp);
  }).catch(function (err) {
    return res.status(500).json(err);
  });
});

module.exports = router;
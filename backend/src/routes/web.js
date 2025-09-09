const express = require('express');
const router = express.Router();
const {getHomePage, getAbcPage, getEx} = require('../controllers/homeController');


//router.methods('/route', handler)
router.get('/', getHomePage);
router.get('/abc', getAbcPage);
router.get('/ex', getEx);

module.exports = router;

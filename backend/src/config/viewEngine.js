const path = require('path');
const express = require('express');
const configViewEngine = (app) => {
    //config view engine
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');
    // config static files
    app.use(express.static(path.join(__dirname, 'public')));
    
}
module.exports = configViewEngine;
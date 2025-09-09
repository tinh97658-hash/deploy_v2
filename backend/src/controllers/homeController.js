
const connection = require('../config/database');



const getHomePage = (req, res) => {
    //process data
    //call model
    let users = [];
    connection.query(
        'select * from Users u', 
        function(error, results, fields) {
            users = results;
            console.log('>>>>>results: ', results);
            res.send(JSON.stringify(users));
        }
    );
    
}

const getAbcPage = (req, res) => {
    //process data
    //cal model

    res.send("abc World! testing")
}
const getEx = (req, res) => {
    //process data
    //call model

  res.render('ex');
}
module.exports = {
    getHomePage,
    getAbcPage,
    getEx
}
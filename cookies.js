const fs = require("fs");

// trim newline in txt
const weiboCookies = fs.readFileSync("./weibo_cookies.txt").toString().trim();

module.exports = weiboCookies;
